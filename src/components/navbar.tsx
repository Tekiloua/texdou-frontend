import { LogOut, Moon, Sun, BookOpen, Bot, File, UserRound, Bell } from "lucide-react"
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

  const isActive = (path: string) => location.pathname === path

  return (
    <header
      className="fixed z-10 w-full border-b bg-white"
      style={{ borderColor: "#E4E9F7", height: "62px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="flex items-center justify-center rounded-[10px] font-extrabold text-white"
              style={{ width: 36, height: 36, background: "#4F7EF7", fontSize: 17 }}
            >
              T
            </div>
            <span className="text-base font-extrabold" style={{ color: "#1A1D2E" }}>
              TEXDOU
            </span>
          </Link>

          {/* Nav links */}
          {user && (
            <nav className="ml-6 flex items-center gap-1">
              <NavLink to="/documents" active={isActive("/documents")} icon={<File className="size-4" />} label="Documents" />
              <NavLink to="/chatbot" active={isActive("/chatbot")} icon={<Bot className="size-4" />} label="Texdou AI" />
            </nav>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <IconBtn onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Changer le thème">
            {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </IconBtn>

          {/* Notifications */}
          {user && (
            <div className="relative">
              <IconBtn>
                <Bell className="size-4" />
              </IconBtn>
              <span
                className="absolute right-1.5 top-1.5 rounded-full border-2 border-white"
                style={{ width: 7, height: 7, background: "#E24B4A" }}
              />
            </div>
          )}

          {/* Auth */}
          {user ? (
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-all hover:bg-red-50 hover:text-red-500"
              style={{ color: "#6B7290" }}
              title="Se déconnecter"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-all"
              style={{ color: "#6B7290" }}
            >
              <UserRound className="size-4" />
              <span className="hidden sm:inline">Connexion</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

const NavLink = ({
  to,
  active,
  icon,
  label,
  badge,
}: {
  to: string
  active: boolean
  icon: React.ReactNode
  label: string
  badge?: number
}) => (
  <Link
    to={to}
    className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm font-semibold transition-all no-underline"
    style={{
      background: active ? "#EBF2FF" : "transparent",
      color: active ? "#4F7EF7" : "#6B7290",
    }}
  >
    {icon}
    {label}
    {badge !== undefined && (
      <span
        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
        style={{ background: "#4F7EF7", lineHeight: 1 }}
      >
        {badge}
      </span>
    )}
  </Link>
)

const IconBtn = ({
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center rounded-[10px] border transition-all hover:bg-[#F0F4FF]"
    style={{ width: 38, height: 38, borderColor: "#E4E9F7", color: "#6B7290" }}
    {...props}
  >
    {children}
  </button>
)