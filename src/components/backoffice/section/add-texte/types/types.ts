// ─── Types partagés pour le formulaire "Ajouter/Modifier un texte" ──────────

export interface CheckItem {
  id: string
  label: string
  children?: CheckItem[]
}

// Champs "simples" du formulaire, gérés par react-hook-form. Les
// catégories/statuts/thèmes (multi-sélection via arbre de cases à cocher)
// et le contenu Lexical (HTML) restent en state Zustand séparé : ce ne sont
// pas des <input> classiques, donc peu adaptés à `register`.
export interface TexteFormValues {
  titre: string
  numero: string
  dateMiseEnVigueur: string
  nomSignataire: string
  titreSignataire: string
  motsCles: string
}

// Forme brute renvoyée par /categories, /statuts, /themes (voir api.ts).
// L'API peut renvoyer soit une liste à plat avec parent_id, soit une
// arborescence déjà imbriquée (chaque item porte directement ses enfants
// dans "children" ou "sous_categories"/"sous_themes"/"enfants").
export interface RawClassificationItem {
  id: number | string
  nom: string
  slug?: string
  parent_id?: number | string | null
  description?: string | null
  couleur?: string
  children?: RawClassificationItem[]
  sous_categories?: RawClassificationItem[]
  sous_themes?: RawClassificationItem[]
  sous_statuts?: RawClassificationItem[]
  enfants?: RawClassificationItem[]
}

export interface CheckTreeProps {
  items: CheckItem[]
  selected: Set<string>
  onToggle: (id: string) => void
  depth?: number
}

export interface CheckNodeProps {
  item: CheckItem
  selected: Set<string>
  onToggle: (id: string) => void
  depth: number
}

// ─── Formats de page (utilisés par l'éditeur Lexical) ───────────────────────

export type PageFormat = "A4" | "A5" | "Letter" | "Legal"

export const PAGE_FORMATS: Record<
  PageFormat,
  { label: string; widthPx: number; heightPx: number }
> = {
  A4: { label: "A4 (210 × 297 mm)", widthPx: 794, heightPx: 1123 },
  A5: { label: "A5 (148 × 210 mm)", widthPx: 559, heightPx: 794 },
  Letter: { label: "Letter (8.5 × 11 po)", widthPx: 816, heightPx: 1056 },
  Legal: { label: "Legal (8.5 × 14 po)", widthPx: 816, heightPx: 1344 },
}

// Clé des trois arbres de classification gérés via le store Zustand.
export type ClassificationKey = "categories" | "statuts" | "themes"

// ─── Références vers d'autres textes (table textes_reference) ──────────────

// Représentation légère d'un texte sélectionné comme référence, telle que
// stockée dans le store Zustand pendant l'édition du formulaire. On y
// dénormalise titre/numéro/catégorie/statut/date car la table
// `textes_reference` les duplique elle aussi — ça évite un aller-retour API
// supplémentaire au moment de la publication.
export interface ReferenceCandidate {
  id: string
  titre: string
  numero: string | null
  categorie: string | null
  statut: string | null
  date_mise_en_vigueur: string | null
}

// ─── Liens utiles (table liens_utiles) ──────────────────────────────────────

// Représentation d'un lien utile en cours d'édition dans le formulaire.
// `id` est un identifiant local (crypto.randomUUID) tant que le lien n'a
// pas encore été enregistré côté serveur — il ne correspond PAS à
// `liens_utiles.id` en base ; on ne connaît cet id serveur qu'après
// rechargement du texte (mode édition), où il est réutilisé comme clé pour
// permettre la suppression/dédoublonnage de manière stable.
export interface LienUtileCandidate {
  id: string
  titre: string
  url: string
  entite: string | null
}