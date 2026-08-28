import { useCallback, useRef } from "react"
import type {
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form"
import { AlignLeft, Sparkles } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

import { SectionCard, FieldLabel } from "./helper/ui-helpers"
import {
  LexicalDocEditor,
  type LexicalDocEditorHandle,
} from "./editor/lexical-doc-editor"
import { SuggestionBanner } from "./editor/suggestion-banner"
import { useDocumentAnalysis } from "./editor/useDocumentAnalysis"
import { useAddTexteStore } from "./store/useAddTexteStore"
import type { TexteFormValues } from "./types/types"

interface MotsClesResumeSectionProps {
  register: UseFormRegister<TexteFormValues>
  // Nécessaires pour appliquer la suggestion de mots-clés (champ de
  // formulaire simple, pas dans le store Zustand — contrairement au
  // résumé, qui lui passe par resumeHtml/setResumeHtml).
  setValue: UseFormSetValue<TexteFormValues>
  getValues: UseFormGetValues<TexteFormValues>
  // Nécessaire pour que le champ "motsCles" soit contrôlé : sans ça, le
  // Textarea reste non-contrôlé (RHF met la valeur à jour uniquement via
  // sa ref interne au submit/blur), et setValue("motsCles", …) appelé
  // depuis handleInsertKeywords ne se reflète pas forcément à l'écran tant
  // que rien ne force un re-render de ce composant.
  watch: UseFormWatch<TexteFormValues>
  // true en mode "modification d'un texte existant" — voir add-texte-section.tsx.
  isEditMode: boolean
}

// Regroupe les mots-clés (recherche dans le registre) et le résumé du texte
// juridique (éditeur Lexical), tous deux liés à la restitution du texte dans
// les listes de résultats.
//
// Porte aussi le bouton "Générer suggestions" (résumé + mots-clés, voir
// useDocumentAnalysis.generateAllSuggestions) : ce bouton est déclenché ici
// plutôt que dans DocumentSection pour rester à proximité des champs qu'il
// alimente (mots-clés, résumé).
//
// Les suggestions de métadonnées (titre/classification/informations
// complémentaires) NE sont PAS déclenchées par ce bouton : elles se
// génèrent automatiquement dès la fin de l'extraction de chaque fichier
// (voir recordExtractedText dans useDocumentAnalysis.ts). Les redéclencher
// ici ferait réapparaître ces bannières à chaque clic, même après que
// l'utilisateur les ait déjà résolues.
//
// IMPORTANT : ce bouton est totalement INDÉPENDANT des bannières
// d'insertion du texte extrait par document (ValidationBanner dans
// DocumentSection) — voir `hasExtractableText` dans useDocumentAnalysis,
// qui ne redevient jamais false après un "Insérer"/"Ignorer" sur ces
// bannières-là. Cliquer "Insérer" sur le texte d'un document n'affecte donc
// jamais la disponibilité de ce bouton.
export function MotsClesResumeSection({
  register,
  setValue,
  getValues,
  watch,
  isEditMode,
}: MotsClesResumeSectionProps) {
  const resumeHtml = useAddTexteStore((s) => s.resumeHtml)
  const setResumeHtml = useAddTexteStore((s) => s.setResumeHtml)
  const hasPrefilled = useAddTexteStore((s) => s.hasPrefilled)
  const setContentDirty = useAddTexteStore((s) => s.setContentDirty)

  const {
    combined,
    hasExtractableText,
    generateAllSuggestions,
    resolveCombinedSummary,
    resolveCombinedKeywords,
  } = useDocumentAnalysis()

  // Poignée impérative de l'éditeur Lexical du résumé — sert uniquement à
  // insérer la suggestion générée, sur le même principe que editorRef dans
  // document-section.tsx.
  const resumeEditorRef = useRef<LexicalDocEditorHandle>(null)

  // Valeur "surveillée" du champ — permet à ce composant de re-render
  // chaque fois que motsCles change, y compris via un setValue programmatique
  // (clic sur "Ajouter"), pas seulement via la saisie clavier directe.
  const motsClesValue = watch("motsCles") ?? ""

  const isGenerating =
    combined.summaryStatus === "loading" || combined.keywordsStatus === "loading"

  const handleResumeChange = useCallback(
    (html: string) => {
      setResumeHtml(html)
      if (hasPrefilled || !isEditMode) setContentDirty(true)
    },
    [setResumeHtml, hasPrefilled, isEditMode, setContentDirty]
  )

  const handleInsertSummary = useCallback(() => {
    resumeEditorRef.current?.insertMarkdownAtCursor(combined.summary ?? "")
    if (hasPrefilled || !isEditMode) setContentDirty(true)
    resolveCombinedSummary()
  }, [combined.summary, hasPrefilled, isEditMode, setContentDirty, resolveCombinedSummary])

  const handleIgnoreSummary = useCallback(() => {
    resolveCombinedSummary()
  }, [resolveCombinedSummary])

  const handleInsertKeywords = useCallback(() => {
    // Complète les mots-clés déjà saisis plutôt que de les écraser — évite
    // de perdre une saisie manuelle si l'utilisateur en avait déjà
    // renseigné avant de générer la suggestion.
    const current = (getValues("motsCles") ?? "").trim()
    const currentList = current
      ? current.split(",").map((m) => m.trim()).filter(Boolean)
      : []
    const merged = Array.from(new Set([...currentList, ...(combined.keywords ?? [])]))
    setValue("motsCles", merged.join(", "), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    if (hasPrefilled || !isEditMode) setContentDirty(true)
    resolveCombinedKeywords()
  }, [
    combined.keywords,
    getValues,
    setValue,
    hasPrefilled,
    isEditMode,
    setContentDirty,
    resolveCombinedKeywords,
  ])

  const handleIgnoreKeywords = useCallback(() => {
    resolveCombinedKeywords()
  }, [resolveCombinedKeywords])

  return (
    <>
      {/* Déclenchement manuel des suggestions (résumé + mots-clés +
          métadonnées administratives/classification), une fois l'import des
          documents terminé. Reste actif même après avoir inséré/ignoré le
          texte extrait d'un document (voir hasExtractableText plus haut). */}
      {hasExtractableText && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 border-cyan-700/40 text-cyan-800 hover:bg-cyan-50"
            onClick={() => generateAllSuggestions()}
            disabled={isGenerating}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isGenerating ? "Génération en cours…" : "Générer suggestions"}
          </Button>
        </div>
      )}
      {(combined.summaryStatus === "error" || combined.keywordsStatus === "error") && (
        <p className="text-right text-xs text-red-600">
          Échec de la génération du résumé et des mots-clés
          {combined.error ? ` (${combined.error})` : ""}.
        </p>
      )}

      {/* Mots-clés */}
      <SectionCard
        icon={<AlignLeft className="h-4 w-4" />}
        title="Mots-clés"
        subtitle="Améliorent la recherche dans le registre"
      >
        {combined.keywordsStatus === "pending" && (
          <SuggestionBanner
            title="Mots-clés suggérés depuis les documents importés"
            preview={(combined.keywords ?? []).join(", ")}
            insertLabel="Ajouter"
            onInsert={handleInsertKeywords}
            onIgnore={handleIgnoreKeywords}
          />
        )}
        <div>
          <FieldLabel htmlFor="motsCles">Mots-clés</FieldLabel>
          <Textarea
            id="motsCles"
            {...register("motsCles")}
            // Champ contrôlé : la valeur affichée vient de `watch`, pas
            // uniquement de la ref interne de RHF — nécessaire pour que
            // setValue("motsCles", …) (bouton "Ajouter" ci-dessus) se
            // reflète immédiatement à l'écran.
            value={motsClesValue}
            placeholder="Saisissez des mots-clés séparés par des virgules…"
            rows={3}
            className="resize-none border-slate-200 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Ces mots-clés améliorent la recherche dans le registre.
          </p>
        </div>
      </SectionCard>

      {/* Résumé */}
      <SectionCard
        icon={<AlignLeft className="h-4 w-4" />}
        title="Résumé"
        subtitle="Synthèse concise du texte, visible dans les listes de résultats"
      >
        {combined.summaryStatus === "pending" && (
          <SuggestionBanner
            title="Résumé suggéré depuis les documents importés"
            preview={combined.summary ?? ""}
            onInsert={handleInsertSummary}
            onIgnore={handleIgnoreSummary}
          />
        )}
        <LexicalDocEditor
          ref={resumeEditorRef}
          placeholder="Rédigez un résumé du texte juridique…"
          minHeight={200}
          onChange={handleResumeChange}
          initialHtml={resumeHtml}
        />
      </SectionCard>
    </>
  )
}