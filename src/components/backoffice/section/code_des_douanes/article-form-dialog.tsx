import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  articleSchema,
  type Article,
  type ArticleFormValues,
  type Chapitre,
} from "./types/code-douane-types"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  chapitres: Chapitre[]
  /** Article en cours de modification (undefined = création) */
  article?: Article
  /** Chapitre présélectionné (création depuis un chapitre, ou chapitre actuel de l'article) */
  chapitreId?: number
  onSubmit: (values: ArticleFormValues) => void
}

/** Dialog d'ajout / modification d'un article */
export const ArticleFormDialog = ({
  open,
  onOpenChange,
  chapitres,
  article,
  chapitreId,
  onSubmit,
}: Props) => {
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: { chapitre_id: chapitreId, numero: "", titre: "", contenu: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        chapitre_id: chapitreId ?? chapitres[0]?.id,
        numero: article?.numero ?? "",
        titre: article?.titre ?? "",
        contenu: article?.contenu ?? "",
      })
    }
  }, [open, article, chapitreId])

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{article ? "Modifier l'article" : "Ajouter un article"}</DialogTitle>
          <DialogDescription>
            Renseignez le numéro, le titre et le contenu de l'article.
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
            <label className="text-sm font-medium">Chapitre</label>
            <Controller
              control={form.control}
              name="chapitre_id"
              render={({ field }) => (
                <Select
                  value={field.value !== undefined ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger className="border border-slate-300">
                    <SelectValue placeholder="Choisir un chapitre" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapitres.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        Chapitre {c.numero} — {c.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.chapitre_id && <p className="text-xs font-medium text-red-500">{errors.chapitre_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="art-numero" className="text-sm font-medium">Numéro</label>
            <Input id="art-numero" placeholder="Ex. 5" className="border border-slate-300" {...form.register("numero")} />
            {errors.numero && <p className="text-xs font-medium text-red-500">{errors.numero.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="art-titre" className="text-sm font-medium">Titre</label>
            <Input id="art-titre" placeholder="Ex. Territoire douanier" className="border border-slate-300" {...form.register("titre")} />
            {errors.titre && <p className="text-xs font-medium text-red-500">{errors.titre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="art-contenu" className="text-sm font-medium">Contenu</label>
            <Textarea id="art-contenu" rows={6} className="border border-slate-300" {...form.register("contenu")} />
            {errors.contenu && <p className="text-xs font-medium text-red-500">{errors.contenu.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-cyan-700 hover:bg-cyan-800">
              {article ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}