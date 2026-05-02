import { create } from "zustand"

type FiltreState = {
  categorie: string | undefined
  updateCategorie: (newCategorie: string | undefined) => void
  statut: string | undefined
  updateStatut: (newStatut: string | undefined) => void
  theme: string | undefined
  updateTheme: (newTheme: string | undefined ) => void
  date_debut: Date | undefined
  updateDateDebut: (newDateDebut: Date | undefined) => void
  date_fin: Date | undefined
  updateDateFin: (newDateFin: Date | undefined) => void
  mots_cles:string | undefined
  updateMotsCles: (newMotsCles: string | undefined) => void
  contenu_html: string | undefined
  updateContenuHtml: (newContenuHtml: string | undefined) => void
}

export const useFiltre = create<FiltreState>((set) => ({
  categorie: undefined,
  statut: undefined,
  theme: undefined,
  date_debut: undefined,
  date_fin: undefined,
  mots_cles: undefined,
  contenu_html: undefined,

  updateStatut: (newStatut) => set({ statut: newStatut }),
  updateCategorie: (newCategorie) => set({ categorie: newCategorie }),
  updateTheme: (newTheme) => set({ theme: newTheme }),
  updateDateDebut: (newDateDebut) => set({ date_debut: newDateDebut }),
  updateDateFin: (newDateFin) => set({ date_fin: newDateFin }),
  updateMotsCles: (newMotsCles) => set({ mots_cles: newMotsCles }),
  updateContenuHtml: (newContenuHtml) => set({ contenu_html: newContenuHtml }),
}))
