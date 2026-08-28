import { useCallback, useState } from "react"
import type { UseFormGetValues, UseFormRegister, UseFormSetValue } from "react-hook-form"
import { BookOpen, Link2, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

import { SectionCard, FieldLabel } from "./helper/ui-helpers"
import type { LienUtileCandidate, TexteFormValues } from "./types/types"
import { useAddTexteStore } from "./store/useAddTexteStore"
import { ReferenceTextesDialog } from "./reference-textes-dialog"
import { SuggestionBanner } from "./editor/suggestion-banner"
import { useDocumentAnalysis } from "./editor/useDocumentAnalysis"
import { decodeTitle } from "@/hooks/decode-html"

interface InformationsComplementairesSectionProps {
  register: UseFormRegister<TexteFormValues>
  // Nécessaires pour appliquer la suggestion de préremplissage (numéro,
  // date, signataires) sans écraser une saisie déjà faite par l'utilisateur
  // — voir handleInsertMetadata.
  setValue: UseFormSetValue<TexteFormValues>
  getValues: UseFormGetValues<TexteFormValues>
  // Id du texte en cours d'édition (absent en mode création) — exclu de la
  // liste de sélection pour éviter qu'un texte se référence lui-même.
  currentTexteId?: string
}

// État local du mini-formulaire du dialog "Ajouter lien utile". Isolé dans
// son propre type pour éviter de le confondre avec LienUtileCandidate (qui,
// lui, représente une entrée déjà validée et ajoutée au store).
interface LienUtileFormState {
  titre: string
  url: string
  entite: string
}

const EMPTY_LIEN_UTILE_FORM: LienUtileFormState = {
  titre: "",
  url: "",
  entite: "",
}

// Métadonnées administratives : date de mise en vigueur, numéro, signataire,
// références vers d'autres textes (table textes_reference) et liens utiles
// (table liens_utiles). Les mots-clés sont volontairement exclus de cette
// section (voir MotsClesResumeSection, qui les regroupe avec le résumé).
export function InformationsComplementairesSection({
  register,
  setValue,
  getValues,
  currentTexteId,
}: InformationsComplementairesSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const references = useAddTexteStore((s) => s.references)
  const setReferences = useAddTexteStore((s) => s.setReferences)
  const removeReference = useAddTexteStore((s) => s.removeReference)

  const referenceList = Array.from(references.values())

  // ── Liens utiles (table liens_utiles) ────────────────────────────────────
  const liensUtiles = useAddTexteStore((s) => s.liensUtiles)
  const addLienUtile = useAddTexteStore((s) => s.addLienUtile)
  const removeLienUtile = useAddTexteStore((s) => s.removeLienUtile)

  const liensUtilesList = Array.from(liensUtiles.values())

  const [lienDialogOpen, setLienDialogOpen] = useState(false)
  const [lienForm, setLienForm] = useState<LienUtileFormState>(
    EMPTY_LIEN_UTILE_FORM
  )
  const [lienError, setLienError] = useState<string | null>(null)

  // ── Suggestion de préremplissage (numéro, date, signataires) ────────────
  // Générée en même temps que le résumé/mots-clés (voir MotsClesResumeSection
  // -> generateAllSuggestions), affichée ici sous forme de bannière dédiée.
  const { combined, resolveCombinedAdminMetadata } = useDocumentAnalysis()
  const metadata = combined.metadata

  // Un champ administratif (hors classification/titre, gérés dans
  // titre-classification-section.tsx) est suggéré s'il est présent dans la
  // réponse backend.
  const hasAdminSuggestion = Boolean(
    metadata &&
      (metadata.numero ||
        metadata.date_mise_en_vigueur ||
        metadata.nom_signataire ||
        metadata.titre_signataire)
  )

  const adminPreview = metadata
    ? [
        metadata.numero && `Numéro : ${metadata.numero}`,
        metadata.date_mise_en_vigueur &&
          `Date : ${metadata.date_mise_en_vigueur}`,
        metadata.nom_signataire && `Signataire : ${metadata.nom_signataire}`,
        metadata.titre_signataire && `Titre : ${metadata.titre_signataire}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : ""

  // N'écrase JAMAIS un champ déjà renseigné par l'utilisateur — ne remplit
  // que les champs actuellement vides, même si la suggestion en propose une
  // valeur différente.
  const handleInsertMetadata = useCallback(() => {
    if (!metadata) return

    const fieldsToFill: Array<[keyof TexteFormValues, string | undefined]> = [
      ["numero", metadata.numero],
      ["dateMiseEnVigueur", metadata.date_mise_en_vigueur],
      ["nomSignataire", metadata.nom_signataire],
      ["titreSignataire", metadata.titre_signataire],
    ]

    for (const [field, suggestedValue] of fieldsToFill) {
      if (!suggestedValue) continue
      const currentValue = (getValues(field) as string | undefined)?.trim()
      if (currentValue) continue // déjà renseigné par l'utilisateur : on ne touche pas
      setValue(field, suggestedValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }

    resolveCombinedAdminMetadata()
  }, [metadata, getValues, setValue, resolveCombinedAdminMetadata])

  const handleIgnoreMetadata = useCallback(() => {
    resolveCombinedAdminMetadata()
  }, [resolveCombinedAdminMetadata])

  const updateLienForm = <K extends keyof LienUtileFormState>(
    field: K,
    value: LienUtileFormState[K]
  ) => setLienForm((prev) => ({ ...prev, [field]: value }))

  const resetLienForm = () => {
    setLienForm(EMPTY_LIEN_UTILE_FORM)
    setLienError(null)
  }

  const handleAddLienUtile = () => {
    const titre = lienForm.titre.trim()
    const url = lienForm.url.trim()

    if (!titre || !url) {
      setLienError("Le titre et l'URL sont obligatoires.")
      return
    }

    const nouveauLien: LienUtileCandidate = {
      id: crypto.randomUUID(),
      titre,
      url,
      entite: lienForm.entite.trim() || null,
    }

    addLienUtile(nouveauLien)
    resetLienForm()
    setLienDialogOpen(false)
  }

  return (
    <SectionCard
      icon={<BookOpen className="h-4 w-4" />}
      title="Informations complémentaires"
      subtitle="Métadonnées administratives et signataires"
    >
      {combined.adminMetadataStatus === "pending" && hasAdminSuggestion && (
        <SuggestionBanner
          title="Informations suggérées depuis les documents importés"
          preview={adminPreview}
          insertLabel="Insérer"
          onInsert={handleInsertMetadata}
          onIgnore={handleIgnoreMetadata}
        />
      )}
      {combined.adminMetadataStatus === "error" && (
        <p className="mb-3 text-xs text-red-600">
          Échec de la génération des suggestions
          {combined.error ? ` (${combined.error})` : ""}.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="dateMiseEnVigueur">
            Date de mise en vigueur
          </FieldLabel>
          <Input
            id="dateMiseEnVigueur"
            type="date"
            {...register("dateMiseEnVigueur")}
            className="border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
        </div>

        <div>
          <FieldLabel htmlFor="numero">Numéro</FieldLabel>
          <Input
            id="numero"
            {...register("numero")}
            placeholder="Ex. 2024-DC-042"
            className="border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
        </div>

        <div>
          <FieldLabel htmlFor="nomSignataire">Nom du signataire</FieldLabel>
          <Input
            id="nomSignataire"
            {...register("nomSignataire")}
            placeholder="Ex. Jean-Baptiste Rakoto"
            className="border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
        </div>

        <div>
          <FieldLabel htmlFor="titreSignataire">Titre du signataire</FieldLabel>
          <Input
            id="titreSignataire"
            {...register("titreSignataire")}
            placeholder="Ex. Directeur Général des Douanes"
            className="border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
        </div>
      </div>

      {/* ── Références vers d'autres textes ─────────────────────────────── */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <FieldLabel>Textes de référence</FieldLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-7 gap-1.5 text-xs border border-b-4 border-slate-400 font-medium text-slate-600 hover:border-cyan-700 hover:text-cyan-700"
          >
            <Link2 className="h-3.5 w-3.5" />
            Associer une référence
          </Button>
        </div>

        {referenceList.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucune référence associée pour l'instant.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {referenceList.map((ref) => (
              <li
                key={ref.id}
                className="flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-50 py-2 pr-1 pl-2.5 text-xs font-medium text-slate-700"
              >
                <span className="max-w-52 truncate">{decodeTitle(ref.titre)}</span>
                <button
                  type="button"
                  onClick={() => removeReference(ref.id)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-slate-50 bg-red-400 transition-colors hover:bg-red-200 hover:text-red-700"
                  aria-label={`Retirer ${ref.titre}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-[11px] text-slate-400">
          Les références seront enregistrées lors de la publication du texte.
        </p>
      </div>

      {/* ── Liens utiles ─────────────────────────────────────────────────── */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <FieldLabel>Liens utiles</FieldLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLienDialogOpen(true)}
            className="h-7 gap-1.5 text-xs border border-b-4 border-slate-400 font-medium text-slate-600 hover:border-cyan-700 hover:text-cyan-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter lien utile
          </Button>
        </div>

        {liensUtilesList.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucun lien utile associé pour l'instant.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {liensUtilesList.map((lien) => (
              <li
                key={lien.id}
                className="flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-50 py-2 pr-1 pl-2.5 text-xs font-medium text-slate-700"
              >
                <a
                  href={lien.url}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-52 truncate hover:underline"
                  title={lien.entite ?? undefined}
                >
                  {lien.titre}
                </a>
                <button
                  type="button"
                  onClick={() => removeLienUtile(lien.id)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-slate-50 bg-red-400 transition-colors hover:bg-red-200 hover:text-red-700"
                  aria-label={`Retirer ${lien.titre}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-[11px] text-slate-400">
          Les liens utiles seront enregistrés lors de la publication du texte.
        </p>
      </div>

      <ReferenceTextesDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selected={references}
        onConfirm={setReferences}
        excludeId={currentTexteId}
      />

      {/* ── Dialog d'ajout d'un lien utile ──────────────────────────────── */}
      <AlertDialog
        open={lienDialogOpen}
        onOpenChange={(open) => {
          setLienDialogOpen(open)
          if (!open) resetLienForm()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajouter un lien utile</AlertDialogTitle>
            <AlertDialogDescription>
              Renseignez le titre et l'URL du lien. L'entité est optionnelle.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="lienUtileTitre">Titre</Label>
              <Input
                id="lienUtileTitre"
                value={lienForm.titre}
                onChange={(e) => updateLienForm("titre", e.target.value)}
                placeholder="Ex. Portail des douanes"
                className="mt-1 border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
              />
            </div>
            <div>
              <Label htmlFor="lienUtileUrl">URL</Label>
              <Input
                id="lienUtileUrl"
                type="url"
                value={lienForm.url}
                onChange={(e) => updateLienForm("url", e.target.value)}
                placeholder="https://..."
                className="mt-1 border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
              />
            </div>
            <div>
              <Label htmlFor="lienUtileEntite">Entité (optionnel)</Label>
              <Input
                id="lienUtileEntite"
                value={lienForm.entite}
                onChange={(e) => updateLienForm("entite", e.target.value)}
                placeholder="Ex. Direction Générale des Douanes"
                className="mt-1 border-slate-300 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
              />
            </div>
            {lienError && <p className="text-xs text-red-500">{lienError}</p>}
          </div>

          <AlertDialogFooter className="gap-10">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button
              type="button"
              onClick={handleAddLienUtile}
              className="h-8 w-[30%] rounded-xl border-b-4 border-slate-900 bg-slate-200 text-black hover:bg-slate-300 hover:text-black active:border-none"
            >
              Ajouter
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}