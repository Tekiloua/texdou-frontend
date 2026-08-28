import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  Gauge,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchConsommations, type Consommation } from "@/api/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartPoint {
  date: string
  sortKey: number
  input: number
  output: number
  total: number
}

type PresetKey = "7d" | "30d" | "90d" | "all"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function presetRange(preset: Exclude<PresetKey, "all">): {
  debut: string
  fin: string
} {
  const end = new Date()
  const start = new Date()
  const days = preset === "7d" ? 6 : preset === "30d" ? 29 : 89
  start.setDate(end.getDate() - days)
  return { debut: toISODate(start), fin: toISODate(end) }
}

function filterByDateRange(
  data: Consommation[],
  dateDebut: string,
  dateFin: string
): Consommation[] {
  if (!dateDebut && !dateFin) return data

  // Bounds are inclusive. dateDebut/dateFin come from <input type="date"> as "YYYY-MM-DD".
  const start = dateDebut ? new Date(`${dateDebut}T00:00:00`) : null
  const end = dateFin ? new Date(`${dateFin}T23:59:59.999`) : null

  return data.filter((c) => {
    const d = new Date(c.created_at)
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  })
}

function groupByDate(data: Consommation[]): ChartPoint[] {
  const map: Record<
    string,
    { input: number; output: number; sortKey: number }
  > = {}

  for (const c of data) {
    const d = new Date(c.created_at)
    const date = d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    })
    if (!map[date]) {
      map[date] = {
        input: 0,
        output: 0,
        sortKey: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      }
    }
    map[date].input += c.input
    map[date].output += c.output
  }

  return Object.entries(map)
    .map(([date, v]) => ({
      date,
      sortKey: v.sortKey,
      input: v.input,
      output: v.output,
      total: v.input + v.output,
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
}

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR")
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)
}

const seriesLabel: Record<string, string> = {
  input: "Entrants",
  output: "Sortants",
  total: "Total",
}

const seriesColor: Record<string, string> = {
  input: "#2563eb",
  output: "#7c3aed",
  total: "#059669",
}

// ─── Tooltip custom (style shadcn) ─────────────────────────────────────────────

interface TooltipEntry {
  dataKey?: string | number
  name?: string | number
  value?: number | string | Array<number | string>
  color?: string
}

interface ConsommationTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
}

function ConsommationTooltip({
  active,
  payload,
  label,
}: ConsommationTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce(
    (s, e) => s + (typeof e.value === "number" ? e.value : 0),
    0
  )

  return (
    <div className="min-w-[160px] rounded-xl border border-border/60 bg-background/95 px-3.5 py-3 text-xs shadow-lg backdrop-blur-sm">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? entry.name ?? "")
          const value = typeof entry.value === "number" ? entry.value : 0
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: seriesColor[key] ?? entry.color }}
              />
              <span className="text-muted-foreground">
                {seriesLabel[key] ?? key}
              </span>
              <span className="ml-auto font-medium text-foreground tabular-nums">
                {formatNumber(value)}
              </span>
            </div>
          )
        })}
        <div className="mt-1.5 flex items-center gap-2 border-t border-border/60 pt-1.5">
          <span className="text-muted-foreground">Total</span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">
            {formatNumber(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export const ConsommationSection = () => {
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [activePreset, setActivePreset] = useState<PresetKey>("all")

  const dateError = Boolean(dateDebut && dateFin && dateDebut > dateFin)

  const {
    data: rawData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["consommations", dateDebut, dateFin],
    queryFn: () =>
      fetchConsommations(dateDebut || undefined, dateFin || undefined),
    enabled: !dateError,
  })

  // Filtrage côté client en filet de sécurité : garantit que l'intervalle de
  // dates s'applique réellement même si l'API ne filtre pas (ou filtre mal)
  // côté serveur.
  const data = useMemo(
    () => filterByDateRange(rawData, dateDebut, dateFin),
    [rawData, dateDebut, dateFin]
  )

  const totalInput = data.reduce((s: number, c: Consommation) => s + c.input, 0)
  const totalOutput = data.reduce(
    (s: number, c: Consommation) => s + c.output,
    0
  )
  const totalTokens = totalInput + totalOutput
  const chartData = useMemo(() => groupByDate(data), [data])

  const applyPreset = (preset: PresetKey) => {
    setActivePreset(preset)
    if (preset === "all") {
      setDateDebut("")
      setDateFin("")
      return
    }
    const { debut, fin } = presetRange(preset)
    setDateDebut(debut)
    setDateFin(fin)
  }

  const handleManualChange = (setter: (v: string) => void) => (v: string) => {
    setActivePreset("all") // manual edit exits preset selection, but keeps dates as typed
    setter(v)
  }

  const hasFilter = Boolean(dateDebut || dateFin)

  const inputPct =
    totalTokens > 0 ? Math.round((totalInput / totalTokens) * 100) : 0
  const outputPct =
    totalTokens > 0 ? Math.round((totalOutput / totalTokens) * 100) : 0

  const presets: { key: PresetKey; label: string }[] = [
    { key: "7d", label: "7 jours" },
    { key: "30d", label: "30 jours" },
    { key: "90d", label: "90 jours" },
    { key: "all", label: "Tout" },
  ]

  return (
    <div className="space-y-4 bg-background px-14 py-3 h-full flex flex-col justify-center">
      {/* ── Titre ── */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-blue-500/15 text-emerald-600 dark:text-emerald-400">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Consommation
          </h2>
          <p className="text-sm text-muted-foreground">
            Suivi des tokens utilisés par les appels au modèle
          </p>
        </div>
      </div>

      {/* ── Filtre dates ── */}
      <Card className="border border-b-foreground/20 bg-card rounded-xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
              <CalendarRange className="h-4 w-4" />
              Filtrer par période
            </CardTitle>
            {hasFilter && (
              <button
                onClick={() => applyPreset("all")}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Réinitialiser
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Presets rapides */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activePreset === p.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-b-foreground/20 bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date-debut" className="text-xs">
                Date de début
              </Label>
              <Input
                id="date-debut"
                type="date"
                value={dateDebut}
                max={dateFin || undefined}
                onChange={(e) =>
                  handleManualChange(setDateDebut)(e.target.value)
                }
                className="w-44 border border-b-foreground/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date-fin" className="text-xs">
                Date de fin
              </Label>
              <Input
                id="date-fin"
                type="date"
                value={dateFin}
                min={dateDebut || undefined}
                onChange={(e) => handleManualChange(setDateFin)(e.target.value)}
                className="w-44 border-b-foreground/20"
              />
            </div>
            {hasFilter && !dateError && (
              <p className="pb-2 text-xs text-muted-foreground">
                {data.length} résultat{data.length !== 1 ? "s" : ""} sur la
                période sélectionnée
              </p>
            )}
          </div>

          {dateError && (
            <p className="text-xs font-medium text-destructive">
              La date de début doit être antérieure ou égale à la date de fin.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Cards résumé ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/60">
              <CardContent className="h-28 pt-6" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Erreur lors du chargement"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="relative overflow-hidden border border-b-foreground/20 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Total tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-3xl font-bold tabular-nums"
                title={formatNumber(totalTokens)}
              >
                {formatCompact(totalTokens)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.length} appel{data.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-b-foreground/20 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <ArrowDownRight className="h-3.5 w-3.5" />
                Tokens entrants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-3xl font-bold text-blue-600 tabular-nums dark:text-blue-400"
                title={formatNumber(totalInput)}
              >
                {formatCompact(totalInput)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-blue-500/15">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${inputPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {inputPct}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border border-b-foreground/20 shadow-sm rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Tokens sortants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className="text-3xl font-bold text-violet-600 tabular-nums dark:text-violet-400"
                title={formatNumber(totalOutput)}
              >
                {formatCompact(totalOutput)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-violet-500/15">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${outputPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {outputPct}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── AreaChart ── */}
      {!isLoading && !isError && chartData.length > 0 && (
        <Card className="border border-b-foreground/20 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Consommation par date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="fillInput" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={seriesColor.input}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={seriesColor.input}
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                  <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={seriesColor.output}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={seriesColor.output}
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCompact(v)}
                  width={44}
                />
                <Tooltip content={<ConsommationTooltip />} />
                <Legend
                  formatter={(value: string) => seriesLabel[value] ?? value}
                />
                <Area
                  type="monotone"
                  dataKey="input"
                  stroke={seriesColor.input}
                  strokeWidth={2}
                  fill="url(#fillInput)"
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="output"
                  stroke={seriesColor.output}
                  strokeWidth={2}
                  fill="url(#fillOutput)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && chartData.length === 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 pt-6 text-center">
            <CalendarRange className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucune consommation sur cette période.
            </p>
            {hasFilter && (
              <button
                onClick={() => applyPreset("all")}
                className="mt-3 text-xs font-medium text-foreground underline underline-offset-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
