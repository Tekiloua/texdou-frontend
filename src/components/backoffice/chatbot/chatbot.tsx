import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateConversationRequest } from "@/api/api"
import { useChatbotHeaderStore } from "../store/useChatbotHeaderStore"
import { useKnowledgeBaseStore } from "./store/useKnowledgeBaseStore"
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
} from "./hooks/useConversations"
import {
  MessageList,
  SHIMMER_STYLE,
  toDisplayMessage,
  type Message,
} from "./chat-message-list"
import { ChatComposer } from "./chat-composer"
import { HistorySheet, SettingsSheet } from "./chat-panels"

// ── ChatPanel ─────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  activeId: number | null
  onConversationCreated: (id: number) => void
  onOpenSidebar: () => void
  onOpenHistory: () => void
  onRename: (id: number, titre: string) => void
}

function ChatPanel({
  activeId,
  onConversationCreated,
  onOpenSidebar,
  onOpenHistory,
  onRename,
}: ChatPanelProps) {
  const [input, setInput] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  // true pendant la création de la conversation + l'attente de la toute
  // première réponse de l'assistant (cas : on tape sans conversation active).
  const [isStartingConversation, setIsStartingConversation] =
    useState<boolean>(false)
  // id du message assistant à animer en "machine à écrire" (celui qui vient
  // d'arriver) — les autres messages de l'historique s'affichent directement.
  const [animatingId, setAnimatingId] = useState<string | number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: conversationDetail, isLoading: isLoadingConversation } =
    useConversation(activeId)

  const createConversation = useCreateConversation()
  const sendMessage = useSendMessage()

  // Base de connaissance sélectionnée dans le Sheet "Connaissance" du
  // SiteHeader (KnowledgeSheet). Les ids des textes cochés sont envoyés avec
  // chaque message pour restreindre la recherche RAG côté backend
  // (cf. message_route.py : texte_ids -> filtre "source" sur ChromaDB).
  const baseIds = useKnowledgeBaseStore((s) => s.baseIds)

  const messages: Message[] = useMemo(() => {
    const raw = conversationDetail?.messages ?? []
    // Tri défensif : le backend trie normalement par id, mais on se prémunit
    // ici d'un ordre imparfait (ex. égalité de created_at) en triant d'abord
    // par date puis, à égalité, par id numérique (les ids optimistes,
    // préfixés "optimistic-", sont non-numériques et restent en fin de liste
    // via NaN, ce qui est acceptable car ils sont toujours ajoutés en dernier).
    const sorted = [...raw].sort((a, b) => {
      const dateDiff = +new Date(a.created_at) - +new Date(b.created_at)
      if (dateDiff !== 0) return dateDiff
      const aId = Number(a.id)
      const bId = Number(b.id)
      if (Number.isNaN(aId) || Number.isNaN(bId)) return 0
      return aId - bId
    })
    return sorted.map(toDisplayMessage)
  }, [conversationDetail])

  const hasMessages = messages.length > 0
  const typing = sendMessage.isPending

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, typing])

  // On ne veut pas rejouer l'animation de frappe si on change de conversation
  // ou qu'on revient plus tard sur celle-ci.
  useEffect(() => {
    setAnimatingId(null)
  }, [activeId])

  const doSend = useCallback(
    async (rawText: string): Promise<void> => {
      const text = rawText.trim()
      if (!text || typing || isStartingConversation) return

      setInput("")
      setError(null)
      if (inputRef.current) inputRef.current.style.height = "auto"

      const wasWithoutConversation = activeId === null
      if (wasWithoutConversation) setIsStartingConversation(true)

      try {
        let convId = activeId
        // Aucune conversation active : on en crée une avant d'envoyer le message,
        // puis on bascule directement dessus.
        if (convId === null) {
          const created = await createConversation.mutateAsync(
            text.slice(0, 40) + (text.length > 40 ? "…" : "")
          )
          convId = created.id
          onConversationCreated(created.id)
        }

        const result = await sendMessage.mutateAsync({
          conversationId: convId,
          contenu: text,
          // Snapshot de la sélection au moment de l'envoi : si l'utilisateur
          // modifie sa base de connaissance juste après avoir cliqué sur
          // "envoyer", on ne veut pas que ça affecte ce message déjà parti.
          texteIds: Array.from(baseIds),
        })
        // Déclenche l'animation de frappe sur le message assistant qui vient
        // d'arriver plutôt que de l'afficher d'un seul coup.
        setAnimatingId(result.assistant_message.id)
      } catch {
        setError("Une erreur s'est produite. Veuillez réessayer.")
      } finally {
        if (wasWithoutConversation) setIsStartingConversation(false)
        inputRef.current?.focus()
      }
    },
    [
      activeId,
      typing,
      isStartingConversation,
      createConversation,
      sendMessage,
      onConversationCreated,
      baseIds,
    ]
  )

  const handleSendClick = useCallback(
    (): Promise<void> => doSend(input),
    [doSend, input]
  )

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSendClick()
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  // Purement décoratif pour le moment : aucun endpoint backend ne consomme
  // encore ce choix (le modèle utilisé est fixé côté serveur).
  const [selectedModel, setSelectedModel] = useState<string>("Sonnet 5")
  const [selectedEffort, setSelectedEffort] = useState<string>("Faible")

  const title =
    activeId !== null
      ? (conversationDetail?.titre ?? "Conversation")
      : "Assistant IA"

  const setChatbotHeader = useChatbotHeaderStore((s) => s.setChatbotHeader)
  const resetChatbotHeader = useChatbotHeaderStore((s) => s.reset)

  // Pousse le titre + les actions (renommer, ouvrir l'historique, ouvrir le
  // panneau paramètres mobile) dans le store lu par le SiteHeader global.
  useEffect(() => {
    setChatbotHeader({
      title: hasMessages ? title : "Assistant IA",
      hasActiveConversation: activeId !== null,
      onRename: (titre: string) => {
        if (activeId !== null) onRename(activeId, titre)
      },
      onOpenHistory,
      onOpenMobileSidebar: onOpenSidebar,
    })
  }, [
    title,
    hasMessages,
    activeId,
    onRename,
    onOpenHistory,
    onOpenSidebar,
    setChatbotHeader,
  ])

  // Nettoie le store quand on quitte la page Chatbot, pour que les autres
  // pages du backoffice n'affichent pas un titre de conversation obsolète.
  useEffect(() => {
    return () => resetChatbotHeader()
  }, [resetChatbotHeader])

  return (
    <div className="flex min-h-0 flex-1 flex-col sm:p-2 md:p-4">
      <Card className="relative mx-auto flex h-full w-full flex-col overflow-hidden border-transparent bg-background ring-0">
        {/* Body: welcome or messages — seule cette zone scrolle */}
        <CardContent
          className={`mx-40 flex min-h-0 flex-1 flex-col overflow-y-auto py-2 sm:mx-6 md:mx-40 lg:mx-40 ${hasMessages ? "" : "mt-10 sm:mt-20"}`}
        >
          <MessageList
            activeId={activeId}
            isStartingConversation={isStartingConversation}
            isLoadingConversation={isLoadingConversation}
            hasMessages={hasMessages}
            messages={messages}
            typing={typing}
            animatingId={animatingId}
            onAnimationDone={() => setAnimatingId(null)}
            error={error}
            onSend={(p) => void doSend(p)}
            bottomRef={bottomRef}
          />
        </CardContent>
        <CardFooter>
          <div className="mx-auto flex w-full shrink-0 px-2 sm:px-4 sm:py-4 sm:pb-6">
            <ChatComposer
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              onSend={() => void handleSendClick()}
              disabled={typing || isStartingConversation}
              hasMessages={hasMessages}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              selectedEffort={selectedEffort}
              onSelectEffort={setSelectedEffort}
              inputRef={inputRef}
            />
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export const Chatbot = () => {
  const [activeId, setActiveId] = useState<number | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [historyOpen, setHistoryOpen] = useState<boolean>(false)

  const queryClient = useQueryClient()
  const { data: conversations = [], isLoading } = useConversations()
  const deleteConversation = useDeleteConversation()

  // Renommage d'une conversation : PUT /conversations/{id} (titre).
  const renameConversation = useMutation({
    mutationFn: ({ id, titre }: { id: number; titre: string }) =>
      updateConversationRequest(id, { titre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.invalidateQueries({ queryKey: ["conversation"] })
    },
  })

  // Simulation : pas d'endpoint backend pour le total de tokens consommés.
  const totalTokensUsed = 87_432

  const handleNew = (): void => {
    setActiveId(null)
  }

  const handleDelete = (id: number): void => {
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (activeId === id) {
          const next = conversations.find((c) => c.id !== id)
          setActiveId(next?.id ?? null)
        }
      },
    })
  }

  const handleRename = (id: number, titre: string): void => {
    renameConversation.mutate({ id, titre })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <style>{SHIMMER_STYLE}</style>
      <ChatPanel
        activeId={activeId}
        onConversationCreated={setActiveId}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        onRename={handleRename}
      />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        conversations={conversations}
        activeId={activeId}
        isLoading={isLoading}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
        onRename={handleRename}
      />
      <SettingsSheet
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        totalTokensUsed={totalTokensUsed}
      />
    </div>
  )
}