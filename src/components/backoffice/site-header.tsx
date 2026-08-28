import { useEffect, useRef, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { History, Pencil, Settings } from "lucide-react"
import { useChatbotHeaderStore } from "./store/useChatbotHeaderStore"

export function SiteHeader() {
  const {
    title,
    hasActiveConversation,
    onRename,
    onOpenHistory,
    onOpenMobileSidebar,
  } = useChatbotHeaderStore()

  // Édition inline du titre de la conversation — logique migrée depuis
  // ChatPanel (chatbot.tsx). Reste locale au SiteHeader : seule la validation
  // finale (commitTitleEdit) redescend l'info via onRename, fourni par la
  // page Chatbot.
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [titleDraft, setTitleDraft] = useState<string>("")
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus()
  }, [isEditingTitle])

  // Quitte le mode édition si le titre affiché change ailleurs (changement
  // de conversation, navigation vers une autre page…).
  useEffect(() => {
    setIsEditingTitle(false)
  }, [title])

  const startEditingTitle = (): void => {
    if (!hasActiveConversation || title === null) return
    setTitleDraft(title)
    setIsEditingTitle(true)
  }

  const commitTitleEdit = (): void => {
    const next = titleDraft.trim()
    if (next !== "" && title !== null && next !== title) {
      onRename(next)
    }
    setIsEditingTitle(false)
  }

  const cancelTitleEdit = (): void => {
    setIsEditingTitle(false)
    setTitleDraft("")
  }

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b bg-background border-b-foreground/20 py-8 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" />

          {/* Titre de conversation + renommage : uniquement affiché quand la
              page Chatbot a enregistré des données dans le store. */}
          {title !== null && (
            <div className="ml-1 flex min-w-0 items-center gap-2 border-l pl-3">
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitleEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitTitleEdit()
                    }
                    if (e.key === "Escape") {
                      e.preventDefault()
                      cancelTitleEdit()
                    }
                  }}
                  className="h-8 max-w-60 border-cyan-300 px-2 text-sm font-semibold tracking-tight text-forground placeholder:text-foreground/50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEditingTitle}
                  disabled={!hasActiveConversation}
                  className="group flex max-w-[220px] items-center gap-1.5 rounded-md text-left disabled:cursor-default"
                >
                  <h1 className="max-w-[220px] truncate text-sm leading-tight font-semibold tracking-tight text-foreground">
                    {title}
                  </h1>
                  {hasActiveConversation && (
                    <Pencil
                      size={12}
                      className="ml-1 shrink-0 text-foreground/80 transition-opacity"
                    />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {title !== null && (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Options : ouvre le Sheet historique */}
            <button
              onClick={onOpenHistory}
              aria-label="Options de la conversation"
              className="flex items-center gap-1.5 rounded-lg border border-b-4 border-slate-400 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <History size={14} className="text-cyan-700" />
              Conversation
            </button>

            {/* Mobile sidebar (paramètres du chatbot) toggle */}
            <button
              onClick={onOpenMobileSidebar}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-slate-600 md:hidden"
            >
              <Settings size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}