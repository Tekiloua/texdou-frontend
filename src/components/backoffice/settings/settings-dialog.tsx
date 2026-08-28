import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  GearIcon,
  UserCircleIcon,
  PaletteIcon,
  FilesIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  fetchDocuments,
  fetchOrphanDocuments,
  deleteOrphanDocument,
  fetchAllRagStatus,
  includeDocumentInRag,
  type DocumentType,
} from "@/api/api"
import { Button } from "@/components/ui/button"

// ─── Sections affichées dans la sidebar du dialog ───────────────────────────
// Volontairement réduit par rapport aux paramètres de Claude.ai : seules les
// sections pertinentes pour ce projet sont gardées (pas de Facturation,
// Connecteurs, Claude Code, etc.).
// Note : la section RAG dédiée a été retirée — l'inclusion dans le RAG se
// fait désormais directement depuis la section Documents (colonne RAG).
type SettingsSectionId = "general" | "compte" | "apparence" | "documents"

const SETTINGS_SECTIONS: {
  id: SettingsSectionId
  label: string
  icon: React.ReactNode
}[] = [
  { id: "general", label: "Général", icon: <GearIcon className="size-4" /> },
  { id: "compte", label: "Compte", icon: <UserCircleIcon className="size-4" /> },
  { id: "apparence", label: "Apparence", icon: <PaletteIcon className="size-4" /> },
  { id: "documents", label: "Documents", icon: <FilesIcon className="size-4" /> },
]

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] =
    React.useState<SettingsSectionId>("general")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Dialog volontairement forcé en thème sombre (comme Claude.ai),
          indépendamment du thème clair/sombre choisi ailleurs dans l'app. */}
      <DialogContent
        showCloseButton={false}
        className="flex h-[600px] w-full max-w-6xl overflow-hidden rounded-2xl border border-sidebar-border bg-card p-0 text-card-foreground sm:max-w-6xl"
      >
        <DialogTitle className="sr-only">Paramètres</DialogTitle>

        {/* ── Sidebar gauche ── */}
        <div className="flex w-56 shrink-0 flex-col gap-1 border-r border-card-foreground/80 bg-sidebar p-3">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-sidebar-foreground">
            Paramètres
          </p>
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors border border-transparent",
                activeSection === section.id
                  ? "bg-sidebar-primary border border-card-foreground text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:border-sidebar-border"
              )}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>

        {/* ── Contenu ── */}
        <div className="relative flex-1 overflow-y-auto p-6 bg-background">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-md p-1 text-red-800 hover:text-red-500 hover:scale-105"
          >
            <XIcon className="size-4" />
          </button>

          {activeSection === "general" && <GeneralSection />}
          {activeSection === "compte" && <CompteSection />}
          {activeSection === "apparence" && <ApparenceSection />}
          {activeSection === "documents" && <DocumentsSection />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sections ────────────────────────────────────────────────────────────────
// Contenu volontairement minimal / à brancher sur les vraies données du
// projet (utilisateur connecté, préférences, etc.).

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-base font-semibold text-foreground">{children}</h2>
}

function GeneralSection() {
  return (
    <div>
      <SectionTitle>Général</SectionTitle>
      <p className="text-sm text-zinc-400">
        Paramètres généraux de l'application.
      </p>
    </div>
  )
}

function CompteSection() {
  return (
    <div>
      <SectionTitle>Compte</SectionTitle>
      <p className="text-sm text-zinc-400">
        Informations liées à votre compte utilisateur.
      </p>
    </div>
  )
}

function ApparenceSection() {
  return (
    <div>
      <SectionTitle>Apparence</SectionTitle>
      <p className="text-sm text-zinc-400">
        Choisissez le thème d'affichage de l'application.
      </p>
    </div>
  )
}

// ─── Documents ───────────────────────────────────────────────────────────────
// Liste tous les documents (table `documents`), avec recherche par nom, tri
// (date / taille) et filtre par statut (orphelin ou lié à un texte). Un
// document est "orphelin" quand aucune ligne `textes_documents` ne pointe
// vers lui (donné par GET /documents/orphelins) — dans ce cas, il peut être
// supprimé directement depuis cette liste.

type DocumentSortOption = "recent" | "ancien" | "taille_desc" | "taille_asc"
type DocumentStatusFilter = "tous" | "orphelins" | "lies"

function formatTaille(octets: number | null): string {
  if (octets == null) return "—"
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function DocumentsSection() {
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState<DocumentSortOption>("recent")
  const [statusFilter, setStatusFilter] =
    React.useState<DocumentStatusFilter>("tous")

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  })

  const { data: orphanDocuments = [] } = useQuery({
    queryKey: ["documents-orphelins"],
    queryFn: fetchOrphanDocuments,
  })

  // ── Statut RAG (bulk, un seul appel pour tous les documents) ──
  const { data: ragStatus = [] } = useQuery({
    queryKey: ["documents-rag-status"],
    queryFn: fetchAllRagStatus,
  })

  const ragIncludedIds = React.useMemo(
    () =>
      new Set(ragStatus.filter((entry) => entry.inclus).map((entry) => entry.document_id)),
    [ragStatus]
  )

  const orphanIds = React.useMemo(
    () => new Set(orphanDocuments.map((doc) => doc.id)),
    [orphanDocuments]
  )

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOrphanDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] })
      queryClient.invalidateQueries({ queryKey: ["documents-orphelins"] })
      setDocumentASupprimer(null)
    },
  })

  // ── Inclusion d'un document dans le RAG (POST /documents/{id}/rag-include) ──
  const [documentEnCoursInclusion, setDocumentEnCoursInclusion] =
    React.useState<number | null>(null)

  const includeRagMutation = useMutation({
    mutationFn: (id: number) => includeDocumentInRag(id),
    onMutate: (id) => setDocumentEnCoursInclusion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-rag-status"] })
    },
    onSettled: () => setDocumentEnCoursInclusion(null),
  })

  // Document en attente de confirmation de suppression (null = aucun
  // AlertDialog ouvert). On garde le document entier pour afficher son nom
  // dans le message de confirmation.
  const [documentASupprimer, setDocumentASupprimer] =
    React.useState<DocumentType | null>(null)

  const documentsAffiches = React.useMemo(() => {
    let result = documents.filter((doc) =>
      (doc.nom ?? "").toLowerCase().includes(search.toLowerCase())
    )

    if (statusFilter === "orphelins") {
      result = result.filter((doc) => orphanIds.has(doc.id))
    } else if (statusFilter === "lies") {
      result = result.filter((doc) => !orphanIds.has(doc.id))
    }

    const parseDate = (value: string | null) =>
      value ? new Date(value).getTime() : 0

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return parseDate(b.date_upload) - parseDate(a.date_upload)
        case "ancien":
          return parseDate(a.date_upload) - parseDate(b.date_upload)
        case "taille_desc":
          return (b.taille_octets ?? 0) - (a.taille_octets ?? 0)
        case "taille_asc":
          return (a.taille_octets ?? 0) - (b.taille_octets ?? 0)
        default:
          return 0
      }
    })

    return result
  }, [documents, search, sortBy, statusFilter, orphanIds])

  return (
    <div>
      <SectionTitle>Documents</SectionTitle>

      {/* ── Barre de recherche + filtres ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom…"
            className="w-full rounded-lg border border-card-foreground bg-card py-1.5 pl-8 pr-3 text-sm text-card-foreground placeholder:text-card-foreground/60 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as DocumentSortOption)}
          className="rounded-lg border border-card-foreground bg-card px-2 py-1.5 text-sm text-card-foreground/80 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="recent">Plus récent</option>
          <option value="ancien">Plus ancien</option>
          <option value="taille_desc">Taille (plus grand)</option>
          <option value="taille_asc">Taille (plus petit)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as DocumentStatusFilter)
          }
          className="rounded-lg border border-zinc-700 bg-card px-2 py-1.5 text-sm text-card-foreground/80 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="tous">Tous</option>
          <option value="orphelins">Orphelins</option>
          <option value="lies">Liés à un texte</option>
        </select>
      </div>

      {/* ── Liste ── */}
      {isLoading ? (
        <p className="text-sm text-zinc-500">Chargement des documents…</p>
      ) : documentsAffiches.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun document ne correspond.</p>
      ) : (
        <div className="max-h-120 overflow-y-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-primary text-xs text-primary-foreground">
              <tr className="border-b border-card-foreground/80">
                <th className="px-3 py-2 font-medium">Nom</th>
                <th className="px-3 py-2 font-medium">Taille</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">RAG</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {documentsAffiches.map((doc: DocumentType) => {
                const estOrphelin = orphanIds.has(doc.id)
                return (
                  <tr
                    key={doc.id}
                    className="border-b border-card-foreground/60 last:border-0"
                  >
                    <td className="max-w-[220px] truncate px-3 py-2 text-foreground">
                      {doc.nom ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground/70">
                      {formatTaille(doc.taille_octets)}
                    </td>
                    <td className="px-3 py-2 text-foreground/70">
                      {formatDate(doc.date_upload)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          estOrphelin
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        )}
                      >
                        {estOrphelin ? "Orphelin" : "Lié"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {ragIncludedIds.has(doc.id) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                          <CheckCircleIcon className="size-3.5" />
                          Inclus
                        </span>
                      ) : estOrphelin ? (
                        <span
                          title="Un document orphelin ne peut pas être inclus dans le RAG"
                          className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400"
                        >
                          <WarningCircleIcon className="size-3.5" />
                          Impossible
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => includeRagMutation.mutate(doc.id)}
                          disabled={documentEnCoursInclusion === doc.id}
                          className="h-7 px-2 text-xs"
                        >
                          {documentEnCoursInclusion === doc.id
                            ? "Inclusion…"
                            : "Inclure dans RAG"}
                        </Button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {estOrphelin && (
                        <button
                          type="button"
                          onClick={() => setDocumentASupprimer(doc)}
                          disabled={deleteMutation.isPending}
                          className="rounded-md p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          title="Supprimer ce document orphelin"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirmation de suppression ── */}
      <AlertDialog
        open={documentASupprimer !== null}
        onOpenChange={(open) => {
          if (!open) setDocumentASupprimer(null)
        }}
      >
        <AlertDialogContent className="border border-b-4 border-slate-600 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {documentASupprimer && (
                <>
                  Le fichier «&nbsp;{documentASupprimer.nom}&nbsp;» sera
                  définitivement supprimé du serveur. Cette action est
                  irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-12">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100"
            >
              Annuler
            </AlertDialogCancel>
            <Button
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (documentASupprimer) {
                  deleteMutation.mutate(documentASupprimer.id)
                }
              }}
              className="border border-b-4 b border-red-400 bg-red-200 rounded-xl text-red-900 hover:bg-red-300"
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}