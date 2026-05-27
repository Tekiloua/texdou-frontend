import { create } from "zustand"

export type User = {
  numero: string
  username?: string
}

type AuthState = {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

// Un seul store — propre et typé
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))