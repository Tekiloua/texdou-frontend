import { Search, X, Check, ListFilter } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CategorieType, StatutType, ThemeType } from "@/types"
import { useFiltre } from "@/store/useFiltre"
import { useState } from "react"

type FiltreProps = {
  dataCategories: CategorieType[]
  dataStatuts: StatutType[]
  dataThemes: ThemeType[]
}

const statutColors: Record<string, { bg: string; text: string; dot: string }> = {
  "En projet":  { bg: "#FAEEDA", text: "#854F0B", dot: "#BA7517" },
  "En vigueur": { bg: "#E6F9F1", text: "#0F6E56", dot: "#1D9E75" },
  "Abrogé":     { bg: "#FDECEA", text: "#A32D2D", dot: "#E24B4A" },
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i)

// Decade groupings for year sub-sub-menus
const DECADES = Array.from(
  { length: Math.ceil((CURRENT_YEAR - 1989) / 10) },
  (_, i) => {
    const start = CURRENT_YEAR - i * 10
    const end = Math.max(start - 9, 1990)
    return { label: `${end} – ${start}`, years: Array.from({ length: start - end + 1 }, (_, j) => start - j) }
  }
)

const subContentStyle: React.CSSProperties = {
  borderColor: "#E4E9F7",
  boxShadow: "0 12px 32px rgba(30,40,100,0.10)",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  borderRadius: 14,
  padding: "6px",
  minWidth: 200,
  background: "#fff",
}

const menuItemBase =
  "flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold transition-colors outline-none focus:bg-[#F5F7FF] data-[highlighted]:bg-[#F5F7FF]"

const CheckIcon = ({ visible }: { visible: boolean }) => (
  <Check
    className="size-3.5 shrink-0"
    style={{ opacity: visible ? 1 : 0, color: "#4F7EF7" }}
  />
)

const ActivePill = ({ label, color }: { label: string; color?: { bg: string; text: string; dot: string } }) =>
  color ? (
    <span
      className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: color.bg, color: color.text }}
    >
      <span className="size-1.5 rounded-full shrink-0" style={{ background: color.dot }} />
      {label}
    </span>
  ) : (
    <span
      className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: "#EBF2FF", color: "#185FA5" }}
    >
      {label}
    </span>
  )

export const Filtre = ({ dataCategories, dataStatuts, dataThemes }: FiltreProps) => {
  const { categorie, statut, mots_cles, updateCategorie, updateStatut, updateMotsCles } = useFiltre()
  const [annee, setAnnee] = useState<string | undefined>(undefined)

  const hasFilters =
    (categorie && categorie !== "toutes_les_categories") ||
    (statut && statut !== "tous_les_statuts") ||
    !!mots_cles ||
    !!annee

  const clearAll = () => {
    updateCategorie("toutes_les_categories")
    updateStatut("tous_les_statuts")
    updateMotsCles(undefined)
    setAnnee(undefined)
  }

  const activeParts: string[] = []
  if (categorie && categorie !== "toutes_les_categories") activeParts.push(categorie)
  if (statut && statut !== "tous_les_statuts") activeParts.push(statut)
  if (annee) activeParts.push(annee)

  const statutMeta = statut && statut !== "tous_les_statuts" ? statutColors[statut] : undefined
  const anneeMeta = annee

  return (
    <div
      className="flex flex-wrap items-center gap-2.5"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Search field ── */}
      <div
        className="group flex flex-1 min-w-55 items-center gap-2.5 rounded-[11px] px-3.5 transition-all duration-150"
        style={{
          height: 42,
          border: `1.5px solid ${mots_cles ? "#4F7EF7" : "#E2E8F4"}`,
          background: mots_cles ? "#EBF2FF" : "#FAFBFF",
          boxShadow: mots_cles ? "0 0 0 3px #EBF2FF" : "none",
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.borderColor = "#4F7EF7"
          e.currentTarget.style.boxShadow = "0 0 0 3px #EBF2FF"
          e.currentTarget.style.background = "#EBF2FF"
        }}
        onBlurCapture={(e) => {
          if (!mots_cles) {
            e.currentTarget.style.borderColor = "#E2E8F4"
            e.currentTarget.style.boxShadow = "none"
            e.currentTarget.style.background = "#FAFBFF"
          }
        }}
      >
        <Search className="size-3.5 shrink-0" style={{ color: mots_cles ? "#4F7EF7" : "#A0ABBC" }} />
        <input
          placeholder="Rechercher un document…"
          value={mots_cles ?? ""}
          onChange={(e) => updateMotsCles(e.target.value || undefined)}
          className="flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#B8C0D0]"
          style={{ color: "#1A1D2E" }}
        />
        {mots_cles && (
          <button
            onClick={() => updateMotsCles(undefined)}
            className="flex size-5 items-center justify-center rounded-full hover:bg-[#D6E6FF] transition-colors"
          >
            <X className="size-3" style={{ color: "#4F7EF7" }} />
          </button>
        )}
      </div>

      {/* ── Active filter pills (outside dropdown) ── */}
      {activeParts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categorie && categorie !== "toutes_les_categories" && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-[11px] font-bold"
              style={{ background: "#EBF2FF", color: "#185FA5" }}
            >
              {categorie}
              <button
                onClick={() => updateCategorie("toutes_les_categories")}
                className="flex size-4 items-center justify-center rounded-full hover:bg-[#C5D9FF] transition-colors"
              >
                <X className="size-2.5" style={{ color: "#4F7EF7" }} />
              </button>
            </span>
          )}
          {statut && statut !== "tous_les_statuts" && statutMeta && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-[11px] font-bold"
              style={{ background: statutMeta.bg, color: statutMeta.text }}
            >
              <span className="size-1.5 rounded-full shrink-0" style={{ background: statutMeta.dot }} />
              {statut}
              <button
                onClick={() => updateStatut("tous_les_statuts")}
                className="flex size-4 items-center justify-center rounded-full transition-colors hover:opacity-70"
              >
                <X className="size-2.5" style={{ color: statutMeta.text }} />
              </button>
            </span>
          )}
          {annee && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-[11px] font-bold"
              style={{ background: "#F0EDFF", color: "#5B21B6" }}
            >
              {annee}
              <button
                onClick={() => setAnnee(undefined)}
                className="flex size-4 items-center justify-center rounded-full hover:bg-[#DDD6FE] transition-colors"
              >
                <X className="size-2.5" style={{ color: "#5B21B6" }} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Dropdown trigger ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-[11px] px-4 text-[13px] font-semibold transition-all duration-150 focus:outline-none"
            style={{
              height: 42,
              border: `1.5px solid ${hasFilters ? "#4F7EF7" : "#E2E8F4"}`,
              background: hasFilters ? "#4F7EF7" : "#FAFBFF",
              color: hasFilters ? "#fff" : "#1A1D2E",
              boxShadow: hasFilters ? "0 2px 12px rgba(79,126,247,0.25)" : "none",
            }}
          >
            <ListFilter className="size-3.5 shrink-0" />
            Filtres
            {hasFilters && (
              <span
                className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}
              >
                {activeParts.length}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={6}
          style={{ ...subContentStyle, minWidth: 230 }}
        >
          {/* ── Section: Catégorie > Statut (nested hover) ── */}
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#A0ABBC" }}>
            Catégorie
          </p>

          {/* Toutes */}
          <DropdownMenuItem
            onClick={() => { updateCategorie("toutes_les_categories"); updateStatut("tous_les_statuts") }}
            className={menuItemBase}
            style={{ color: !categorie || categorie === "toutes_les_categories" ? "#4F7EF7" : "#1A1D2E" }}
          >
            <CheckIcon visible={!categorie || categorie === "toutes_les_categories"} />
            Toutes les catégories
          </DropdownMenuItem>

          {/* Each category → hover reveals statut sub-menu */}
          {dataCategories.map((cat) => (
            <DropdownMenuSub key={cat.id}>
              <DropdownMenuSubTrigger
                className={menuItemBase}
                style={{ color: categorie === cat.nom ? "#185FA5" : "#1A1D2E" }}
                onClick={() => updateCategorie(cat.nom ?? "")}
              >
                <CheckIcon visible={categorie === cat.nom} />
                <span
                  className="mr-1 inline-block shrink-0 rounded-sm"
                  style={{ width: 3, height: 14, background: categorie === cat.nom ? "#4F7EF7" : "#D8E0F0" }}
                />
                {cat.nom}
                {categorie === cat.nom && statutMeta && (
                  <ActivePill label={statut!} color={statutMeta} />
                )}
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent style={subContentStyle}>
                <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#A0ABBC" }}>
                  Statut
                </p>
                <DropdownMenuItem
                  onClick={() => { updateCategorie(cat.nom ?? ""); updateStatut("tous_les_statuts") }}
                  className={menuItemBase}
                  style={{ color: !statut || statut === "tous_les_statuts" ? "#4F7EF7" : "#1A1D2E" }}
                >
                  <CheckIcon visible={!statut || statut === "tous_les_statuts"} />
                  Tous les statuts
                </DropdownMenuItem>

                {dataStatuts.map((s) => {
                  const meta = s.nom ? statutColors[s.nom] : undefined
                  return (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => { updateCategorie(cat.nom ?? ""); updateStatut(s.nom ?? "") }}
                      className={menuItemBase}
                      style={{ color: statut === s.nom ? "#185FA5" : "#1A1D2E" }}
                    >
                      <CheckIcon visible={statut === s.nom} />
                      {meta ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: meta.bg, color: meta.text }}
                        >
                          <span className="size-1.5 shrink-0 rounded-full" style={{ background: meta.dot }} />
                          {s.nom}
                        </span>
                      ) : s.nom}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}

          <DropdownMenuSeparator className="my-1.5 bg-[#F0F4FF]" />

          {/* ── Section: Année > décennie > années ── */}
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#A0ABBC" }}>
            Année
          </p>

          <DropdownMenuItem
            onClick={() => setAnnee(undefined)}
            className={menuItemBase}
            style={{ color: !annee ? "#4F7EF7" : "#1A1D2E" }}
          >
            <CheckIcon visible={!annee} />
            Toutes les années
          </DropdownMenuItem>

          {DECADES.map((decade) => (
            <DropdownMenuSub key={decade.label}>
              <DropdownMenuSubTrigger
                className={menuItemBase}
                style={{ color: decade.years.some((y) => String(y) === annee) ? "#5B21B6" : "#1A1D2E" }}
              >
                <span
                  className="size-3.5 shrink-0 rounded"
                  style={{
                    background: decade.years.some((y) => String(y) === annee) ? "#EDE9FE" : "transparent",
                    border: "1.5px solid",
                    borderColor: decade.years.some((y) => String(y) === annee) ? "#A78BFA" : "#D8E0F0",
                  }}
                />
                {decade.label}
                {decade.years.some((y) => String(y) === annee) && (
                  <ActivePill label={annee!} />
                )}
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent style={{ ...subContentStyle, minWidth: 130 }}>
                {decade.years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => setAnnee(String(year))}
                    className={menuItemBase}
                    style={{ color: annee === String(year) ? "#5B21B6" : "#1A1D2E" }}
                  >
                    <Check
                      className="size-3.5 shrink-0"
                      style={{ opacity: annee === String(year) ? 1 : 0, color: "#7C3AED" }}
                    />
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}

          {/* ── Reset ── */}
          {hasFilters && (
            <>
              <DropdownMenuSeparator className="my-1.5 bg-[#F0F4FF]" />
              <DropdownMenuItem
                onClick={clearAll}
                className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-red-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:bg-red-50 focus:text-red-500"
              >
                <X className="size-3.5" />
                Réinitialiser les filtres
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}