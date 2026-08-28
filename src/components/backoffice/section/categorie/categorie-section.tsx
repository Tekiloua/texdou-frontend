import { useMemo } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FolderTree } from "lucide-react"
import { fetchCategories } from "@/api/api"
import { useQuery } from "@tanstack/react-query"
import { flattenCategories, type ApiCategorie, type CategoryRow } from "./types/categorie-types"
import { CategoryFormCard } from "./categorie-form-card"
import { CategoryTableCard } from "./categorie-table-card"

// ---------- Composant principal ----------

export const CategorySection = () => {
  const {
    data: dataCategories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
  } = useQuery<ApiCategorie[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  /** Liste aplatie ordonnée pour l'affichage (parent → enfants en retrait) */
  const flatRows = useMemo<CategoryRow[]>(
    () => flattenCategories(dataCategories ?? []),
    [dataCategories]
  )

  // ---------- Render ----------

  if (isLoadingCategories) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Chargement des catégories…
      </div>
    )
  }

  if (isErrorCategories) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-500">
        Erreur lors du chargement des catégories.
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 p-10 sm:p-8">
        <div className="mx-auto max-w-7xl">
          {/* En-tête */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-sm">
                <FolderTree className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Catégorie de texte
                </h1>
                <p className="text-sm text-slate-500">
                  Organisez les textes douaniers par catégorie
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Formulaire d'ajout */}
            <CategoryFormCard flatRows={flatRows} />

            {/* Liste des catégories */}
            <CategoryTableCard flatRows={flatRows} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}