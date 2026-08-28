"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import {
  deleteTextes,
  updateTextePublish,
  updateTexteRag,
  toggleRagInclusion,
  fetchRagInclusionStatus,
  fetchTextes,
  fetchTextesPublics,
} from "@/api/api"
import {
  fetchTextesDocuments,
  fetchDocuments,
  type DocumentType,
} from "@/api/api"
import type { TexteType } from "@/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/store/useAuthStore"
import { TextesHeader } from "./textes-header"
import { TextesFiltre } from "./textes-filtre"
import { TextesTable } from "./textes-table"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DateFilter = "toutes-dates" | "7j" | "30j" | "90j"
export type OngletFilter = "tous" | "brouillon"
export type SortOrder = "chargement" | "recent" | "ancien"
// "toutes" = pas de filtre catégorie ; sinon le nom exact de la catégorie.
export type CategorieFilter = "toutes" | string
// Filtre sur l'inclusion RAG (voir TexteRow.rag, calculé côté frontend à
// partir de l'état réel des chunks Chroma des documents liés).
export type RagFilter = "tous" | "inclus" | "exclus"

export interface TexteRow {
  id: string
  titre: string
  categorie: string
  statut: string
  themes: string[]
  publish: 0 | 1 | number
  rag: 0 | 1 | number
  // True si au moins un document est lié à ce texte. Utilisé par
  // TextesTable pour afficher "NonDispo" à la place de la case à cocher
  // RAG quand aucun document n'est rattaché (donc rien à inclure/exclure).
  hasDocuments: boolean
  dateMiseEnVigueurISO: string | null
  dateMiseEnVigueur: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Nombre de textes affichés initialement, puis ajoutés à chaque clic sur
// "Voir plus".
const PAGE_SIZE = 100

export const TextesSection = () => {
  const { user } = useAuthStore()
  const isAdmin = user?.role === "admin"
  const queryClient = useQueryClient()

  const {
    data: dataTextes,
    isLoading: isLoadingTextes,
    error: errorFetchTextes,
  } = useQuery<TexteType[]>({
    queryKey: user?.role != "normal" ? ["textes"] : ["textes-publics"],
    queryFn: user?.role != "normal" ? fetchTextes : fetchTextesPublics,
  })

  // ── Documents liés à chaque texte, chargés en une fois pour toute la page ──
  const { data: associations = [] } = useQuery({
    queryKey: ["textes-documents"],
    queryFn: fetchTextesDocuments,
  })
  const { data: allDocuments = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  })

  const documentsByTexte = React.useMemo(() => {
    const documentsById = new Map<number, DocumentType>(
      allDocuments.map((d) => [d.id, d])
    )

    const map = new Map<string, DocumentType[]>()
    for (const { texte_id, document_id } of associations) {
      const document = documentsById.get(document_id)
      if (!document) continue
      const key = String(texte_id)
      map.set(key, [...(map.get(key) ?? []), document])
    }
    return map
  }, [associations, allDocuments])

  // ── État d'inclusion RAG réel (côté Chroma), par nom de fichier ─────────
  // Source de vérité pour le précochage de la case "RAG" : on ne se fie pas
  // uniquement à la colonne BDD `textes.rag`, mais à l'état effectif des
  // chunks (metadata "inclus") des documents liés, via GET
  // /rag/inclusion-status (rag_route.py).
  const allDocumentNames = React.useMemo(() => {
    const names = new Set<string>()
    for (const docs of documentsByTexte.values()) {
      for (const d of docs) {
        if (d.nom) names.add(d.nom)
      }
    }
    return Array.from(names)
  }, [documentsByTexte])

  const { data: ragInclusionStatus = {} } = useQuery({
    queryKey: ["rag-inclusion-status", allDocumentNames],
    queryFn: () => fetchRagInclusionStatus(allDocumentNames),
    enabled: allDocumentNames.length > 0,
  })

  const textes: TexteRow[] = React.useMemo(() => {
    return (dataTextes ?? []).map((t) => {
      const id = String(t.id ?? "")
      const docs = documentsByTexte.get(id) ?? []
      const docNames = docs
        .map((d) => d.nom)
        .filter((nom): nom is string => Boolean(nom))
      const hasDocuments = docNames.length > 0
      // Coché seulement si TOUS les documents liés sont actuellement
      // inclus dans le RAG (fetchRagInclusionStatus renvoie true par
      // défaut pour un document sans chunk connu — voir
      // get_inclus_status_for_sources côté back).
      const ragChecked =
        hasDocuments &&
        docNames.every((nom) => ragInclusionStatus[nom] !== false)

      const dateMiseEnVigueurISO = t.date_mise_en_vigueur
        ? new Date(t.date_mise_en_vigueur).toISOString()
        : null

      return {
        id,
        titre: t.titre ?? "(Sans titre)",
        categorie: t.categorie ?? "—",
        statut: t.statut ?? "—",
        themes: t.themes ?? [],
        publish: t.publish ?? 0,
        rag: ragChecked ? 1 : 0,
        hasDocuments,
        // Date brute (ISO), utilisée pour le filtrage/tri
        dateMiseEnVigueurISO,
        dateMiseEnVigueur: t.date_mise_en_vigueur
          ? new Date(t.date_mise_en_vigueur).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "—",
      }
    })
  }, [dataTextes, documentsByTexte, ragInclusionStatus])

  // ── Options du filtre Catégorie : dérivées de l'ensemble des textes
  // (non filtré), triées alphabétiquement, sans doublons ni valeur vide. ──
  const categorieOptions = React.useMemo(() => {
    const set = new Set<string>()
    for (const t of textes) {
      if (t.categorie && t.categorie !== "—") set.add(t.categorie)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))
  }, [textes])

  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  // ── État "brouillon" (lié aux inputs de TextesFiltre) vs état "appliqué"
  // (utilisé par le filtrage réel). Rien ne change tant que l'utilisateur
  // n'a pas cliqué sur "Appliquer" — sauf Réinitialiser, qui remet les deux
  // à zéro immédiatement.
  const DEFAULT_SEARCH = ""
  const DEFAULT_DATE_FILTER: DateFilter = "toutes-dates"
  const DEFAULT_SORT_ORDER: SortOrder = "chargement"
  const DEFAULT_CATEGORIE_FILTER: CategorieFilter = "toutes"
  const DEFAULT_RAG_FILTER: RagFilter = "tous"

  const [draftSearch, setDraftSearch] = React.useState(DEFAULT_SEARCH)
  const [draftDateFilter, setDraftDateFilter] =
    React.useState<DateFilter>(DEFAULT_DATE_FILTER)
  const [draftSortOrder, setDraftSortOrder] =
    React.useState<SortOrder>(DEFAULT_SORT_ORDER)
  const [draftCategorieFilter, setDraftCategorieFilter] =
    React.useState<CategorieFilter>(DEFAULT_CATEGORIE_FILTER)
  const [draftRagFilter, setDraftRagFilter] =
    React.useState<RagFilter>(DEFAULT_RAG_FILTER)

  const [search, setSearch] = React.useState(DEFAULT_SEARCH)
  const [dateFilter, setDateFilter] =
    React.useState<DateFilter>(DEFAULT_DATE_FILTER)
  const [, setOngletFilter] = React.useState<OngletFilter>("tous")
  const [sortOrder, setSortOrder] =
    React.useState<SortOrder>(DEFAULT_SORT_ORDER)
  const [categorieFilter, setCategorieFilter] =
    React.useState<CategorieFilter>(DEFAULT_CATEGORIE_FILTER)
  const [ragFilter, setRagFilter] =
    React.useState<RagFilter>(DEFAULT_RAG_FILTER)

  // ── Pagination ("Voir plus") : combien de lignes filtrées sont affichées.
  // Réinitialisé à PAGE_SIZE dès qu'un filtre est (ré)appliqué, sinon
  // "Voir plus" resterait à une position qui n'a plus de sens sur le
  // nouveau résultat filtré.
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE)

  const [isApplyingFilters, startApplyTransition] = React.useTransition()

  const applyFilters = () => {
    startApplyTransition(() => {
      setSearch(draftSearch)
      setDateFilter(draftDateFilter)
      setSortOrder(draftSortOrder)
      setCategorieFilter(draftCategorieFilter)
      setRagFilter(draftRagFilter)
      setVisibleCount(PAGE_SIZE)
    })
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [publishTarget, setPublishTarget] = React.useState<{
    id: string
    titre: string
    nextValue: 0 | 1
  } | null>(null)

  // ── Bascule RAG (checkbox "RAG" du tableau) ─────────────────────────────
  // nextValue = état voulu après confirmation ; documentNames = noms des
  // documents liés au texte, utilisés pour retrouver leurs chunks dans
  // Chroma (metadata "source") et basculer leur champ "inclus".
  const [ragTarget, setRagTarget] = React.useState<{
    id: string
    titre: string
    nextValue: 0 | 1
    documentNames: string[]
  } | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteTextes(ids),
    onSuccess: () => {
      setSelected(new Set())
      setDeleteDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ["textes"] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: 0 | 1 }) =>
      updateTextePublish(id, publish),
    onSuccess: () => {
      setPublishTarget(null)
      queryClient.invalidateQueries({ queryKey: ["textes"] })
    },
  })

  const askTogglePublish = React.useCallback(
    (id: string, titre: string, current: number) => {
      setPublishTarget({ id, titre, nextValue: current === 1 ? 0 : 1 })
    },
    []
  )

  const confirmTogglePublish = () => {
    if (!publishTarget) return
    publishMutation.mutate({
      id: publishTarget.id,
      publish: publishTarget.nextValue,
    })
  }

  // ── Mutation RAG : met à jour le flag "rag" du texte (BDD) ET bascule
  // l'inclusion des chunks Chroma des documents liés (metadata "inclus").
  const ragMutation = useMutation({
    mutationFn: async ({
      id,
      nextValue,
      documentNames,
    }: {
      id: string
      nextValue: 0 | 1
      documentNames: string[]
    }) => {
      await updateTexteRag(id, nextValue)
      if (documentNames.length > 0) {
        await toggleRagInclusion(documentNames, nextValue)
      }
    },
    onSuccess: () => {
      setRagTarget(null)
      queryClient.invalidateQueries({ queryKey: ["textes"] })
      queryClient.invalidateQueries({ queryKey: ["rag-inclusion-status"] })
    },
  })

  const askToggleRag = React.useCallback(
    (id: string, titre: string, current: number) => {
      const documentNames = (documentsByTexte.get(id) ?? [])
        .map((d) => d.nom)
        .filter((nom): nom is string => Boolean(nom))
      setRagTarget({
        id,
        titre,
        nextValue: current === 1 ? 0 : 1,
        documentNames,
      })
    },
    [documentsByTexte]
  )

  const confirmToggleRag = () => {
    if (!ragTarget) return
    ragMutation.mutate({
      id: ragTarget.id,
      nextValue: ragTarget.nextValue,
      documentNames: ragTarget.documentNames,
    })
  }

  // ---- Filtering ----------------------------------------------------------
  const filtered = React.useMemo(() => {
    const now = new Date()
    const cutoffDays: Record<Exclude<DateFilter, "toutes-dates">, number> = {
      "7j": 7,
      "30j": 30,
      "90j": 90,
    }

    let result = textes.filter((t) => {
      if (
        search.trim() &&
        !t.titre.toLowerCase().includes(search.trim().toLowerCase()) &&
        !t.categorie.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false
      }

      if (dateFilter !== "toutes-dates") {
        if (!t.dateMiseEnVigueurISO) return false
        const d = new Date(t.dateMiseEnVigueurISO)
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays < 0 || diffDays > cutoffDays[dateFilter]) return false
      }

      if (categorieFilter !== "toutes" && t.categorie !== categorieFilter) {
        return false
      }

      if (ragFilter === "inclus" && t.rag !== 1) return false
      if (ragFilter === "exclus" && t.rag !== 0) return false

      return true
    })

    // ---- Sorting (par date de mise en vigueur, seulement si choisi explicitement) ----
    // "chargement" = valeur par défaut : on garde l'ordre d'arrivée des
    // textes (celui du fetch), pour que "Voir plus" ajoute proprement en
    // bas de liste. Trier par date reste possible via le sélecteur, mais
    // réordonne alors volontairement l'ensemble — comportement attendu
    // d'un tri, pas un bug.
    if (sortOrder !== "chargement") {
      result = [...result].sort((a, b) => {
        const timeA = a.dateMiseEnVigueurISO
          ? new Date(a.dateMiseEnVigueurISO).getTime()
          : 0
        const timeB = b.dateMiseEnVigueurISO
          ? new Date(b.dateMiseEnVigueurISO).getTime()
          : 0
        return sortOrder === "recent" ? timeB - timeA : timeA - timeB
      })
    }

    return result
  }, [textes, search, dateFilter, sortOrder, categorieFilter, ragFilter])

  // ── Lignes réellement affichées : les `visibleCount` premières du
  // résultat filtré. Le bouton "Voir plus" augmente ce compteur. ──────────
  const visibleTextes = React.useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  )
  const hasMore = filtered.length > visibleCount

  // ---- Selection ------------------------------------------------------------
  const toggleOne = React.useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // La sélection "tout" ne porte que sur les lignes actuellement visibles
  // (celles chargées via "Voir plus"), pas sur l'ensemble des lignes
  // filtrées qui ne sont pas encore affichées.
  const toggleAll = React.useCallback(() => {
    const ids = visibleTextes.map((t) => t.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }, [visibleTextes, selected])

  const resetFilters = React.useCallback(() => {
    setDraftSearch(DEFAULT_SEARCH)
    setDraftDateFilter(DEFAULT_DATE_FILTER)
    setDraftSortOrder(DEFAULT_SORT_ORDER)
    setDraftCategorieFilter(DEFAULT_CATEGORIE_FILTER)
    setDraftRagFilter(DEFAULT_RAG_FILTER)
    setSearch(DEFAULT_SEARCH)
    setDateFilter(DEFAULT_DATE_FILTER)
    setSortOrder(DEFAULT_SORT_ORDER)
    setCategorieFilter(DEFAULT_CATEGORIE_FILTER)
    setRagFilter(DEFAULT_RAG_FILTER)
    setOngletFilter("tous")
    setVisibleCount(PAGE_SIZE)
  }, [])

  const confirmDelete = () => {
    deleteMutation.mutate(Array.from(selected))
  }

  if (isLoadingTextes)
    return (
      <div className="flex h-[90vh] w-full flex-col items-center justify-center gap-3 bg-slate-50">
        <LoaderCircle className="size-6 animate-spin text-cyan-600" />
        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          Chargement
        </p>
      </div>
    )

  if (errorFetchTextes)
    return (
      <div className="flex h-[90vh] items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Une erreur est survenue.
      </div>
    )

  return (
    <div className="flex h-full w-full flex-col bg-background px-2">
      <TextesHeader isAdmin={isAdmin} />

      <TextesFiltre
        search={draftSearch}
        onSearchChange={setDraftSearch}
        dateFilter={draftDateFilter}
        onDateFilterChange={setDraftDateFilter}
        sortOrder={draftSortOrder}
        onSortOrderChange={setDraftSortOrder}
        categorieFilter={draftCategorieFilter}
        onCategorieFilterChange={setDraftCategorieFilter}
        categorieOptions={categorieOptions}
        ragFilter={draftRagFilter}
        onRagFilterChange={setDraftRagFilter}
        onResetFilters={resetFilters}
        onApply={applyFilters}
        isApplying={isApplyingFilters}
        selectedCount={selected.size}
        onDeleteClick={() => setDeleteDialogOpen(true)}
        totalCount={filtered.length}
      />

      <TextesTable
        items={visibleTextes}
        selected={selected}
        onToggleOne={toggleOne}
        onToggleAll={toggleAll}
        onAskTogglePublish={askTogglePublish}
        onAskToggleRag={askToggleRag}
        onResetFilters={resetFilters}
        documentsByTexte={documentsByTexte}
        isApplyingFilters={isApplyingFilters}
      />

      {/* "Voir plus" : charge PAGE_SIZE lignes supplémentaires du résultat
          filtré, sans tout recharger depuis le serveur (fetchTextes a déjà
          tout ramené en une fois). */}
      {hasMore && (
        <div className="flex justify-center py-6">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-b-4 border-foreground/20 bg-slate-100 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 active:border-b"
          >
            Voir plus ({filtered.length - visibleCount} restant
            {filtered.length - visibleCount > 1 ? "s" : ""})
          </button>
        </div>
      )}

      {/* Confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer les textes sélectionnés ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer {selected.size} texte
              {selected.size > 1 ? "s" : ""}. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-10">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="h-8 border-b-4 border-slate-900 bg-slate-200 hover:bg-slate-300 active:border-none"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 w-[30%] border-b-4 border-red-400 bg-rose-100 text-red-800 hover:bg-rose-200 hover:text-red-800 active:border-none"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation du changement de statut Public */}
      <AlertDialog
        open={publishTarget !== null}
        onOpenChange={(open) => !open && setPublishTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {publishTarget?.nextValue === 1
                ? "Rendre ce texte public ?"
                : "Retirer ce texte du public ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {publishTarget?.nextValue === 1
                ? `"${publishTarget?.titre}" sera visible publiquement.`
                : `"${publishTarget?.titre}" ne sera plus visible publiquement.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-12">
            <AlertDialogCancel
              disabled={publishMutation.isPending}
              className=""
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 w-[30%] border-b-4 border-teal-400 bg-teal-100 text-teal-800 hover:bg-teal-200 hover:text-teal-800 active:border-none"
              onClick={confirmTogglePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? "Mise à jour…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation de bascule RAG */}
      <AlertDialog
        open={ragTarget !== null}
        onOpenChange={(open) => !open && setRagTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ragTarget?.nextValue === 1
                ? "Inclure ce texte dans le RAG ?"
                : "Exclure ce texte du RAG ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ragTarget?.nextValue === 1
                ? `Les chunks des documents liés à "${ragTarget?.titre}" seront de nouveau utilisés par le chatbot pour répondre aux questions.`
                : `Les chunks des documents liés à "${ragTarget?.titre}" seront ignorés par le chatbot lors de la recherche de réponses, sans être supprimés.`}
              {ragTarget && ragTarget.documentNames.length === 0 && (
                <span className="mt-2 block text-amber-600">
                  Aucun document indexé n'est actuellement lié à ce texte.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-12">
            <AlertDialogCancel disabled={ragMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 w-[30%] border-b-4 border-teal-400 bg-teal-100 text-teal-800 hover:bg-teal-200 hover:text-teal-800 active:border-none"
              onClick={confirmToggleRag}
              disabled={ragMutation.isPending}
            >
              {ragMutation.isPending ? "Mise à jour…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}