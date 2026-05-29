import axios from "axios"

const SERVER_URL = "http://localhost:8000"

// ─── In-memory access token ───────────────────────────────────────────────────
let accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token
}

export const clearAccessToken = () => {
  accessToken = null
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,   // envoie le cookie refresh_token automatiquement
})

// ─── Request interceptor : injecte le Bearer token ───────────────────────────
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ─── Response interceptor : refresh automatique sur 401 ──────────────────────
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config

    // Ne jamais tenter de re-refresh sur les routes d'auth elles-mêmes
    // (évite la boucle infinie si le refresh token est lui-même expiré)
    const isAuthRoute = originalRequest.url?.includes("/api/refresh") ||
                        originalRequest.url?.includes("/api/login")

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true

      // Si un refresh est déjà en cours, on met la requête en attente
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const response = await api.post("/api/refresh")
        const newToken = response.data.access_token

        setAccessToken(newToken)
        isRefreshing = false
        onRefreshed(newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        // Refresh échoué → déconnexion propre
        isRefreshing = false
        refreshSubscribers = []
        clearAccessToken()
        window.location.href = "/login"
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const logoutRequest = () => api.post("/logout")

// ─── API calls ────────────────────────────────────────────────────────────────
export const fetchCategories       = () => api.get("/categories").then(r => r.data)
export const fetchStats            = () => api.get("/stats").then(r => r.data)
export const fetchDocuments        = () => api.get("/documents").then(r => r.data)
export const fetchHistoriques      = () => api.get("/historiques").then(r => r.data)
export const fetchLiensUtiles      = () => api.get("/liens-utiles").then(r => r.data)
export const fetchStatuts          = () => api.get("/statuts").then(r => r.data)
export const fetchTextes           = () => api.get("/textes").then(r => r.data)
export const fetchTexteById        = (id: string) => api.get(`/textes/${id}`).then(r => r.data)
export const fetchTextesDocuments  = () => api.get("/textes-documents").then(r => r.data)
export const fetchTextesReferences = () => api.get("/textes-references").then(r => r.data)
export const fetchTextesThemes     = () => api.get("/textes-themes").then(r => r.data)
export const fetchThemes           = () => api.get("/themes").then(r => r.data)

export default api