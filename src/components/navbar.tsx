import {
  LogOut,
  Bell,
  File,
  Bot,
  LayoutDashboard,
  UserRound,
  PlusIcon,
  KeyRound,
  FilePlus,
  ShieldCheck,
  Zap,
  Check,
  Clock,
  ChevronRight,
  X,
  BellOff,
  Trash2,
  Sparkle,
  Sparkles,
} from "lucide-react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/useAuthStore"
import { logoutRequest, clearAccessToken } from "@/api/api"
import { Separator } from "./ui/separator"
import { useState, useRef, useEffect } from "react"
import { CanSee } from "./protected-route"

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType =
  | "password_reset"
  | "document_added"
  | "role_change"
  | "subscription_warning"
  | "subscription_expired"
  | "new_user"

interface Notification {
  id: string
  type: NotifType
  title: string
  description: string
  time: string
  read: boolean
  actionLabel?: string
  urgent?: boolean
}

// ─── Mock data (remplacer par un vrai fetch) ──────────────────────────────────

const INITIAL_NOTIFS: Notification[] = [
  {
    id: "1",
    type: "password_reset",
    title: "Demande de réinitialisation",
    description:
      "jean.rakoto@acme.mg a demandé une réinitialisation de mot de passe.",
    time: "Il y a 5 min",
    read: false,
    actionLabel: "Traiter",
  },
  {
    id: "2",
    type: "document_added",
    title: "Nouveau document ajouté",
    description:
      "Marie Andria a ajouté « Décret n°2024-091 relatif aux marchés publics ».",
    time: "Il y a 18 min",
    read: false,
    actionLabel: "Voir",
  },
  {
    id: "3",
    type: "subscription_warning",
    title: "Forfait IA presque épuisé",
    description:
      "Il vous reste 12 % de votre quota mensuel (120 / 1 000 requêtes).",
    time: "Il y a 1 h",
    read: false,
    actionLabel: "Mettre à niveau",
    urgent: true,
  },
  {
    id: "4",
    type: "role_change",
    title: "Demande de changement de rôle",
    description: "Hery Rakotondrabe demande le rôle Éditeur.",
    time: "Il y a 2 h",
    read: false,
    actionLabel: "Approuver",
  },
  {
    id: "5",
    type: "new_user",
    title: "Nouvel utilisateur inscrit",
    description: "Sophie Randriamanana attend validation de son compte.",
    time: "Il y a 3 h",
    read: true,
    actionLabel: "Valider",
  },
  {
    id: "6",
    type: "subscription_expired",
    title: "Forfait IA expiré",
    description:
      "Renouvelez votre abonnement pour continuer à utiliser Texdou AI.",
    time: "Hier",
    read: true,
    actionLabel: "Renouveler",
    urgent: true,
  },
]

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotifType,
  {
    icon: React.FC<{ className?: string; style?: React.CSSProperties }>
    bg: string
    color: string
    iconColor: string
  }
> = {
  password_reset: {
    icon: KeyRound,
    bg: "#EBF2FF",
    color: "#185FA5",
    iconColor: "#4F7EF7",
  },
  document_added: {
    icon: FilePlus,
    bg: "#E1F5EE",
    color: "#0F6E56",
    iconColor: "#1D9E75",
  },
  role_change: {
    icon: ShieldCheck,
    bg: "#FBEAF0",
    color: "#993556",
    iconColor: "#D4547A",
  },
  subscription_warning: {
    icon: Zap,
    bg: "#FAEEDA",
    color: "#854F0B",
    iconColor: "#BA7517",
  },
  subscription_expired: {
    icon: Zap,
    bg: "#FDECEA",
    color: "#A32D2D",
    iconColor: "#E24B4A",
  },
  new_user: {
    icon: ShieldCheck,
    bg: "#F0EBFF",
    color: "#5B2FA0",
    iconColor: "#8B5CF6",
  },
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS)
  const [dropOpen, setDropOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const dropRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifs.filter((n) => !n.read).length
  const displayed =
    activeTab === "unread" ? notifs.filter((n) => !n.read) : notifs

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const markAllRead = () =>
    setNotifs((p) => p.map((n) => ({ ...n, read: true })))
  const markRead = (id: string) =>
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
  const remove = (id: string) => setNotifs((p) => p.filter((n) => n.id !== id))
  const clearAll = () => {
    setNotifs([])
    setDropOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logoutRequest()
    } catch {
      /* ignore */
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
      style={{
        borderColor: "#E4E9F7",
        height: "62px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="flex items-center justify-center rounded-[10px] font-extrabold text-white"
            style={{
              width: 36,
              height: 36,
              background: "#4F7EF7",
              fontSize: 17,
            }}
          >
            T
          </div>
          <span
            className="text-base font-extrabold"
            style={{ color: "#1A1D2E" }}
          >
            TEXDOU
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && (
            <nav className="mr-2 ml-6 flex items-center gap-1">
              <NavLink
                to="/documents"
                active={isActive("/documents")}
                icon={<File className="size-4" />}
                label="Documents"
              />
              <NavLink
                to="/chatbot"
                active={isActive("/chatbot")}
                icon={<Sparkles className="size-4" />}
                label="Texdou AI"
              />
              <CanSee role="admin">
                <Separator orientation="vertical" className="mx-2 w-4" />
                <NavLink
                  to="/dashboard"
                  active={isActive("/dashboard")}
                  icon={<LayoutDashboard className="size-4" />}
                  label="Dashboard"
                />
              </CanSee>
            </nav>
          )}

          <CanSee role="admin">
            <Link to="/pdf-stats" title="Ajouter un document">
              <IconBtn aria-label="Ajouter un document">
                <PlusIcon className="size-4" />
              </IconBtn>
            </Link>
          </CanSee>

          <CanSee role="admin">
            {" "}
            {/* ── Notification bell + dropdown ── */}
            {user && (
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen((v) => !v)}
                  className="relative flex items-center justify-center rounded-[10px] border transition-all hover:bg-[#F0F4FF]"
                  style={{
                    width: 38,
                    height: 38,
                    borderColor: dropOpen ? "#4F7EF7" : "#E4E9F7",
                    color: "#6B7290",
                  }}
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                      style={{
                        minWidth: 16,
                        height: 16,
                        background: "#E24B4A",
                        padding: "0 3px",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown */}
                {dropOpen && (
                  <div
                    className="absolute right-0 mt-2 overflow-hidden rounded-2xl border bg-white shadow-2xl"
                    style={{ width: 400, borderColor: "#E4E9F7", zIndex: 50 }}
                  >
                    {/* Header */}
                    <div
                      className="flex items-center justify-between border-b px-4 py-3"
                      style={{ borderColor: "#E4E9F7" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex items-center justify-center rounded-xl"
                          style={{
                            width: 34,
                            height: 34,
                            background: "#EBF2FF",
                          }}
                        >
                          <Bell
                            className="size-4"
                            style={{ color: "#4F7EF7" }}
                          />
                        </div>
                        <div>
                          <p
                            className="text-sm font-extrabold"
                            style={{ color: "#1A1D2E" }}
                          >
                            Notifications
                          </p>
                          <p className="text-xs" style={{ color: "#8892B0" }}>
                            {unreadCount > 0
                              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                              : "Tout est lu"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all hover:bg-blue-50"
                            style={{ color: "#4F7EF7" }}
                          >
                            <Check className="size-3" /> Tout lire
                          </button>
                        )}
                        <button
                          onClick={clearAll}
                          className="flex items-center justify-center rounded-lg p-1.5 transition-all hover:bg-red-50"
                          title="Tout effacer"
                        >
                          <Trash2
                            className="size-3.5"
                            style={{ color: "#B0B8D0" }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div
                      className="flex border-b px-4"
                      style={{ borderColor: "#E4E9F7" }}
                    >
                      {(["all", "unread"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className="mr-4 flex items-center gap-1.5 py-2.5 text-xs font-bold transition-colors"
                          style={{
                            color: activeTab === tab ? "#4F7EF7" : "#8892B0",
                            borderBottom:
                              activeTab === tab
                                ? "2px solid #4F7EF7"
                                : "2px solid transparent",
                          }}
                        >
                          {tab === "all" ? "Toutes" : "Non lues"}
                          {tab === "unread" && unreadCount > 0 && (
                            <span
                              className="flex items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{
                                minWidth: 17,
                                height: 17,
                                background: "#4F7EF7",
                                padding: "0 4px",
                              }}
                            >
                              {unreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 380, overflowY: "auto" }}>
                      {displayed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                          <div
                            className="flex items-center justify-center rounded-2xl"
                            style={{
                              width: 48,
                              height: 48,
                              background: "#F0F4FF",
                            }}
                          >
                            <BellOff
                              className="size-5"
                              style={{ color: "#B0B8D0" }}
                            />
                          </div>
                          <p
                            className="text-xs font-semibold"
                            style={{ color: "#8892B0" }}
                          >
                            Aucune notification
                          </p>
                        </div>
                      ) : (
                        displayed.map((notif) => (
                          <NotifRow
                            key={notif.id}
                            notif={notif}
                            onRead={markRead}
                            onRemove={remove}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CanSee>
          {/* Auth */}
          {user ? (
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-all hover:bg-red-50 hover:text-red-500"
              style={{ color: "#6B7290" }}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-sm font-semibold no-underline transition-all"
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

// ─── Notification row (dans le dropdown) ─────────────────────────────────────

const NotifRow = ({
  notif,
  onRead,
  onRemove,
}: {
  notif: Notification
  onRead: (id: string) => void
  onRemove: (id: string) => void
}) => {
  const cfg = TYPE_CONFIG[notif.type]
  const Icon = cfg.icon

  return (
    <div
      className="group relative flex gap-3 border-b px-4 py-3 transition-colors hover:bg-[#F7F9FF]"
      style={{
        borderColor: "#F0F4FF",
        background: notif.read ? "#fff" : "#F7F9FF",
      }}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div
          className="absolute top-4 right-3 rounded-full"
          style={{ width: 6, height: 6, background: "#4F7EF7" }}
        />
      )}

      {/* Icon */}
      <div
        className="flex shrink-0 items-center justify-center rounded-xl"
        style={{ width: 36, height: 36, background: cfg.bg }}
      >
        <Icon className="size-4" style={{ color: cfg.iconColor }} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className="text-xs leading-tight font-bold"
            style={{ color: "#1A1D2E" }}
          >
            {notif.title}
          </p>
          {notif.urgent && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "#FDECEA", color: "#A32D2D" }}
            >
              Urgent
            </span>
          )}
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "#6B7290" }}>
          {notif.description}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" style={{ color: "#C0C8DC" }}>
            <Clock className="size-3" />
            <span className="text-[10px] font-medium">{notif.time}</span>
          </div>
          <div className="flex items-center gap-1">
            {notif.actionLabel && (
              <button
                onClick={() => onRead(notif.id)}
                className="flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all hover:opacity-80"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {notif.actionLabel}
                <ChevronRight className="size-2.5" />
              </button>
            )}
            {/* hover actions */}
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {!notif.read && (
                <button
                  onClick={() => onRead(notif.id)}
                  className="rounded p-0.5 hover:bg-blue-50"
                  title="Marquer lu"
                >
                  <Check className="size-3" style={{ color: "#4F7EF7" }} />
                </button>
              )}
              <button
                onClick={() => onRemove(notif.id)}
                className="rounded p-0.5 hover:bg-red-50"
                title="Supprimer"
              >
                <X className="size-3" style={{ color: "#E24B4A" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

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
    className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm font-semibold no-underline transition-all"
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
