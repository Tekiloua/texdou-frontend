import { slugify } from "@/hooks/slugify"
import type { TexteType } from "@/types"
import axios from "axios"

// Exporté (en plus d'être utilisé ci-dessous pour l'instance axios) pour les
// rares cas où un appel réseau ne peut pas passer par l'instance `api`
// (ex: streaming SSE via fetch() natif dans useDocumentAnalysis.ts, qui a
// besoin de lire le body en flux — chose qu'axios ne permet pas).
export const SERVER_URL = import.meta.env.VITE_SERVER_URL

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true, // envoie le cookie access_token automatiquement
})

// ─── Intercepteur 401 : session expirée ou absente ────────────────────────────
//
// CORRECTION : l'ancienne version ne filtrait que "/me" via isMeCheck.
// N'importe quelle autre route protégée (ex: /users, /historiques, /stats…)
// qui retournait 401 — même transitoirement au chargement, avant que le
// cookie soit transmis — déclenchait une redirection immédiate vers le login,
// provoquant des déconnexions intempestives à la navigation.
//
// On exclut désormais toutes les URLs "silencieuses" (init, auth, register)
// pour lesquelles un 401 est attendu ou géré localement par le composant.
//
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error?.config?.url ?? ""
    const status: number | undefined = error?.response?.status

    // URLs pour lesquelles un 401 ne doit JAMAIS déclencher une redirection :
    //   - /me      : appel d'initialisation au montage (useInitAuth)
    //   - /login   : identifiants incorrects → géré localement dans LoginForm
    //   - /register: numéro déjà utilisé, etc. → géré localement
    const silentUrls = ["/me", "/login", "/register"]
    const isSilent = silentUrls.some((u) => url.includes(u))

    if (status === 401 && !isSilent) {
      const publicPaths = ["/douane/manager", "/register"]
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = "/douane/manager"
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginRequest = (data: { numero: string; password: string }) =>
  api.post("/login", data).then((r) => r.data)

export const registerRequest = (data: {
  username: string
  numero: number
  password: string
}) => api.post("/register", data).then((r) => r.data)

export const logoutRequest = () => api.post("/logout")

export const fetchMe = () => api.get("/me").then((r) => r.data)

// ─── Utilisateurs (backoffice, admin) ──────────────────────────────────────

export type UserRole = "normal" | "expert" | "admin"

export interface UserRecord {
  id: number
  username: string | null
  numero: string
  role: UserRole
}

export interface UserCreatePayload {
  username?: string | null
  numero: number
  password: string
  role: UserRole
}

export interface UserUpdatePayload {
  username?: string | null
  numero?: number
  password?: string
  role?: UserRole
}

export const addUserRequest = (data: UserCreatePayload) =>
  api.post<UserRecord>("/users", data).then((r) => r.data)

export const updateUserRequest = (id: number, data: UserUpdatePayload) =>
  api.put<UserRecord>(`/users/${id}`, data).then((r) => r.data)

export const deleteUserRequest = (id: number) =>
  api.delete(`/users/${id}`).then((r) => r.data)

export const deleteUsersRequest = (ids: number[]) =>
  api.delete("/users", { data: { ids } }).then((r) => r.data)

// ─── API calls ────────────────────────────────────────────────────────────────
export const fetchCategories = () => api.get("/categories").then((r) => r.data)
export const fetchStats = () => api.get("/stats").then((r) => r.data)
export const fetchUsers = () => api.get<UserRecord[]>("/users").then((r) => r.data)
export const fetchLatestDocuments = () =>
  api.get("/latest-documents").then((r) => r.data)
export const fetchDocuments = () =>
  api.get<DocumentType[]>("/documents").then((r) => r.data)
export interface HistoriqueRecord {
  id: number
  texte_id: number | null
  texte_titre: string | null
  ancien_statut: string | null
  nouveau_statut: string | null
  numero_user: string | null
  date: string // ISO
}

export const fetchHistoriques = () =>
  api.get<HistoriqueRecord[]>("/historiques").then((r) => r.data)
export const fetchLiensUtiles = () =>
  api.get("/liens-utiles").then((r) => r.data)
export const fetchStatuts = () => api.get("/statuts").then((r) => r.data)
export const fetchTextes = () => api.get("/textes").then((r) => r.data)

// ─── Liste paginée ("voir plus") ────────────────────────────────────────────
export interface PaginatedTextesResponse {
  items: TexteType[]
  total: number
  has_more: boolean
}

export const fetchTextesPaginated = (limit: number, offset: number) =>
  api
    .get<PaginatedTextesResponse>("/textes/paginated", {
      params: { limit, offset },
    })
    .then((r) => r.data)
export const fetchTexteById = (id: string) =>
  api.get(`/textes/${id}`).then((r) => r.data)
export interface TexteDocumentAssociation {
  texte_id: number
  document_id: number
}

export const fetchTextesDocuments = () =>
  api.get<TexteDocumentAssociation[]>("/textes-documents").then((r) => r.data)

export interface DocumentType {
  id: number
  nom: string | null
  chemin_fichier: string | null
  nouveau_chemin: string | null
  mime_type: string | null
  taille_octets: number | null
  date_upload: string | null
}

export const fetchDocumentsByTexteId = (texteId: string | number) =>
  api.get<DocumentType[]>(`/textes/${texteId}/documents`).then((r) => r.data)

// Télécharge le contenu binaire d'un document déjà stocké côté serveur et le
// reconstruit en objet File natif du navigateur — pour pouvoir le réutiliser
// tel quel dans LexicalDocEditor (miniatures) et dans updateTexte (le champ
// "files" y matche par nom + taille, donc on garde nom et taille identiques
// pour que ce document ne soit pas considéré comme "nouveau" au moment du
// save et donc dupliqué côté serveur).
async function documentToFile(doc: DocumentType): Promise<File> {
  const path = doc.chemin_fichier?.replace(/^\/+/, "") // évite un double "/"
  const response = await api.get(`/${path}`, { responseType: "blob" })
  const blob: Blob = response.data
  return new File([blob], doc.nom ?? "document", {
    type: doc.mime_type ?? blob.type,
  })
}

// Version "prête à l'emploi" pour préremplir le state `files` du formulaire
// d'édition d'un texte : récupère la liste des documents liés, puis
// télécharge chacun en parallèle. Un échec isolé (fichier manquant sur le
// disque, etc.) n'empêche pas les autres documents d'être chargés — on log
// juste l'erreur et on continue avec ce qui a pu être récupéré.
//
// IMPORTANT : le résultat distingue explicitement "ce texte n'a réellement
// aucun document" de "le téléchargement a échoué" via `failedCount`. Ne
// jamais traiter un `files` vide comme équivalent à "aucun document" sans
// vérifier `failedCount === 0` — sinon un échec réseau silencieux (mauvais
// chemin, 401, fichier manquant) est interprété comme "l'utilisateur a
// retiré tous les documents" et le PUT /textes/{id} qui suit les supprime
// réellement côté backend.
export interface TexteDocumentsPrefillResult {
  files: File[]
  totalDocuments: number
  failedCount: number
}

export const fetchTexteDocumentsAsFiles = async (
  texteId: string | number
): Promise<TexteDocumentsPrefillResult> => {
  const documents = await fetchDocumentsByTexteId(texteId)
  const results = await Promise.allSettled(documents.map(documentToFile))

  let failedCount = 0
  results.forEach((r) => {
    if (r.status === "rejected") {
      failedCount += 1
      console.error("Impossible de récupérer un document existant :", r.reason)
    }
  })

  const files = results
    .filter((r): r is PromiseFulfilledResult<File> => r.status === "fulfilled")
    .map((r) => r.value)

  return { files, totalDocuments: documents.length, failedCount }
}

// ─── Statut RAG des documents d'un texte ────────────────────────────────────
export interface RagStatusEntry {
  document_id: number
  inclus: boolean
}

export const fetchRagStatusByTexteId = (texteId: string | number) =>
  api
    .get<RagStatusEntry[]>(`/textes/${texteId}/documents/rag-status`)
    .then((r) => r.data)

// Version bulk : tous les documents en un seul appel. À utiliser pour une
// liste de textes (ex: TextesTable) plutôt que fetchRagStatusByTexteId
// appelé une fois par ligne (pattern N+1).
export const fetchAllRagStatus = () =>
  api.get<RagStatusEntry[]>("/documents/rag-status").then((r) => r.data)

export interface RagIncludeResult {
  file: string
  chunks_indexed: number
  markdown_path: string
  chunks_path?: string
}

export const includeDocumentInRag = (documentId: number) =>
  api
    .post<RagIncludeResult>(`/documents/${documentId}/rag-include`)
    .then((r) => r.data)

// ─── Inclusion RAG par nom de document (case à cocher "RAG" du tableau des
// textes) ────────────────────────────────────────────────────────────────
// Bascule le champ "inclus" (0/1) de TOUS les chunks Chroma dont
// metadata["source"] correspond à un des noms de fichiers fournis (les
// documents liés au texte). Voir POST /rag/toggle-inclusion (rag_route.py).
export interface RagInclusionToggleResult {
  inclus: 0 | 1
  chunks_updated: number
  details: Record<string, number>
}

export const toggleRagInclusion = (sources: string[], inclus: 0 | 1) =>
  api
    .post<RagInclusionToggleResult>("/rag/toggle-inclusion", { sources, inclus })
    .then((r) => r.data)

export const fetchRagInclusionStatus = (sources: string[]) =>
  api
    .get<Record<string, boolean>>("/rag/inclusion-status", {
      params: { sources: sources.join(",") },
    })
    .then((r) => r.data)

// ─── Documents orphelins (non liés à un texte) ──────────────────────────────
export const fetchOrphanDocuments = () =>
  api.get<DocumentType[]>("/documents/orphelins").then((r) => r.data)

export const deleteOrphanDocument = (id: number) =>
  api.delete(`/documents/orphelins/${id}`).then((r) => r.data)

// ─── Textes Références ────────────────────────────────────────────────────────
export interface TexteReferenceType {
  id: number
  texte_id: number
  titre: string | null
  numero: string | null
  date_mise_en_vigueur: string | null
  categorie: string | null
  statut: string | null
  lien_url: string | null
  texte_lie_id: number | null
}

export const fetchReferencesByTexteId = (texteId: string | number) =>
  api
    .get<TexteReferenceType[]>(`/textes/${texteId}/references`)
    .then((r) => r.data)

export const fetchTextesReferences = () =>
  api.get("/textes-references").then((r) => r.data)

export const fetchTextesThemes = () =>
  api.get("/textes-themes").then((r) => r.data)
export const fetchThemes = () => api.get("/themes").then((r) => r.data)

// ─── Textes Liens utiles (table liens_utiles) ────────────────────────────────
// Forme renvoyée par le backend pour un lien utile déjà enregistré (donc
// avec un id serveur et son texte_id, contrairement à LienUtileInputPayload
// qui est ce qu'on ENVOIE lors de la création/édition d'un texte).
export interface LienUtileType {
  id: number
  texte_id: number
  titre: string | null
  url: string | null
  entite: string | null
}

export const fetchLiensUtilesByTexteId = (texteId: string | number) =>
  api
    .get<LienUtileType[]>(`/textes/${texteId}/liens-utiles`)
    .then((r) => r.data)

// ─── Textes : création ──────────────────────────────────────────────────────
export interface TexteCreatePayload {
  titre: string
  numero?: string | null
  date_mise_en_vigueur?: string | null
  signataire_nom?: string | null
  signataire_titre?: string | null
  resume?: string | null
  mots_cles?: string | null
  contenu_html?: string | null
  categorie_id: number
  statut_id: number
  publish?: number
  rag?: number
  theme_ids?: number[]
}

// Référence liée envoyée EN MÊME TEMPS que la création du texte : mêmes
// champs qu'une référence, mais sans texte_id (le texte n'existe pas
// encore côté serveur au moment de la requête — voir TexteReferenceInput
// dans texte_reference_schemas.py).
export interface TexteReferenceInputPayload {
  titre?: string | null
  numero?: string | null
  date_mise_en_vigueur?: string | null
  categorie?: string | null
  statut?: string | null
  lien_url?: string | null
  texte_lie_id?: number | null
}

// Lien utile envoyé EN MÊME TEMPS que la création/édition du texte : mêmes
// champs qu'un lien utile, mais sans texte_id (déduit côté serveur — voir
// LienUtileInput dans lien_utile_schemas.py).
export interface LienUtileInputPayload {
  titre?: string | null
  url?: string | null
  entite?: string | null
}

// /add-texte accepte désormais un multipart/form-data (et non plus du JSON
// pur) afin de transporter les fichiers importés (images/PDF), les
// références liées et les liens utiles en une seule requête, dans la même
// transaction que la création du texte côté backend.
//   - "texte"        : le payload du texte, sérialisé en JSON
//   - "references"   : la liste des références liées, sérialisée en JSON
//   - "liens_utiles" : la liste des liens utiles, sérialisée en JSON
//   - "files"        : un champ répété, un par fichier
// On ne fixe pas manuellement le header Content-Type : axios détecte le
// FormData et pose lui-même le bon "multipart/form-data; boundary=...".
export const addTexte = (
  payload: TexteCreatePayload,
  files: File[] = [],
  references: TexteReferenceInputPayload[] = [],
  liensUtiles: LienUtileInputPayload[] = []
) => {
  const formData = new FormData()
  formData.append("texte", JSON.stringify(payload))
  formData.append("references", JSON.stringify(references))
  formData.append("liens_utiles", JSON.stringify(liensUtiles))
  files.forEach((file) => formData.append("files", file))

  return api.post("/add-texte", formData).then((r) => r.data)
}

// ─── Progression en direct de l'indexation RAG (SSE) ─────────────────────
// Consommé par le terminal de publication : dès que l'id du texte créé/mis
// à jour est connu, on ouvre ce flux pour recevoir en direct les étapes
// réelles du chunking sémantique + embedding + upsert Chroma (voir
// GET /rag/ingest-progress/{texte_id} et _emit_ingest_progress côté
// backend). Le backend bufferise les tout premiers events si la tâche de
// fond démarre avant l'ouverture du flux, donc rien n'est perdu même en
// cas de connexion légèrement tardive.
export interface IngestProgressEvent {
  type:
    | "chunking_start"
    | "chunking_done"
    | "embedding_progress"
    | "upsert_progress"
    | "done"
    | "error"
  chunks_total?: number
  chunks_indexed?: number
  batch?: number
  total_batches?: number
  chunks_embedded?: number
  chunks_upserted?: number
  message?: string
}

export function subscribeIngestProgress(
  texteId: number | string,
  onEvent: (event: IngestProgressEvent) => void
): () => void {
  const source = new EventSource(`${SERVER_URL}/rag/ingest-progress/${texteId}`, {
    withCredentials: true,
  })

  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data) as IngestProgressEvent)
    } catch (err) {
      console.error("Event de progression RAG invalide :", e.data, err)
    }
  }

  // Le flux se ferme normalement de lui-même côté backend juste après un
  // event "done"/"error" (voir stream_ingest_progress) — un onerror ici
  // signale donc une coupure anormale (réseau, timeout proxy), pas la fin
  // normale du flux.
  source.onerror = () => {
    source.close()
  }

  return () => source.close()
}

// ─── Textes : édition / suppression ──────────────────────────────────────────
export type TexteUpdatePayload = Partial<TexteCreatePayload>

export interface TexteUpdateOptions {
  files?: File[]
  references?: TexteReferenceInputPayload[]
  liensUtiles?: LienUtileInputPayload[]
  // Réservé aux toggles dédiés (updateTexteRag / updateTextePublish) : ne
  // JAMAIS le passer à true depuis le formulaire d'édition générique, sous
  // peine d'écraser rag/publish avec la valeur par défaut du formulaire.
  statusFieldsProvided?: boolean
}

// PUT /textes/{id} accepte du multipart/form-data, comme /add-texte, pour
// transporter en même temps :
//   - "texte"        : les champs modifiés, sérialisés en JSON (mise à jour
//                      partielle : seuls les champs fournis sont pris en
//                      compte côté backend)
//   - "references"   : liste SOUHAITÉE des références liées, sérialisée en
//                      JSON. Omis = inchangé côté backend (utile pour
//                      updateTextePublish/Rag qui ne veulent toucher qu'un
//                      seul champ).
//   - "liens_utiles" : liste SOUHAITÉE des liens utiles, sérialisée en JSON.
//                      Omis = inchangé côté backend (même logique que
//                      "references"). Contrairement aux références, la
//                      liste envoyée REMPLACE entièrement l'existant côté
//                      backend (pas de diff fin par id).
//   - "files"        : état COMPLET voulu pour les documents du texte
//                      (existants conservés + nouveaux), pris en compte
//                      UNIQUEMENT si `options.files` est fourni (même
//                      convention que "references"/"liens_utiles" : absent
//                      = documents liés inchangés côté backend). Le backend
//                      compare alors chaque fichier envoyé (nom + taille)
//                      aux documents déjà liés : même nom/taille = inchangé,
//                      sinon nouveau fichier. Tout document déjà lié absent
//                      de cette liste est retiré — y compris si `options.files`
//                      est un tableau vide (`[]`), ce qui signifie alors
//                      explicitement "retirer tous les documents".
//                      N'appeler avec `options.files` que depuis le
//                      formulaire d'édition qui gère réellement les
//                      documents : les updates ponctuelles (publish/rag)
//                      ne doivent JAMAIS le fournir, pour ne pas supprimer
//                      les documents liés par accident.
export const updateTexte = (
  id: string | number,
  payload: TexteUpdatePayload,
  options?: TexteUpdateOptions
) => {
  const formData = new FormData()
  formData.append("texte", JSON.stringify(payload))

  if (options?.references !== undefined) {
    formData.append("references", JSON.stringify(options.references))
  }
  if (options?.liensUtiles !== undefined) {
    formData.append("liens_utiles", JSON.stringify(options.liensUtiles))
  }
  // `files_provided` distingue explicitement "je fournis l'état complet
  // voulu des documents (même vide)" de "je ne fournis rien, ne touche pas
  // aux documents" : un champ multipart "files" absent et un tableau vide
  // sont indiscernables côté backend, d'où ce flag séparé.
  if (options?.files !== undefined) {
    formData.append("files_provided", "true")
    options.files.forEach((file) => formData.append("files", file))
  }
  // Par défaut, rag/publish sont IGNORÉS par le backend même s'ils sont
  // présents dans `payload` (voir texte_route.py) : seuls les toggles
  // dédiés ci-dessous doivent passer `statusFieldsProvided: true`.
  if (options?.statusFieldsProvided) {
    formData.append("status_fields_provided", "true")
  }

  return api.put(`/textes/${id}`, formData).then((r) => r.data)
}

export const updateTextePublish = (id: string | number, publish: 0 | 1) =>
  updateTexte(id, { publish }, { statusFieldsProvided: true })

export const updateTexteRag = (id: string | number, rag: 0 | 1) =>
  updateTexte(id, { rag }, { statusFieldsProvided: true })

export const deleteTextes = (ids: (string | number)[]) =>
  api.delete("/textes", { data: { ids: ids.map(Number) } }).then((r) => r.data)

export const addCategorie = (values: {
  nom: string
  slug?: string
  parent_id?: string | number | null
  description?: string | null
  couleur?: string
}) =>
  api
    .post("/add-categorie", {
      nom: values.nom,
      slug: values.slug || slugify(values.nom),
      parent_id: values.parent_id ?? null,
      description: values.description || null,
      couleur: values.couleur || "#0E7490",
    })
    .then((r) => r.data)

export const deleteCategories = (ids: (string | number)[]) =>
  api.delete("/delete-categories", { data: { ids } }).then((r) => r.data)

export const addStatut = (values: {
  nom: string
  slug?: string
  parent_id?: string | number | null
  description?: string | null
  couleur?: string
}) =>
  api
    .post("/add-statut", {
      nom: values.nom,
      slug: values.slug || slugify(values.nom),
      parent_id: values.parent_id ?? null,
      description: values.description || null,
      couleur: values.couleur || "#0E7490",
    })
    .then((r) => r.data)

export const deleteStatuts = (ids: (string | number)[]) =>
  api.delete("/delete-statuts", { data: { ids } }).then((r) => r.data)

export const addTheme = (values: {
  nom: string
  slug?: string
  parent_id?: string | number | null
  description?: string | null
  couleur?: string
}) =>
  api
    .post("/add-theme", {
      nom: values.nom,
      slug: values.slug || slugify(values.nom),
      parent_id: values.parent_id ?? null,
      description: values.description || null,
      couleur: values.couleur || "#0E7490",
    })
    .then((r) => r.data)

export const deleteThemes = (ids: (string | number)[]) =>
  api.delete("/delete-themes", { data: { ids } }).then((r) => r.data)

// ─── Conversations & Messages (chatbot) ────────────────────────────────────
export type MessageRoleApi = "user" | "assistant"

export interface MessageRecord {
  id: number
  conversation_id: number
  role: MessageRoleApi
  contenu: string
  created_at: string
}

export interface ConversationRecord {
  id: number
  titre: string | null
  user_id: number
  created_at: string
  updated_at: string
}

export interface ConversationDetailRecord extends ConversationRecord {
  messages: MessageRecord[]
}

export interface ChatResponsePayload {
  user_message: MessageRecord
  assistant_message: MessageRecord
}

export const fetchConversations = () =>
  api.get<ConversationRecord[]>("/conversations").then((r) => r.data)

export const fetchConversationById = (id: number) =>
  api
    .get<ConversationDetailRecord>(`/conversations/${id}`)
    .then((r) => r.data)

export const createConversationRequest = (data?: { titre?: string | null }) =>
  api
    .post<ConversationRecord>("/conversations", data ?? {})
    .then((r) => r.data)

export const updateConversationRequest = (
  id: number,
  data: { titre?: string | null }
) =>
  api
    .put<ConversationRecord>(`/conversations/${id}`, data)
    .then((r) => r.data)

export const deleteConversationRequest = (id: number) =>
  api.delete(`/conversations/${id}`).then((r) => r.data)

export const deleteConversationsRequest = (ids: number[]) =>
  api.delete("/conversations", { data: { ids } }).then((r) => r.data)

export const sendMessageRequest = (conversationId: number, contenu: string) =>
  api
    .post<ChatResponsePayload>(`/conversations/${conversationId}/messages`, {
      contenu,
    })
    .then((r) => r.data)

// ─── À ajouter dans api.ts, juste après fetchReferencesByTexteId ──────────────

export interface TexteReferenceCreatePayload {
  texte_id: number
  titre?: string | null
  numero?: string | null
  date_mise_en_vigueur?: string | null
  categorie?: string | null
  statut?: string | null
  lien_url?: string | null
  texte_lie_id?: number | null
}

export const addTexteReference = (payload: TexteReferenceCreatePayload) =>
  api
    .post<TexteReferenceType>("/textes-references", payload)
    .then((r) => r.data)

export const fetchTextesPublics = () =>
  api.get("/textes-publics").then((r) => r.data)

export const fetchTextePubliqueById = (id: string) =>
  api.get(`/textes-publics/${id}`).then((r) => r.data)

// ─── Consommations ──────────────────────────────────────────────────────────

export interface Consommation {
  id: number
  numero: string
  input: number
  output: number
  created_at: string
}

export const fetchConsommations = (dateDebut?: string, dateFin?: string) => {
  const params: Record<string, string> = {}
  if (dateDebut) params.date_debut = dateDebut
  if (dateFin) params.date_fin = dateFin

  return api
    .get<Consommation[]>("/consommations", { params })
    .then((r) => r.data)
}

// ─── RAG (upload & indexation de documents) ─────────────────────────────────
// POST /rag/upload (rag_route.py) : accepte un ou plusieurs PDF/images en
// multipart/form-data, champ "files" répété. Chaque fichier est extrait
// (VLM), découpé en chunks, embedé et indexé dans Chroma côté serveur.
export interface RagIndexedResult {
  file: string
  chunks_indexed: number
  markdown_path: string
  chunks_path?: string
}

export interface RagErrorResult {
  file: string
  error: string
}

export interface RagUploadResponse {
  indexed: RagIndexedResult[]
  errors: RagErrorResult[]
}

export const uploadRagDocuments = (files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))

  return api
    .post<RagUploadResponse>("/rag/upload", formData)
    .then((r) => r.data)
}

export type QualiteDocumentType = {
  id: number
  document_id: number
  page: number
  blur: number
  skew: number
  noise_score: number
  black_pixel_ratio: number
  entropy: number
  brightness: number
  score: number
}

export async function fetchQualitesDocument(
  documentId: number
): Promise<QualiteDocumentType[]> {
  try {
    const { data } = await api.get(`/qualites-documents/document/${documentId}`)
    return data.pages // ton schéma QualiteDocumentListResponse a un champ "pages"
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [] // aucune qualité enregistrée pour ce doc
    }
    throw new Error("Erreur lors du chargement des qualités")
  }
}


export interface ChunkItem {
  id: number;
  embedding_id: string;
  created_at: string;
  document: string | null;
  chunk_index: number | null;
  source: string | null;
  markdown_path: string | null;
  pages: string | null;
  batch: string | null;
  // Statut d'inclusion dans la recherche RAG (0 ou 1, voir chroma_route.py
  // et POST /rag/toggle-inclusion). Par défaut à 1 côté backend.
  inclus: number;
}
 
export interface PaginatedChunks {
  items: ChunkItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
 
export interface StatsResponse {
  total_chunks: number;
  total_sources: number;
  collections: Array<{
    id: string;
    name: string;
    dimension: number | null;
    total_embeddings: number;
  }>;
}
 
export interface SourceItem {
  source: string;
  chunk_count: number;
}
 
export interface FetchChunksParams {
  page: number;
  pageSize: number;
  source?: string;
  search?: string;
}
 
// ── Fonctions API ─────────────────────────────────────────────────────────────
 
export const chromaApi = {
  getStats: (): Promise<StatsResponse> =>
    api.get("/chroma/stats").then((r) => r.data),
 
  getChunks: ({ page, pageSize, source, search }: FetchChunksParams): Promise<PaginatedChunks> =>
    api
      .get("/chroma/chunks", {
        params: {
          page,
          page_size: pageSize,
          ...(source ? { source } : {}),
          ...(search ? { search } : {}),
        },
      })
      .then((r) => r.data),
 
  getChunkById: (id: number): Promise<ChunkItem> =>
    api.get(`/chroma/chunks/${id}`).then((r) => r.data),
 
  getSources: (): Promise<SourceItem[]> =>
    api.get("/chroma/sources").then((r) => r.data),
};
 

export default api