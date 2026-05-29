import { create } from "zustand"

export type UserRole = "normal" | "expert" | "admin"

export type User = {
  numero: string
  username?: string
  role: UserRole
}

type AuthState = {
  user: User | null
  isInitializing: boolean          // true pendant le refresh initial au démarrage
  setUser: (user: User | null) => void
  setInitializing: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,            // commence à true — App attend que ce soit false
  setUser: (user) => set({ user }),
  setInitializing: (v) => set({ isInitializing: v }),
  logout: () => set({ user: null }),
}))