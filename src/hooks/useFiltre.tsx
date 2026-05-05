import { fetchCategories, fetchStatuts } from "@/api/api"
import { useFiltre } from "@/store/useFiltre"
import type { CategorieType, StatutType, TexteType } from "@/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export const useFilteredTextes = (textes: TexteType[]): TexteType[] => {
  const queryClient = useQueryClient()

  const { data: dataCategories } = useQuery<CategorieType[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    initialData: () =>
      queryClient.getQueryData<CategorieType[]>(["categories"]),
  })
  
  const { data: dataStatuts } = useQuery<StatutType[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
    initialData: () => queryClient.getQueryData<StatutType[]>(["statuts"]),
  })

  const { statut, categorie, mots_cles, contenu_html } = useFiltre()

  if (!dataCategories || !dataStatuts) return textes

  let dataFiltered = textes

  if (statut != undefined) {
    dataFiltered = dataFiltered.filter((texte) => {
      if(statut == "tous_les_statuts") return true
      const s = dataStatuts.find((s) => s.id === texte.statut_id)
      return (s?.nom == statut) || (s?.nom == "tous_les_statuts")
    })
  }

  if (categorie != undefined) {
    dataFiltered = dataFiltered.filter((texte) => {
      if(categorie == "toutes_les_categories") return true
      const c = dataCategories.find((c) => c.id == texte.categorie_id)
      return c?.nom == categorie // toutes_les_categories
    })
  }

  if (mots_cles != undefined) {
    dataFiltered = dataFiltered.filter((texte) => {
      return texte.mots_cles?.toLowerCase().includes(mots_cles.toLowerCase())
    })
  }


  return dataFiltered
}
