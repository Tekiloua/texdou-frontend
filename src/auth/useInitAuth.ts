import { useEffect } from "react"
import { fetchMe } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"

// ─── useInitAuth ──────────────────────────────────────────────────────────────
//
// Hook appelé une seule fois au montage de l'app (ex: dans App.tsx ou le
// composant racine protégé) pour récupérer l'utilisateur courant depuis le
// cookie httpOnly existant.
//
// CORRECTION : l'ancien hook laissait l'intercepteur axios gérer les 401
// de /me, ce qui pouvait provoquer une redirection vers le login alors que
// l'utilisateur était en train de naviguer. Désormais :
//   - /me est dans la liste "silentUrls" de l'intercepteur → pas de redirect
//   - En cas d'erreur (401 ou réseau), on pose user=null proprement et on
//     laisse le guard de route décider quoi faire.
//   - setInitializing(false) est TOUJOURS appelé dans finally, même en cas
//     d'erreur réseau transitoire, pour éviter un spinner infini.
//
export function useInitAuth() {
  const { setUser, setInitializing } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      try {
        // /me est exclu de la redirection automatique dans l'intercepteur 401.
        // Si le cookie est absent ou expiré, on arrive dans le catch → user=null.
        const me = await fetchMe()
        setUser({
          numero: me.numero,
          username: me.username,
          role: me.role,
        })
      } catch {
        // 401  → pas de cookie valide, utilisateur non connecté (cas normal).
        // 5xx / réseau → erreur transitoire : on ne déconnecte pas l'utilisateur
        // brutalement, on laisse juste user=null et le guard de route gère.
        setUser(null)
      } finally {
        // Indispensable : sans ce finally, une erreur réseau laisserait
        // isInitializing=true et l'app resterait bloquée sur le spinner.
        setInitializing(false)
      }
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}