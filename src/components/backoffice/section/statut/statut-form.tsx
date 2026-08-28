import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { slugify } from "@/hooks/slugify"
import { addStatut } from "@/api/api"
import {
  statutSchema,
  type StatutFormValues,
  type StatutRow,
} from "./types/statut-types"

interface StatutFormProps {
  flatRows: StatutRow[]
}

/** Formulaire d'ajout d'un statut (avec slug auto-généré depuis le nom) */
export function StatutForm({ flatRows }: StatutFormProps) {
  const queryClient = useQueryClient()

  const form = useForm<StatutFormValues>({
    resolver: zodResolver(statutSchema),
    defaultValues: {
      nom: "",
      slug: "",
      parent_id: null,
      description: "",
      couleur: "#0E7490",
    },
  })

  const nomValue = form.watch("nom")

  useEffect(() => {
    if (!form.getFieldState("slug").isDirty) {
      form.setValue("slug", slugify(nomValue ?? ""))
    }
  }, [nomValue])

  async function handleAdd(values: StatutFormValues): Promise<void> {
    try {
      await addStatut(values)
      await queryClient.invalidateQueries({ queryKey: ["statuts"] })
      form.reset()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        form.setError("nom", { message: error.response.data.detail })
      } else {
        console.error("Erreur lors de l'ajout :", error)
      }
    }
  }

  return (
    <Card className="h-fit lg:sticky lg:top-6 lg:col-span-1 border border-slate-400 rounded-xl px-4 py-8">
      <CardHeader>
        <CardTitle className="text-base">Ajouter un statut</CardTitle>
      </CardHeader>

      <form onSubmit={form.handleSubmit(handleAdd)}>
        <CardContent className="space-y-5">
          {/* Nom */}
          <div className="space-y-1.5">
            <label htmlFor="nom" className="text-sm leading-none font-medium">
              Nom
            </label>
            <Input
              id="nom"
              placeholder="Ex. Abrogé"
              className="border border-slate-300"
              {...form.register("nom")}
            />
            <p className="text-xs text-slate-500">
              Ce nom est utilisé un peu partout sur votre site.
            </p>
            {form.formState.errors.nom && (
              <p className="text-xs font-medium text-red-500">
                {form.formState.errors.nom.message}
              </p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label htmlFor="slug" className="text-sm leading-none font-medium">
              Slug
            </label>
            <Input
              id="slug"
              placeholder="ex-abroge"
              className="border border-slate-300 font-mono text-sm"
              {...form.register("slug")}
            />
            <p className="text-xs text-slate-500">
              Généré automatiquement depuis le nom. Modifiable manuellement.
            </p>
            {form.formState.errors.slug && (
              <p className="text-xs font-medium text-red-500">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>

          {/* Statut parent */}
          <div className="space-y-1.5">
            <label className="text-sm leading-none font-medium">
              Statut parent
            </label>
            <Controller
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <Select
                  value={
                    field.value !== null && field.value !== undefined
                      ? String(field.value)
                      : "none"
                  }
                  onValueChange={(val) =>
                    field.onChange(val === "none" ? null : Number(val))
                  }
                >
                  <SelectTrigger className="border border-slate-300">
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {flatRows.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {"　".repeat(s.depth)}
                        {s.depth > 0 ? "↳ " : ""}
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.parent_id && (
              <p className="text-xs font-medium text-red-500">
                {form.formState.errors.parent_id.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="text-sm leading-none font-medium"
            >
              Description
            </label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Décrivez brièvement ce statut…"
              className="border border-slate-300"
              maxLength={100} ///100 caractere maximum
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs font-medium text-red-500">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Couleur */}
          <div className="space-y-1.5">
            <label className="text-sm leading-none font-medium">Couleur</label>
            <Controller
              control={form.control}
              name="couleur"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={field.value ?? "#0E7490"}
                    onChange={field.onChange}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-slate-200 p-1"
                    aria-label="Sélectionner une couleur"
                  />
                  <Input
                    value={field.value ?? "#0E7490"}
                    onChange={field.onChange}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            />
            {form.formState.errors.couleur && (
              <p className="text-xs font-medium text-red-500">
                {form.formState.errors.couleur.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full gap-2 bg-cyan-700 hover:bg-cyan-800"
          >
            <Plus className="h-4 w-4" />
            {form.formState.isSubmitting
              ? "Ajout en cours…"
              : "Ajouter un statut"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
