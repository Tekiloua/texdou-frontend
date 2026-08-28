import { fetchCategories, fetchStatuts, fetchThemes } from "@/api/api"
import { useFiltre } from "@/store/useFiltre"
import type { CategorieType, StatutType, TexteType, ThemeType } from "@/types"
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

  const { data: dataThemes } = useQuery<ThemeType[]>({
    queryKey: ["statuts"],
    queryFn: fetchThemes,
    initialData: () => queryClient.getQueryData<ThemeType[]>(["themes"]),
  })

  const { statut, categorie, theme, mots_cles, date_debut, date_fin, annee } =
    useFiltre()

  if (!dataCategories || !dataStatuts || !dataThemes) return textes

  let dataFiltered = textes

  if (statut) {
    dataFiltered = dataFiltered.filter((texte) => {
      if (statut == "tous_les_statuts") return true
      const s = dataStatuts.find((s) => s.id === texte.statut_id)
      return s?.nom == statut
    })
  }

  if (categorie) {
    dataFiltered = dataFiltered.filter((texte) => {
      if (categorie == "toutes_les_categories") return true
      const c = dataCategories.find((c) => c.id == texte.categorie_id)
      return c?.nom == categorie
    })
  }

  if (theme) {
    dataFiltered = dataFiltered.filter((texte) => {
      if (theme == "toutes_les_themes") return true
      return texte.themes?.includes(theme)
    })
  }

  if (date_debut) {
    dataFiltered = dataFiltered.filter((texte) => {
      if (!texte.date_mise_en_vigueur) return false
      return date_debut <= new Date(texte.date_mise_en_vigueur)
    })
  }

  if (date_fin) {
    dataFiltered = dataFiltered.filter((texte) => {
      if (!texte.date_mise_en_vigueur) return false
      return date_fin >= new Date(texte.date_mise_en_vigueur)
    })
  }

  if (annee) {
    dataFiltered = dataFiltered.filter((texte) => {
      if (!texte.date_mise_en_vigueur) return false
      return annee === new Date(texte.date_mise_en_vigueur).getFullYear()
    })
  }

  if (mots_cles != undefined) {
    dataFiltered = dataFiltered.filter((texte) => {
      return texte.mots_cles?.toLowerCase().includes(mots_cles.toLowerCase())
    })
  }

  return dataFiltered
}
