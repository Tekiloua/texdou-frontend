import { Search, Filter, Trash2, Check } from "lucide-react"
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CategorieFilter, DateFilter, RagFilter, SortOrder } from "./textes-section"
import { useAuthStore } from "@/store/useAuthStore"

export function TextesFiltre({
  search,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  sortOrder,
  onSortOrderChange,
  categorieFilter,
  onCategorieFilterChange,
  categorieOptions,
  ragFilter,
  onRagFilterChange,
  onResetFilters,
  onApply,
  isApplying,
  selectedCount,
  onDeleteClick,
  totalCount,
}: {
  search: string
  onSearchChange: (value: string) => void
  dateFilter: DateFilter
  onDateFilterChange: (value: DateFilter) => void
  sortOrder: SortOrder
  onSortOrderChange: (value: SortOrder) => void
  categorieFilter: CategorieFilter
  onCategorieFilterChange: (value: CategorieFilter) => void
  categorieOptions: string[]
  ragFilter: RagFilter
  onRagFilterChange: (value: RagFilter) => void
  onResetFilters: () => void
  onApply: () => void
  isApplying: boolean
  selectedCount: number
  onDeleteClick: () => void
  totalCount: number
}) {
  const {user} = useAuthStore()
  // Le filtre RAG n'a de sens que pour les rôles qui voient la colonne RAG
  // (normal ne voit ni la case à cocher RAG, ni le flag d'inclusion).
  const canFilterRag = user?.role != "normal"
  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={dateFilter}
              onValueChange={(v) => onDateFilterChange(v as DateFilter)}
            >
              <SelectTrigger className="h-9 w-38 border-foreground/20 text-sm text-slate-600">
                <SelectValue placeholder="Toutes les dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes-dates">Toutes les dates</SelectItem>
                <SelectItem value="7j">7 derniers jours</SelectItem>
                <SelectItem value="30j">30 derniers jours</SelectItem>
                <SelectItem value="90j">90 derniers jours</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(v) => onSortOrderChange(v as SortOrder)}
            >
              <SelectTrigger className="h-9 w-44 border-foreground/20 text-sm text-slate-600">
                <SelectValue placeholder="Trier par date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chargement">
                  <span className="flex items-center gap-1.5">
                    Ordre de chargement
                  </span>
                </SelectItem>
                <SelectItem value="recent">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                    Plus récent d'abord
                  </span>
                </SelectItem>
                <SelectItem value="ancien">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpWideNarrow className="h-3.5 w-3.5" />
                    Plus ancien d'abord
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categorieFilter}
              onValueChange={(v) => onCategorieFilterChange(v as CategorieFilter)}
            >
              <SelectTrigger className="h-9 w-44 border-foreground/20 text-sm text-slate-600">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {categorieOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canFilterRag && (
              <Select
                value={ragFilter}
                onValueChange={(v) => onRagFilterChange(v as RagFilter)}
              >
                <SelectTrigger className="h-9 w-40 border-foreground/20 text-sm text-slate-600">
                  <SelectValue placeholder="RAG" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">RAG : tous</SelectItem>
                  <SelectItem value="inclus">RAG : inclus</SelectItem>
                  <SelectItem value="exclus">RAG : exclus</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              size="sm"
              className="h-9 gap-1.5 border-b-4 border-foreground/20 text-slate-600 hover:bg-slate-200 active:border-b"
              onClick={onResetFilters}
            >
              <Filter className="size-3" />
              Réinitialiser
            </Button>

            <Button
              size="sm"
              onClick={onApply}
              disabled={isApplying}
              className="h-9 gap-1.5 border-b-4 border-teal-800 bg-teal-600 text-white hover:bg-teal-700 active:border-b disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Check className="size-3" />
              {isApplying ? "Application…" : "Appliquer"}
            </Button>
            {/* Bouton supprimer: visible uniquement si des éléments sont cochés pour l'admin et l'expert */}
            {user?.role != "normal" && (
              <div
                className={`flex items-center gap-2 ${selectedCount > 0 ? "opacity-100" : "opacity-40"}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-b-4 border-foreground/20 hover:bg-slate-200"
                  onClick={onDeleteClick}
                  disabled={selectedCount === 0}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer ({selectedCount})
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher des textes"
            className="h-9 border-foreground/20 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Compteur (la pagination a été retirée au profit d'un scroll dans le tableau) */}
      <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-2.5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="font-medium text-slate-700">{totalCount}</span> texte
          {totalCount > 1 ? "s" : ""}
          {selectedCount > 0 && (
            <span className="ml-2 text-teal-700">
              · {selectedCount} sélectionné(s)
            </span>
          )}
        </span>
      </div>
    </>
  )
}