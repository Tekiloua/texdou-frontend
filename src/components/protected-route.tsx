/**
 * protected-route.tsx
 *
 * Exporte deux outils :
 *
 * 1. <ProtectedRoute>          — bloque une route entière
 * 2. <CanSee>                  — masque n'importe quel élément JSX inline
 *
 * Hiérarchie des rôles : normal < expert < admin
 *
 * Exemples d'utilisation de <CanSee> :
 *
 *   // Visible uniquement par les experts ET les admins
 *   <CanSee role="expert">
 *     <button>Action experte</button>
 *   </CanSee>
 *
 *   // Visible uniquement par les admins
 *   <CanSee role="admin">
 *     <span>Zone admin</span>
 *   </CanSee>
 *
 *   // Visible uniquement par les utilisateurs connectés (peu importe le rôle)
 *   <CanSee>
 *     <p>Contenu connecté</p>
 *   </CanSee>
 *
 *   // Visible uniquement par les non-connectés (ex: bouton "Se connecter")
 *   <CanSee guestOnly>
 *     <a href="/login">Se connecter</a>
 *   </CanSee>
 */

import { Navigate } from "react-router"
import { useAuthStore, type UserRole } from "@/store/useAuthStore"

// ─── Hiérarchie ──────────────────────────────────────────────────────────────

const ROLE_RANK: Record<UserRole, number> = {
  normal: 0,
  expert: 1,
  admin:  2,
}

function hasAccess(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required]
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

type ProtectedRouteProps = {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !hasAccess(user.role, requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// ─── CanSee ───────────────────────────────────────────────────────────────────

type CanSeeProps = {
  children: React.ReactNode
  /** Rôle minimum requis pour voir l'élément (inclut les rôles supérieurs) */
  role?: UserRole
  /** Si true : visible uniquement par les visiteurs NON connectés */
  guestOnly?: boolean
}

export function CanSee({ children, role, guestOnly }: CanSeeProps) {
  const user = useAuthStore((s) => s.user)

  // Réservé aux non-connectés (ex : bouton "Se connecter" dans la navbar)
  if (guestOnly) {
    return user ? null : <>{children}</>
  }

  // Doit être connecté
  if (!user) return null

  // Rôle minimum requis
  if (role && !hasAccess(user.role, role)) return null

  return <>{children}</>
}