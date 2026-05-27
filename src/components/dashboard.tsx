import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)

  // Si pas connecté (store vide), redirige vers login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
      <p className="text-muted-foreground">
        Connecté en tant que <span className="font-medium text-amber-700 dark:text-amber-500">{user.numero}</span>
      </p>
    </div>
  )
}