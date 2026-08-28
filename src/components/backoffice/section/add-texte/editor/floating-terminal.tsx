import { type ReactNode, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface FloatingTerminalProps {
  title: string
  // Contrôle l'affichage global du terminal (monté/démonté par le parent).
  open: boolean
  // Le bouton fermer n'apparaît que lorsque l'animation/le traitement en
  // cours est terminé — jamais pendant qu'un flux est actif, pour éviter
  // de fermer une console dont le contenu est encore en train d'arriver.
  canClose: boolean
  onClose: () => void
  children: ReactNode
  // Position à l'écran — plusieurs terminaux peuvent coexister (analyse de
  // documents + publication), donc décalés pour ne pas se superposer.
  position?: "bottom-right" | "bottom-left"
  // Petit indicateur d'activité dans l'en-tête (point qui pulse) tant que
  // canClose est false.
  statusLabel?: string
  // Contenu additionnel affiché sous le corps du terminal (ex: bouton
  // "Réinitialiser" une fois la publication terminée).
  footer?: ReactNode
}

// Terminal flottant générique, thème clair façon terminal moderne (fond
// blanc cassé, texte slate, en-tête avec pastilles) — positionné en overlay
// fixe plutôt qu'inline dans le flux du formulaire. Utilisé pour la console
// d'analyse de documents et pour l'animation de publication des chunks RAG.
export function FloatingTerminal({
  title,
  open,
  canClose,
  onClose,
  children,
  position = "bottom-right",
  statusLabel,
  footer,
}: FloatingTerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  // Auto-scroll vers le bas à chaque nouveau contenu, comme un vrai
  // terminal qui suit la sortie en direct.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  })

  if (!open) return null

  const positionClasses =
    position === "bottom-right" ? "right-4 bottom-4" : "left-4 bottom-4"

  return (
    <div
      className={`fixed ${positionClasses} z-50 w-110 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5`}
      role="log"
      aria-live="polite"
    >
      {/* En-tête façon fenêtre de terminal */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </span>
          <span className="ml-1.5 truncate font-mono text-[11px] text-slate-500">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!canClose && statusLabel && (
            <span className="flex items-center gap-1.5 text-[10px] text-cyan-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-600" />
              </span>
              {statusLabel}
            </span>
          )}
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label="Fermer le terminal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Corps du terminal */}
      <div
        ref={bodyRef}
        className="max-h-64 space-y-1.5 overflow-y-auto scroll-smooth bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-700"
      >
        {children}
      </div>

      {footer && (
        <div className="border-t border-slate-200 bg-slate-50 p-2.5">
          {footer}
        </div>
      )}
    </div>
  )
}