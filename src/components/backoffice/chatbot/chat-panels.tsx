import { useState } from "react"
import {
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ConversationRecord } from "@/api/api"

function formatDate(date: Date): string {
  const d = new Date(date)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Hier"
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR")
}

// ── HistorySheet ──────────────────────────────────────────────────────────────
// Sheet shadcn/ui ouvert depuis le bouton "options" du header du chat. Contient
// la liste des conversations + le renommage de la conversation active.

interface HistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversations: ConversationRecord[]
  activeId: number | null
  isLoading: boolean
  onSelect: (id: number) => void
  onNew: () => void
  onDelete: (id: number) => void
  onRename: (id: number, titre: string) => void
}

export function HistorySheet({
  open,
  onOpenChange,
  conversations,
  activeId,
  isLoading,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: HistorySheetProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState<string>("")

  const groups = conversations.reduce<Record<string, ConversationRecord[]>>(
    (acc, conv) => {
      const label = formatDate(new Date(conv.created_at))
      if (!acc[label]) acc[label] = []
      acc[label].push(conv)
      return acc
    },
    {}
  )

  const startEditing = (conv: ConversationRecord): void => {
    setEditingId(conv.id)
    setEditValue(conv.titre ?? "")
  }

  const commitEditing = (): void => {
    const titre = editValue.trim()
    if (editingId !== null && titre !== "") {
      onRename(editingId, titre)
    }
    setEditingId(null)
    setEditValue("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[88%] flex-col gap-0 p-0 sm:w-[380px]"
      >
        <SheetHeader className="border-b border-slate-200 px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-700">
              <MessageSquare size={14} className="text-white" />
            </div>
            Historique
          </SheetTitle>
        </SheetHeader>

        <div className="p-3">
          <Button
            onClick={() => {
              onNew()
              onOpenChange(false)
            }}
            className="h-9 w-full gap-2 bg-cyan-700 text-xs text-white hover:bg-cyan-800"
          >
            <Plus size={14} />
            Nouvelle conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Chargement…
            </div>
          )}

          {!isLoading &&
            Object.entries(groups).map(([label, convs]) => (
              <div key={label} className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Clock size={11} className="text-slate-400" />
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    {label}
                  </span>
                </div>

                {convs.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      if (editingId === conv.id) return
                      onSelect(conv.id)
                      onOpenChange(false)
                    }}
                    className={`group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                      activeId === conv.id
                        ? "bg-cyan-50 text-cyan-800"
                        : "text-slate-600 hover:bg-slate-50"
                    } `}
                  >
                    <MessageSquare size={13} className="shrink-0 opacity-60" />

                    {editingId === conv.id ? (
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            commitEditing()
                          }
                          if (e.key === "Escape") {
                            setEditingId(null)
                            setEditValue("")
                          }
                        }}
                        onBlur={commitEditing}
                        className="h-6 flex-1 border-cyan-300 bg-white px-1.5 text-xs"
                      />
                    ) : (
                      <span className="flex-1 truncate text-xs">
                        {conv.titre ?? "Nouvelle conversation"}
                      </span>
                    )}

                    {editingId === conv.id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          commitEditing()
                        }}
                        className="rounded p-0.5 text-cyan-700 hover:text-cyan-900"
                      >
                        <Check size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditing(conv)
                        }}
                        className="rounded p-0.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-cyan-700"
                      >
                        <Pencil size={12} />
                      </button>
                    )}

                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        onDelete(conv.id)
                      }}
                      className="rounded p-0.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ))}

          {!isLoading && conversations.length === 0 && (
            <p className="mt-8 px-4 text-center text-xs text-slate-400">
              Aucune conversation pour l'instant.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── SettingsPanel ─────────────────────────────────────────────────────────────
// NB: pas d'endpoint backend dédié aux statistiques de tokens pour le moment —
// panneau conservé à titre indicatif (données simulées).

const TOKEN_LIMIT = 500_000



// ── SettingsSheet ─────────────────────────────────────────────────────────────
// Panneau paramètres/consommation, ouvert depuis le toggle mobile du
// SiteHeader (auparavant une aside statique, devenue un Sheet pour rester
// responsive et cohérente avec HistorySheet).

interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalTokensUsed: number
}

export function SettingsSheet({
  open,
  onOpenChange,
  totalTokensUsed,
}: SettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[88%] flex-col gap-0 p-0 sm:w-[380px]"
      >
        <SheetHeader className="border-b border-card-foreground px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-700">
              <Settings size={14} className="text-white" />
            </div>
            Paramètres
          </SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}