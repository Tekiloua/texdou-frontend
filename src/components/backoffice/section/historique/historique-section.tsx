import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  FilePenLine,
  FileText,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchHistoriques, type HistoriqueRecord } from "@/api/api"
import { decodeTitle } from "@/hooks/decode-html"

// ─── Types d'affichage ──────────────────────────────────────────────────────
// L'historique ne trace pour l'instant que les changements de statut d'un
// texte (cf. PUT /textes/{id} côté backend). On garde une forme d'entrée
// générique proche de celle utilisée précédemment pour faciliter une
// éventuelle extension future (documents, utilisateurs...).

interface HistoriqueEntry {
  id: number
  cible: string
  auteur: string
  date: string // ISO
  ancien: string | null
  nouveau: string | null
}

function toEntry(record: HistoriqueRecord): HistoriqueEntry {
  return {
    id: record.id,
    cible: record.texte_titre ?? `Texte #${record.texte_id ?? "?"}`,
    auteur: record.numero_user ?? "Système",
    date: record.date,
    ancien: record.ancien_statut,
    nouveau: record.nouveau_statut,
  }
}

// ─── Helpers de date ────────────────────────────────────────────────────────

function formatDateLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, today)) return "Aujourd'hui"
  if (sameDay(date, yesterday)) return "Hier"

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function groupByDay(entries: HistoriqueEntry[]) {
  const groups: { label: string; entries: HistoriqueEntry[] }[] = []

  for (const entry of entries) {
    const label = formatDateLabel(entry.date)
    const existing = groups.find((g) => g.label === label)
    if (existing) existing.entries.push(entry)
    else groups.push({ label, entries: [entry] })
  }

  return groups
}

const statutBadge: Record<string, string> = {
  Brouillon:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
  Publié:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
}

// ─── Composant principal ──────────────────────────────────────────────────────

export const HistoriqueSection = () => {
  const [search, setSearch] = useState("")

  const {
    data: historiques,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["historiques"],
    queryFn: fetchHistoriques,
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    const entries = (historiques ?? []).map(toEntry)

    return entries
      .filter((e) => {
        const q = search.trim().toLowerCase()
        if (q === "") return true
        return (
          e.cible.toLowerCase().includes(q) ||
          e.auteur.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [historiques, search])

  const groups = groupByDay(filtered)

  return (
    <div className="flex h-full flex-col space-y-4 bg-background px-14 py-6">
      {/* ── Titre ── */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-blue-500/15 text-emerald-600 dark:text-emerald-400">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Historique</h2>
          <p className="text-sm text-muted-foreground">
            Journal des changements de statut effectués sur les textes
          </p>
        </div>
      </div>

      {/* ── Recherche ── */}
      <Card className="rounded-xl border border-foreground/20">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un texte ou un auteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-foreground/20 pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── États de chargement / erreur ── */}
      {isLoading && (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex items-center justify-center gap-2 py-16 pt-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de l'historique...
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-dashed border-red-300">
          <CardContent className="flex items-center justify-center gap-2 py-16 pt-6 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            Impossible de charger l'historique
            {error instanceof Error ? ` : ${error.message}` : ""}
          </CardContent>
        </Card>
      )}

      {/* ── Timeline ── */}
      {!isLoading && !isError && (
        <>
          {groups.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-16 pt-6 text-center text-sm text-muted-foreground">
                Aucune action ne correspond à ces critères.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <div key={group.label}>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </h3>

                  <div className="relative pl-6">
                    {/* Ligne verticale de la timeline */}
                    <div className="absolute top-1 bottom-1 left-[7px] w-px bg-border" />

                    <div className="space-y-4">
                      {group.entries.map((entry) => (
                        <div key={entry.id} className="relative flex gap-3">
                          {/* Point sur la timeline */}
                          <span className="absolute top-1.5 left-[-24px] h-3.5 w-3.5 rounded-full bg-amber-500 ring-4 ring-background" />

                          <Card className="flex-1 rounded-xl border border-foreground/20">
                            <CardContent className="px-4 py-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="mt-0.5 shrink-0 text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                      {decodeTitle(entry.cible).slice(0, 150)}
                                      ...
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      Texte · par{" "}
                                      <span className="font-medium text-foreground/80">
                                        {entry.auteur}
                                      </span>
                                    </p>

                                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                                      <span className="w-16 shrink-0 text-muted-foreground">
                                        Statut
                                      </span>
                                      {entry.ancien && (
                                        <>
                                          <Badge
                                            variant="outline"
                                            className={`px-1.5 py-0 text-[11px] ${
                                              statutBadge[entry.ancien] ?? ""
                                            }`}
                                          >
                                            {entry.ancien}
                                          </Badge>
                                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        </>
                                      )}
                                      <Badge
                                        variant="outline"
                                        className={`px-1.5 py-0 text-[11px] ${
                                          statutBadge[entry.nouveau ?? ""] ?? ""
                                        }`}
                                      >
                                        {entry.nouveau}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="gap-1 border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                                  >
                                    <FilePenLine className="h-3 w-3" />
                                    Modification
                                  </Badge>
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {formatTime(entry.date)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
