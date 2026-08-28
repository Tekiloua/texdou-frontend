import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchConversations,
  fetchConversationById,
  createConversationRequest,
  updateConversationRequest,
  deleteConversationRequest,
  deleteConversationsRequest,
  sendMessageRequest,
  type ConversationRecord,
  type ConversationDetailRecord,
  type MessageRecord,
} from "@/api/api"

// ─── Query keys ──────────────────────────────────────────────────────────────
export const conversationKeys = {
  all: ["conversations"] as const,
  detail: (id: number) => ["conversations", id] as const,
}

// ─── Liste des conversations ─────────────────────────────────────────────────
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.all,
    queryFn: fetchConversations,
  })
}

// ─── Détail d'une conversation (avec ses messages) ───────────────────────────
export function useConversation(id: number | null) {
  return useQuery({
    queryKey: id !== null ? conversationKeys.detail(id) : ["conversations", "none"],
    queryFn: () => fetchConversationById(id as number),
    enabled: id !== null,
  })
}

// ─── Créer une conversation ───────────────────────────────────────────────────
export function useCreateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (titre?: string | null) =>
      createConversationRequest(titre ? { titre } : undefined),
    onSuccess: (conv: ConversationRecord) => {
      queryClient.setQueryData<ConversationRecord[]>(
        conversationKeys.all,
        (prev) => (prev ? [conv, ...prev] : [conv])
      )
    },
  })
}

// ─── Renommer une conversation ────────────────────────────────────────────────
export function useUpdateConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, titre }: { id: number; titre: string | null }) =>
      updateConversationRequest(id, { titre }),
    onSuccess: (conv: ConversationRecord) => {
      queryClient.setQueryData<ConversationRecord[]>(
        conversationKeys.all,
        (prev) => prev?.map((c) => (c.id === conv.id ? conv : c))
      )
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conv.id) })
    },
  })
}

// ─── Supprimer une conversation ───────────────────────────────────────────────
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteConversationRequest(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ConversationRecord[]>(
        conversationKeys.all,
        (prev) => prev?.filter((c) => c.id !== id)
      )
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) })
    },
  })
}

// ─── Supprimer plusieurs conversations ────────────────────────────────────────
export function useDeleteConversations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => deleteConversationsRequest(ids),
    onSuccess: (_data, ids) => {
      queryClient.setQueryData<ConversationRecord[]>(
        conversationKeys.all,
        (prev) => prev?.filter((c) => !ids.includes(c.id))
      )
      ids.forEach((id) =>
        queryClient.removeQueries({ queryKey: conversationKeys.detail(id) })
      )
    },
  })
}

// Préfixe utilisé pour repérer le message utilisateur "optimiste" (affiché
// immédiatement, avant que le serveur ait répondu) et le remplacer ensuite
// par le vrai message renvoyé par le backend.
const OPTIMISTIC_ID_PREFIX = "optimistic-"

function makeOptimisticMessage(conversationId: number, contenu: string): MessageRecord {
  return {
    id: `${OPTIMISTIC_ID_PREFIX}${Date.now()}` as unknown as number,
    conversation_id: conversationId,
    role: "user",
    contenu,
    created_at: new Date().toISOString(),
  }
}

// ─── Envoyer un message (retourne message user + réponse assistant) ─────────
// L'id de conversation est passé au moment de l'appel (mutate/mutateAsync)
// plutôt qu'au moment où le hook est instancié, pour gérer correctement le
// cas où la conversation vient tout juste d'être créée (juste avant le
// premier envoi).
export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      conversationId,
      contenu,
    }: {
      conversationId: number
      contenu: string
    }) => sendMessageRequest(conversationId, contenu),
    // Affiche le message de l'utilisateur tout de suite, avant même la
    // réponse du serveur, pendant que l'assistant "réfléchit".
    onMutate: async ({ conversationId, contenu }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(conversationId) })

      const optimisticMessage = makeOptimisticMessage(conversationId, contenu)

      queryClient.setQueryData<ConversationDetailRecord | undefined>(
        conversationKeys.detail(conversationId),
        (prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, optimisticMessage] }
            : prev
      )

      return { optimisticId: optimisticMessage.id }
    },
    onSuccess: (data, { conversationId }, context) => {
      queryClient.setQueryData<ConversationDetailRecord | undefined>(
        conversationKeys.detail(conversationId),
        (prev) => {
          if (!prev) return prev
          // On retire le message optimiste et on ajoute les vrais messages
          // (user + assistant) renvoyés par le backend.
          const withoutOptimistic = prev.messages.filter(
            (m) => m.id !== context?.optimisticId
          )
          return {
            ...prev,
            messages: [...withoutOptimistic, data.user_message, data.assistant_message],
          }
        }
      )
      // Le titre / updated_at de la conversation peuvent avoir changé côté back
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    },
    // En cas d'échec, on retire le message optimiste pour ne pas laisser un
    // message "fantôme" affiché comme envoyé.
    onError: (_err, { conversationId }, context) => {
      queryClient.setQueryData<ConversationDetailRecord | undefined>(
        conversationKeys.detail(conversationId),
        (prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.filter((m) => m.id !== context?.optimisticId),
              }
            : prev
      )
    },
  })
}