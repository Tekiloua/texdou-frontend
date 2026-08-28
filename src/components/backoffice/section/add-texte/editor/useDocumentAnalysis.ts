import { useEffect, useState } from "react"
import { SERVER_URL } from "@/api/api"

// ── Analyse en direct des fichiers importés (mini console de progression) ──
// Ce store est un singleton en dehors de React (pas un store Zustand) car il
// doit survivre au démontage du composant qui a déclenché l'analyse (ex:
// changement d'onglet Éditeur/Prévisualisation) et permettre à plusieurs
// composants de s'abonner à la même progression sans dupliquer les requêtes
// réseau. `useDocumentAnalysis` expose juste un pont React (useState +
// subscribe) par-dessus.

export interface PageProgress {
  page: number
  totalPages: number
  status: "processing" | "done"
  score?: number
  // Texte (Markdown) extrait de cette page par le VLM — envoyé par le
  // backend dans l'event "page_done". Sert au préremplissage de l'éditeur
  // Lexical une fois le fichier terminé (voir `getFullText` ci-dessous et
  // la bannière de validation dans document-section.tsx).
  text?: string
}

export interface FileAnalysis {
  filename: string
  pages: PageProgress[]
  status: "queued" | "processing" | "done" | "error"
  error?: string
  // Une fois `status === "done"` et qu'il y a du texte extrait, la
  // bannière de validation ("Insérer" / "Ignorer") est affichée tant que
  // ce champ vaut "pending". Elle passe à "resolved" dès que
  // l'utilisateur a tranché — `dismiss()` retire ensuite réellement
  // l'entrée (bannière + ligne de la console).
  insertion: "none" | "pending" | "resolved"
}

// Forme brute des events SSE envoyés par /qualites-documents/analyze-stream.
interface SseEvent {
  type: "page_start" | "page_done" | "file_done" | "error"
  filename: string
  page?: number
  total_pages?: number
  score?: number
  // Texte Markdown extrait de la page — envoyé par le backend dans le
  // payload de l'event "page_done".
  text?: string
  message?: string
}

// ── Suggestions combinées (résumé, mots-clés, métadonnées) ─────────────────
// Contrairement au texte extrait (par fichier, bannière ValidationBanner),
// ces suggestions portent sur le texte combiné de TOUS les fichiers importés
// — un même contenu pouvant être scindé en plusieurs PDF (ex: un texte coupé
// en deux). Déclenchées manuellement (bouton "Générer suggestions", voir
// mots-cles-resume-section.tsx), pas automatiquement à la fin de chaque
// fichier.
export type SuggestionStatus = "idle" | "loading" | "pending" | "resolved" | "error"

// Suggestions de préremplissage pour informations-complementaires-section.tsx
// et titre-classification-section.tsx, extraites par le backend depuis le
// texte combiné des documents importés. Tous les champs sont optionnels : le
// backend ne renvoie que ce qu'il a réussi à identifier avec confiance.
//
// NOTE IMPLÉMENTATION : ceci suppose un nouvel endpoint backend
// POST /qualites-documents/generate-metadata-suggestions, prenant
// { texts: string[] } et renvoyant ce shape en JSON. Ce endpoint n'existe
// pas encore dans les fichiers fournis — à créer côté backend (voir
// generate-summary-keywords pour un exemple de route similaire).
export interface MetadataSuggestion {
  titre?: string
  numero?: string
  date_mise_en_vigueur?: string
  nom_signataire?: string
  titre_signataire?: string
  // Nom textuel plutôt qu'id : le matching avec les catégories/statuts/
  // thèmes déjà chargés (fetchCategories/fetchStatuts/fetchThemes) se fait
  // côté frontend (titre-classification-section.tsx), le backend n'a pas à
  // connaître les ids internes.
  categorie_nom?: string
  statut_nom?: string
  theme_noms?: string[]
}

export interface CombinedSuggestion {
  summary?: string
  summaryStatus: SuggestionStatus
  keywords?: string[]
  keywordsStatus: SuggestionStatus
  metadata?: MetadataSuggestion
  // Statuts SÉPARÉS pour les deux bannières qui consomment `metadata`,
  // bien que les deux viennent du même appel réseau
  // (generateMetadataSuggestions) : informations-complementaires-section.tsx
  // (numero/date/signataires) et titre-classification-section.tsx
  // (titre/catégorie/statut/thème). Sans cette séparation, résoudre l'une
  // des deux bannières (Insérer/Ignorer) faisait disparaître l'autre aussi,
  // puisqu'elles partageaient le même statut "resolved".
  adminMetadataStatus: SuggestionStatus
  titreMetadataStatus: SuggestionStatus
  // true dès qu'AU MOINS un fichier a produit du texte exploitable, une
  // fois pour toutes — contrairement à un calcul dérivé de `analyses`, ce
  // flag n'est JAMAIS remis à false par un dismiss() de bannière. C'est ce
  // qui permet au bouton "Générer suggestions" (mots-cles-resume-section.tsx)
  // de rester actif même après que l'utilisateur a inséré/ignoré le texte
  // extrait d'un fichier.
  hasExtractableText: boolean
  error?: string
}

const idleCombinedSuggestion: CombinedSuggestion = {
  summaryStatus: "idle",
  keywordsStatus: "idle",
  adminMetadataStatus: "idle",
  titreMetadataStatus: "idle",
  hasExtractableText: false,
}

type Listener = (state: Map<string, FileAnalysis>) => void
type CombinedListener = (combined: CombinedSuggestion) => void

class AnalysisStore {
  private state = new Map<string, FileAnalysis>()
  private listeners = new Set<Listener>()

  private combined: CombinedSuggestion = idleCombinedSuggestion
  private combinedListeners = new Set<CombinedListener>()

  // Pool persistant du texte extrait de chaque fichier, INDÉPENDANT du
  // cycle de vie des bannières (`insertion`/`dismiss`). C'est la source de
  // vérité pour la génération de résumé/mots-clés/métadonnées : dismiss()
  // retire l'entrée de `this.state` (donc de l'affichage), mais le texte
  // déjà extrait reste disponible ici pour une génération ultérieure.
  private extractedTexts: string[] = []
  private extractedTextKeys = new Set<string>()

  // Debounce du déclenchement automatique de generateMetadataSuggestions()
  // (voir recordExtractedText ci-dessous) : si plusieurs fichiers terminent
  // leur extraction à quelques centaines de ms d'écart, on regroupe ça en
  // un seul appel réseau portant sur tout le texte déjà disponible, plutôt
  // que de déclencher une requête par fichier.
  private metadataAutoTriggerTimer: ReturnType<typeof setTimeout> | null = null
  private static readonly METADATA_AUTO_TRIGGER_DELAY_MS = 600

  // File d'attente des fichiers à analyser. Les pages d'un même fichier
  // sont déjà traitées séquentiellement côté backend (une à la fois) ; ici
  // on applique la même règle au niveau fichier — un seul flux SSE ouvert
  // à la fois — plutôt que de lancer un fetch par fichier en parallèle
  // (ce que faisait le `forEach` appelant analyzeFile pour chaque fichier
  // importé simultanément).
  private queue: File[] = []
  private processing = false

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    fn(new Map(this.state))
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    const snapshot = new Map(this.state)
    this.listeners.forEach((fn) => fn(snapshot))
  }

  subscribeCombined(fn: CombinedListener) {
    this.combinedListeners.add(fn)
    fn(this.combined)
    return () => {
      this.combinedListeners.delete(fn)
    }
  }

  private emitCombined() {
    this.combinedListeners.forEach((fn) => fn(this.combined))
  }

  // Clé stable pour un File donné (nom + date de dernière modif), cohérente
  // avec la clé utilisée pour les miniatures dans lexical-doc-editor.tsx.
  keyFor(file: File) {
    return `${file.name}-${file.lastModified}`
  }

  // Point d'entrée public : ajoute le fichier à la file d'attente au lieu
  // de démarrer son analyse immédiatement. Affiche tout de suite une ligne
  // "en attente" dans la console pour un retour visuel instantané, même si
  // un autre fichier est encore en cours de traitement.
  analyzeFile(file: File) {
    const key = this.keyFor(file)
    if (!this.state.has(key)) {
      this.state.set(key, {
        filename: file.name,
        pages: [],
        status: "queued",
        insertion: "none",
      })
      this.emit()
    }
    this.queue.push(file)
    void this.processQueue()
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const file = this.queue.shift()!
      await this.runAnalysis(file)
    }

    this.processing = false
  }

  private async runAnalysis(file: File) {
    const key = this.keyFor(file)
    const entry = this.state.get(key)
    if (entry) entry.status = "processing"
    this.emit()

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`${SERVER_URL}/qualites-documents/analyze-stream`, {
        method: "POST",
        body: formData,
        // Même comportement que l'instance axios `api` (withCredentials:
        // true) : le cookie access_token doit être envoyé, sinon la route
        // (si protégée) répondrait 401 plutôt que de streamer.
        credentials: "include",
      })

      if (!res.ok || !res.body) {
        throw new Error(`Requête d'analyse échouée (HTTP ${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Les events SSE sont séparés par une ligne vide ("\n\n"). Le
        // dernier fragment de `buffer` peut être un event incomplet
        // (coupé par le découpage réseau) : on le remet en attente pour
        // le prochain chunk plutôt que de tenter un JSON.parse partiel.
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() ?? ""

        for (const raw of chunks) {
          const line = raw.replace(/^data:\s*/, "").trim()
          if (!line) continue
          try {
            this.handleEvent(key, JSON.parse(line) as SseEvent)
          } catch (parseErr) {
            console.error("Event SSE invalide :", line, parseErr)
          }
        }
      }

      const finalEntry = this.state.get(key)
      if (finalEntry && finalEntry.status === "processing") {
        // Le flux s'est terminé sans event "file_done" explicite (ex:
        // connexion coupée en fin de traitement) — on considère l'analyse
        // terminée plutôt que de laisser la console bloquée en "en cours".
        finalEntry.status = "done"
        finalEntry.insertion = this.getFullText(finalEntry).trim()
          ? "pending"
          : "none"
        this.recordExtractedText(key, finalEntry)
        this.emit()
      }
    } catch (err) {
      const errorEntry = this.state.get(key)
      if (errorEntry) {
        errorEntry.status = "error"
        errorEntry.error = err instanceof Error ? err.message : "Erreur inconnue"
        this.emit()
      }
    }
  }

  private handleEvent(key: string, evt: SseEvent) {
    const entry = this.state.get(key)
    if (!entry) return

    switch (evt.type) {
      case "page_start": {
        let p = entry.pages.find((pg) => pg.page === evt.page)
        if (!p) {
          p = {
            page: evt.page!,
            totalPages: evt.total_pages ?? evt.page!,
            status: "processing",
          }
          entry.pages.push(p)
        } else {
          p.status = "processing"
        }
        break
      }
      case "page_done": {
        let p = entry.pages.find((pg) => pg.page === evt.page)
        if (!p) {
          p = {
            page: evt.page!,
            totalPages: evt.total_pages ?? evt.page!,
            status: "done",
          }
          entry.pages.push(p)
        }
        p.status = "done"
        p.score = evt.score
        p.text = evt.text
        break
      }
      case "file_done": {
        entry.status = "done"
        // Bannière de préremplissage affichée uniquement s'il y a du texte
        // exploitable — pas de bannière pour un fichier dont aucune page
        // n'a produit de texte (ex: pages blanches, échec d'extraction).
        entry.insertion = this.getFullText(entry).trim() ? "pending" : "none"
        this.recordExtractedText(key, entry)
        break
      }
      case "error": {
        entry.status = "error"
        entry.error = evt.message
        break
      }
    }

    this.emit()
  }

  // Concatène le texte extrait de chaque page (dans l'ordre des pages),
  // séparé par une ligne vide — c'est ce Markdown qui est proposé à
  // l'insertion dans l'éditeur Lexical via la bannière de validation, et
  // aussi la matière première des suggestions combinées.
  getFullText(entry: FileAnalysis) {
    return [...entry.pages]
      .sort((a, b) => a.page - b.page)
      .map((p) => p.text ?? "")
      .filter((t) => t.trim().length > 0)
      .join("\n\n")
  }

  // Enregistre le texte extrait d'un fichier terminé dans le pool
  // persistant `extractedTexts`, une seule fois par fichier (idempotent —
  // un même fichier peut terminer via "file_done" ou via le fallback de fin
  // de flux dans runAnalysis, jamais les deux, mais on se protège quand
  // même d'un double appel). Met aussi à jour `hasExtractableText`, qui ne
  // redescend JAMAIS à false une fois passé à true (voir dismiss()).
  private recordExtractedText(key: string, entry: FileAnalysis) {
    if (this.extractedTextKeys.has(key)) return
    const text = this.getFullText(entry)
    if (!text.trim()) return

    this.extractedTextKeys.add(key)
    this.extractedTexts.push(text)

    if (!this.combined.hasExtractableText) {
      this.combined = { ...this.combined, hasExtractableText: true }
      this.emitCombined()
    }

    // Déclenchement automatique des suggestions de préremplissage
    // (informations complémentaires + titre/classification) dès qu'un
    // fichier termine son extraction — au même moment que l'apparition de
    // la bannière "Texte extrait de « fichier »" (ValidationBanner, voir
    // document-section.tsx). L'utilisateur n'a donc plus besoin de cliquer
    // sur "Générer suggestions" pour voir ces deux bannières-là ; ce bouton
    // reste utile pour (re)générer le résumé et les mots-clés, ou pour
    // relancer les suggestions de métadonnées manuellement.
    this.scheduleAutoMetadataSuggestions()
  }

  private scheduleAutoMetadataSuggestions() {
    if (this.metadataAutoTriggerTimer) {
      clearTimeout(this.metadataAutoTriggerTimer)
    }
    this.metadataAutoTriggerTimer = setTimeout(() => {
      this.metadataAutoTriggerTimer = null
      void this.generateMetadataSuggestions()
    }, AnalysisStore.METADATA_AUTO_TRIGGER_DELAY_MS)
  }

  // Marque la bannière comme tranchée (insérée ou ignorée) sans retirer
  // l'entrée — évite un flash si un autre code s'appuie encore sur
  // `analyses` pendant la même mise à jour.
  resolveInsertion(key: string) {
    const entry = this.state.get(key)
    if (!entry) return
    entry.insertion = "resolved"
    this.emit()
  }

  // Retire complètement une entrée (bannière + ligne de la mini console) —
  // appelé après resolveInsertion, une fois l'action de l'utilisateur
  // traitée. IMPORTANT : ceci ne touche PAS à `extractedTexts` — le bouton
  // "Générer suggestions" (résumé/mots-clés/métadonnées) reste utilisable
  // après un dismiss, avec tout le texte déjà extrait jusque-là.
  dismiss(key: string) {
    const entry = this.state.get(key)
    if (!entry) return
    if (entry.insertion === "pending") return

    this.state.delete(key)
    this.emit()
  }

  // Point d'entrée public : combine le texte déjà extrait de tous les
  // fichiers terminés et demande au backend un résumé + mots-clés sur
  // l'ensemble. Le nombre de mots-clés demandé est proportionnel à la
  // longueur du contenu (~1 mot-clé pour 20 mots), avec un plancher de 5
  // pour rester utile sur de courts documents.
  async generateSummaryKeywords() {
    const texts = this.extractedTexts
    if (texts.length === 0) return

    const totalWords = texts
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
    const keywordsCount = Math.max(5, Math.round(totalWords / 20))

    this.combined = { ...this.combined, summaryStatus: "loading", keywordsStatus: "loading" }
    this.emitCombined()

    try {
      const res = await fetch(
        `${SERVER_URL}/qualites-documents/generate-summary-keywords`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // `keywords_count` : le backend actuel renvoie peut-être toujours
          // un nombre fixe (ex: 5) s'il ne lit pas encore ce champ — voir
          // generate-summary-keywords côté backend pour l'ajouter s'il ne
          // le fait pas déjà.
          body: JSON.stringify({ texts, keywords_count: keywordsCount }),
          credentials: "include",
        }
      )

      if (!res.ok) {
        throw new Error(`Requête échouée (HTTP ${res.status})`)
      }

      const data = (await res.json()) as {
        summary?: string | null
        keywords?: string[] | null
      }

      this.combined = {
        ...this.combined,
        summary: data.summary ?? undefined,
        summaryStatus: data.summary?.trim() ? "pending" : "idle",
        keywords: data.keywords ?? undefined,
        keywordsStatus: data.keywords && data.keywords.length > 0 ? "pending" : "idle",
      }
    } catch (err) {
      this.combined = {
        ...this.combined,
        summaryStatus: "error",
        keywordsStatus: "error",
        error: err instanceof Error ? err.message : "Erreur inconnue",
      }
    }

    this.emitCombined()
  }

  // Demande au backend des suggestions de préremplissage pour les champs
  // administratifs (numéro, date, signataires) et de classification
  // (catégorie/statut/thème), à partir du même pool de texte extrait.
  //
  // NÉCESSITE un endpoint backend POST
  // /qualites-documents/generate-metadata-suggestions qui n'existe pas
  // encore dans les fichiers fournis — voir MetadataSuggestion ci-dessus
  // pour le shape de réponse attendu.
  async generateMetadataSuggestions() {
    const texts = this.extractedTexts
    if (texts.length === 0) return

    this.combined = {
      ...this.combined,
      adminMetadataStatus: "loading",
      titreMetadataStatus: "loading",
    }
    this.emitCombined()

    try {
      const res = await fetch(
        `${SERVER_URL}/qualites-documents/generate-metadata-suggestions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts }),
          credentials: "include",
        }
      )

      if (!res.ok) {
        throw new Error(`Requête échouée (HTTP ${res.status})`)
      }

      const data = (await res.json()) as MetadataSuggestion

      // Chaque bannière n'apparaît que si les champs qu'elle consomme sont
      // effectivement présents dans la réponse — indépendamment l'une de
      // l'autre (voir adminMetadataStatus/titreMetadataStatus ci-dessus).
      const hasAdminSuggestion = Boolean(
        data.numero ||
          data.date_mise_en_vigueur ||
          data.nom_signataire ||
          data.titre_signataire
      )
      const hasTitreSuggestion = Boolean(
        data.titre ||
          data.categorie_nom ||
          data.statut_nom ||
          (data.theme_noms && data.theme_noms.length > 0)
      )

      this.combined = {
        ...this.combined,
        metadata: data,
        adminMetadataStatus: hasAdminSuggestion ? "pending" : "idle",
        titreMetadataStatus: hasTitreSuggestion ? "pending" : "idle",
      }
    } catch (err) {
      this.combined = {
        ...this.combined,
        adminMetadataStatus: "error",
        titreMetadataStatus: "error",
        error: err instanceof Error ? err.message : "Erreur inconnue",
      }
    }

    this.emitCombined()
  }

  // Déclenche le résumé + les mots-clés — c'est ce qu'appelle le bouton
  // "Générer suggestions" (mots-cles-resume-section.tsx). Les suggestions
  // de métadonnées (titre/classification/informations complémentaires) ne
  // sont PLUS déclenchées ici : elles le sont automatiquement dès la fin de
  // l'extraction de chaque fichier (voir recordExtractedText /
  // scheduleAutoMetadataSuggestions ci-dessus). Les inclure encore ici
  // ferait réapparaître ces bannières à chaque clic sur ce bouton, même
  // après que l'utilisateur les ait déjà insérées ou ignorées.
  async generateAllSuggestions() {
    await this.generateSummaryKeywords()
  }

  resolveCombinedSummary() {
    this.combined = { ...this.combined, summaryStatus: "resolved" }
    this.emitCombined()
  }

  resolveCombinedKeywords() {
    this.combined = { ...this.combined, keywordsStatus: "resolved" }
    this.emitCombined()
  }

  resolveCombinedAdminMetadata() {
    this.combined = { ...this.combined, adminMetadataStatus: "resolved" }
    this.emitCombined()
  }

  resolveCombinedTitreMetadata() {
    this.combined = { ...this.combined, titreMetadataStatus: "resolved" }
    this.emitCombined()
  }
}

// Singleton partagé par toute l'application.
export const analysisStore = new AnalysisStore()

export function useDocumentAnalysis() {
  const [state, setState] = useState<Map<string, FileAnalysis>>(new Map())
  const [combined, setCombined] = useState<CombinedSuggestion>(idleCombinedSuggestion)

  useEffect(() => analysisStore.subscribe(setState), [])
  useEffect(() => analysisStore.subscribeCombined(setCombined), [])

  return {
    analyses: state,
    analyzeFile: (file: File) => analysisStore.analyzeFile(file),
    getFullText: (entry: FileAnalysis) => analysisStore.getFullText(entry),
    resolveInsertion: (key: string) => analysisStore.resolveInsertion(key),
    dismiss: (key: string) => analysisStore.dismiss(key),

    combined,
    // true dès qu'au moins un fichier a produit du texte exploitable, et le
    // reste pour toute la session (indépendant des dismiss de bannières) —
    // voir hasExtractableText dans CombinedSuggestion.
    hasExtractableText: combined.hasExtractableText,
    generateSummaryKeywords: () => analysisStore.generateSummaryKeywords(),
    generateMetadataSuggestions: () => analysisStore.generateMetadataSuggestions(),
    generateAllSuggestions: () => analysisStore.generateAllSuggestions(),
    resolveCombinedSummary: () => analysisStore.resolveCombinedSummary(),
    resolveCombinedKeywords: () => analysisStore.resolveCombinedKeywords(),
    resolveCombinedAdminMetadata: () => analysisStore.resolveCombinedAdminMetadata(),
    resolveCombinedTitreMetadata: () => analysisStore.resolveCombinedTitreMetadata(),
  }
}