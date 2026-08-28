import type { UserRecord, UserRole } from "@/api/api"

export type { UserRecord, UserRole }

// ─── Filtre de rôle (barre de filtre) ────────────────────────────────────────

export type RoleFilter = "all" | UserRole

// ─── Formulaire d'ajout / édition ────────────────────────────────────────────
// Un seul et même formulaire pour les deux cas : en édition, le mot de passe
// est optionnel (vide = inchangé) et le numéro/username sont pré-remplis.

export interface UserFormValues {
  username: string
  numero: string
  password: string
  role: UserRole
}

export const EMPTY_FORM: UserFormValues = {
  username: "",
  numero: "",
  password: "",
  role: "normal",
}

// ─── Rôles : libellés + styles de badge ──────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  normal: "Normal",
  expert: "Expert",
  admin: "Administrateur",
}

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  normal: "bg-slate-100 text-slate-600",
  expert: "bg-amber-100 text-amber-700",
  admin: "bg-cyan-100 text-cyan-800",
}