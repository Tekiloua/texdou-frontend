import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { toast, Toaster } from "sonner"
import { Search, X, Check, CalendarIcon, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { CategorieType, StatutType, ThemeType } from "@/types"
import { useFiltre } from "@/store/useFiltre"
import { useEffect, useState } from "react"
import { REGEXP_ONLY_DIGITS } from "input-otp"

type FiltreProps = {
  dataCategories: CategorieType[]
  dataStatuts: StatutType[]
  dataThemes: ThemeType[]
  docTrouver?: number
}

const statutColors: Record<string, { bg: string; text: string; dot: string }> =
  {
    "En projet": { bg: "#FAEEDA", text: "#854F0B", dot: "#BA7517" },
    "En vigueur": { bg: "#E6F9F1", text: "#0F6E56", dot: "#1D9E75" },
    Abrogé: { bg: "#FDECEA", text: "#A32D2D", dot: "#E24B4A" },
    Modifié: { bg: "#EAF4FD", text: "#2D5FA3", dot: "#4A90E2" },
    "Modifié et remplacé": { bg: "#EAF4FD", text: "#2D5FA3", dot: "#4A90E2" },
  }

const CURRENT_YEAR = new Date().getFullYear()
const DECADES = Array.from(
  { length: Math.ceil((CURRENT_YEAR - 1989) / 10) },
  (_, i) => {
    const start = CURRENT_YEAR - i * 10
    const end = Math.max(start - 9, 1990)
    return {
      label: `${end} – ${start}`,
      years: Array.from({ length: start - end + 1 }, (_, j) => start - j),
    }
  }
)

const dropdownContentStyle: React.CSSProperties = {
  background: "#1e2a3a",
  border: "1px solid #2d3d52",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
  padding: "6px",
  minWidth: 200,
}

const menuItemBase =
  "flex cursor-pointer items-center gap-2.5 rounded-[7px] px-3 py-2 text-[12.5px] font-medium text-slate-200 transition-colors outline-none focus:bg-white/10 data-[highlighted]:bg-white/10"

const CheckIcon = ({ visible }: { visible: boolean }) => (
  <Check
    className={`size-3.5 shrink-0 text-["#22d3ee"] ${visible ? "opacity-100" : "opacity-0"}`}
  />
)

// Reusable dark select trigger button
const SelectTrigger = ({
  label,
  value,
  active,
}: {
  label: string
  value?: string
  active: boolean
}) => (
  <button
    className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${active ? "text-[#22d3ee]" : "text-[#cbd5e1]"}`}
    style={{
      background: active ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.05)",
      borderColor: active ? "#22d3ee" : "rgba(255,255,255,0.12)",
      height: 38,
    }}
  >
    <span className="truncate">{value || label}</span>
    <ChevronDown className="size-3.5 shrink-0 opacity-60" />
  </button>
)

export const Filtre = ({
  dataCategories,
  dataStatuts,
  dataThemes,
  docTrouver,
}: FiltreProps) => {
  const {
    annee,
    categorie,
    statut,
    date_debut,
    date_fin,
    mots_cles,
    theme,
    updateAnnee,
    updateCategorie,
    updateDateDebut,
    updateDateFin,
    updateMotsCles,
    updateTheme,
    updateStatut,
  } = useFiltre()
  const currentYear = new Date().getFullYear()

  const [yearOptDebut, setYearOptDebut] = useState<number>(currentYear)
  const [monthDebut, setMonthDebut] = useState(new Date())
  const [yearOptFin, setYearOptFin] = useState<number>(currentYear)
  const [monthFin, setMonthFin] = useState(new Date())

  const goToYearDebut = (year: number) => {
    setMonthDebut(new Date(year, 0, 1))
  }

  const goToYearFin = (year: number) => {
    setMonthFin(new Date(year, 0, 1))
  }
  // const [annee, setAnnee] = useState<string | undefined>(undefined)
  const [tempDateDebut, setTempDateDebut] = useState<Date | undefined>()
  const [tempDateFin, setTempDateFin] = useState<Date | undefined>()
  const [afficherPar, setAfficherPar] = useState<string>("recent")

  // Variable pour savoir s'il y a un filtre afin d'afficher le boutton "Réinitialiser les filtres"
  const hasFilters =
    (categorie && categorie !== "toutes_les_categories") ||
    (statut && statut !== "tous_les_statuts") ||
    (theme && theme !== "tous_les_themes") ||
    !!mots_cles ||
    !!annee ||
    !!date_debut ||
    !!date_fin

  const renderThemeItems = (themes: ThemeType[], depth = 0): React.ReactNode[] => {
    return themes.flatMap((t) => {
      const hasChildren = t.sous_themes && t.sous_themes.length > 0

      const item = (
        <DropdownMenuItem
          key={t.id}
          onClick={() => updateTheme(t.nom ?? "")}
          className={menuItemBase}
          style={{ paddingLeft: 12 + depth * 16 }}
        >
          <CheckIcon visible={t.nom === selectedThemeLabel} />
          {depth > 0 && (
            <span className="shrink-0 text-slate-500">└─</span>
          )}
          <span className={depth === 0 ? "font-semibold" : undefined}>
            {t.nom}
          </span>
        </DropdownMenuItem>
      )

      if (!hasChildren) {
        return [item]
      }

      return [item, ...renderThemeItems(t.sous_themes, depth + 1)]
    })
  }

  // Fonction pour effacer tous les filtres
  const clearAll = () => {
    updateCategorie(undefined)
    updateTheme(undefined)
    updateStatut(undefined)
    updateMotsCles(undefined)
    updateDateDebut(undefined)
    updateDateFin(undefined)
    updateAnnee(undefined)
  }

  const selectedCatLabel =
    categorie && categorie !== "toutes_les_categories" ? categorie : undefined
  const selectedStatutLabel =
    statut && statut !== "tous_les_statuts" ? statut : undefined
  const selectedThemeLabel =
    theme && theme !== "tous_les_themes" ? theme : undefined

  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.12)",
    height: 38,
  }

  const labelStyle =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400"

  const handleValidateDebut = () => {
    if (!tempDateDebut) return
    updateDateDebut(tempDateDebut)
    setTempDateDebut(undefined)
  }

  const handleValidateFin = () => {
    if (!tempDateFin) return
    updateDateFin(tempDateFin)
    setTempDateFin(undefined)
  }

  // useEffect(() => {
  //   if (!docTrouver && docTrouver != 0) return
  //   toast.info(`${docTrouver} texte${docTrouver > 1 ? "s" : ""}`, {
  //     duration: 2000, // 1,5 secondes
  //   })
  // }, [
  //   hasFilters,
  //   annee,
  //   categorie,
  //   statut,
  //   date_debut,
  //   date_fin,
  //   mots_cles,
  //   theme,
  // ])

  return (
    <div className="rounded-[5px] bg-[#2A3A52] p-5">
      {/* ── Row 1: Mots clés | Catégorie | Thème | Statut ── */}
      <Toaster position="top-center" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Mots clés */}
        <div>
          <label className={labelStyle}>Mots clés :</label>
          <div
            className="flex items-center gap-2 rounded-md border px-3 transition-colors"
            style={{
              ...inputStyle,
              borderColor: mots_cles ? "#22d3ee" : "rgba(255,255,255,0.12)",
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = "#22d3ee"
              e.currentTarget.style.background = "rgba(34,211,238,0.06)"
            }}
            onBlurCapture={(e) => {
              if (!mots_cles) {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
                e.currentTarget.style.background = "rgba(255,255,255,0.05)"
              }
            }}
          >
            <Search
              className="size-3.5 shrink-0"
              style={{ color: mots_cles ? "#22d3ee" : "#64748b" }}
            />
            <input
              placeholder="Rechercher…"
              value={mots_cles ?? ""}
              onChange={(e) => updateMotsCles(e.target.value || undefined)}
              className="flex-1 bg-transparent text-[12.5px] font-medium text-slate-200 outline-none placeholder:text-slate-500"
              style={{ height: 34 }}
            />
            {mots_cles && (
              <button onClick={() => updateMotsCles(undefined)}>
                <X className="size-3 text-slate-400 transition-colors hover:text-slate-200" />
              </button>
            )}
          </div>
        </div>

        {/* Catégorie */}
        <div>
          <label className={labelStyle}>Catégorie :</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <SelectTrigger
                  label="Toutes les catégories"
                  value={selectedCatLabel}
                  active={!!selectedCatLabel}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={4}
              style={dropdownContentStyle}
            >
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                Catégorie
              </p>
              <DropdownMenuItem
                onClick={() => {
                  updateCategorie("toutes_les_categories")
                  updateStatut("tous_les_statuts")
                }}
                className={menuItemBase}
              >
                <CheckIcon
                  visible={!categorie || categorie === "toutes_les_categories"}
                />
                Toutes les catégories
              </DropdownMenuItem>
              {dataCategories.map((cat) => (
                <DropdownMenuSub key={cat.id}>
                  <DropdownMenuSubTrigger
                    className={menuItemBase}
                    onClick={() => updateCategorie(cat.nom ?? "")}
                  >
                    <CheckIcon visible={categorie === cat.nom} />
                    {cat.nom}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    style={{ ...dropdownContentStyle, minWidth: 160 }}
                  >
                    <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                      Statut
                    </p>
                    <DropdownMenuItem
                      onClick={() => {
                        updateCategorie(cat.nom ?? "")
                        updateStatut("tous_les_statuts")
                      }}
                      className={menuItemBase}
                    >
                      <CheckIcon
                        visible={!statut || statut === "tous_les_statuts"}
                      />
                      Tous les statuts
                    </DropdownMenuItem>
                    {dataStatuts.map((s) => {
                      const meta = s.nom ? statutColors[s.nom] : undefined
                      return (
                        <DropdownMenuItem
                          key={s.id}
                          onClick={() => {
                            updateCategorie(cat.nom ?? "")
                            updateStatut(s.nom ?? "")
                          }}
                          className={menuItemBase}
                        >
                          <CheckIcon visible={statut === s.nom} />
                          {meta ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
                              style={{ background: meta.bg, color: meta.text }}
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: meta.dot }}
                              />
                              {s.nom}
                            </span>
                          ) : (
                            s.nom
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thème */}
        <div>
          <label className={labelStyle}>Thème :</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <SelectTrigger
                  label="Tous les thèmes"
                  value={selectedThemeLabel}
                  active={!!selectedThemeLabel}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={4}
              style={{
                ...dropdownContentStyle,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                Theme
              </p>

              <DropdownMenuItem
                onClick={() => updateTheme(undefined)}
                className={menuItemBase}
              >
                <CheckIcon visible={!theme || theme === "tous_les_themes"} />
                Tous les themes
              </DropdownMenuItem>

              {renderThemeItems(dataThemes)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Statut */}
        <div>
          <label className={labelStyle}>Statut :</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <SelectTrigger
                  label="Tous les statuts"
                  value={selectedStatutLabel}
                  active={!!selectedStatutLabel}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={4}
              style={dropdownContentStyle}
            >
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                Statut
              </p>
              <DropdownMenuItem
                onClick={() => updateStatut("tous_les_statuts")}
                className={menuItemBase}
              >
                <CheckIcon visible={!statut || statut === "tous_les_statuts"} />
                Tous les statuts
              </DropdownMenuItem>
              {dataStatuts.map((s) => {
                const meta = s.nom ? statutColors[s.nom] : undefined
                return (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => updateStatut(s.nom ?? "")}
                    className={menuItemBase}
                  >
                    <CheckIcon visible={statut === s.nom} />
                    {meta ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={{ background: meta.bg, color: meta.text }}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: meta.dot }}
                        />
                        {s.nom}
                      </span>
                    ) : (
                      s.nom
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Divider ── */}
      <div
        className="my-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      />

      {/* ── Row 2: Du | Au | Année | Afficher par ── */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Du */}
        <div>
          <label className={labelStyle}>Du :</label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-[12.5px] font-medium transition-colors"
                style={{
                  ...inputStyle,
                  borderColor: date_debut
                    ? "#22d3ee"
                    : "rgba(255,255,255,0.12)",
                  background: date_debut
                    ? "rgba(34,211,238,0.08)"
                    : "rgba(255,255,255,0.05)",
                  color: date_debut ? "#22d3ee" : "#64748b",
                }}
              >
                <span className="truncate">
                  {date_debut
                    ? format(date_debut, "dd / MM / yyyy", { locale: fr })
                    : "Date de début"}
                </span>
                <div className="flex items-center gap-1.5">
                  {date_debut && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        updateDateDebut(undefined)
                      }}
                      className="flex items-center rounded p-0.5 transition-colors"
                    >
                      <X className="size-3 text-[#22d3ee] hover:text-white" />
                    </span>
                  )}
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="flex flex-col rounded-sm border border-blue-400 backdrop-blur-[700px]">
              <AlertDialogHeader className="pb-0">
                <AlertDialogTitle className="flex w-full items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="size-4" />
                    Date de début
                  </span>
                  <div className="flex gap-1">
                    {tempDateDebut && (
                      <AlertDialogAction>
                        <span onClick={handleValidateDebut}>
                          <Check className="size-4" />
                        </span>
                      </AlertDialogAction>
                    )}
                    <AlertDialogCancel
                      onClick={() => {
                        //pour effacer le tempDateDebut
                        setTempDateDebut(undefined)
                      }}
                      className="transition-colors"
                    >
                      <X className="size-4" />
                    </AlertDialogCancel>
                  </div>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  date de reference au texte
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <div className="px-auto flex w-full justify-center">
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={yearOptDebut.toString()}
                    onChange={(value) => {
                      setYearOptDebut(Number(value))

                      if (value.length === 4) {
                        const year = Number(value)

                        if (!isNaN(year) && year >= 1900 && year <= 2100) {
                          goToYearDebut(year)
                        }
                      }
                    }}
                    defaultValue={new Date().getFullYear().toString()}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Calendar
                  className="w-full bg-transparent"
                  mode="single"
                  selected={date_debut}
                  month={monthDebut}
                  onMonthChange={setMonthDebut}
                  onSelect={(date) => {
                    setTempDateDebut(date ?? undefined)
                  }}
                  locale={fr}
                />
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Au */}
        <div>
          <label className={labelStyle}>Au :</label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-[12.5px] font-medium transition-colors"
                style={{
                  ...inputStyle,
                  borderColor: date_fin ? "#22d3ee" : "rgba(255,255,255,0.12)",
                  background: date_fin
                    ? "rgba(34,211,238,0.08)"
                    : "rgba(255,255,255,0.05)",
                  color: date_fin ? "#22d3ee" : "#64748b",
                }}
              >
                <span className="truncate">
                  {date_fin
                    ? format(date_fin, "dd / MM / yyyy", { locale: fr })
                    : "Date de fin"}
                </span>
                <div className="flex items-center gap-1.5">
                  {date_fin && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        updateDateFin(undefined)
                      }}
                      className="flex items-center rounded p-0.5 transition-colors"
                    >
                      <X className="size-3 text-[#22d3ee] hover:text-white" />
                    </span>
                  )}
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="flex flex-col rounded-sm border border-blue-400 backdrop-blur-[700px]">
              <AlertDialogHeader className="pb-0">
                <AlertDialogTitle className="flex w-full items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="size-4" />
                    Date de Fin
                  </span>
                  <div className="flex gap-1">
                    {tempDateFin && (
                      <AlertDialogAction>
                        <span onClick={handleValidateFin}>
                          <Check className="size-4" />
                        </span>
                      </AlertDialogAction>
                    )}
                    <AlertDialogCancel
                      onClick={() => {
                        //pour effacer le tempDateFin
                        setTempDateFin(undefined)
                      }}
                      className="transition-colors"
                    >
                      <X className="size-4" />
                    </AlertDialogCancel>
                  </div>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  date de reference au texte
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <div className="px-auto flex w-full justify-center">
                  <InputOTP
                    maxLength={4}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={yearOptFin.toString()}
                    onChange={(value) => {
                      setYearOptFin(Number(value))

                      if (value.length === 4) {
                        const year = Number(value)

                        if (!isNaN(year) && year >= 1900 && year <= 2100) {
                          goToYearFin(year)
                        }
                      }
                    }}
                    defaultValue={new Date().getFullYear().toString()}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Calendar
                  className="w-full bg-transparent"
                  mode="single"
                  selected={date_fin}
                  month={monthFin}
                  onMonthChange={setMonthFin}
                  onSelect={(date) => {
                    setTempDateFin(date ?? undefined)
                  }}
                  locale={fr}
                />
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Année */}
        <div>
          <label className={labelStyle}>Année :</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <SelectTrigger
                  label="Toutes les années"
                  value={annee ? "" + annee : "Toutes les années"}
                  active={!!annee}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={4}
              style={dropdownContentStyle}
            >
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                Année
              </p>
              <DropdownMenuItem
                onClick={() => updateAnnee(undefined)}
                className={menuItemBase}
              >
                <CheckIcon visible={!annee} />
                Toutes les années
              </DropdownMenuItem>
              {DECADES.map((decade) => (
                <DropdownMenuSub key={decade.label}>
                  <DropdownMenuSubTrigger
                    className={menuItemBase}
                    style={{
                      color: decade.years.some((y) => y === annee)
                        ? "#22d3ee"
                        : undefined,
                    }}
                  >
                    <span
                      className="size-3.5 shrink-0 rounded"
                      style={{
                        border: "1.5px solid",
                        borderColor: decade.years.some((y) => y === annee)
                          ? "#22d3ee"
                          : "rgba(255,255,255,0.2)",
                      }}
                    />
                    {decade.label}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    style={{ ...dropdownContentStyle, minWidth: 130 }}
                  >
                    {decade.years.map((year) => (
                      <DropdownMenuItem
                        key={year}
                        onClick={() => updateAnnee(year)}
                        className={
                          menuItemBase +
                          ` ${annee === year ? "text-[#22d3ee]" : undefined}`
                        }
                      >
                        <Check
                          className={`size-3.5 shrink-0 text-[#22d3ee] ${annee === year ? "opacity-100" : "opacity-0"}`}
                        />
                        {year}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Afficher par */}
        <div>
          <label className={labelStyle}>Afficher par :</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <SelectTrigger
                  label="Plus récent au plus ancien"
                  value={
                    afficherPar === "recent"
                      ? "Plus récent au plus ancien"
                      : afficherPar === "ancien"
                        ? "Plus ancien au plus récent"
                        : afficherPar === "az"
                          ? "A → Z"
                          : "Z → A"
                  }
                  active={false}
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              style={dropdownContentStyle}
            >
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
                Tri
              </p>
              {[
                { value: "recent", label: "Plus récent au plus ancien" },
                { value: "ancien", label: "Plus ancien au plus récent" },
              ].map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setAfficherPar(opt.value)}
                  className={menuItemBase}
                >
                  <CheckIcon visible={afficherPar === opt.value} />
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Reset row ── */}
      {hasFilters && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold text-red-400 transition-colors hover:bg-red-400/10 hover:text-red-300"
          >
            <X className="size-3.5" />
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  )
}