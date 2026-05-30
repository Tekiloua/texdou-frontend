import { useState, useEffect } from "react"
import {
  FileText,
  Users,
  Upload,
  Trash2,
  Search,
  Plus,
  Eye,
  ChevronRight,
  TrendingUp,
  Shield,
  AlertCircle,
  CheckCircle2,
  X,
  Download,
  Key,
  MoreVertical,
  Filter,
  ArrowUpDown,
  Sparkles,
  LayoutDashboard,
  BookOpen,
  UserCircle,
  Clock,
} from "lucide-react"
import { fetchStatuts , fetchUsers, fetchLatestDocuments} from "@/api/api"

// ── Palette — identique au reste du projet
const C = {
  blue: "#4F7EF7",
  blueDark: "#3D6EE5",
  bluePale: "#EBF2FF",
  blueBg: "#F0F4FF",
  teal: "#0F6E56",
  tealPale: "#E1F5EE",
  amber: "#BA7517",
  amberPale: "#FAEEDA",
  rose: "#993556",
  rosePale: "#FBEAF0",
  ink: "#1A1D2E",
  mid: "#6B7290",
  muted: "#8892B0",
  dim: "#B0B8D0",
  border: "#E4E9F7",
}

// ── Types
type UserFromAPI = {
  id: number
  numero: string
  username: string | null
  role: string
}

type TexteFromAPI = {
  id: number
  titre: string | null
  numero: string | null
  date_mise_en_vigueur: string | null
  statut_id: number | null
  categorie_id: number | null
}

type StatsFromAPI = {
  total_textes: number
  textes_en_vigueur: number
}

// ── Mock documents (documents uploadés — non remplacés ici)
const MOCK_DOCUMENTS = [
  { id: 1, title: "Loi n°2022-014 relative au Code des Douanes", type: "Loi", date: "2024-12-10", status: "new", size: "2.4 MB" },
  { id: 2, title: "Circulaire n°047 – Régimes suspensifs", type: "Circulaire", date: "2024-12-08", status: "new", size: "840 KB" },
  { id: 3, title: "Décret n°2024-198 – Tarif douanier", type: "Décret", date: "2024-11-30", status: "active", size: "5.1 MB" },
  { id: 4, title: "Note de service n°12 – OEA", type: "Note", date: "2024-11-25", status: "active", size: "320 KB" },
  { id: 5, title: "Arrêté n°3310 – Marchandises prohibées", type: "Arrêté", date: "2024-11-18", status: "active", size: "1.2 MB" },
  { id: 6, title: "Circulaire n°039 – Valeur en douane", type: "Circulaire", date: "2024-10-05", status: "active", size: "670 KB" },
]

type Tab = "overview" | "documents" | "users"

// ── Toast
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[14px] border px-5 py-4 text-sm font-semibold shadow-xl"
      style={{
        background: "#fff",
        borderColor: type === "success" ? C.teal : C.rose,
        color: C.ink,
        animation: "slideUp 0.3s ease",
        minWidth: 300,
      }}
    >
      {type === "success"
        ? <CheckCircle2 className="size-4 shrink-0" style={{ color: C.teal }} />
        : <AlertCircle className="size-4 shrink-0" style={{ color: C.rose }} />}
      {msg}
      <button onClick={onClose} className="ml-auto">
        <X className="size-3.5" style={{ color: C.dim }} />
      </button>
    </div>
  )
}

// ── Modal
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(26,29,46,0.45)" }}>
      <div
        className="relative w-full max-w-lg rounded-[20px] border bg-white p-8 shadow-2xl mx-4"
        style={{ borderColor: C.border }}
      >
        <button onClick={onClose} className="absolute right-5 top-5">
          <X className="size-5" style={{ color: C.dim }} />
        </button>
        <h3 className="mb-6 text-lg font-extrabold" style={{ color: C.ink }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS)
  const [users, setUsers] = useState<UserFromAPI[]>([])
  const [latestTextes, setLatestTextes] = useState<TexteFromAPI[]>([])
  const [statsData, setStatsData] = useState<StatsFromAPI | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingTextes, setLoadingTextes] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [searchDoc, setSearchDoc] = useState("")
  const [searchUser, setSearchUser] = useState("")
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null)
  const [showResetModal, setShowResetModal] = useState<number | null>(null)
  const [uploadForm, setUploadForm] = useState({ title: "", type: "Loi" })

  // ── Chargement des données depuis l'API
  useEffect(() => {
    fetchUsers()
      .then((data: UserFromAPI[]) => setUsers(data))
      .catch(() => {/* token absent ou non-admin : on garde le tableau vide */})
      .finally(() => setLoadingUsers(false))

    fetchLatestDocuments()
      .then((data: TexteFromAPI[]) => setLatestTextes(data))
      .catch(() => {})
      .finally(() => setLoadingTextes(false))

    fetchStatuts()
      .then((data: StatsFromAPI) => setStatsData(data))
      .catch(() => {})
  }, [])

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleDelete = (id: number) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setShowDeleteModal(null)
    showToast("Document supprimé avec succès.")
  }

  const handleUpload = () => {
    if (!uploadForm.title.trim()) return
    const newDoc = {
      id: Date.now(),
      title: uploadForm.title,
      type: uploadForm.type,
      date: new Date().toISOString().slice(0, 10),
      status: "new",
      size: "—",
    }
    setDocuments((prev) => [newDoc, ...prev])
    setUploadForm({ title: "", type: "Loi" })
    setShowUploadModal(false)
    showToast("Document inséré avec succès.")
  }

  const handleResetPassword = (_id: number) => {
    setShowResetModal(null)
    showToast("Mot de passe réinitialisé. Un lien a été envoyé à l'utilisateur.")
  }

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchDoc.toLowerCase()) ||
    d.type.toLowerCase().includes(searchDoc.toLowerCase())
  )

  const filteredUsers = users.filter((u) =>
    (u.username ?? "").toLowerCase().includes(searchUser.toLowerCase()) ||
    u.numero.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.role.toLowerCase().includes(searchUser.toLowerCase())
  )

  const newDocs = documents.filter((d) => d.status === "new")
  // Badge "Nouveaux documents" dans l'onglet = derniers textes de l'API
  const newDocsBadge = latestTextes.length

  const NAV_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: "documents", label: "Documents", icon: BookOpen },
    { id: "users", label: "Utilisateurs", icon: UserCircle },
  ]

  return (
    // Pas de min-h-screen ni de background propre : on s'intègre dans le <main> de App.tsx
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* ── En-tête de page ── */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div
              className="flex size-7 items-center justify-center rounded-[7px]"
              style={{ background: C.bluePale }}
            >
              <Sparkles className="size-3.5" style={{ color: C.blue }} />
            </div>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: C.muted }}
            >
              Administration
            </span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.ink }}>
            Tableau de bord
          </h1>
        </div>
        <p className="text-xs font-medium" style={{ color: C.dim }}>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* ── Onglets de navigation (style des chips du projet) ── */}
      <div
        className="mb-6 flex gap-1 rounded-[12px] border bg-white p-1"
        style={{ borderColor: C.border }}
      >
        {NAV_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="relative flex flex-1 items-center justify-center gap-2 rounded-[9px] py-2 text-sm font-semibold transition-all"
            style={{
              background: activeTab === id ? C.blue : "transparent",
              color: activeTab === id ? "#fff" : C.mid,
            }}
          >
            <Icon className="size-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            {id === "documents" && newDocsBadge > 0 && (
              <span
                className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  background: activeTab === id ? "rgba(255,255,255,0.3)" : C.blue,
                  color: "#fff",
                }}
              >
                {newDocsBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════
          TAB : VUE D'ENSEMBLE
      ══════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                value: statsData ? String(statsData.total_textes) : "—",
                label: "Documents officiels",
                icon: FileText, color: C.blue, bg: C.bluePale,
              },
              {
                value: statsData ? String(statsData.textes_en_vigueur) : "—",
                label: "Textes en vigueur",
                icon: Shield, color: C.teal, bg: C.tealPale,
              },
              {
                value: latestTextes.length > 0 ? String(latestTextes.length) : "—",
                label: "Derniers ajouts",
                icon: TrendingUp, color: C.amber, bg: C.amberPale,
              },
              {
                value: loadingUsers ? "…" : String(users.length),
                label: "Utilisateurs",
                icon: Users, color: C.rose, bg: C.rosePale,
              },
            ].map(({ value, label, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="flex flex-col gap-3 rounded-2xl border bg-white p-5"
                style={{ borderColor: C.border }}
              >
                <div
                  className="flex size-10 items-center justify-center rounded-[10px]"
                  style={{ background: bg }}
                >
                  <Icon className="size-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-extrabold leading-none" style={{ color: C.ink }}>{value}</p>
                  <p className="mt-1 text-[11px] font-semibold" style={{ color: C.muted }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Deux colonnes */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Nouveaux documents */}
            <div className="rounded-2xl border bg-white" style={{ borderColor: C.border }}>
              <div
                className="flex items-center justify-between border-b px-5 py-4"
                style={{ borderColor: C.border }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-4" style={{ color: C.blue }} />
                  <span className="text-sm font-bold" style={{ color: C.ink }}>Derniers textes ajoutés</span>
                  {newDocsBadge > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: C.blue }}
                    >
                      {newDocsBadge}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab("documents")}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: C.blue }}
                >
                  Voir tout <ChevronRight className="size-3" />
                </button>
              </div>
              <div className="divide-y" style={{ borderColor: C.border }}>
                {loadingTextes ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm font-semibold" style={{ color: C.muted }}>Chargement…</p>
                  </div>
                ) : latestTextes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="size-8" style={{ color: C.teal }} />
                    <p className="text-sm font-semibold" style={{ color: C.muted }}>Aucun document récent</p>
                  </div>
                ) : latestTextes.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-3 px-5 py-4">
                    <div
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: C.bluePale }}
                    >
                      <FileText className="size-4" style={{ color: C.blue }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>
                        {doc.titre ?? `Texte #${doc.id}`}
                      </p>
                      <p className="text-xs" style={{ color: C.muted }}>
                        {doc.numero ?? "—"} · {doc.date_mise_en_vigueur ?? "—"}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: C.bluePale, color: C.blue }}
                    >
                      #{doc.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Derniers utilisateurs */}
            <div className="rounded-2xl border bg-white" style={{ borderColor: C.border }}>
              <div
                className="flex items-center justify-between border-b px-5 py-4"
                style={{ borderColor: C.border }}
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4" style={{ color: C.rose }} />
                  <span className="text-sm font-bold" style={{ color: C.ink }}>Derniers utilisateurs</span>
                </div>
                <button
                  onClick={() => setActiveTab("users")}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: C.blue }}
                >
                  Voir tout <ChevronRight className="size-3" />
                </button>
              </div>
              <div className="divide-y" style={{ borderColor: C.border }}>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm font-semibold" style={{ color: C.muted }}>Chargement…</p>
                  </div>
                ) : users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: C.rose }}
                    >
                      {(u.username ?? u.numero).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>
                        {u.username ?? `Utilisateur #${u.id}`}
                      </p>
                      <p className="text-xs" style={{ color: C.muted }}>{u.numero}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: u.role === "admin" ? C.rosePale : u.role === "expert" ? C.amberPale : C.bluePale,
                        color: u.role === "admin" ? C.rose : u.role === "expert" ? C.amber : C.blue,
                      }}
                    >
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: C.border }}>
            <p className="mb-3 text-sm font-bold" style={{ color: C.ink }}>Actions rapides</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setActiveTab("documents"); setShowUploadModal(true) }}
                className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: C.blue }}
              >
                <Upload className="size-4" /> Insérer un document
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className="flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-all hover:border-blue-300"
                style={{ borderColor: C.border, color: C.ink }}
              >
                <FileText className="size-4" /> Gérer les documents
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className="flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-all hover:border-blue-300"
                style={{ borderColor: C.border, color: C.ink }}
              >
                <Users className="size-4" /> Voir les utilisateurs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════
          TAB : DOCUMENTS
      ══════════════════════ */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex items-center gap-2 rounded-[10px] border bg-white px-3 py-2.5"
              style={{ borderColor: C.border, minWidth: 240 }}
            >
              <Search className="size-4 shrink-0" style={{ color: C.dim }} />
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="Rechercher un document…"
                value={searchDoc}
                onChange={(e) => setSearchDoc(e.target.value)}
                style={{ color: C.ink }}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="flex items-center gap-2 rounded-[10px] border bg-white px-3 py-2.5 text-sm font-semibold"
                style={{ borderColor: C.border, color: C.mid }}
              >
                <Filter className="size-4" /> Filtrer
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: C.blue }}
              >
                <Plus className="size-4" /> Insérer
              </button>
            </div>
          </div>

          {/* Bandeau nouveaux docs */}
          {newDocs.length > 0 && (
            <div
              className="flex items-center gap-3 rounded-[12px] border px-5 py-3 text-sm font-semibold"
              style={{ borderColor: "#BDD0FF", background: C.bluePale, color: C.blue }}
            >
              <Sparkles className="size-4 shrink-0" />
              {newDocs.length} nouveau{newDocs.length > 1 ? "x" : ""} document{newDocs.length > 1 ? "s" : ""} ajouté{newDocs.length > 1 ? "s" : ""} récemment.
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: C.border }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#FAFBFF" }}>
                    {[
                      ["Document", true],
                      ["Type", false],
                      ["Date", false],
                      ["Taille", false],
                      ["Statut", false],
                    ].map(([label, sortable]) => (
                      <th
                        key={label as string}
                        className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: C.muted }}
                      >
                        <span className="flex items-center gap-1">
                          {label as string}
                          {sortable && <ArrowUpDown className="size-3" />}
                        </span>
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: C.border }}>
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="transition-colors hover:bg-[#FAFBFF]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: C.bluePale }}
                          >
                            <FileText className="size-4" style={{ color: C.blue }} />
                          </div>
                          <span className="max-w-55 truncate font-semibold" style={{ color: C.ink }}>
                            {doc.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                          style={{ background: C.bluePale, color: C.blue }}
                        >
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm" style={{ color: C.mid }}>{doc.date}</td>
                      <td className="px-4 py-4 text-sm" style={{ color: C.mid }}>{doc.size}</td>
                      <td className="px-4 py-4">
                        {doc.status === "new" ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ background: C.tealPale, color: C.teal }}
                          >
                            <span className="size-1.5 rounded-full inline-block" style={{ background: C.teal }} />
                            Nouveau
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ background: "#F1F3FA", color: C.muted }}
                          >
                            <span className="size-1.5 rounded-full inline-block bg-current" />
                            Actif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded-[7px] p-1.5 transition-colors hover:bg-[#EBF2FF]"
                            title="Voir"
                          >
                            <Eye className="size-4" style={{ color: C.blue }} />
                          </button>
                          <button
                            className="rounded-[7px] p-1.5 transition-colors hover:bg-[#EBF2FF]"
                            title="Télécharger"
                          >
                            <Download className="size-4" style={{ color: C.mid }} />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(doc.id)}
                            className="rounded-[7px] p-1.5 transition-colors hover:bg-[#FBEAF0]"
                            title="Supprimer"
                          >
                            <Trash2 className="size-4" style={{ color: C.rose }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDocs.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <FileText className="size-10" style={{ color: C.dim }} />
                <p className="text-sm font-semibold" style={{ color: C.muted }}>Aucun document trouvé</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════
          TAB : UTILISATEURS
      ══════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex flex-1 items-center gap-2 rounded-[10px] border bg-white px-3 py-2.5"
              style={{ borderColor: C.border, minWidth: 240 }}
            >
              <Search className="size-4 shrink-0" style={{ color: C.dim }} />
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="Nom, numéro ou e-mail…"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{ color: C.ink }}
              />
            </div>
            <span className="text-sm font-semibold" style={{ color: C.muted }}>
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingUsers && (
              <div className="col-span-3 flex items-center justify-center py-14">
                <p className="text-sm font-semibold" style={{ color: C.muted }}>Chargement des utilisateurs…</p>
              </div>
            )}
            {!loadingUsers && filteredUsers.map((u) => (
              <div
                key={u.id}
                className="group rounded-2xl border bg-white p-5 transition-all"
                style={{ borderColor: C.border }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.blue
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${C.bluePale}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                {/* Header */}
                <div className="mb-4 flex items-start gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: u.role === "admin" ? C.rose : u.role === "expert" ? C.amber : C.blue }}
                  >
                    {(u.username ?? u.numero).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold" style={{ color: C.ink }}>
                      {u.username ?? `Utilisateur #${u.id}`}
                    </p>
                    <p className="truncate text-xs" style={{ color: C.muted }}>Matricule : {u.numero}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: u.role === "admin" ? C.rosePale : u.role === "expert" ? C.amberPale : C.tealPale,
                      color: u.role === "admin" ? C.rose : u.role === "expert" ? C.amber : C.teal,
                    }}
                  >
                    {u.role}
                  </span>
                </div>

                {/* Infos */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <div
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                    style={{ background: C.bluePale, color: C.blue }}
                  >
                    <Shield className="size-3" /> {u.numero}
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
                    style={{ background: C.amberPale, color: C.amber }}
                  >
                    <UserCircle className="size-3" /> ID {u.id}
                  </div>
                </div>

                <p className="mb-4 text-[11px]" style={{ color: C.dim }}>Rôle : {u.role}</p>

                {/* Actions */}
                <div className="flex gap-2 border-t pt-4" style={{ borderColor: C.border }}>
                  <button
                    onClick={() => setShowResetModal(u.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border py-2 text-xs font-bold transition-all"
                    style={{ borderColor: C.border, color: C.amber }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#F5C97A"
                      e.currentTarget.style.background = C.amberPale
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <Key className="size-3.5" /> Réinitialiser MDP
                  </button>
                  <button
                    className="flex size-8 items-center justify-center rounded-[9px] border transition-all"
                    style={{ borderColor: C.border, color: C.mid }}
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <Users className="size-10" style={{ color: C.dim }} />
              <p className="text-sm font-semibold" style={{ color: C.muted }}>Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════
          MODALES
      ══════════════════════ */}

      {showUploadModal && (
        <Modal title="Insérer un nouveau document" onClose={() => setShowUploadModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold" style={{ color: C.ink }}>
                Titre du document *
              </label>
              <input
                className="w-full rounded-[10px] border px-4 py-2.5 text-sm outline-none transition-all"
                style={{ borderColor: C.border, color: C.ink }}
                placeholder="ex. Circulaire n°048 – Importations alimentaires"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                onFocus={(e) => (e.target.style.borderColor = C.blue)}
                onBlur={(e) => (e.target.style.borderColor = C.border)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold" style={{ color: C.ink }}>
                Type de document
              </label>
              <select
                className="w-full rounded-[10px] border px-4 py-2.5 text-sm outline-none"
                style={{ borderColor: C.border, color: C.ink }}
                value={uploadForm.type}
                onChange={(e) => setUploadForm((f) => ({ ...f, type: e.target.value }))}
              >
                {["Loi", "Décret", "Arrêté", "Circulaire", "Note"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold" style={{ color: C.ink }}>
                Fichier PDF
              </label>
              <div
                className="flex flex-col items-center gap-2 rounded-[10px] border-2 border-dashed px-6 py-8 text-center"
                style={{ borderColor: C.border }}
              >
                <Upload className="size-8" style={{ color: C.dim }} />
                <p className="text-sm font-semibold" style={{ color: C.muted }}>
                  Glisser-déposer ou{" "}
                  <span style={{ color: C.blue }}>choisir un fichier</span>
                </p>
                <p className="text-xs" style={{ color: C.dim }}>PDF, max 20 MB</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 rounded-[10px] border py-2.5 text-sm font-semibold"
                style={{ borderColor: C.border, color: C.mid }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.title.trim()}
                className="flex-1 rounded-[10px] py-2.5 text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: C.blue }}
              >
                Insérer le document
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteModal !== null && (
        <Modal title="Supprimer ce document ?" onClose={() => setShowDeleteModal(null)}>
          <div className="space-y-5">
            <div
              className="flex items-start gap-3 rounded-[12px] border px-4 py-3"
              style={{ borderColor: "#FECDD3", background: "#FFF1F2" }}
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" style={{ color: C.rose }} />
              <p className="text-sm leading-6" style={{ color: C.ink }}>
                Cette action est <strong>irréversible</strong>. Le document sera définitivement
                retiré de la base de données TEXDOU.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 rounded-[10px] border py-2.5 text-sm font-semibold"
                style={{ borderColor: C.border, color: C.mid }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="flex-1 rounded-[10px] py-2.5 text-sm font-bold text-white"
                style={{ background: C.rose }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showResetModal !== null && (() => {
        const u = users.find((x) => x.id === showResetModal)
        return (
          <Modal title="Réinitialiser le mot de passe" onClose={() => setShowResetModal(null)}>
            <div className="space-y-5">
              <p className="text-sm leading-6" style={{ color: C.mid }}>
                Réinitialisation du mot de passe pour{" "}
                <strong style={{ color: C.ink }}>{u?.username ?? `Utilisateur #${u?.id}`}</strong>{" "}
                (matricule : {u?.numero}).
              </p>
              <div
                className="flex items-center gap-3 rounded-[12px] border px-4 py-3"
                style={{ borderColor: "#FEF3C7", background: "#FFFBEB" }}
              >
                <Key className="size-4 shrink-0" style={{ color: C.amber }} />
                <p className="text-xs font-semibold" style={{ color: C.amber }}>
                  L'utilisateur devra choisir un nouveau mot de passe à sa prochaine connexion.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(null)}
                  className="flex-1 rounded-[10px] border py-2.5 text-sm font-semibold"
                  style={{ borderColor: C.border, color: C.mid }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleResetPassword(showResetModal)}
                  className="flex-1 rounded-[10px] py-2.5 text-sm font-bold text-white"
                  style={{ background: C.amber }}
                >
                  Envoyer le lien
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}