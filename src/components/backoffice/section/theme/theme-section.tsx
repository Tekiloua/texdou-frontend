import { useMemo } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Layers } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { fetchThemes, flattenThemes , type ApiTheme, type ThemeRow} from "./types/theme-types"
import { ThemeFormCard } from "./theme-form-card"
import { ThemeTableCard } from "./theme-table-card"

// ---------- Composant principal ----------

export const ThemeSection = () => {
  const {
    data: dataThemes,
    isLoading: isLoadingThemes,
    isError: isErrorThemes,
  } = useQuery<ApiTheme[]>({
    queryKey: ["themes"],
    queryFn: fetchThemes,
  })

  /** Liste aplatie ordonnée pour l'affichage (parent → enfants en retrait) */
  const flatRows = useMemo<ThemeRow[]>(
    () => flattenThemes(dataThemes ?? []),
    [dataThemes]
  )

  // ---------- Render ----------

  if (isLoadingThemes) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Chargement des thèmes…
      </div>
    )
  }

  if (isErrorThemes) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-500">
        Erreur lors du chargement des thèmes.
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 p-20 sm:p-8">
        <div className="mx-auto max-w-7xl">
          {/* En-tête */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-sm">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Thème de texte
                </h1>
                <p className="text-sm text-slate-500">
                  Organisez les textes douaniers par thème
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 justify-center">
            <ThemeFormCard flatRows={flatRows} />
            <ThemeTableCard flatRows={flatRows} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}