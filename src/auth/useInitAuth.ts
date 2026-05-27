/**
 * useInitAuth.ts
 * 
 * Au chargement de l'app, tente de récupérer un nouvel access token
 * via le cookie refresh_token (httpOnly) — si l'utilisateur était
 * précédemment connecté, il reste connecté même après F5.
 */
import { useEffect } from "react"
import api, { setAccessToken } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"

export function useInitAuth() {
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const init = async () => {
      try {
        // Le cookie refresh_token est envoyé automatiquement (withCredentials)
        const refreshRes = await api.post("/refresh")
        const token = refreshRes.data.access_token
        setAccessToken(token)

        // Récupère les infos de l'utilisateur
        const meRes = await api.get("/me")
        setUser({ numero: meRes.data.numero })
      } catch {
        // Pas de session active — utilisateur non connecté, pas d'erreur
        setUser(null)
      }
    }

    init()
  }, [])
}