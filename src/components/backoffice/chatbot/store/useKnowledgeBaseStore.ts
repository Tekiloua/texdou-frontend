import { create } from "zustand"

// ── useKnowledgeBaseStore ────────────────────────────────────────────────────
// Simulation front-only de la "base de connaissance" du chatbot : aucun appel
// backend, on garde juste en mémoire les ids de textes sélectionnés comme
// base. Partagé entre SiteHeader (compteur du bouton) et KnowledgeSheet
// (onglets Base / Textes).

interface KnowledgeBaseState {
  baseIds: Set<number>
  addToBase: (ids: number[]) => void
  removeFromBase: (ids: number[]) => void
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set) => ({
  baseIds: new Set<number>(),
  addToBase: (ids) =>
    set((state) => {
      const next = new Set(state.baseIds)
      ids.forEach((id) => next.add(id))
      return { baseIds: next }
    }),
  removeFromBase: (ids) =>
    set((state) => {
      const next = new Set(state.baseIds)
      ids.forEach((id) => next.delete(id))
      return { baseIds: next }
    }),
}))