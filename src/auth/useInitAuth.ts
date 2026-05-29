/**
 * useInitAuth.ts
 *
 * Au démarrage de l'app, tente de récupérer un access token via le cookie
 * refresh_token (httpOnly). Pendant ce temps, isInitializing = true afin
 * qu'App.tsx n'évalue pas encore les routes protégées (évite la fausse
 * redirection vers /login pour un utilisateur déjà connecté).
 */
import { useEffect } from "react"
import api, { setAccessToken } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"

export function useInitAuth() {
  const { setUser, setInitializing } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      try {
        // /refresh renvoie { access_token, role }
        const refreshRes = await api.post("/api/refresh")
        setAccessToken(refreshRes.data.access_token)

        // /me renvoie { numero, username, role }
        const meRes = await api.get("/api/me")
        setUser({
          numero:   meRes.data.numero,
          username: meRes.data.username,
          role:     meRes.data.role,
        })
      } catch {
        // Pas de session active — c'est normal
        setUser(null)
      } finally {
        // Dans tous les cas on débloque le rendu des routes
        setInitializing(false)
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}