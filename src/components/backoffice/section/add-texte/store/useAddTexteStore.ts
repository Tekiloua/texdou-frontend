import { create } from "zustand"
import type {
  ClassificationKey,
  LienUtileCandidate,
  ReferenceCandidate,
} from "../types/types"

// Réexporté pour compatibilité avec le code existant qui importait ce type
// directement depuis le store (la définition canonique vit maintenant dans
// types/types.ts, aux côtés de LienUtileCandidate).
export type { ReferenceCandidate }

interface AddTexteState {
  // ── Classification (catégorie / statut / thème) ──────────────────────────
  categories: Set<string>
  statuts: Set<string>
  themes: Set<string>
  toggleClassification: (key: ClassificationKey, id: string) => void
  setClassification: (key: ClassificationKey, ids: Set<string>) => void
  clearClassification: (key: ClassificationKey) => void

  // ── Références (textes liés, table textes_reference) ────────────────────
  // Clé = id (string) du texte référencé, pour dédupliquer facilement.
  references: Map<string, ReferenceCandidate>
  setReferences: (refs: Map<string, ReferenceCandidate>) => void
  removeReference: (id: string) => void
  clearReferences: () => void

  // ── Liens utiles (table liens_utiles) ────────────────────────────────────
  // Clé = id local (crypto.randomUUID en création, id serveur réutilisé en
  // édition) pour dédupliquer/supprimer facilement.
  liensUtiles: Map<string, LienUtileCandidate>
  addLienUtile: (lien: LienUtileCandidate) => void
  removeLienUtile: (id: string) => void
  setLiensUtiles: (liens: Map<string, LienUtileCandidate>) => void
  clearLiensUtiles: () => void

  // ── Contenu Lexical (document principal + résumé) ────────────────────────
  documentHtml: string
  resumeHtml: string
  setDocumentHtml: (html: string) => void
  setResumeHtml: (html: string) => void

  // ── Import de fichiers (document principal) ──────────────────────────────
  // Plusieurs fichiers autorisés, image et/ou PDF mélangés.
  files: File[]
  setFiles: (files: File[]) => void
  addFiles: (files: File[]) => void
  removeFile: (index: number) => void

  // true pendant le téléchargement des documents déjà liés (mode édition,
  // voir document-section.tsx : fetchTexteDocumentsAsFiles). Tant que ce
  // flag est true, `files` ne reflète PAS encore l'état réel des documents
  // du texte — soumettre le formulaire à ce moment enverrait une liste
  // vide/incomplète, que le backend interpréterait comme "tous les
  // documents ont été retirés" et les supprimerait. Le bouton de
  // publication doit rester désactivé tant que documentsLoading est true.
  documentsLoading: boolean
  setDocumentsLoading: (loading: boolean) => void

  // true si le préremplissage des documents existants (mode édition) a
  // échoué totalement ou partiellement — un ou plusieurs documents liés
  // n'ont pas pu être retéléchargés (voir fetchTexteDocumentsAsFiles).
  // Tant que ce flag est true, `files` ne représente PAS l'état réel des
  // documents du texte : soumettre le formulaire ne doit alors PAS envoyer
  // `files` au backend (voir add-texte-section.tsx), pour éviter de
  // supprimer par erreur les documents qui n'ont pas pu être rechargés.
  documentsPrefillFailed: boolean
  setDocumentsPrefillFailed: (failed: boolean) => void

  // ── Suivi des modifications non enregistrées ──────────────────────────────
  contentDirty: boolean
  setContentDirty: (dirty: boolean) => void

  hasPrefilled: boolean
  setHasPrefilled: (value: boolean) => void

  reset: () => void
}

const initialState = {
  categories: new Set<string>(),
  statuts: new Set<string>(),
  themes: new Set<string>(),
  references: new Map<string, ReferenceCandidate>(),
  liensUtiles: new Map<string, LienUtileCandidate>(),
  documentHtml: "",
  resumeHtml: "",
  files: [] as File[],
  documentsLoading: false,
  documentsPrefillFailed: false,
  contentDirty: false,
  hasPrefilled: false,
}

export const useAddTexteStore = create<AddTexteState>((set, get) => ({
  ...initialState,

  toggleClassification: (key, id) => {
    if (key === "statuts") {
      // Choix unique : sélectionner cet id, ou désélectionner s'il est déjà actif.
      const current = get().statuts
      const next = current.has(id) ? new Set<string>() : new Set([id])
      set({ statuts: next })
      return
    }
    const current = new Set(get()[key])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    set({ [key]: current } as Pick<AddTexteState, typeof key>)
  },

  setClassification: (key, ids) => {
    set({ [key]: ids } as Pick<AddTexteState, typeof key>)
  },

  clearClassification: (key) => {
    set({ [key]: new Set<string>() } as Pick<AddTexteState, typeof key>)
  },

  setReferences: (refs) => set({ references: refs }),

  removeReference: (id) => {
    const next = new Map(get().references)
    next.delete(id)
    set({ references: next })
  },

  clearReferences: () => set({ references: new Map<string, ReferenceCandidate>() }),

  addLienUtile: (lien) => {
    const next = new Map(get().liensUtiles)
    next.set(lien.id, lien)
    set({ liensUtiles: next })
  },

  removeLienUtile: (id) => {
    const next = new Map(get().liensUtiles)
    next.delete(id)
    set({ liensUtiles: next })
  },

  setLiensUtiles: (liens) => set({ liensUtiles: liens }),

  clearLiensUtiles: () =>
    set({ liensUtiles: new Map<string, LienUtileCandidate>() }),

  setDocumentHtml: (html) => set({ documentHtml: html }),
  setResumeHtml: (html) => set({ resumeHtml: html }),
  setFiles: (files) => set({ files }),
  addFiles: (newFiles) => set({ files: [...get().files, ...newFiles] }),
  removeFile: (index) =>
    set({ files: get().files.filter((_, i) => i !== index) }),
  setDocumentsLoading: (loading) => set({ documentsLoading: loading }),
  setDocumentsPrefillFailed: (failed) => set({ documentsPrefillFailed: failed }),
  setContentDirty: (dirty) => set({ contentDirty: dirty }),
  setHasPrefilled: (value) => set({ hasPrefilled: value }),

  reset: () =>
    set({
      categories: new Set<string>(),
      statuts: new Set<string>(),
      themes: new Set<string>(),
      references: new Map<string, ReferenceCandidate>(),
      liensUtiles: new Map<string, LienUtileCandidate>(),
      documentHtml: "",
      resumeHtml: "",
      files: [],
      documentsLoading: false,
      documentsPrefillFailed: false,
      contentDirty: false,
      hasPrefilled: false,
    }),
}))