import { useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type {
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form"
import { AlignLeft, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { fetchCategories, fetchStatuts, fetchThemes } from "@/api/api"

import { SectionCard, AddLinkButton, FieldLabel } from "./helper/ui-helpers"
import { CheckTree } from "./helper/check-tree"
import { buildCheckTree } from "./lib/classification-utils"
import { SuggestionBanner } from "./editor/suggestion-banner"
import { useDocumentAnalysis } from "./editor/useDocumentAnalysis"
import type { RawClassificationItem, TexteFormValues } from "./types/types"
import { useAddTexteStore } from "./store/useAddTexteStore"

interface TitreClassificationSectionProps {
  register: UseFormRegister<TexteFormValues>
  // Nécessaires pour appliquer la suggestion de titre sans écraser une
  // saisie déjà faite par l'utilisateur — voir handleInsertSuggestion.
  setValue: UseFormSetValue<TexteFormValues>
  getValues: UseFormGetValues<TexteFormValues>
  titreError?: boolean
}

// Trouve l'id d'un item de classification dont le nom correspond (insensible
// à la casse et aux espaces superflus) au nom suggéré par le backend. Match
// exact d'abord, puis un match "contient" en dernier recours (les noms
// suggérés par un LLM peuvent différer légèrement en formulation).
function findMatchingId(
  items: RawClassificationItem[] | undefined,
  suggestedName: string | undefined
): string | undefined {
  if (!items || !suggestedName) return undefined
  const target = suggestedName.trim().toLowerCase()
  if (!target) return undefined

  const exact = items.find((it) => it.nom?.trim().toLowerCase() === target)
  if (exact) return String(exact.id)

  const partial = items.find(
    (it) =>
      it.nom?.trim().toLowerCase().includes(target) ||
      target.includes(it.nom?.trim().toLowerCase() ?? "\u0000")
  )
  return partial ? String(partial.id) : undefined
}

// Regroupe : le titre du texte juridique, et les trois arbres de
// classification (catégorie / statut / thème). Les sélections de
// classification sont gérées via le store Zustand (`useAddTexteStore`),
// partagé avec le reste du formulaire (soumission, préremplissage…).
//
// Affiche aussi une bannière de suggestion (titre + catégorie/statut/thème),
// générée en même temps que le résumé/mots-clés depuis les documents
// importés (voir MotsClesResumeSection -> generateAllSuggestions). Le
// matching catégorie/statut/thème se fait ICI, côté frontend, par
// comparaison de noms (voir findMatchingId) — le backend ne renvoie que des
// noms textuels, jamais d'ids internes.
export function TitreClassificationSection({
  register,
  setValue,
  getValues,
  titreError,
}: TitreClassificationSectionProps) {
  const categories = useAddTexteStore((s) => s.categories)
  const statuts = useAddTexteStore((s) => s.statuts)
  const themes = useAddTexteStore((s) => s.themes)
  const toggleClassification = useAddTexteStore((s) => s.toggleClassification)
  const clearClassification = useAddTexteStore((s) => s.clearClassification)
  const setClassification = useAddTexteStore((s) => s.setClassification)
  const hasPrefilled = useAddTexteStore((s) => s.hasPrefilled)
  const setContentDirty = useAddTexteStore((s) => s.setContentDirty)

  const { combined, resolveCombinedTitreMetadata } = useDocumentAnalysis()
  const metadata = combined.metadata

  const {
    data: rawCategories,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = useQuery<RawClassificationItem[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  const {
    data: rawStatuts,
    isLoading: isLoadingStatuts,
    error: errorStatuts,
  } = useQuery<RawClassificationItem[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
  })

  const {
    data: rawThemes,
    isLoading: isLoadingThemes,
    error: errorThemes,
  } = useQuery<RawClassificationItem[]>({
    queryKey: ["themes"],
    queryFn: fetchThemes,
  })

  const categoriesTree = useMemo(
    () => buildCheckTree(rawCategories),
    [rawCategories]
  )
  const statutsTree = useMemo(() => buildCheckTree(rawStatuts), [rawStatuts])
  const themesTree = useMemo(() => buildCheckTree(rawThemes), [rawThemes])

  const selectedCatCount = categories.size
  const selectedStatutCount = statuts.size
  const selectedThemeCount = themes.size

  // ── Résolution de la suggestion en ids réels, une fois les référentiels
  // chargés — tant que rawCategories/rawStatuts/rawThemes ne sont pas
  // disponibles, la bannière n'a rien à proposer pour la classification
  // (mais peut quand même proposer le titre seul).
  const suggestedCategorieId = useMemo(
    () => findMatchingId(rawCategories, metadata?.categorie_nom),
    [rawCategories, metadata?.categorie_nom]
  )
  const suggestedStatutId = useMemo(
    () => findMatchingId(rawStatuts, metadata?.statut_nom),
    [rawStatuts, metadata?.statut_nom]
  )
  const suggestedThemeIds = useMemo(() => {
    if (!rawThemes || !metadata?.theme_noms?.length) return []
    return metadata.theme_noms
      .map((nom) => findMatchingId(rawThemes, nom))
      .filter((id): id is string => Boolean(id))
  }, [rawThemes, metadata?.theme_noms])

  const hasClassificationSuggestion =
    Boolean(suggestedCategorieId) ||
    Boolean(suggestedStatutId) ||
    suggestedThemeIds.length > 0
  const hasTitreSuggestion = Boolean(metadata?.titre?.trim())
  const hasAnySuggestion = hasClassificationSuggestion || hasTitreSuggestion

  const suggestionPreview = [
    metadata?.titre && `Titre : ${metadata.titre}`,
    suggestedCategorieId && metadata?.categorie_nom && `Catégorie : ${metadata.categorie_nom}`,
    suggestedStatutId && metadata?.statut_nom && `Statut : ${metadata.statut_nom}`,
    suggestedThemeIds.length > 0 &&
      metadata?.theme_noms &&
      `Thèmes : ${metadata.theme_noms.join(", ")}`,
  ]
    .filter(Boolean)
    .join(" · ")

  const handleToggle = (
    key: "categories" | "statuts" | "themes",
    id: string
  ) => {
    toggleClassification(key, id)
    if (hasPrefilled) setContentDirty(true)
  }

  // N'écrase pas un titre déjà saisi ; AJOUTE (n'écrase jamais) les
  // catégories/thèmes déjà sélectionnés, remplace le statut suggéré
  // uniquement si aucun n'est déjà choisi (choix unique, voir
  // toggleClassification côté store).
  const handleInsertSuggestion = useCallback(() => {
    const currentTitre = (getValues("titre") ?? "").trim()
    if (!currentTitre && metadata?.titre) {
      setValue("titre", metadata.titre, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }

    if (suggestedCategorieId) {
      setClassification(
        "categories",
        new Set([...categories, suggestedCategorieId])
      )
    }
    if (suggestedStatutId && statuts.size === 0) {
      setClassification("statuts", new Set([suggestedStatutId]))
    }
    if (suggestedThemeIds.length > 0) {
      setClassification("themes", new Set([...themes, ...suggestedThemeIds]))
    }

    if (hasPrefilled) setContentDirty(true)
    resolveCombinedTitreMetadata()
  }, [
    getValues,
    setValue,
    metadata,
    suggestedCategorieId,
    suggestedStatutId,
    suggestedThemeIds,
    categories,
    statuts,
    themes,
    setClassification,
    hasPrefilled,
    setContentDirty,
    resolveCombinedTitreMetadata,
  ])

  const handleIgnoreSuggestion = useCallback(() => {
    resolveCombinedTitreMetadata()
  }, [resolveCombinedTitreMetadata])

  return (
    <>
      {/* 1. Titre */}
      <SectionCard
        icon={<AlignLeft className="h-4 w-4" />}
        title="Titre du texte"
        subtitle="Intitulé officiel tel qu'il apparaîtra dans le registre"
      >
        {combined.titreMetadataStatus === "pending" && hasAnySuggestion && (
          <SuggestionBanner
            title="Titre et classification suggérés depuis les documents importés"
            preview={suggestionPreview}
            insertLabel="Insérer"
            onInsert={handleInsertSuggestion}
            onIgnore={handleIgnoreSuggestion}
          />
        )}
        <div>
          <FieldLabel htmlFor="titre">Titre</FieldLabel>
          <Input
            id="titre"
            {...register("titre", { required: true })}
            placeholder="Ex. Arrêté portant modification du régime douanier…"
            className="border-foreground/20 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
          {titreError && (
            <p className="mt-1 text-xs text-red-500">
              Le titre est obligatoire.
            </p>
          )}
        </div>
      </SectionCard>

      {/* 2. Catégorie / Statut / Thème */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Catégorie"
          subtitle={
            selectedCatCount > 0
              ? `${selectedCatCount} sélectionnée${selectedCatCount > 1 ? "s" : ""}`
              : "Aucune sélection"
          }
          action={
            <AddLinkButton
              to="/douane/backoffice/add-categorie"
              label="Nouveau"
            />
          }
        >
          {isLoadingCategories ? (
            <p className="py-4 text-center text-xs text-slate-400">
              Chargement des catégories…
            </p>
          ) : errorCategories ? (
            <p className="py-4 text-center text-xs text-red-500">
              Impossible de charger les catégories.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <CheckTree
                items={categoriesTree}
                selected={categories}
                onToggle={(id) => handleToggle("categories", id)}
              />
            </div>
          )}
          {selectedCatCount > 0 && (
            <button
              type="button"
              onClick={() => clearClassification("categories")}
              className="mt-3 text-xs text-slate-400 transition-colors hover:text-red-500"
            >
              Effacer la sélection
            </button>
          )}
        </SectionCard>

        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Statut du texte"
          subtitle={
            selectedStatutCount > 0
              ? `${selectedStatutCount} sélectionné${selectedStatutCount > 1 ? "s" : ""}`
              : "Aucune sélection"
          }
          action={
            <AddLinkButton to="/douane/backoffice/add-statut" label="Nouveau" />
          }
        >
          {isLoadingStatuts ? (
            <p className="py-4 text-center text-xs text-slate-400">
              Chargement des statuts…
            </p>
          ) : errorStatuts ? (
            <p className="py-4 text-center text-xs text-red-500">
              Impossible de charger les statuts.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <CheckTree
                items={statutsTree}
                selected={statuts}
                onToggle={(id) => handleToggle("statuts", id)}
              />
            </div>
          )}
          {selectedStatutCount > 0 && (
            <button
              type="button"
              onClick={() => clearClassification("statuts")}
              className="mt-3 text-xs text-slate-400 transition-colors hover:text-red-500"
            >
              Effacer la sélection
            </button>
          )}
        </SectionCard>

        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Thème"
          subtitle={
            selectedThemeCount > 0
              ? `${selectedThemeCount} sélectionné${selectedThemeCount > 1 ? "s" : ""}`
              : "Aucune sélection"
          }
          action={
            <AddLinkButton to="/douane/backoffice/add-theme" label="Nouveau" />
          }
        >
          {isLoadingThemes ? (
            <p className="py-4 text-center text-xs text-slate-400">
              Chargement des thèmes…
            </p>
          ) : errorThemes ? (
            <p className="py-4 text-center text-xs text-red-500">
              Impossible de charger les thèmes.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              <CheckTree
                items={themesTree}
                selected={themes}
                onToggle={(id) => handleToggle("themes", id)}
              />
            </div>
          )}
          {selectedThemeCount > 0 && (
            <button
              type="button"
              onClick={() => clearClassification("themes")}
              className="mt-3 text-xs text-slate-400 transition-colors hover:text-red-500"
            >
              Effacer la sélection
            </button>
          )}
        </SectionCard>
      </div>
    </>
  )
}