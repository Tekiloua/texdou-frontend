import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchTextes } from "@/api/api"
import type { TexteType } from "@/types"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Link2, Search } from "lucide-react"

import type { ReferenceCandidate } from "./store/useAddTexteStore"
import { decodeTitle } from "@/hooks/decode-html"

interface ReferenceTextesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Sélection déjà confirmée (vient du store) — sert de point de départ au
  // brouillon local de la boîte de dialogue.
  selected: Map<string, ReferenceCandidate>
  onConfirm: (selected: Map<string, ReferenceCandidate>) => void
  // Le texte en cours d'édition ne doit pas pouvoir se référencer lui-même.
  excludeId?: string
}

// Boîte de dialogue de sélection multiple des textes à associer comme
// référence au texte en cours d'édition/création. La sélection n'est
// commitée dans le store qu'au clic sur "Confirmer" — l'enregistrement
// réel en base (table textes_reference) se fait plus tard, au moment de la
// publication du texte (voir add-texte-section.tsx).
export const ReferenceTextesDialog = ({
  open,
  onOpenChange,
  selected,
  onConfirm,
  excludeId,
}: ReferenceTextesDialogProps) => {
  const [search, setSearch] = useState("")
  const [draft, setDraft] = useState<Map<string, ReferenceCandidate>>(selected)

  const { data: textes, isLoading } = useQuery<TexteType[]>({
    queryKey: ["textes"],
    queryFn: fetchTextes,
    enabled: open,
  })

  // Resynchronise le brouillon sur la sélection confirmée à chaque
  // ouverture (pour repartir d'un état propre si l'utilisateur avait
  // annulé la dernière fois).
  useEffect(() => {
    if (open) setDraft(new Map(selected))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtered = useMemo(() => {
    if (!textes) return []
    const term = search.trim().toLowerCase()
    return textes
      .filter((t) => String(t.id) !== excludeId)
      .filter((t) =>
        term
          ? (t.titre ?? "").toLowerCase().includes(term) ||
            (t.numero ?? "").toLowerCase().includes(term)
          : true
      )
  }, [textes, search, excludeId])

  const toggle = (t: TexteType) => {
    setDraft((prev) => {
      const next = new Map(prev)
      const id = String(t.id)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.set(id, {
          id,
          titre: t.titre ?? "Sans titre",
          numero: t.numero ?? null,
          categorie: t.categorie ?? null,
          statut: t.statut ?? null,
          date_mise_en_vigueur: t.date_mise_en_vigueur
            ? String(t.date_mise_en_vigueur).slice(0, 10)
            : null,
        })
      }
      return next
    })
  }

  const handleConfirm = () => {
    onConfirm(draft)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-4xl bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Sélectionner des références</AlertDialogTitle>
          <AlertDialogDescription>
            Choisissez un ou plusieurs textes à associer comme référence à ce
            texte. L'association sera enregistrée lors de la publication.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre ou numéro…"
            className="border-slate-200 pl-8 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
          />
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
          {isLoading ? (
            <p className="p-4 text-center text-xs text-slate-400">
              Chargement des textes…
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">
              Aucun texte trouvé.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const id = String(t.id)
                const checked = draft.has(id)
                return (
                  <li key={id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-slate-50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(t)}
                        className="mt-0.5 border border-slate-400"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {decodeTitle(t.titre) || "Sans titre"}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                          {t.numero && <span>{t.numero}</span>}
                          {t.categorie && <span>· {t.categorie}</span>}
                          {t.statut && <span>· {t.statut}</span>}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="h-8 w-fit text-slate-900 p-4 px-8 border-b-4 border-slate-900 bg-slate-200 hover:bg-slate-300 active:border-none"
          >
            Annuler
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            className="bg-cyan-700 text-white hover:bg-cyan-800"
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Confirmer ({draft.size})
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
