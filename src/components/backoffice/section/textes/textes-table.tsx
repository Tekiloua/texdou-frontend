import * as React from "react"
import { Sparkles, Pencil, Filter, InfoIcon, FileText } from "lucide-react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { decodeTitle } from "@/hooks/decode-html"
import type { TexteRow } from "./textes-section"
import {
  fetchQualitesDocument,
  type DocumentType,
  type QualiteDocumentType,
} from "@/api/api"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { useAuthStore } from "@/store/useAuthStore"

const STATUT_STYLES: Record<string, string> = {
  "En vigueur": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Abrogé: "bg-slate-100 text-slate-500 border-slate-50/60",
  Suspendu: "bg-amber-50 text-amber-700 border-amber-200",
}

const DOT_STYLES: Record<string, string> = {
  "En vigueur": "bg-emerald-500",
  Abrogé: "bg-slate-400",
  Suspendu: "bg-amber-500",
}

const STATUT_STYLES_DEFAULT = "bg-slate-100 text-slate-500 border-slate-50/60"
const DOT_STYLES_DEFAULT = "bg-slate-400"

export const TextesTable = React.memo(function TextesTable({
  items,
  selected,
  onToggleOne,
  onToggleAll,
  onAskTogglePublish,
  onAskToggleRag,
  onResetFilters,
  documentsByTexte,
  isApplyingFilters,
}: {
  items: TexteRow[]
  selected: Set<string>
  onToggleOne: (id: string) => void
  onToggleAll: () => void
  onAskTogglePublish: (id: string, titre: string, current: number) => void
  onAskToggleRag: (id: string, titre: string, current: number) => void
  onResetFilters: () => void
  documentsByTexte: Map<string, DocumentType[]>
  isApplyingFilters?: boolean
}) {
  const ids = items.map((t) => t.id)
  const allChecked = ids.length > 0 && ids.every((id) => selected.has(id))
  const { user } = useAuthStore()
  return (
    <>
      {/* Table — scroll vertical sur le tableau uniquement, en-tête fixe.
          [&_[data-slot=table-container]]:overflow-visible neutralise le
          wrapper overflow-x-auto interne du composant Table (shadcn) : sans
          ça, ce wrapper devient lui-même un conteneur de scroll au sens CSS,
          et le `sticky` de TableHeader s'accroche à LUI (qui ne scrolle
          jamais, faute de hauteur limitée) plutôt qu'au div ci-dessous qui,
          lui, scrolle réellement — d'où le header qui ne restait pas fixe. */}
      <div
        className={`mx-auto max-w-7xl rounded-xl border border-foreground/20 bg-card px-4 py-6`}
      >
        <div className="[&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-slate-50/20">
                {user?.role != "normal" && (
                  <TableHead className="w-7 pl-6">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={onToggleAll}
                      aria-label="Tout sélectionner"
                      className="border border-slate-800"
                    />
                  </TableHead>
                )}
                <TableHead></TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Titre
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Catégorie
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Statut
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Thème
                </TableHead>
                <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Mise en vigueur
                </TableHead>
                {user?.role != "normal" && (
                  <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Qualité Doc.
                  </TableHead>
                )}
                {user?.role != "normal" && (
                  <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Public
                  </TableHead>
                )}
                {user?.role != "normal" && (
                  <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    RAG
                  </TableHead>
                )}
                {user?.role != "normal" && (
                  <TableHead className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Action
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isApplyingFilters
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow
                      key={`skeleton-${i}`}
                      className="border-slate-100"
                    >
                      <TableCell className="pl-6">
                        <Skeleton className="size-4 rounded" />
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="size-4 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="size-4 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="size-6 rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                : items.map((t) => {
                    const checked = selected.has(t.id)
                    return (
                      <React.Fragment key={t.id}>
                        <TableRow
                          className={cn(
                            "border-slate-100 transition-colors hover:bg-teal-50/40",
                            checked && "bg-teal-50/60 hover:bg-teal-50/60"
                          )}
                        >
                          {user?.role != "normal" && (
                            <TableCell className="pl-6 align-top">
                              <Checkbox
                                className="border border-slate-800"
                                checked={checked}
                                onCheckedChange={() => onToggleOne(t.id)}
                                aria-label={`Sélectionner ${t.titre}`}
                              />
                            </TableCell>
                          )}
                          <TableCell></TableCell>

                          <Tooltip>
                            <TooltipTrigger className="cursor-pointer">
                              <TableCell className="align-top">
                                <Link to={`/douane/texdou/${t.id}`}>
                                  <button className="text-left text-sm leading-snug font-medium text-teal-700 underline-offset-2 hover:text-teal-800 hover:underline">
                                    {user?.role != "normal"
                                      ? t.titre.length > 30
                                        ? `${decodeTitle(t.titre).slice(0, 30)}…`
                                        : decodeTitle(t.titre)
                                      : t.titre.length > 60
                                        ? `${decodeTitle(t.titre).slice(0, 60)}…`
                                        : decodeTitle(t.titre)}
                                  </button>
                                </Link>
                              </TableCell>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{decodeTitle(t.titre)}</p>
                            </TooltipContent>
                          </Tooltip>

                          <TableCell className="align-top text-sm text-slate-600">
                            {t.categorie}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                STATUT_STYLES[t.statut] ?? STATUT_STYLES_DEFAULT
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  DOT_STYLES[t.statut] ?? DOT_STYLES_DEFAULT
                                )}
                              />
                              {t.statut}
                            </Badge>
                          </TableCell>
                          <Tooltip>
                            <TooltipTrigger className="cursor-pointer">
                              <TableCell className="align-top text-sm text-slate-600">
                                {t.themes.length > 0
                                  ? t.themes.join(", ").slice(0, 30) + "…"
                                  : "—"}
                              </TableCell>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {t.themes.length > 0
                                  ? t.themes.join(", ")
                                  : "Aucun"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <TableCell className="align-top text-sm text-slate-600">
                            {t.dateMiseEnVigueur || "—"}
                          </TableCell>
                          {user?.role != "normal" && (
                            <TableCell>
                              Bonne{" "}
                              <InfoIcon className="ml-1 inline h-3 w-3 text-slate-400" />
                            </TableCell>
                          )}
                          {user?.role != "normal" && (
                            <TableCell>
                              <Checkbox
                                className="border border-slate-800"
                                checked={t.publish === 1}
                                onCheckedChange={() =>
                                  onAskTogglePublish(t.id, t.titre, t.publish)
                                }
                              />
                            </TableCell>
                          )}
                          {user?.role != "normal" && (
                            <TableCell>
                              {t.hasDocuments ? (
                                <Checkbox
                                  className="border border-slate-800"
                                  checked={t.rag === 1}
                                  onCheckedChange={() =>
                                    onAskToggleRag(t.id, t.titre, t.rag)
                                  }
                                  aria-label={`Inclure ${t.titre} dans le RAG`}
                                />
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  NonDispo
                                </span>
                              )}
                            </TableCell>
                          )}

                          {user?.role != "normal" && (
                            <TableCell className="align-top">
                              <Link
                                to={`/douane/backoffice/edit-texte/${t.id}`}
                                className="inline-flex h-8 w-12 items-center justify-center rounded-md border border-b-4 border-border text-foreground/90 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
                                title="Modifier ce texte"
                                aria-label={`Modifier ${t.titre}`}
                              >
                                Modifier
                              </Link>
                            </TableCell>
                          )}
                        </TableRow>
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableCell colSpan={11} className="p-0">
                            <TexteDocumentsAccordion
                              documents={documentsByTexte.get(t.id) ?? []}
                            />
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    )
                  })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Aucun texte ne correspond à ces filtres
          </p>
          <p className="max-w-sm text-sm text-slate-500">
            Essayez d'ajuster votre recherche ou vos filtres, ou
            réinitialisez-les pour revoir tous les textes.
          </p>
          <Button
            variant="outline"
            className="mt-1 gap-2 border-slate-50/60"
            onClick={onResetFilters}
          >
            <Filter className="h-4 w-4" />
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </>
  )
})

// ─── Documents liés à un texte ───────────────────────────────────────────────
// Accordéon ouvert par défaut, listant simplement les documents liés à ce
// texte (reçus en props, déjà chargés en bulk par TextesSection). Chaque
// document est lui-même un accordéon imbriqué : à l'ouverture, on charge
// (et affiche en tableau) les métriques de qualité de chacune de ses pages.

// ─── Documents liés à un texte ───────────────────────────────────────────────
// Accordéon ouvert par défaut, listant simplement les documents liés à ce
// texte (reçus en props, déjà chargés en bulk par TextesSection). Chaque
// document est cliquable et ouvre un Dialog affichant le détail qualité de
// ses pages (chargé à l'ouverture du dialog).

function TexteDocumentsAccordion({ documents }: { documents: DocumentType[] }) {
  const [openDocument, setOpenDocument] = React.useState<DocumentType | null>(
    null
  )

  if (documents.length === 0) return null

  return (
    <>
      <Accordion
        type="single"
        collapsible
        // defaultValue="documents"
        className="px-6 pb-3"
      >
        <AccordionItem value="documents" className="border-none">
          <AccordionTrigger className="py-1 text-xs font-medium text-slate-500 uppercase hover:no-underline">
            Documents liés ({documents.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-1.5 pt-1">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setOpenDocument(doc)}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-1.5 text-left transition-colors hover:border-teal-200 hover:bg-teal-50/60"
                >
                  <FileText className="size-3.5 shrink-0 text-slate-400" />
                  <span className="truncate text-sm text-slate-700">
                    {doc.nom?.substring(0, 50) ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog
        open={openDocument !== null}
        onOpenChange={(open) => !open && setOpenDocument(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4 shrink-0 text-slate-400" />
              <span className="truncate">{openDocument?.nom ?? "—"}</span>
            </DialogTitle>
            <DialogDescription>Métriques de qualité par page</DialogDescription>
          </DialogHeader>

          {openDocument && (
            <DocumentQualiteTable documentId={openDocument.id} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Qualité d'un document (par page) ────────────────────────────────────────
// Chargée uniquement à l'ouverture de l'accordéon du document (montage du
// composant → déclenchement du useQuery). Résultat mis en cache par React
// Query, donc pas de refetch si on referme/rouvre l'accordéon.

function DocumentQualiteTable({ documentId }: { documentId: number }) {
  const { data, isLoading, error } = useQuery<QualiteDocumentType[]>({
    queryKey: ["qualites-documents", documentId],
    queryFn: () => fetchQualitesDocument(documentId),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5 pb-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <p className="pb-2 text-xs text-slate-400 italic">
        Aucune donnée de qualité pour ce document.
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 pb-3">
      {data.map((q) => (
        <div
          key={q.id}
          className="w-full rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Page {q.page}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                q.score >= 70
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : q.score >= 40
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
              )}
            >
              Score {q.score}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
            <QualiteMetric label="Netteté" value={q.blur.toFixed(2)} />
            <QualiteMetric label="Inclinaison" value={`${q.skew}°`} />
            <QualiteMetric label="Bruit" value={q.noise_score} />
            <QualiteMetric label="Pixels noirs" value={q.black_pixel_ratio} />
            <QualiteMetric label="Entropie" value={q.entropy} />
            <QualiteMetric label="Luminosité" value={`${q.brightness}%`} />
          </div>
        </div>
      ))}
    </div>
  )
}

function QualiteMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label} :
      </span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  )
}