import type { ChangeEvent, KeyboardEvent, RefObject } from "react"
import { ArrowUp, Check, ChevronDown, Mic, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Purement décoratif pour le moment : aucun endpoint backend ne consomme
// encore ce choix (le modèle utilisé est fixé côté serveur).
const MODELS = ["Sonnet 5", "Opus 4.8", "Haiku 4.5", "Fable 5"]
const EFFORTS = ["Faible", "Moyen", "Élevé"]

interface ChatComposerProps {
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  disabled: boolean
  hasMessages: boolean
  selectedModel: string
  onSelectModel: (model: string) => void
  selectedEffort: string
  onSelectEffort: (effort: string) => void
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export function ChatComposer({
  value,
  onChange,
  onKeyDown,
  onSend,
  disabled,
  hasMessages,
  selectedModel,
  onSelectModel,
  selectedEffort,
  onSelectEffort,
  inputRef,
}: ChatComposerProps) {
  return (
    <div
      className={`w-full ${!hasMessages ? "max-w-[47.5rem]" : "max-w-[50rem]"} mx-auto rounded-3xl border border-slate-400 bg-white p-2.5 sm:p-3`}
    >
      <textarea
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={
          hasMessages ? "Continuez la conversation…" : "Posez votre question…"
        }
        disabled={disabled}
        rows={1}
        className="max-h-40 w-full resize-none bg-transparent px-1.5 pt-1 text-sm leading-relaxed placeholder:text-slate-400 focus:outline-none disabled:opacity-60 sm:text-base dark:text-white"
      />

      <div className="mt-2 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label="Ajouter un fichier"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Plus size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {/* Sélecteur de modèle — décoratif, ne fait rien côté backend */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1.5 text-xs text-slate-500 transition-colors outline-none hover:bg-black/5 focus:outline-none sm:gap-1.5 sm:px-2 dark:text-slate-300 dark:hover:bg-white/10">
              <span className="truncate font-semibold text-slate-800 dark:text-white">
                {selectedModel}
              </span>
              <span className="hidden text-slate-400 sm:inline">
                {selectedEffort}
              </span>
              <ChevronDown size={13} className="shrink-0 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] tracking-wide text-slate-400 uppercase">
                Modèle
              </DropdownMenuLabel>
              {MODELS.map((m) => (
                <DropdownMenuItem
                  key={m}
                  onClick={() => onSelectModel(m)}
                  className="justify-between text-sm"
                >
                  {m}
                  {selectedModel === m && (
                    <Check size={13} className="text-cyan-700" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] tracking-wide text-slate-400 uppercase">
                Effort
              </DropdownMenuLabel>
              {EFFORTS.map((ef) => (
                <DropdownMenuItem
                  key={ef}
                  onClick={() => onSelectEffort(ef)}
                  className="justify-between text-sm"
                >
                  {ef}
                  {selectedEffort === ef && (
                    <Check size={13} className="text-cyan-700" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            aria-label="Dicter un message"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700 sm:flex dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Mic size={16} />
          </button>

          <Button
            onClick={onSend}
            disabled={value.trim() === "" || disabled}
            aria-label="Envoyer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-600 p-0 text-white hover:bg-cyan-700 disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}