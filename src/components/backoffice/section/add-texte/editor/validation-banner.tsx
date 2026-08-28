import { FileCheck2, X } from "lucide-react"
import type { FileAnalysis } from "./useDocumentAnalysis"

interface ValidationBannerProps {
  // Fichiers terminés avec du texte extrait, en attente d'une décision de
  // l'utilisateur — clé = clé du store (nom + lastModified), pas juste le
  // nom de fichier, pour rester cohérent avec analysisStore.
  pending: Array<[string, FileAnalysis]>
  onInsert: (key: string, entry: FileAnalysis) => void
  onIgnore: (key: string) => void
}

// Bannière de validation (étape 6 du flux) : une ligne par fichier dont
// l'analyse est terminée, proposant d'insérer le texte extrait dans
// l'éditeur Lexical au curseur, ou de l'ignorer. Affichée sous la mini
// console (AnalysisConsole), avant l'éditeur — voir document-section.tsx.
export function ValidationBanner({
  pending,
  onInsert,
  onIgnore,
}: ValidationBannerProps) {
  if (pending.length === 0) return null

  return (
    <div className="mb-2 space-y-2">
      {pending.map(([key, entry]) => (
        <div
          key={key}
          className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          <FileCheck2 className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1 truncate">
            Texte extrait de « {entry.filename} » prêt — l'insérer dans le
            document, au curseur ?
          </span>
          <button
            type="button"
            onClick={() => onInsert(key, entry)}
            className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            Insérer
          </button>
          <button
            type="button"
            onClick={() => onIgnore(key)}
            className="flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            title="Ignorer ce texte"
          >
            <X className="h-3 w-3" />
            Ignorer
          </button>
        </div>
      ))}
    </div>
  )
}