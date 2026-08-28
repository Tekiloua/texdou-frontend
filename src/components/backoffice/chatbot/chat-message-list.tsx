import { useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { Bot, Check, Copy, Loader2, Sparkles } from "lucide-react"
import MarkdownIt from "markdown-it"
import DOMPurify from "dompurify"
import type { MessageRecord } from "@/api/api"

// ── Types (côté affichage) ────────────────────────────────────────────────────

export type MessageRole = "user" | "bot"

export interface Message {
  id: string | number
  role: MessageRole
  text: string
  ts: Date
}

export function toDisplayMessage(m: MessageRecord): Message {
  return {
    id: m.id,
    role: m.role === "assistant" ? "bot" : "user",
    text: m.contenu,
    ts: new Date(m.created_at),
  }
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── ReasoningIndicator ───────────────────────────────────────────────────────
// Affiché tant que la réponse de l'assistant n'est pas encore disponible.
// Icône qui pulse + libellé à effet "shimmer" dont le texte tourne, dans le
// style des indicateurs de réflexion de Claude.

const REASONING_PHRASES = [
  "Réflexion en cours",
  "Analyse de la demande",
  "Préparation de la réponse",
]

// Exporté pour être injecté une seule fois au niveau racine (voir chatbot.tsx).
export const SHIMMER_STYLE = `
.shimmer-text {
  background: linear-gradient(90deg, #94a3b8 25%, #0f172a 50%, #94a3b8 75%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shimmer-move 1.6s linear infinite;
}
@keyframes shimmer-move {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`

function ReasoningIndicator() {
  const [phraseIndex, setPhraseIndex] = useState<number>(0)

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % REASONING_PHRASES.length)
    }, 1900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mb-3 flex items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-700">
        <Bot size={14} className="text-white" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3">
        <Sparkles size={13} className="shrink-0 animate-pulse text-cyan-600" />
        <span className="shimmer-text text-xs font-medium">
          {REASONING_PHRASES[phraseIndex]}…
        </span>
      </div>
    </div>
  )
}

// ── MarkdownContent ───────────────────────────────────────────────────────────
// Rendu markdown des réponses de l'assistant via markdown-it (le LLM est
// instruit pour répondre en Markdown). Le HTML généré est assaini avec
// DOMPurify avant injection dans le DOM.

const markdownRenderer = new MarkdownIt({
  html: false, // ignore les balises HTML brutes présentes dans le texte
  linkify: true, // transforme automatiquement les URLs en liens
  breaks: true, // un retour à la ligne simple devient <br>
})

// Ouvre les liens dans un nouvel onglet, avec rel de sécurité
const defaultLinkRender =
  markdownRenderer.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

markdownRenderer.renderer.rules.link_open = (
  tokens,
  idx,
  options,
  env,
  self
) => {
  tokens[idx].attrSet("target", "_blank")
  tokens[idx].attrSet("rel", "noopener noreferrer")
  return defaultLinkRender(tokens, idx, options, env, self)
}

function MarkdownContent({ text }: { text: string }) {
  const html = useMemo(() => {
    const rawHtml = markdownRenderer.render(text)
    return DOMPurify.sanitize(rawHtml)
  }, [text])

  return (
    <div
      className="markdown-content &[ _td]:border-slate-200 &[ _td]:px-2 &[ _td]:py-1 &[ _th]:border &[ _th]:border-slate-200 &[ _th]:px-2 &[ _th]:py-1 &[ _th}:text-left &[ _th}:font-semibold &[ _ul}:list-disc &[ _ul}:space-y-1 &[ _ul}:pl-5 space-y-2 text-sm leading-relaxed break-words text-card-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-300 [&_blockquote]:pl-3 [&_blockquote]:text-primary [&_blockquote]:italic [&_code]:rounded [&_code]:bg-card [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-slate-900 [&_em]:italic [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-primary [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-primary [&_hr]:my-3 [&_hr]:border-slate-200 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-slate-100 [&_pre_code]:px-2 [&_pre_code]:py-1 [&_pre_code]:bg-card [&_pre_code]:text-card-foreground [&_strong]:font-semibold [&_strong]:text-destructive [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── TypewriterText ────────────────────────────────────────────────────────────
// Révèle progressivement le texte final d'un message (au lieu de l'afficher
// d'un coup) pour simuler une frappe, comme sur Claude.ai. Le texte final est
// déjà disponible (pas de vrai streaming réseau) — l'animation est purement
// côté client.

interface TypewriterTextProps {
  text: string
  onDone?: () => void
}

function TypewriterText({ text, onDone }: TypewriterTextProps) {
  const [count, setCount] = useState<number>(0)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    setCount(0)
    if (!text) return

    // Nombre de caractères ajoutés par tick, borné pour que les messages
    // longs ne prennent pas une éternité à s'afficher.
    const step = Math.max(1, Math.round(text.length / 72))
    const id = setInterval(() => {
      setCount((c) => {
        const next = c + step
        if (next >= text.length) {
          clearInterval(id)
          onDoneRef.current?.()
          return text.length
        }
        return next
      })
    }, 100)

    return () => clearInterval(id)
  }, [text])

  const isTyping = count < text.length

  return (
    <span className="relative">
      <MarkdownContent text={text.slice(0, count)} />
      {isTyping && (
        <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-cyan-700 align-middle" />
      )}
    </span>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────
// Copie le texte brut du message dans le presse-papiers, avec un petit
// feedback visuel (icône qui devient une coche pendant ~1.5s).

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<boolean>(false)

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Presse-papiers indisponible (permissions, contexte non sécurisé…) :
      // on ignore silencieusement, ce n'est pas une action critique.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label="Copier le message"
      className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      {copied ? (
        <Check size={12} className="text-cyan-700" />
      ) : (
        <Copy size={12} />
      )}
    </button>
  )
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: Message
  isAnimating?: boolean
  onAnimationDone?: () => void
}

function MessageBubble({
  msg,
  isAnimating,
  onAnimationDone,
}: MessageBubbleProps) {
  const isUser = msg.role === "user"
  return (
    <div
      className={`mb-3 flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-700">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div className="flex max-w-[85%] flex-col gap-0.5 sm:max-w-[78%]">
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-sm bg-cyan-700 px-4 py-2 text-sm leading-relaxed break-words text-white"
              : "rounded-2xl rounded-tl-sm border border-slate-200 px-4 py-2 text-slate-800"
          }
        >
          {isUser ? (
            msg.text
          ) : isAnimating ? (
            <TypewriterText text={msg.text} onDone={onAnimationDone} />
          ) : (
            <MarkdownContent text={msg.text} />
          )}
        </div>

        <div
          className={`flex items-center gap-1 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}
        >
          <span className="text-[10px] text-slate-400">
            {formatTime(msg.ts)}
          </span>

          <CopyButton text={msg.text} />
        </div>
      </div>
    </div>
  )
}

// ── WelcomeScreen ─────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  onSend: (text: string) => void
}

function WelcomeScreen({ onSend: _onSend }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-4 text-center sm:px-6 sm:py-6">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-700 sm:h-16 sm:w-16">
        <Bot size={24} className="text-white sm:hidden" />
        <Bot size={28} className="hidden text-white sm:block" />
      </div>
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        Comment puis-je vous aider ?
      </h2>
      <p className="mb-8 max-w-sm text-sm text-foreground/60">
        Posez-moi n'importe quelle question, je suis là pour vous assister.
      </p>
    </div>
  )
}

// ── BigLoader ─────────────────────────────────────────────────────────────────
// Affiché en plein écran de la zone de chat pendant la création de la
// conversation et l'attente de la toute première réponse de l'assistant.

function BigLoader() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center sm:px-6 sm:py-12">
      <div className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-2xl bg-cyan-400 opacity-40" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-700 sm:h-16 sm:w-16">
          <Bot size={28} className="text-white sm:hidden" />
          <Bot size={32} className="hidden text-white sm:block" />
        </div>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-800">
          L'assistant réfléchit…
        </p>
        <p className="mt-1 text-sm text-foreground/80">
          Préparation de votre conversation
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {([0, 1, 2] as const).map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-cyan-700"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── MessageList ───────────────────────────────────────────────────────────────
// Composant exporté : orchestre l'état "vide / chargement / messages" du
// corps de la conversation. Toute la logique d'affichage vit ici, ChatPanel
// ne fait que lui transmettre son état.

interface MessageListProps {
  activeId: number | null
  isStartingConversation: boolean
  isLoadingConversation: boolean
  hasMessages: boolean
  messages: Message[]
  typing: boolean
  animatingId: string | number | null
  onAnimationDone: () => void
  error: string | null
  onSend: (text: string) => void
  bottomRef: RefObject<HTMLDivElement | null>
}

export function MessageList({
  activeId,
  isStartingConversation,
  isLoadingConversation,
  hasMessages,
  messages,
  typing,
  animatingId,
  onAnimationDone,
  error,
  onSend,
  bottomRef,
}: MessageListProps) {
  if (isStartingConversation) return <BigLoader />

  if (activeId !== null && isLoadingConversation) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        Chargement de la conversation…
      </div>
    )
  }

  if (!hasMessages) return <WelcomeScreen onSend={onSend} />

  return (
    <div>
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          isAnimating={msg.id === animatingId}
          onAnimationDone={onAnimationDone}
        />
      ))}
      {typing && <ReasoningIndicator />}
      {error !== null && (
        <div className="my-2 text-center">
          <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs text-red-500">
            {error}
          </span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
