import { useState } from "react"
import {
  Bell,
  KeyRound,
  FilePlus,
  ShieldCheck,
  Zap,
  X,
  Check,
  Clock,
  ChevronRight,
  BellOff,
  Trash2,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTIFS: Notification[] = [
  {
    id: "1",
    type: "password_reset",
    title: "Demande de réinitialisation",
    description: "L'utilisateur jean.rakoto@acme.mg a demandé une réinitialisation de mot de passe.",
    time: "Il y a 5 min",
    read: false,
    actionLabel: "Traiter la demande",
    urgent: false,
  },
  {
    id: "2",
    type: "document_added",
    title: "Nouveau document ajouté",
    description: "Marie Andria a ajouté « Décret n°2024-091 relatif aux marchés publics ».",
    time: "Il y a 18 min",
    read: false,
    actionLabel: "Voir le document",
  },
  {
    id: "3",
    type: "subscription_warning",
    title: "Forfait IA presque épuisé",
    description: "Il vous reste 12 % de votre quota mensuel Texdou AI (120 / 1 000 requêtes).",
    time: "Il y a 1 h",
    read: false,
    actionLabel: "Mettre à niveau",
    urgent: true,
  },
  {
    id: "4",
    type: "role_change",
    title: "Demande de changement de rôle",
    description: "Hery Rakotondrabe demande le rôle Éditeur pour accéder à la gestion des textes.",
    time: "Il y a 2 h",
    read: false,
    actionLabel: "Approuver / Refuser",
  },
  {
    id: "5",
    type: "new_user",
    title: "Nouvel utilisateur inscrit",
    description: "Sophie Randriamanana vient de créer un compte et attend validation.",
    time: "Il y a 3 h",
    read: true,
    actionLabel: "Valider le compte",
  },
  {
    id: "6",
    type: "subscription_expired",
    title: "Forfait IA expiré",
    description: "Votre abonnement IA a expiré. Renouvelez pour continuer à utiliser Texdou AI.",
    time: "Hier",
    read: true,
    actionLabel: "Renouveler",
    urgent: true,
  },
  {
    id: "7",
    type: "document_added",
    title: "Nouveau document ajouté",
    description: "Paul Ramiand a ajouté « Loi n°2024-003 sur l'environnement numérique ».",
    time: "Hier",
    read: true,
    actionLabel: "Voir le document",
  },
]

// ─── Config par type ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotifType,
  { icon: React.FC<{ className?: string }>; bg: string; color: string; iconColor: string }
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

// ─── Notification Panel ───────────────────────────────────────────────────────

export default function NotificationPanel() {
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFS)
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")

  const unreadCount = notifs.filter((n) => !n.read).length

  const displayed =
    activeTab === "unread" ? notifs.filter((n) => !n.read) : notifs

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))

  const markRead = (id: string) =>
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )

  const remove = (id: string) =>
    setNotifs((prev) => prev.filter((n) => n.id !== id))

  const clearAll = () => setNotifs([])

  return (
    <div
      className="flex min-h-screen items-start justify-center py-10 px-4"
      style={{ background: "#F0F4FF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl"
        style={{ borderColor: "#E4E9F7" }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "#E4E9F7" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: "#EBF2FF" }}
            >
              <Bell className="size-5" style={{ color: "#4F7EF7" }} />
            </div>
            <div>
              <h2
                className="text-base font-extrabold"
                style={{ color: "#1A1D2E" }}
              >
                Notifications
              </h2>
              <p className="text-xs" style={{ color: "#8892B0" }}>
                {unreadCount > 0
                  ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Tout est lu"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:bg-blue-50"
                style={{ color: "#4F7EF7" }}
              >
                <Check className="size-3.5" />
                Tout marquer lu
              </button>
            )}
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:bg-red-50"
              style={{ color: "#8892B0" }}
              title="Effacer tout"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex border-b px-5"
          style={{ borderColor: "#E4E9F7" }}
        >
          {(["all", "unread"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative mr-4 flex items-center gap-2 py-3 text-sm font-semibold transition-colors"
              style={{
                color: activeTab === tab ? "#4F7EF7" : "#8892B0",
                borderBottom: activeTab === tab ? "2px solid #4F7EF7" : "2px solid transparent",
              }}
            >
              {tab === "all" ? "Toutes" : "Non lues"}
              {tab === "unread" && unreadCount > 0 && (
                <span
                  className="flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ minWidth: 18, height: 18, background: "#4F7EF7", padding: "0 5px" }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div className="flex flex-col" style={{ maxHeight: 520, overflowY: "auto" }}>
          {displayed.length === 0 ? (
            <EmptyState />
          ) : (
            displayed.map((notif) => (
              <NotifItem
                key={notif.id}
                notif={notif}
                onRead={markRead}
                onRemove={remove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Single notification item ────────────────────────────────────────────────

const NotifItem = ({
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
      className="group relative flex gap-4 border-b px-5 py-4 transition-colors hover:bg-[#F7F9FF]"
      style={{
        borderColor: "#F0F4FF",
        background: notif.read ? "#fff" : "#F7F9FF",
      }}
    >
      {/* Unread dot */}
      {!notif.read && (
        <div
          className="absolute top-5 right-4 rounded-full"
          style={{ width: 7, height: 7, background: "#4F7EF7" }}
        />
      )}

      {/* Icon */}
      <div
        className="flex shrink-0 items-center justify-center rounded-xl"
        style={{ width: 42, height: 42, background: cfg.bg }}
      >
        <Icon className="size-5" style={{ color: cfg.iconColor }} />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-sm font-bold leading-tight"
              style={{ color: "#1A1D2E" }}
            >
              {notif.title}
            </p>
            {notif.urgent && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "#FDECEA", color: "#A32D2D" }}
              >
                Urgent
              </span>
            )}
          </div>
          {/* Actions on hover */}
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {!notif.read && (
              <button
                onClick={() => onRead(notif.id)}
                className="rounded-lg p-1 transition-colors hover:bg-blue-50"
                title="Marquer comme lu"
              >
                <Check className="size-3.5" style={{ color: "#4F7EF7" }} />
              </button>
            )}
            <button
              onClick={() => onRemove(notif.id)}
              className="rounded-lg p-1 transition-colors hover:bg-red-50"
              title="Supprimer"
            >
              <X className="size-3.5" style={{ color: "#E24B4A" }} />
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "#6B7290" }}>
          {notif.description}
        </p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1" style={{ color: "#B0B8D0" }}>
            <Clock className="size-3" />
            <span className="text-[11px] font-medium">{notif.time}</span>
          </div>
          {notif.actionLabel && (
            <button
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: cfg.bg, color: cfg.color }}
              onClick={() => onRead(notif.id)}
            >
              {notif.actionLabel}
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-16">
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{ width: 56, height: 56, background: "#F0F4FF" }}
    >
      <BellOff className="size-6" style={{ color: "#B0B8D0" }} />
    </div>
    <p className="text-sm font-semibold" style={{ color: "#8892B0" }}>
      Aucune notification
    </p>
    <p className="text-xs" style={{ color: "#B0B8D0" }}>
      Vous êtes à jour !
    </p>
  </div>
)