import type { IngestProgressEvent } from "@/api/api"
import { FloatingTerminal } from "./floating-terminal"

export type PublishStatus = "idle" | "running" | "success" | "error"

interface PublishTerminalProps {
  status: PublishStatus
  // Lignes de log déjà formatées (voir buildLogLine dans
  // add-texte-section.tsx), construites à partir des vrais events reçus du
  // flux SSE /rag/ingest-progress/{texte_id} — plus aucune simulation ici.
  lines: string[]
  errorMessage?: string | null
  onClose: () => void
  // N'affiche "Réinitialiser" qu'en mode création (pas en édition, où la
  // page navigue de toute façon vers le backoffice à la fermeture).
  showReset: boolean
  onReset: () => void
}

// Terminal flottant affichant la progression RÉELLE du chunking sémantique,
// de l'embedding et de l'upsert Chroma pendant la publication d'un texte
// (voir subscribeIngestProgress dans api.ts et stream_ingest_progress côté
// backend). Aucune animation simulée : chaque ligne correspond à un event
// SSE effectivement reçu.
export function PublishTerminal({
  status,
  lines,
  errorMessage,
  onClose,
  showReset,
  onReset,
}: PublishTerminalProps) {
  if (status === "idle") return null

  const isRunning = status === "running"

  return (
    <FloatingTerminal
      title="publication-rag — terminal"
      open
      canClose={!isRunning}
      onClose={onClose}
      position="bottom-right"
      statusLabel="indexation en cours…"
      footer={
        !isRunning && status === "success" && showReset ? (
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-md border border-cyan-700/40 bg-white px-3 py-1.5 text-xs font-medium text-cyan-800 transition-colors hover:bg-cyan-50"
          >
            Réinitialiser le formulaire
          </button>
        ) : undefined
      }
    >
      {lines.length === 0 && isRunning && (
        <div className="text-slate-500">
          <span className="text-slate-400">$</span> connexion au flux d'indexation…
        </div>
      )}

      {lines.map((line, i) => (
        <div key={i} className="text-slate-700">
          <span className="text-slate-400">$</span> {line}
        </div>
      ))}

      {status === "success" && (
        <div className="mt-1 flex items-center gap-1.5 text-emerald-700">
          <span className="text-slate-400">$</span>
          ✓ Publication terminée — chunks indexés avec succès.
        </div>
      )}

      {status === "error" && (
        <div className="mt-1 flex items-center gap-1.5 text-red-600">
          <span className="text-slate-400">$</span>
          ✗ Échec de la publication{errorMessage ? ` — ${errorMessage}` : ""}.
        </div>
      )}
    </FloatingTerminal>
  )
}

// Traduit un event SSE brut en ligne de log lisible, affichée telle quelle
// dans le terminal. Centralisé ici pour que add-texte-section.tsx n'ait
// qu'à accumuler ces lignes sans connaître le détail du format des events.
export function formatIngestProgressLine(event: IngestProgressEvent): string | null {
  switch (event.type) {
    case "chunking_start":
      return "Découpage sémantique du contenu en cours…"
    case "chunking_done":
      return `Découpage terminé — ${event.chunks_total ?? 0} chunk(s) identifié(s)`
    case "embedding_progress":
      return `Embedding — lot ${event.batch}/${event.total_batches} (${event.chunks_embedded}/${event.chunks_total} chunks)`
    case "upsert_progress":
      return `Indexation ChromaDB — ${event.chunks_upserted}/${event.chunks_total} chunks upsertés`
    case "done":
      return event.chunks_indexed
        ? `Indexation terminée — ${event.chunks_indexed} chunk(s) au total`
        : "Aucun contenu à indexer pour ce texte."
    case "error":
      return null // géré séparément via errorMessage
    default:
      return null
  }
}