import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Book, Check, Loader2, Search, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fetchTextes, fetchTextesDocuments, fetchAllRagStatus } from "@/api/api"
import { useKnowledgeBaseStore } from "./store/useKnowledgeBaseStore"
import type { TexteType } from "@/types"

// ── KnowledgeSheet ────────────────────────────────────────────────────────────
// Sheet ouvert depuis le bouton "Connaissance" du SiteHeader, visible
// uniquement sur la page Chatbot. Deux onglets :
//  - "Base"   : textes actuellement dans useKnowledgeBaseStore. Sélection
//               multiple au clic, puis bouton "Retirer".
//  - "Textes" : uniquement les textes ayant au moins un document déjà
//               indexé dans ChromaDB (via fetchTextesDocuments +
//               fetchAllRagStatus). Un texte sans document indexé n'a rien
//               à apporter au RAG, il n'apparaît donc pas ici. Sélection
//               multiple au clic, puis bouton "Ajouter à la base".
// La sélection (baseIds) est ensuite envoyée avec chaque message pour
// filtrer la recherche RAG côté backend (cf. useKnowledgeBaseStore,
// chatbot.tsx, message_route.py).

interface KnowledgeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Tab = "base" | "textes"

export function KnowledgeSheet({ open, onOpenChange }: KnowledgeSheetProps) {
  const [tab, setTab] = useState<Tab>("base")
  const [search, setSearch] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { baseIds, addToBase, removeFromBase } = useKnowledgeBaseStore()

  const { data: textes = [], isLoading: isLoadingTextes } = useQuery<
    TexteType[]
  >({
    queryKey: ["textes"],
    queryFn: fetchTextes,
  })

  // Associations texte <-> document, et statut d'indexation RAG (Chroma) de
  // chaque document. Sert à ne proposer, dans l'onglet "Textes", que les
  // textes ayant au moins un document déjà indexé — un texte sans document
  // indexé n'apporterait aucun contexte au chatbot une fois ajouté à la base
  // (cf. rag_retriever.py : le filtre Chroma se fait sur les "source" des
  // documents réellement indexés).
  const { data: textesDocuments = [], isLoading: isLoadingAssociations } =
    useQuery({
      queryKey: ["textes-documents"],
      queryFn: fetchTextesDocuments,
    })
  const { data: ragStatus = [], isLoading: isLoadingRagStatus } = useQuery({
    queryKey: ["documents", "rag-status"],
    queryFn: fetchAllRagStatus,
  })

  const isLoading =
    isLoadingTextes || isLoadingAssociations || isLoadingRagStatus

  // Ids de textes ayant au moins un document indexé dans Chroma.
  const ragEligibleTexteIds = useMemo(() => {
    const indexedDocumentIds = new Set(
      ragStatus.filter((s) => s.inclus).map((s) => s.document_id)
    )
    const eligible = new Set<number>()
    for (const assoc of textesDocuments) {
      if (indexedDocumentIds.has(assoc.document_id)) {
        eligible.add(assoc.texte_id)
      }
    }
    return eligible
  }, [textesDocuments, ragStatus])

  // Textes proposables dans l'onglet "Textes" : uniquement ceux avec au
  // moins un document effectivement indexé.
  const ragEligibleTextes = useMemo(
    () => textes.filter((t) => t.id !== undefined && ragEligibleTexteIds.has(t.id)),
    [textes, ragEligibleTexteIds]
  )

  // La sélection n'a de sens que dans le contexte d'un seul onglet à la fois.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [tab])

  // Repart de zéro à chaque ouverture du Sheet.
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
      setSearch("")
    }
  }, [open])

  const baseTextes = useMemo(
    () => textes.filter((t) => t.id !== undefined && baseIds.has(t.id)),
    [textes, baseIds]
  )

  const filtered = useMemo(() => {
    // Onglet "Base" : ce qui est déjà dans la base de l'utilisateur, même si
    // un texte n'est plus RAG-éligible entretemps (il reste visible pour
    // pouvoir être retiré). Onglet "Textes" : uniquement les textes ayant au
    // moins un document indexé, pour ne proposer que des textes réellement
    // exploitables par le chatbot.
    const list = tab === "base" ? baseTextes : ragEligibleTextes
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((t) => (t.titre ?? "").toLowerCase().includes(q))
  }, [tab, baseTextes, ragEligibleTextes, search])

  const toggleSelect = (id: number | undefined): void => {
    if (id === undefined) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAction = (): void => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (tab === "textes") {
      addToBase(ids)
    } else {
      removeFromBase(ids)
    }
    setSelectedIds(new Set())
  }

  const selectionCount = selectedIds.size

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[88%] flex-col gap-0 p-0 sm:w-[420px]"
      >
        <SheetHeader className="border-b border-slate-200 px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-700">
              <Book size={14} className="text-white" />
            </div>
            Base de connaissance
          </SheetTitle>
        </SheetHeader>

        {/* Tabs : Base / Textes */}
        <div className="flex border-b border-slate-200 px-2">
          <button
            type="button"
            onClick={() => setTab("base")}
            className={`relative px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
              tab === "base"
                ? "text-cyan-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Base ({baseTextes.length})
            {tab === "base" && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-cyan-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("textes")}
            className={`relative px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors ${
              tab === "textes"
                ? "text-cyan-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Textes
            {tab === "textes" && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-cyan-700" />
            )}
          </button>
        </div>

        {/* Recherche */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un texte…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Barre d'action : visible dès qu'au moins un texte est sélectionné */}
        {selectionCount > 0 && (
          <div className="mx-3 mt-2 flex items-center justify-between rounded-lg bg-cyan-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-cyan-800">
                {selectionCount} sélectionné{selectionCount > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Annuler la sélection"
              >
                <X size={13} />
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleAction}
              className={`h-7 gap-1.5 text-xs ${
                tab === "textes"
                  ? "bg-cyan-700 text-white hover:bg-cyan-800"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {tab === "textes" ? "Ajouter à la base" : "Retirer"}
            </Button>
          </div>
        )}

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Chargement…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="mt-8 px-4 text-center text-xs text-slate-400">
              {tab === "base"
                ? "Aucun texte dans la base."
                : search.trim()
                  ? "Aucun texte trouvé."
                  : "Aucun texte indexé n'est disponible pour le moment."}
            </p>
          )}

          {!isLoading &&
            filtered.map((t) => {
              const isSelected = t.id !== undefined && selectedIds.has(t.id)
              const isInBase = t.id !== undefined && baseIds.has(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSelect(t.id)}
                  className={`group mb-0.5 flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-cyan-50 ring-1 ring-inset ring-cyan-300"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {t.titre ?? "Sans titre"}
                    </p>
                    {t.numero && (
                      <p className="truncate text-[10px] text-slate-400">
                        {t.numero}
                      </p>
                    )}
                  </div>
                  {isSelected ? (
                    <Check size={14} className="mt-0.5 shrink-0 text-cyan-700" />
                  ) : (
                    tab === "textes" &&
                    isInBase && (
                      <span className="mt-0.5 shrink-0 rounded-full bg-cyan-100 px-1.5 py-0.5 text-[9px] font-medium text-cyan-700">
                        Dans la base
                      </span>
                    )
                  )}
                </button>
              )
            })}
        </div>
      </SheetContent>
    </Sheet>
  )
}