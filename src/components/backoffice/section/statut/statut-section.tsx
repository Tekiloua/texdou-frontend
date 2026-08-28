import { useMemo } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Tags } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { type ApiStatut,type StatutRow, fetchStatuts, flattenStatuts } from "./types/statut-types"
import { StatutForm } from "./statut-form"
import { StatutTable } from "./statut-table"

export const StatutSection = () => {
  const {
    data: dataStatuts,
    isLoading: isLoadingStatuts,
    isError: isErrorStatuts,
  } = useQuery<ApiStatut[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
  })

  /** Liste aplatie ordonnée pour l'affichage (parent → enfants en retrait) */
  const flatRows = useMemo<StatutRow[]>(
    () => flattenStatuts(dataStatuts ?? []),
    [dataStatuts]
  )

  if (isLoadingStatuts) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Chargement des statuts…
      </div>
    )
  }

  if (isErrorStatuts) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-500">
        Erreur lors du chargement des statuts.
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full h-full bg-slate-200 p-20 flex flex-col items-center justify-center sm:p-8">
        <div className="mx-auto max-w-7xl">
          {/* En-tête */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-sm">
                <Tags className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Statut de texte
                </h1>
                <p className="text-sm text-slate-500">
                  Organisez les textes douaniers par statut
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <StatutForm flatRows={flatRows} />
            <StatutTable flatRows={flatRows} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}