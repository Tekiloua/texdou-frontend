import { LogOut, Moon, Sun, BookOpen, Bot, File, UserRound } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import { logoutRequest, clearAccessToken } from "@/api/api"

export default function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    try {
      await logoutRequest()
    } catch {
      // même si le serveur échoue, on déconnecte localement
    } finally {
      clearAccessToken()
      logout()
      navigate("/login")
    }
  }

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-amber-700 dark:text-amber-500 font-semibold"
      : "text-foreground/60 hover:text-foreground"

  return (
    <header className="fixed z-10 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
          <BookOpen className="size-5" />
          <span className="text-base font-bold tracking-tight">TEXDOU</span>
        </Link>

        {/* Nav links — visibles seulement si connecté */}
        {user && (
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/chatbot" className={`flex items-center gap-1.5 transition ${isActive("/chatbot")}`}>
              <Bot className="size-4" />
              Chatbot
            </Link>
            <Link to="/documents" className={`flex items-center gap-1.5 transition ${isActive("/documents")}`}>
              <File className="size-4" />
              Documents
            </Link>
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Toggle thème */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-md p-2 text-foreground/60 transition hover:bg-accent hover:text-foreground"
            aria-label="Changer le thème"
          >
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </button>

          {/* Profil / Connexion */}
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-foreground/60 transition hover:bg-accent hover:text-foreground"
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          ) : (
            <Link
              to="/login"
              className={`rounded-md p-2 transition hover:bg-accent ${isActive("/login")}`}
              aria-label="Connexion"
            >
              <UserRound className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}