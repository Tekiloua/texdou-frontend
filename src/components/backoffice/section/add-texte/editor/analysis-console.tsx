import { useEffect, useMemo, useState } from "react"
import { Loader2, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import type { FileAnalysis } from "./useDocumentAnalysis"
import { FloatingTerminal } from "./floating-terminal"

interface AnalysisConsoleProps {
  analyses: Map<string, FileAnalysis>
}

// Console de progression de l'analyse des documents importés, sous forme de
// terminal flottant clair. Purement dérivée de l'état poussé par le hook
// useDocumentAnalysis (lui-même alimenté par le flux SSE côté backend) —
// aucun état local ici à part la visibilité (fermeture manuelle).
export function AnalysisConsole({ analyses }: AnalysisConsoleProps) {
  const entries = useMemo(() => Array.from(analyses.values()), [analyses])
  const [closed, setClosed] = useState(false)

  // Tant qu'un fichier est en attente ou en cours, l'animation n'est pas
  // terminée : pas de bouton fermer, et on rouvre automatiquement le
  // terminal si de nouveaux fichiers arrivent après une fermeture manuelle.
  const isRunning = entries.some(
    (e) => e.status === "queued" || e.status === "processing"
  )

  useEffect(() => {
    if (isRunning) setClosed(false)
  }, [isRunning])

  if (entries.length === 0 || closed) return null

  return (
    <FloatingTerminal
      title="analyse-documents — terminal"
      open
      canClose={!isRunning}
      onClose={() => setClosed(true)}
      position="bottom-left"
      statusLabel="analyse en cours…"
    >
      {entries.map((entry) => (
        <div key={entry.filename}>
          <div className="mb-0.5 flex items-center gap-1.5">
            {entry.status === "queued" && (
              <Clock className="h-3 w-3 shrink-0 text-slate-400" />
            )}
            {entry.status === "processing" && (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-600" />
            )}
            {entry.status === "done" && (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
            )}
            {entry.status === "error" && (
              <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
            )}
            <span className="truncate text-slate-700">
              <span className="text-slate-400">$</span> traitement « {entry.filename} »
              {entry.status === "queued" && " — en attente…"}
              {entry.status === "done" && " — terminé"}
              {entry.status === "error" && ` — erreur : ${entry.error}`}
            </span>
          </div>

          {entry.pages.map((p) => (
            <div
              key={p.page}
              className={[
                "rounded pl-4 transition-colors duration-200",
                p.status === "processing"
                  ? "animate-pulse text-cyan-700"
                  : "text-emerald-700",
              ].join(" ")}
            >
              &gt; page {p.page}/{p.totalPages}{" "}
              {p.status === "processing"
                ? "en cours…"
                : `terminée — score ${Math.round(p.score ?? 0)}/100`}
            </div>
          ))}
        </div>
      ))}
    </FloatingTerminal>
  )
}