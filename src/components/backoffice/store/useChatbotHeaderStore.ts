import { create } from "zustand"

// ─── useChatbotHeaderStore ─────────────────────────────────────────────────
// Pont entre la page Chatbot (qui connaît la conversation active) et le
// SiteHeader global (qui affiche le titre + les actions de renommage/options).
// La page Chatbot pousse ses données dans ce store ; le SiteHeader les lit.
// Sur toute autre page, `title` reste `null` et le SiteHeader n'affiche que
// son contenu par défaut.

interface ChatbotHeaderState {
  title: string | null
  hasActiveConversation: boolean
  onRename: (titre: string) => void
  onOpenHistory: () => void
  onOpenMobileSidebar: () => void
  setChatbotHeader: (data: {
    title: string | null
    hasActiveConversation: boolean
    onRename: (titre: string) => void
    onOpenHistory: () => void
    onOpenMobileSidebar: () => void
  }) => void
  reset: () => void
}

const defaultHeaderState = {
  title: null as string | null,
  hasActiveConversation: false,
  onRename: () => {},
  onOpenHistory: () => {},
  onOpenMobileSidebar: () => {},
}

export const useChatbotHeaderStore = create<ChatbotHeaderState>((set) => ({
  ...defaultHeaderState,
  setChatbotHeader: (data) => set(data),
  reset: () => set(defaultHeaderState),
}))