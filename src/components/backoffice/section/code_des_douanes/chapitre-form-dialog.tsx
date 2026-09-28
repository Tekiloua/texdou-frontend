import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  chapitreSchema,
  type Chapitre,
  type ChapitreFormValues,
} from "./types/code-douane-types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chapitre en cours de modification (undefined = création) */
  chapitre?: Chapitre
  onSubmit: (values: ChapitreFormValues) => void
}

const EMPTY: ChapitreFormValues = { numero: "", titre: "", description: "" }

/** Dialog d'ajout / modification d'un chapitre */
export const ChapitreFormDialog = ({ open, onOpenChange, chapitre, onSubmit }: Props) => {
  const form = useForm<ChapitreFormValues>({
    resolver: zodResolver(chapitreSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        chapitre
          ? { numero: chapitre.numero, titre: chapitre.titre, description: chapitre.description }
          : EMPTY
      )
    }
  }, [open, chapitre])

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chapitre ? "Modifier le chapitre" : "Ajouter un chapitre"}</DialogTitle>
          <DialogDescription>
            Un chapitre regroupe plusieurs articles du Code des douanes.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((v) => {
            onSubmit(v)
            onOpenChange(false)
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="ch-numero" className="text-sm font-medium">Numéro</label>
            <Input id="ch-numero" placeholder="Ex. III" className="border border-slate-300" {...form.register("numero")} />
            {errors.numero && <p className="text-xs font-medium text-red-500">{errors.numero.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ch-titre" className="text-sm font-medium">Titre</label>
            <Input id="ch-titre" placeholder="Ex. Dispositions générales" className="border border-slate-300" {...form.register("titre")} />
            {errors.titre && <p className="text-xs font-medium text-red-500">{errors.titre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ch-desc" className="text-sm font-medium">Description</label>
            <Textarea id="ch-desc" rows={3} className="border border-slate-300" {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-cyan-700 hover:bg-cyan-800">
              {chapitre ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}