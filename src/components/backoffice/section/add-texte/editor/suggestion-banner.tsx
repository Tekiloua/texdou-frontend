import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SuggestionBannerProps {
  title: string
  preview: string
  insertLabel?: string
  onInsert: () => void
  onIgnore: () => void
}

// Bannière générique "suggestion générée automatiquement" : utilisée pour
// le résumé et les mots-clés proposés après extraction VLM d'un document
// (voir mots-cles-resume-section.tsx), sur le même principe que
// ValidationBanner pour le texte extrait dans DocumentSection.
export function SuggestionBanner({
  title,
  preview,
  insertLabel = "Insérer",
  onInsert,
  onIgnore,
}: SuggestionBannerProps) {
  return (
    <div className="mb-3 flex items-start gap-3 rounded-md border border-cyan-700/30 bg-cyan-50 p-3 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-cyan-900">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-cyan-800/80">{preview}</p>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="h-7 bg-cyan-700 px-2.5 text-xs hover:bg-cyan-800"
            onClick={onInsert}
          >
            {insertLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-cyan-800 hover:bg-cyan-100"
            onClick={onIgnore}
          >
            <X className="mr-1 h-3 w-3" />
            Ignorer
          </Button>
        </div>
      </div>
    </div>
  )
}