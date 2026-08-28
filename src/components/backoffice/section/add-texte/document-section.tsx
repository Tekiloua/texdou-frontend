import { useCallback, useEffect, useMemo, useRef } from "react"
import { useParams } from "react-router"
import { FileText } from "lucide-react"

import { SectionCard } from "./helper/ui-helpers"
import {
  LexicalDocEditor,
  type LexicalDocEditorHandle,
} from "./editor/lexical-doc-editor"
import { UploadDocument } from "./editor/upload-document"
import {
  useDocumentAnalysis,
  type FileAnalysis,
} from "./editor/useDocumentAnalysis"
import { AnalysisConsole } from "./editor/analysis-console"
import { ValidationBanner } from "./editor/validation-banner"
import { useAddTexteStore } from "./store/useAddTexteStore"
import { fetchTexteDocumentsAsFiles } from "@/api/api"

interface DocumentSectionProps {
  // true en mode "modification d'un texte existant" (présence d'un :id
  // dans l'URL) — voir add-texte-section.tsx.
  isEditMode: boolean
}

// Section "Document" : corps du texte juridique, avec mise en forme riche
// (éditeur Lexical) et import PDF optionnel.
export function DocumentSection({ isEditMode }: DocumentSectionProps) {
  // Même source que isEditMode (présence d'un :id dans l'URL) — nécessaire
  // ici pour pouvoir aller chercher les documents déjà liés à ce texte.
  const { id } = useParams<{ id: string }>()

  const documentHtml = useAddTexteStore((s) => s.documentHtml)
  const files = useAddTexteStore((s) => s.files)
  const setFiles = useAddTexteStore((s) => s.setFiles)
  const setDocumentsLoading = useAddTexteStore((s) => s.setDocumentsLoading)
  const setDocumentsPrefillFailed = useAddTexteStore(
    (s) => s.setDocumentsPrefillFailed
  )
  const setDocumentHtml = useAddTexteStore((s) => s.setDocumentHtml)
  const hasPrefilled = useAddTexteStore((s) => s.hasPrefilled)
  const setContentDirty = useAddTexteStore((s) => s.setContentDirty)

  // Analyse en direct (SSE) des fichiers importés : dès qu'un fichier est
  // sélectionné dans LexicalDocEditor, il est envoyé à
  // /qualites-documents/analyze-stream et sa progression (page par page,
  // score) alimente la mini console affichée ci-dessous.
  const {
    analyses,
    analyzeFile,
    getFullText,
    resolveInsertion,
    dismiss,
  } = useDocumentAnalysis()

  // Poignée impérative de l'éditeur Lexical — sert uniquement au
  // préremplissage déclenché depuis la bannière de validation
  // (insertMarkdownAtCursor), en dehors du flux normal onChange/initialHtml.
  const editorRef = useRef<LexicalDocEditorHandle>(null)

  // Fichiers dont l'analyse est terminée et dont le texte extrait attend
  // encore une décision de l'utilisateur (insérer / ignorer) — recalculé à
  // chaque mise à jour de `analyses` (nouvel event SSE, nouvelle décision).
  const pendingInsertions = useMemo(
    () =>
      Array.from(analyses.entries()).filter(
        ([, entry]) => entry.insertion === "pending"
      ),
    [analyses]
  )

  const handleInsertExtractedText = useCallback(
    (key: string, entry: FileAnalysis) => {
      const text = getFullText(entry)
      editorRef.current?.insertMarkdownAtCursor(text)
      resolveInsertion(key)
      dismiss(key)
    },
    [getFullText, resolveInsertion, dismiss]
  )

  const handleIgnoreExtractedText = useCallback(
    (key: string) => {
      resolveInsertion(key)
      dismiss(key)
    },
    [resolveInsertion, dismiss]
  )

  const handleDocumentChange = useCallback(
    (html: string) => {
      setDocumentHtml(html)
      if (hasPrefilled || !isEditMode) setContentDirty(true)
    },
    [setDocumentHtml, hasPrefilled, isEditMode, setContentDirty]
  )

  // ── Préremplissage des documents existants (mode édition) ────────────────
  // `hasPrefilled` passe à true une fois que le reste du texte (titre,
  // contenu HTML, etc.) a été chargé dans le store par le composant parent
  // — c'est le signal qu'on peut aller chercher les documents liés. Le ref
  // garantit un fetch unique : sans lui, chaque re-render déclencherait un
  // nouvel appel réseau (hasPrefilled reste true après le premier chargement).
  const documentsFetchedRef = useRef(false)

  useEffect(() => {
    if (!isEditMode || !id || !hasPrefilled) return
    if (documentsFetchedRef.current) return
    documentsFetchedRef.current = true

    let cancelled = false
    setDocumentsLoading(true)
    setDocumentsPrefillFailed(false)

    fetchTexteDocumentsAsFiles(id)
      .then(({ files: fetchedFiles, totalDocuments, failedCount }) => {
        if (cancelled) return

        if (failedCount > 0) {
          // Échec total ou partiel : `fetchedFiles` ne représente PAS
          // l'état réel des documents du texte (il en manque au moins un).
          // On affiche quand même ce qui a pu être récupéré (pour l'aperçu),
          // mais on NE DOIT PAS laisser le formulaire envoyer `files` tel
          // quel au backend — voir documentsPrefillFailed dans
          // add-texte-section.tsx, qui omet alors le champ `files` de la
          // requête pour ne jamais toucher aux documents liés.
          if (fetchedFiles.length > 0) setFiles(fetchedFiles)
          setDocumentsPrefillFailed(true)
          console.error(
            `Préremplissage des documents incomplet : ${failedCount}/${totalDocuments} document(s) n'ont pas pu être rechargés.`
          )
          return
        }

        // Aucun échec : soit le texte n'a réellement aucun document
        // (totalDocuments === 0), soit tous ont été récupérés avec succès.
        // Dans les deux cas, `fetchedFiles` reflète fidèlement l'état réel.
        if (fetchedFiles.length > 0) setFiles(fetchedFiles)
      })
      .catch((err) => {
        // Échec de fetchDocumentsByTexteId lui-même (avant même de savoir
        // combien de documents existent) : à traiter avec la même prudence
        // qu'un échec total — on ne sait pas ce qui est réellement lié.
        if (cancelled) return
        setDocumentsPrefillFailed(true)
        console.error("Préremplissage des documents impossible :", err)
      })
      .finally(() => {
        // Débloque la soumission du formulaire même si le fetch a échoué
        // ou n'a rien renvoyé — mieux vaut permettre l'enregistrement
        // (voir documentsPrefillFailed pour la protection des documents)
        // que de bloquer indéfiniment le bouton.
        if (!cancelled) setDocumentsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    isEditMode,
    id,
    hasPrefilled,
    setFiles,
    setDocumentsLoading,
    setDocumentsPrefillFailed,
  ])

  return (
    <SectionCard
      icon={<FileText className="h-4 w-4" />}
      title="Document"
      subtitle="Corps du texte juridique — mise en forme riche disponible"
    >
      <div className="relative space-y-3">
        {/* L'import de fichier n'a de sens qu'à la création : en mode
            édition, les documents déjà liés sont préremplis automatiquement
            (voir l'effet ci-dessus) et se gèrent depuis la section
            documents dédiée, pas depuis ce formulaire. */}
        {!isEditMode && (
          <UploadDocument
            files={files}
            onFilesChange={setFiles}
            onFilePicked={analyzeFile}
          />
        )}
        <AnalysisConsole analyses={analyses} />

        <ValidationBanner
          pending={pendingInsertions}
          onInsert={handleInsertExtractedText}
          onIgnore={handleIgnoreExtractedText}
        />
        <LexicalDocEditor
          ref={editorRef}
          placeholder="Rédigez le contenu du texte juridique ici…"
          minHeight={520}
          onChange={handleDocumentChange}
          initialHtml={documentHtml}
        />
      </div>
    </SectionCard>
  )
}