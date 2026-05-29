import { ArrowUp, Bot, MessageSquare, Paperclip, Plus, Sparkles, Trash2, User, X } from "lucide-react"
import { useRef, useState } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: number
  role: "bot" | "user"
  content: string
}

interface Conversation {
  id: number
  title: string
  preview: string
  date: string
  messages: Message[]
}

// ─── Mock conversation history ────────────────────────────────────────────────

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    title: "Protection des données",
    preview: "Quelles lois protègent les données…",
    date: "Aujourd'hui",
    messages: [
      {
        id: 1,
        role: "bot",
        content:
          "Bonjour, je suis Texdou AI. Je peux vous aider à rechercher et analyser des textes officiels. Quelle est votre question ?",
      },
    ],
  },
  {
    id: 2,
    title: "Code des investissements",
    preview: "Résumé de l'ordonnance portant…",
    date: "Hier",
    messages: [
      {
        id: 1,
        role: "bot",
        content: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
      },
      {
        id: 2,
        role: "user",
        content: "Résumez l'ordonnance portant réforme du code des investissements étrangers.",
      },
      {
        id: 3,
        role: "bot",
        content:
          "L'ordonnance portant réforme du code des investissements étrangers vise à moderniser le cadre juridique applicable aux capitaux étrangers sur le territoire national. Elle introduit notamment de nouvelles garanties pour les investisseurs et simplifie les procédures d'agrément.",
      },
    ],
  },
  {
    id: 3,
    title: "Marchés publics",
    preview: "Conditions d'accès aux marchés…",
    date: "Cette semaine",
    messages: [
      {
        id: 1,
        role: "bot",
        content: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
      },
    ],
  },
]

const WELCOME_MESSAGE: Message = {
  id: 1,
  role: "bot",
  content:
    "Bonjour, je suis Texdou AI. Je peux vous aider à rechercher et analyser des textes officiels. Quelle est votre question ?",
}

// ─── Main layout ─────────────────────────────────────────────────────────────

export const Chatbot = () => {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS)
  const [activeId, setActiveId] = useState<number>(1)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activeConv = conversations.find((c) => c.id === activeId)!

  const addMessage = (content: string) => {
    const userMsg: Message = { id: Date.now(), role: "user", content }
    const botMsg: Message = {
      id: Date.now() + 1,
      role: "bot",
      content:
        "D'après votre question, voici plusieurs éléments de réponse issus des textes officiels disponibles dans la bibliothèque…",
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [...c.messages, userMsg, botMsg],
              preview: content.slice(0, 48) + (content.length > 48 ? "…" : ""),
            }
          : c
      )
    )
  }

  const newConversation = () => {
    const id = Date.now()
    const conv: Conversation = {
      id,
      title: "Nouvelle conversation",
      preview: "Démarrez en posant une question…",
      date: "Maintenant",
      messages: [{ ...WELCOME_MESSAGE, id: Date.now() }],
    }
    setConversations((prev) => [conv, ...prev])
    setActiveId(id)
  }

  const deleteConversation = (id: number) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) {
      const remaining = conversations.filter((c) => c.id !== id)
      if (remaining.length > 0) setActiveId(remaining[0].id)
      else newConversation()
    }
  }

  return (
    <div
      className="flex overflow-hidden"
      style={{
        height: "calc(100vh - 62px)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: "#F0F4FF",
      }}
    >
      {/* ── Sidebar ── */}
      <ChatSidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main panel ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex shrink-0 items-center gap-3 border-b bg-white px-5"
          style={{ height: 56, borderColor: "#E4E9F7" }}
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-[10px] border transition-all hover:bg-[#F0F4FF]"
              style={{ width: 34, height: 34, borderColor: "#E4E9F7", color: "#6B7290" }}
              title="Ouvrir le panneau"
            >
              <MessageSquare className="size-4" />
            </button>
          )}

          <div
            className="flex items-center justify-center rounded-[10px]"
            style={{ width: 34, height: 34, background: "#4F7EF7" }}
          >
            <Sparkles className="size-4 text-white" />
          </div>

          <div>
            <p className="text-sm font-bold" style={{ color: "#1A1D2E" }}>
              Texdou AI
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full"
                style={{ width: 6, height: 6, background: "#1D9E75" }}
              />
              <p className="text-[11px] font-semibold" style={{ color: "#0F6E56" }}>
                Assistant disponible
              </p>
            </div>
          </div>
        </header>

        {/* Messages + Input */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <MessageList messages={activeConv.messages} />
          <InputChat onSend={addMessage} />
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ChatSidebar = ({
  open,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: {
  open: boolean
  conversations: Conversation[]
  activeId: number
  onSelect: (id: number) => void
  onNew: () => void
  onDelete: (id: number) => void
  onClose: () => void
}) => {
  // Group by date label
  const grouped = conversations.reduce<Record<string, Conversation[]>>((acc, c) => {
    if (!acc[c.date]) acc[c.date] = []
    acc[c.date].push(c)
    return acc
  }, {})

  return (
    <aside
      className="flex shrink-0 flex-col border-r bg-white transition-all duration-200 overflow-hidden"
      style={{
        width: open ? 260 : 0,
        borderColor: "#E4E9F7",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Sidebar header */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4"
        style={{ height: 56, borderColor: "#E4E9F7" }}
      >
        <div className="flex items-center gap-2">
          <Bot className="size-4" style={{ color: "#4F7EF7" }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#8892B0" }}>
            Conversations
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg transition-all hover:bg-[#F0F4FF]"
          style={{ width: 28, height: 28, color: "#8892B0" }}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* New conversation button */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "#4F7EF7" }}
        >
          <Plus className="size-4" />
          Nouvelle conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {Object.entries(grouped).map(([date, convs]) => (
          <div key={date} className="mb-2">
            <p
              className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "#B0B8D0" }}
            >
              {date}
            </p>
            {convs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                onSelect={() => onSelect(conv.id)}
                onDelete={() => onDelete(conv.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}

const ConversationItem = ({
  conv,
  active,
  onSelect,
  onDelete,
}: {
  conv: Conversation
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group relative flex cursor-pointer items-start gap-2.5 rounded-[10px] px-3 py-2.5 transition-all"
      style={{
        background: active ? "#EBF2FF" : hovered ? "#F4F6FF" : "transparent",
      }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MessageSquare
        className="mt-0.5 size-3.5 shrink-0"
        style={{ color: active ? "#4F7EF7" : "#B0B8D0" }}
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px] font-semibold leading-tight"
          style={{ color: active ? "#4F7EF7" : "#1A1D2E" }}
        >
          {conv.title}
        </p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: "#8892B0" }}>
          {conv.preview}
        </p>
      </div>
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex shrink-0 items-center justify-center rounded-md transition-all hover:bg-red-50 hover:text-red-400"
          style={{ width: 22, height: 22, color: "#B0B8D0" }}
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  )
}

// ─── Message list ─────────────────────────────────────────────────────────────

const MessageList = ({ messages }: { messages: Message[] }) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new message
  const prevLen = useRef(messages.length)
  if (messages.length !== prevLen.current) {
    prevLen.current = messages.length
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {messages.map((msg) =>
          msg.role === "bot" ? (
            <BotMessage key={msg.id} message={msg.content} />
          ) : (
            <UserMessage key={msg.id} message={msg.content} />
          )
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Bot message ──────────────────────────────────────────────────────────────

const BotMessage = ({ message }: { message: string }) => (
  <div className="flex items-end gap-2.5">
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: "#4F7EF7" }}
    >
      <Sparkles className="size-3.5 text-white" />
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#8892B0" }}>
        Texdou AI
      </span>
      <div
        className="max-w-lg rounded-[14px] rounded-bl-[4px] px-4 py-3 text-sm leading-relaxed"
        style={{ background: "#F4F6FF", color: "#1A1D2E", border: "1.5px solid #E4E9F7" }}
      >
        {message}
      </div>
    </div>
  </div>
)

// ─── User message ─────────────────────────────────────────────────────────────

const UserMessage = ({ message }: { message: string }) => (
  <div className="flex items-end justify-end gap-2.5">
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#8892B0" }}>
        Vous
      </span>
      <div
        className="max-w-lg rounded-[14px] rounded-br-[4px] px-4 py-3 text-sm leading-relaxed text-white"
        style={{ background: "#4F7EF7" }}
      >
        {message}
      </div>
    </div>
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: "#1A1D2E" }}
    >
      <User className="size-3.5 text-white" />
    </div>
  </div>
)

// ─── Input ────────────────────────────────────────────────────────────────────

const InputChat = ({ onSend }: { onSend: (msg: string) => void }) => {
  const [value, setValue] = useState("")

  const handleSend = () => {
    if (!value.trim()) return
    onSend(value.trim())
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = value.trim().length > 0

  return (
    <div className="shrink-0 px-4 pb-5">
      <div className="mx-auto max-w-2xl">
        <div
          className="overflow-hidden rounded-[14px] border bg-white transition-all"
          style={{
            borderColor: canSend ? "#4F7EF7" : "#E4E9F7",
            boxShadow: canSend ? "0 0 0 3px #EBF2FF" : "none",
          }}
        >
          <textarea
            rows={2}
            className="w-full resize-none bg-transparent px-4 pb-2 pt-4 text-sm leading-relaxed focus:outline-none"
            style={{ color: "#1A1D2E" }}
            placeholder="Posez une question sur les textes officiels…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {/* Footer row */}
          <div
            className="flex items-center justify-between border-t px-3 py-2"
            style={{ borderColor: "#F0F4FF" }}
          >
            <button
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition-all hover:bg-[#F0F4FF]"
              style={{ color: "#8892B0" }}
            >
              <Paperclip className="size-3.5" />
              Joindre
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium" style={{ color: "#B0B8D0" }}>
                {canSend ? `${value.length} car.` : "Entrée pour envoyer"}
              </span>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="flex items-center justify-center rounded-[10px] transition-all"
                style={{
                  width: 34,
                  height: 34,
                  background: canSend ? "#4F7EF7" : "#E4E9F7",
                  color: canSend ? "#fff" : "#B0B8D0",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] font-medium" style={{ color: "#B0B8D0" }}>
          Texdou AI peut faire des erreurs — vérifiez les informations importantes.
        </p>
      </div>
    </div>
  )
}