export type CategorieType = {
  id?: number
  nom?: string
}

export type DocumentType = {
  titre?: string
  fichier_url?: string
}

export type HistoriqueType = {
  id?: number
  texte_id?: number
  date?: Date
  statut?: string
}

export type LienUtileType = {
  id?: number
  texte_id?: number
  titre?: string
  url?: string
  entite?: string
}

export type StatutType = {
  id?: number
  nom?: string
}

export type TexteType = {
  id?: number
  wp_id?: number
  titre?: string
  numero?: string
  date_mise_en_vigueur?: Date
  signataire_nom?: string
  signataire_titre?: string
  resume?: string
  mots_cles?: string
  contenu_html?: string
  categorie_id?: number
  statut_id?: number
  note_presentation?: number
  publish?: number
}

export type TexteDocumentType = {
  texte_id?: number
  document_id?: number
}

export type TexteReferenceType = {
  id?: number
  texte_id?: number
  titre?: string
  numero?: string
  date_mise_en_vigueur?: Date
  categorie?: string
  statut?: string
  lien_url?: string
  texte_lie_id?: number
}

export type TexteThemeType = {
  texte_id?: number
  theme_id?: number
}

export type ThemeType = {
  id?: number
  nom: string
  parent_id: number
}
