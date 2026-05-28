import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CalendarDays, Search, X, SlidersHorizontal } from "lucide-react"
import type { CategorieType, StatutType, ThemeType } from "@/types"
import { useFiltre } from "@/store/useFiltre"

type FiltreProps = {
  dataCategories: CategorieType[]
  dataStatuts: StatutType[]
  dataThemes: ThemeType[]
}

const inputBase: React.CSSProperties = {
  height: 38,
  border: "1.5px solid #E4E9F7",
  borderRadius: 10,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  color: "#1A1D2E",
  background: "#fff",
  outline: "none",
  padding: "0 12px",
}

const SelectField = ({
  label,
  value,
  onChange,
  options,
  defaultLabel,
  defaultValue,
}: {
  label: string
  value: string | undefined
  onChange: (val: string) => void
  options: { id: number | string; nom: string }[]
  defaultLabel: string
  defaultValue: string
}) => (
  <div className="flex flex-col gap-1">
    <label
      className="text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ color: "#8892B0" }}
    >
      {label}
    </label>
    <div className="relative">
      <select
        value={value ?? defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none cursor-pointer transition-colors focus:outline-none"
        style={{
          ...inputBase,
          paddingRight: 32,
          minWidth: 148,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#4F7EF7")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#E4E9F7")}
      >
        <option value={defaultValue}>{defaultLabel}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.nom}>
            {opt.nom}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 12 8" style={{ color: "#8892B0" }}>
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  </div>
)

const DateButton = ({
  label,
  date,
  title,
  description,
  onSelect,
  onClear,
}: {
  label: string
  date: Date | undefined
  title: string
  description: string
  onSelect: (d: Date | undefined) => void
  onClear: () => void
}) => {
  const formatted = date
    ? `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`
    : null

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: "#8892B0" }}
      >
        {label}
      </label>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="flex items-center justify-between gap-3 transition-colors focus:outline-none"
            style={{ ...inputBase, minWidth: 148, paddingRight: 12 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#4F7EF7")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E4E9F7")}
          >
            <span style={{ color: formatted ? "#1A1D2E" : "#B0B8D0" }}>
              {formatted ?? "Sélectionner"}
            </span>
            <CalendarDays className="size-3.5 shrink-0" style={{ color: "#8892B0" }} />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm" style={{ color: "#6B7290" }}>
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex w-full justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onSelect}
              className="rounded-xl border"
              captionLayout="dropdown"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClear} className="text-sm">
              Effacer
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-sm text-white"
              style={{ background: "#4F7EF7" }}
            >
              Valider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export const Filtre = ({ dataCategories, dataStatuts, dataThemes }: FiltreProps) => {
  const {
    categorie,
    statut,
    theme,
    mots_cles,
    date_debut,
    date_fin,
    updateCategorie,
    updateStatut,
    updateTheme,
    updateDateDebut,
    updateDateFin,
    updateMotsCles,
  } = useFiltre()

  const hasActiveFilters =
    (categorie && categorie !== "toutes_les_categories") ||
    (statut && statut !== "tous_les_statuts") ||
    (theme && theme !== "tous_les_themes") ||
    mots_cles ||
    date_debut ||
    date_fin

  const clearAll = () => {
    updateCategorie("toutes_les_categories")
    updateStatut("tous_les_statuts")
    updateTheme("tous_les_themes")
    updateMotsCles(undefined)
    updateDateDebut(undefined)
    updateDateFin(undefined)
  }

  return (
    <div
      className="rounded-[14px] border bg-white p-5"
      style={{ borderColor: "#E4E9F7", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" style={{ color: "#4F7EF7" }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#8892B0" }}>
            Filtres
          </span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:bg-red-50 hover:text-red-500"
            style={{ color: "#8892B0" }}
          >
            <X className="size-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-wrap gap-3">
        {/* Mots clés */}
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#8892B0" }}
          >
            Mots clés
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2"
              style={{ color: "#8892B0" }}
            />
            <Input
              placeholder="Rechercher…"
              value={mots_cles ?? ""}
              onChange={(e) => updateMotsCles(e.target.value || undefined)}
              className="pl-9 focus-visible:ring-0"
              style={{
                ...inputBase,
                paddingLeft: 36,
                width: "100%",
                height: 38,
              }}
            />
          </div>
        </div>

        <SelectField
          label="Catégorie"
          value={categorie}
          onChange={updateCategorie}
          options={dataCategories.map((c) => ({ id: c.id, nom: c.nom ?? "" }))}
          defaultLabel="Toutes les catégories"
          defaultValue="toutes_les_categories"
        />

        <SelectField
          label="Thème"
          value={theme}
          onChange={updateTheme}
          options={dataThemes.map((t) => ({ id: t.id, nom: t.nom ?? "" }))}
          defaultLabel="Tous les thèmes"
          defaultValue="tous_les_themes"
        />

        <SelectField
          label="Statut"
          value={statut}
          onChange={updateStatut}
          options={dataStatuts.map((s) => ({ id: s.id, nom: s.nom ?? "" }))}
          defaultLabel="Tous les statuts"
          defaultValue="tous_les_statuts"
        />

        <DateButton
          label="Du"
          date={date_debut}
          title="Date de début"
          description="Choisir la date de début"
          onSelect={updateDateDebut}
          onClear={() => updateDateDebut(undefined)}
        />

        <DateButton
          label="Au"
          date={date_fin}
          title="Date de fin"
          description="Choisir la date de fin"
          onSelect={updateDateFin}
          onClear={() => updateDateFin(undefined)}
        />

        {/* Année */}
        <div className="flex flex-col gap-1">
          <label
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#8892B0" }}
          >
            Année
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none cursor-pointer transition-colors focus:outline-none"
              style={{ ...inputBase, minWidth: 130, paddingRight: 32 }}
              defaultValue="toutes_les_annees"
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4F7EF7")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E4E9F7")}
            >
              <option value="toutes_les_annees">Toutes les années</option>
              {Array.from({ length: new Date().getFullYear() - 1989 }).map((_, i) => {
                const year = new Date().getFullYear() - i
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 12 8" style={{ color: "#8892B0" }}>
                <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}