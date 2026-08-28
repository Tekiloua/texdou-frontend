import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import {
  addTexte,
  fetchLiensUtilesByTexteId,
  fetchTexteById,
  updateTexte,
  type LienUtileInputPayload,
  type TexteCreatePayload,
  type TexteReferenceInputPayload,
  type TexteUpdatePayload,
} from "@/api/api"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { FileText, Send } from "lucide-react"
import { toast } from "sonner"

import type { TexteFormValues } from "./types/types"
import { useAddTexteStore } from "./store/useAddTexteStore"

import { TitreClassificationSection } from "./titre-classification-section"
import { DocumentSection } from "./document-section"
import { InformationsComplementairesSection } from "./informations-complementaires-section"
import { MotsClesResumeSection } from "./mots-cles-resume-section"
import {
  PublishTerminal,
  formatIngestProgressLine,
  type PublishStatus,
} from "./editor/publish-terminal"
import { subscribeIngestProgress } from "@/api/api"

// ─── Composant principal ────────────────────────────────────────────────────
// Orchestre le formulaire "Ajouter / Modifier un texte juridique" : logique
// de formulaire (react-hook-form), chargement/soumission (react-query),
// dialogues de confirmation, et assemble les 4 sections dédiées :
//   1. TitreClassificationSection      — titre + catégorie/statut/thème
//   2. DocumentSection                 — éditeur du document principal
//   3. InformationsComplementairesSection — métadonnées (hors mots-clés),
//      références liées et liens utiles
//   4. MotsClesResumeSection           — mots-clés + résumé
// Les états partagés entre ces sections (sélections de classification,
// contenu Lexical, fichiers, références, liens utiles, suivi des
// modifications) vivent dans le store Zustand `useAddTexteStore`.
export const AddTexteSection = () => {
  // ─── Mode édition : présence d'un :id dans l'URL ────────────────────────
  const { id } = useParams<{ id?: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm<TexteFormValues>({
    defaultValues: {
      titre: "",
      numero: "",
      dateMiseEnVigueur: "",
      nomSignataire: "",
      titreSignataire: "",
      motsCles: "",
    },
  })

  // ─── États partagés (store Zustand) ─────────────────────────────────────
  const categories = useAddTexteStore((s) => s.categories)
  const statuts = useAddTexteStore((s) => s.statuts)
  const themes = useAddTexteStore((s) => s.themes)
  const documentHtml = useAddTexteStore((s) => s.documentHtml)
  const resumeHtml = useAddTexteStore((s) => s.resumeHtml)
  const files = useAddTexteStore((s) => s.files)
  const references = useAddTexteStore((s) => s.references)
  const liensUtiles = useAddTexteStore((s) => s.liensUtiles)
  const contentDirty = useAddTexteStore((s) => s.contentDirty)
  const setContentDirty = useAddTexteStore((s) => s.setContentDirty)
  const setClassification = useAddTexteStore((s) => s.setClassification)
  const setDocumentHtml = useAddTexteStore((s) => s.setDocumentHtml)
  const setResumeHtml = useAddTexteStore((s) => s.setResumeHtml)
  const setLiensUtiles = useAddTexteStore((s) => s.setLiensUtiles)
  const setHasPrefilled = useAddTexteStore((s) => s.setHasPrefilled)
  const documentsLoading = useAddTexteStore((s) => s.documentsLoading)
  const documentsPrefillFailed = useAddTexteStore(
    (s) => s.documentsPrefillFailed
  )
  const resetStore = useAddTexteStore((s) => s.reset)

  const [submitError, setSubmitError] = useState<string | null>(null)

  // ─── Terminal flottant d'animation de publication (chunking RAG) ────────
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle")
  const [publishLines, setPublishLines] = useState<string[]>([])
  // Fonction de désabonnement du flux SSE en cours, si un texte a déjà été
  // créé/mis à jour et qu'on écoute sa progression réelle.
  const ingestUnsubscribeRef = useRef<(() => void) | null>(null)

  // Ouvre le flux SSE de progression réelle pour ce texte, en remplaçant
  // tout flux précédent encore ouvert (ex: double soumission rapide).
  const startIngestProgressStream = (texteId: number | string) => {
    ingestUnsubscribeRef.current?.()
    setPublishLines([])
    ingestUnsubscribeRef.current = subscribeIngestProgress(texteId, (event) => {
      if (event.type === "error") {
        setSubmitError(event.message ?? "Échec de l'indexation RAG.")
        setPublishStatus("error")
        ingestUnsubscribeRef.current?.()
        ingestUnsubscribeRef.current = null
        return
      }
      const line = formatIngestProgressLine(event)
      if (line) setPublishLines((prev) => [...prev, line])
      if (event.type === "done") {
        setPublishStatus("success")
        ingestUnsubscribeRef.current?.()
        ingestUnsubscribeRef.current = null
      }
    })
  }

  // Coupe proprement le flux SSE si le composant est démonté pendant qu'il
  // est encore ouvert (ex: navigation manuelle avant la fin).
  useEffect(() => {
    return () => {
      ingestUnsubscribeRef.current?.()
    }
  }, [])

  // ─── Suivi des modifications non enregistrées (pour la confirmation de
  // sortie), en plus du `isDirty` de react-hook-form qui ne couvre que les
  // champs enregistrés via `register`. ────────────────────────────────────
  const isFormDirty = isDirty || contentDirty
  // Passe à true une fois le préremplissage terminé, pour ne pas considérer
  // le préremplissage lui-même comme une modification de l'utilisateur.
  const hasPrefilledRef = useRef(false)

  // ─── Dialogues de confirmation ──────────────────────────────────────────
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

  // ─── Chargement du texte existant (mode édition) ────────────────────────
  const {
    data: existingTexte,
    isLoading: isLoadingTexte,
    error: errorTexte,
  } = useQuery({
    queryKey: ["texte", id],
    queryFn: () => fetchTexteById(id as string),
    enabled: isEditMode,
  })

  // ─── Chargement des liens utiles existants (mode édition) ───────────────
  // Requête séparée : la route /textes/{id} ne renvoie pas les liens
  // utiles, il faut donc les charger via /textes/{id}/liens-utiles.
  const { data: existingLiensUtiles } = useQuery({
    queryKey: ["texte", id, "liens-utiles"],
    queryFn: () => fetchLiensUtilesByTexteId(id as string),
    enabled: isEditMode,
  })

  // ─── Préremplissage du formulaire en mode édition ───────────────────────
  useEffect(() => {
    if (!isEditMode || !existingTexte || hasPrefilledRef.current) return

    reset({
      titre: existingTexte.titre ?? "",
      numero: existingTexte.numero ?? "",
      dateMiseEnVigueur: existingTexte.date_mise_en_vigueur
        ? String(existingTexte.date_mise_en_vigueur).slice(0, 10)
        : "",
      nomSignataire: existingTexte.signataire_nom ?? "",
      titreSignataire: existingTexte.signataire_titre ?? "",
      motsCles: existingTexte.mots_cles ?? "",
    })

    if (existingTexte.categorie_id != null) {
      setClassification(
        "categories",
        new Set([String(existingTexte.categorie_id)])
      )
    }
    if (existingTexte.statut_id != null) {
      setClassification("statuts", new Set([String(existingTexte.statut_id)]))
    }
    // Le endpoint /textes/{id} renvoie les noms des thèmes (pas leurs ids) ;
    // s'ils sont un jour exposés en ids, on pourra les mapper directement ici.

    setDocumentHtml(existingTexte.contenu_html ?? "")
    setResumeHtml(existingTexte.resume ?? "")

    // Marque le préremplissage comme terminé après le prochain rendu, pour
    // que les mises à jour ci-dessus ne soient pas comptées comme des
    // modifications utilisateur par les effets qui suivent.
    setTimeout(() => {
      hasPrefilledRef.current = true
      setHasPrefilled(true)
    }, 0)
  }, [
    isEditMode,
    existingTexte,
    reset,
    setClassification,
    setDocumentHtml,
    setResumeHtml,
    setHasPrefilled,
  ])

  // ─── Préremplissage des liens utiles en mode édition ────────────────────
  // Effet séparé du précédent car les liens utiles arrivent d'une requête
  // distincte (`existingLiensUtiles`), potentiellement résolue à un autre
  // moment que `existingTexte`. On réutilise l'id serveur comme clé locale
  // (au lieu d'un crypto.randomUUID) pour permettre une suppression stable.
  const liensUtilesPrefilledRef = useRef(false)
  useEffect(() => {
    if (!isEditMode || !existingLiensUtiles || liensUtilesPrefilledRef.current)
      return

    const map = new Map(
      existingLiensUtiles.map((lien) => [
        String(lien.id),
        {
          id: String(lien.id),
          titre: lien.titre ?? "",
          url: lien.url ?? "",
          entite: lien.entite,
        },
      ])
    )
    setLiensUtiles(map)
    liensUtilesPrefilledRef.current = true
  }, [isEditMode, existingLiensUtiles, setLiensUtiles])

  // ─── Confirmation de sortie : rafraîchissement / fermeture d'onglet ─────
  // Uniquement en mode édition — à la création, quitter sans publier est un
  // choix normal (brouillon abandonné), pas une perte de modification.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isEditMode || !isFormDirty) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isEditMode, isFormDirty])

  // ─── Confirmation de sortie : navigation interne (clic sur un lien) ─────
  // On n'utilise pas useBlocker (API interne à react-router-dom, absente
  // selon la version installée) : à la place, on intercepte en phase de
  // capture tout clic sur un <a> interne du document. C'est ce que rendent
  // les <Link> de react-router — ça fonctionne donc quel que soit le
  // routeur utilisé (BrowserRouter classique ou data router).
  const isFormDirtyRef = useRef(isEditMode && isFormDirty)
  useEffect(() => {
    isFormDirtyRef.current = isEditMode && isFormDirty
  }, [isEditMode, isFormDirty])

  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isFormDirtyRef.current) return

      const target = (e.target as HTMLElement)?.closest("a")
      if (!target) return

      const href = target.getAttribute("href")
      if (!href || href.startsWith("#")) return
      // Ignore les liens externes / ouverture dans un nouvel onglet
      if (target.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey)
        return

      e.preventDefault()
      e.stopPropagation()
      setPendingHref(href)
      setLeaveDialogOpen(true)
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  const confirmLeave = () => {
    setLeaveDialogOpen(false)
    hasPrefilledRef.current = false
    setContentDirty(false)
    isFormDirtyRef.current = false
    if (pendingHref) navigate(pendingHref)
    setPendingHref(null)
  }

  const cancelLeave = () => {
    setLeaveDialogOpen(false)
    setPendingHref(null)
  }

  // Le backend renvoie normalement `detail` comme une chaîne, mais en cas
  // d'erreur de validation FastAPI "brute" (non interceptée côté serveur),
  // `detail` peut être un tableau d'objets {type, loc, msg}. On sécurise
  // l'affichage ici pour ne jamais tenter de rendre un objet dans le JSX.
  const extractErrorMessage = (err: unknown, fallback: string): string => {
    const detail = (err as { response?: { data?: { detail?: unknown } } })
      ?.response?.data?.detail

    if (typeof detail === "string") return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "string"
            ? item
            : ((item as { msg?: string })?.msg ?? JSON.stringify(item))
        )
        .join(" ; ")
    }
    if (detail && typeof detail === "object") return JSON.stringify(detail)
    return fallback
  }

  // ─── Publication : POST /add-texte (multipart : texte + fichiers +
  // références + liens utiles) ─────────────────────────────────────────────
  const publishMutation = useMutation({
    mutationFn: ({
      payload,
      files,
      references,
      liensUtiles,
    }: {
      payload: TexteCreatePayload
      files: File[]
      references: TexteReferenceInputPayload[]
      liensUtiles: LienUtileInputPayload[]
    }) => addTexte(payload, files, references, liensUtiles),
    onSuccess: (data: { id?: number | string }) => {
      setSubmitError(null)
      toast.success("Texte publié avec succès")
      // Le statut passe à "success" seulement quand le flux SSE reçoit
      // l'event "done" (voir startIngestProgressStream) — la création du
      // texte elle-même a réussi, mais l'indexation RAG tourne encore en
      // tâche de fond à ce stade.
      if (data?.id != null) {
        startIngestProgressStream(data.id)
      } else {
        // Filet de sécurité si la réponse ne contient pas d'id exploitable
        // (ne devrait pas arriver) : on ne bloque pas l'utilisateur sur un
        // terminal qui n'aura jamais de progression.
        setPublishStatus("success")
      }
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(
        err,
        "Une erreur est survenue lors de la publication du texte."
      )
      setSubmitError(message)
      toast.error("Échec de la publication", { description: message })
      setPublishStatus("error")
    },
  })

  // ─── Modification : PUT /textes/{id} ────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      payload,
      files,
      references,
      liensUtiles,
    }: {
      payload: TexteUpdatePayload
      // undefined = ne pas toucher aux documents liés (voir performSubmit :
      // c'est le cas si le préremplissage a échoué, pour ne jamais envoyer
      // un `files` incomplet qui ferait supprimer des documents existants).
      files: File[] | undefined
      references: TexteReferenceInputPayload[]
      liensUtiles: LienUtileInputPayload[]
    }) =>
      updateTexte(id as string, payload, {
        ...(files !== undefined ? { files } : {}),
        references,
        liensUtiles,
      }),
    onSuccess: () => {
      setSubmitError(null)
      toast.success("Modifications enregistrées avec succès")
      hasPrefilledRef.current = false
      liensUtilesPrefilledRef.current = false
      setContentDirty(false)
      // id déjà connu (mode édition, vient de l'URL) — pas besoin d'attendre
      // la réponse pour ouvrir le flux de progression réelle.
      if (id) {
        startIngestProgressStream(id)
      } else {
        setPublishStatus("success")
      }
      queryClient.invalidateQueries({ queryKey: ["textes"] })
      queryClient.invalidateQueries({ queryKey: ["texte", id] })
      // La navigation est différée jusqu'à la fermeture du terminal
      // (handlePublishTerminalClose) : naviguer tout de suite démonterait
      // la page — et le terminal avec — avant que l'utilisateur ait vu
      // l'animation se terminer.
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(
        err,
        "Une erreur est survenue lors de l'enregistrement des modifications."
      )
      setSubmitError(message)
      toast.error("Échec de l'enregistrement", { description: message })
      setPublishStatus("error")
    },
  })

  const isSaving = publishMutation.isPending || updateMutation.isPending

  const [pendingValues, setPendingValues] = useState<TexteFormValues | null>(
    null
  )

  const performSubmit = (values: TexteFormValues) => {
    setSubmitError(null)

    // Sécurité supplémentaire : si le préremplissage async des documents
    // existants (mode édition) n'est pas terminé, `files` ne reflète pas
    // encore l'état réel et soumettre supprimerait les documents liés côté
    // backend (voir documentsLoading dans useAddTexteStore). Le bouton est
    // déjà désactivé dans ce cas, mais on bloque aussi ici par sécurité.
    if (isEditMode && documentsLoading) {
      setSubmitError(
        "Chargement des documents existants en cours, veuillez patienter avant d'enregistrer."
      )
      return
    }

    // Le backend attend un categorie_id et un statut_id uniques : on prend
    // le premier élément sélectionné dans chaque arbre de cases à cocher.
    const categorieId =
      categories.size > 0 ? Number(Array.from(categories)[0]) : null
    const statutId = statuts.size > 0 ? Number(Array.from(statuts)[0]) : null

    if (!categorieId) {
      setSubmitError("Veuillez sélectionner une catégorie.")
      return
    }
    if (!statutId) {
      setSubmitError("Veuillez sélectionner un statut.")
      return
    }

    // Les candidats de référence du store (sélectionnés dans la section
    // "Références") sont dénormalisés pour l'affichage (titre, catégorie,
    // statut...) ; on ne garde ici que les champs attendus par le backend.
    // `id` désigne le texte référencé lui-même → texte_lie_id.
    const referencesPayload: TexteReferenceInputPayload[] = Array.from(
      references.values()
    ).map((ref) => ({
      titre: ref.titre || null,
      numero: ref.numero,
      date_mise_en_vigueur: ref.date_mise_en_vigueur,
      categorie: ref.categorie,
      statut: ref.statut,
      lien_url: null,
      texte_lie_id: Number(ref.id),
    }))

    // Les candidats de lien utile du store n'ont pas de texte_id (déduit
    // côté serveur, comme pour les références) : on ne garde que
    // titre/url/entite attendus par LienUtileInputPayload. `id` local
    // (uuid en création, id serveur réutilisé en édition) ne fait pas
    // partie du payload envoyé.
    const liensUtilesPayload: LienUtileInputPayload[] = Array.from(
      liensUtiles.values()
    ).map((lien) => ({
      titre: lien.titre || null,
      url: lien.url || null,
      entite: lien.entite,
    }))

    if (isEditMode) {
      const payload: TexteUpdatePayload = {
        titre: values.titre || "vide",
        numero: values.numero || "vide",
        date_mise_en_vigueur: values.dateMiseEnVigueur || null,
        signataire_nom: values.nomSignataire || "vide",
        signataire_titre: values.titreSignataire || "vide",
        resume: resumeHtml || "vide",
        mots_cles: values.motsCles || "vide",
        contenu_html: documentHtml || "vide",
        categorie_id: categorieId,
        statut_id: statutId,
        theme_ids: Array.from(themes)
          .map(Number)
          .filter((n) => Number.isFinite(n)),
      }

      // Documents à conserver/ajouter : `files` doit représenter l'état
      // COMPLET voulu pour ce texte (les documents déjà liés que
      // l'utilisateur n'a pas retirés + les nouveaux). Le backend compare
      // chaque fichier envoyé (nom + taille) aux documents déjà liés pour
      // savoir lesquels garder tels quels, lesquels sont nouveaux, et
      // lesquels retirer (absents de `files`).
      //
      // Si le préremplissage a échoué totalement ou partiellement
      // (documentsPrefillFailed), `files` ne représente PAS fidèlement les
      // documents déjà liés — un ou plusieurs n'ont pas pu être
      // retéléchargés. Dans ce cas on omet volontairement `files` de la
      // requête : le backend (files_provided=false) ne touchera alors à
      // AUCUN document, ce qui est plus sûr qu'un envoi incomplet qui
      // supprimerait les documents manquants.
      if (documentsPrefillFailed) {
        const warning =
          "Certains documents existants n'ont pas pu être rechargés : ils n'ont pas été modifiés lors de cet enregistrement. Rafraîchissez la page et réessayez si besoin."
        setSubmitError(warning)
        toast.warning("Documents non vérifiés", { description: warning })
      }

      setPublishStatus("running")
      updateMutation.mutate({
        payload,
        files: documentsPrefillFailed ? undefined : files,
        references: referencesPayload,
        liensUtiles: liensUtilesPayload,
      })
      return
    }

    // Tous les champs de TexteCreate sont renseignés avec une valeur par
    // défaut plutôt que null : TexteResponse exige entre autres wp_id,
    // numero, titre et publish en valeurs non nulles (int/str requis) —
    // c'est ce qui provoquait la ResponseValidationError sur wp_id (None
    // envoyé, alors qu'aucun champ wp_id n'existe dans ce formulaire).
    const payload: TexteCreatePayload = {
      titre: values.titre || "vide",
      numero: values.numero || "vide",
      date_mise_en_vigueur: values.dateMiseEnVigueur || null,
      signataire_nom: values.nomSignataire || "vide",
      signataire_titre: values.titreSignataire || "vide",
      resume: resumeHtml || "vide",
      mots_cles: values.motsCles || "vide",
      contenu_html: documentHtml || "vide",
      categorie_id: categorieId,
      statut_id: statutId,
      // note_presentation_id est une vraie clé étrangère vers la table
      // `documents` (contrainte textes_note_presentation_id_fkey) — 0 n'y
      // existe pas et fait échouer l'insertion. Contrairement à wp_id
      // (pas de FK), on doit envoyer null tant qu'aucun document n'est
      // sélectionné dans le formulaire.
      theme_ids: Array.from(themes)
        .map(Number)
        .filter((n) => Number.isFinite(n)),
      publish: 1,
    }

    setPublishStatus("running")

    publishMutation.mutate({
      payload,
      files,
      references: referencesPayload,
      liensUtiles: liensUtilesPayload,
    })
  }

  // En mode édition, on demande toujours confirmation avant d'enregistrer.
  // En mode création on publie directement (comportement inchangé).
  const onSubmit = handleSubmit((values) => {
    if (isEditMode) {
      setPendingValues(values)
      setSaveDialogOpen(true)
      return
    }
    performSubmit(values)
  })

  const confirmSave = () => {
    if (pendingValues) performSubmit(pendingValues)
    setSaveDialogOpen(false)
  }

  // Fermeture du terminal de publication : c'est à ce moment (pas au
  // succès de la mutation) qu'on navigue hors de la page en mode édition,
  // pour laisser le temps à l'utilisateur de voir l'animation se terminer.
  const handleClosePublishTerminal = () => {
    const wasSuccess = publishStatus === "success"
    ingestUnsubscribeRef.current?.()
    ingestUnsubscribeRef.current = null
    setPublishStatus("idle")
    setPublishLines([])
    if (isEditMode && wasSuccess) {
      navigate("/douane/backoffice")
    }
  }

  // Vide entièrement le formulaire (mode création uniquement) : champs
  // react-hook-form ET store Zustand (classification, contenu Lexical,
  // fichiers, références, liens utiles). Appelé depuis le bouton
  // "Réinitialiser" du terminal de publication, une fois la publication
  // terminée avec succès.
  const handleResetForm = () => {
    reset({
      titre: "",
      numero: "",
      dateMiseEnVigueur: "",
      nomSignataire: "",
      titreSignataire: "",
      motsCles: "",
    })
    resetStore()
    setSubmitError(null)
    handleClosePublishTerminal()
  }

  if (isEditMode && isLoadingTexte) {
    return (
      <div className="flex h-[90vh] w-full items-center justify-center bg-slate-50 text-sm font-medium text-slate-400">
        Chargement du texte à modifier…
      </div>
    )
  }

  if (isEditMode && errorTexte) {
    return (
      <div className="flex h-[90vh] w-full items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Impossible de charger ce texte.
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-350">
        {/* ── En-tête ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {isEditMode
                  ? "Modifier le texte juridique"
                  : "Nouveau texte juridique"}
              </h1>
              <p className="text-sm text-slate-500">
                {isEditMode
                  ? "Modifiez et reclassifiez ce texte douanier"
                  : "Rédigez et classifiez un texte douanier"}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={isSaving || (isEditMode && documentsLoading)}
                className="gap-1 border border-b-4 border-foreground/20 bg-background px-2 text-foreground hover:bg-muted"
              >
                <Send className="h-4 w-4" />
                {isEditMode
                  ? isSaving
                    ? "Enregistrement…"
                    : documentsLoading
                      ? "Chargement des documents…"
                      : "Enregistrer modification"
                  : isSaving
                    ? "Publication…"
                    : "Publier"}
              </Button>
            </div>
            {(submitError || errors.titre) && (
              <p className="text-xs text-red-500">
                {submitError ?? "Le titre est obligatoire."}
              </p>
            )}
            {publishMutation.isSuccess && !submitError && !isEditMode && (
              <p className="text-xs text-emerald-600">
                Texte publié avec succès.
              </p>
            )}
          </div>
        </div>

        {/* ── Layout pleine largeur (colonne unique) ── */}
        <div className="space-y-5">
          {/* 1. Titre + Catégorie / Statut / Thème */}
          <TitreClassificationSection
            register={register}
            setValue={setValue}
            getValues={getValues}
            titreError={Boolean(errors.titre)}
          />

          {/* 2. Document principal — éditeur agrandi, pleine largeur */}
          <DocumentSection isEditMode={isEditMode} />

          {/* 3. Informations complémentaires (sans mots-clés), références
              et liens utiles */}
          <InformationsComplementairesSection
            register={register}
            setValue={setValue}
            getValues={getValues}
            currentTexteId={id}
          />

          {/* 4. Mots-clés + Résumé */}
          <MotsClesResumeSection
            register={register}
            setValue={setValue}
            getValues={getValues}
            watch={watch}
            isEditMode={isEditMode}
          />
        </div>
      </div>

      {/* Confirmation d'enregistrement des modifications */}
      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enregistrer les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les modifications apportées à ce texte vont être enregistrées
              définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-10">
            <AlertDialogCancel disabled={isSaving}>Annuler</AlertDialogCancel>
            <Button onClick={confirmSave} disabled={isSaving}
            className="h-8 w-[30%] rounded-xl border-b-4 border-slate-900 bg-slate-200 text-black hover:bg-slate-300 hover:text-black active:border-none"
            >
              {isSaving ? "Enregistrement…" : "Confirmer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation de sortie sans enregistrer (navigation interne) */}
      <AlertDialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (!open) cancelLeave()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter sans enregistrer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non enregistrées. Si vous quittez
              maintenant, elles seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-10">
            <AlertDialogCancel
              onClick={cancelLeave}
              className="h-8 border-b-4 border-slate-900 bg-slate-200 hover:bg-slate-300 active:border-none"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 w-[30%] border-b-4 border-red-400 bg-rose-100 text-red-800 hover:bg-rose-200 hover:text-red-800 active:border-none"
              onClick={confirmLeave}
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminal flottant d'animation de publication (chunking RAG) */}
      <PublishTerminal
        status={publishStatus}
        lines={publishLines}
        errorMessage={submitError}
        onClose={handleClosePublishTerminal}
        showReset={!isEditMode}
        onReset={handleResetForm}
      />
    </div>
  )
}