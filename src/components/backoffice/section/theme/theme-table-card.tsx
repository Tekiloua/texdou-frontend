import { useEffect, useMemo, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, ArrowUpDown } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { deleteThemes } from "@/api/api"
import {
  editThemeSchema,
  slugify,
  type BulkAction,
  type EditThemeFormValues,
  type SortDirection,
  type SortKey,
  type ThemeRow,
} from "./types/theme-types"

interface ThemeTableCardProps {
  flatRows: ThemeRow[]
}

export const ThemeTableCard = ({ flatRows }: ThemeTableCardProps) => {
  const queryClient = useQueryClient()

  // ---------- Table ----------

  const [search, setSearch] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [bulkAction, setBulkAction] = useState<BulkAction>("modifier")
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ---------- États modification ----------
  const [selectThemeOpen, setSelectThemeOpen] = useState(false)
  const [editThemeId, setEditThemeId] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const editForm = useForm<EditThemeFormValues>({
    resolver: zodResolver(editThemeSchema),
    defaultValues: {
      nom: "",
      slug: "",
      parent_id: null,
      description: "",
      couleur: "#0E7490",
    },
  })

  const editNomValue = editForm.watch("nom")
  useEffect(() => {
    if (!editForm.getFieldState("slug").isDirty) {
      editForm.setValue("slug", slugify(editNomValue ?? ""))
    }
  }, [editNomValue])

  /** Ouvre le dialog de sélection (ou directement le formulaire si 1 seul sélectionné) */
  function handleOpenEdit(): void {
    if (selectedIds.size === 0) return
    if (selectedIds.size === 1) {
      const id = [...selectedIds][0]
      openEditForm(id)
    } else {
      setSelectThemeOpen(true)
    }
  }

  /** Pré-remplit le formulaire avec les données du thème choisi */
  function openEditForm(id: number): void {
    const row = flatRows.find((t) => t.id === id)
    if (!row) return
    setEditThemeId(id)
    editForm.reset({
      nom: row.name,
      slug: row.slug,
      parent_id: null,
      description: row.description === "—" ? "" : row.description,
      couleur: row.color,
    })
    editForm.resetField("slug", { keepDirty: false })
    setSelectThemeOpen(false)
    setEditOpen(true)
  }

  async function handleEditSubmit(values: EditThemeFormValues): Promise<void> {
    if (editThemeId === null) return
    try {
      await axios.put(
        `http://192.168.123.15:8000/update-theme/${editThemeId}`,
        {
          nom: values.nom,
          slug: values.slug || slugify(values.nom),
          parent_id: values.parent_id ?? null,
          description: values.description || null,
          couleur: values.couleur || "#0E7490",
        }
      )
      await queryClient.invalidateQueries({ queryKey: ["themes"] })
      setEditOpen(false)
      setSelectedIds(new Set())
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        editForm.setError("nom", { message: error.response.data.detail })
      } else {
        console.error("Erreur lors de la modification :", error)
      }
    }
  }

  const visibleList = useMemo<ThemeRow[]>(() => {
    const q = search.trim().toLowerCase()

    let list = flatRows

    if (q) {
      list = flatRows.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
    }

    if (sortKey === "name") {
      list = [...list].sort((a, b) =>
        sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      )
    }

    return list
  }, [flatRows, search, sortKey, sortDir])

  const allVisibleSelected: boolean =
    visibleList.length > 0 && visibleList.every((t) => selectedIds.has(t.id))

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function toggleSelectAll(): void {
    setSelectedIds(() => {
      if (allVisibleSelected) return new Set()
      return new Set(visibleList.map((t) => t.id))
    })
  }

  function toggleSelectOne(id: number): void {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleApplyBulk(): void {
    if (selectedIds.size === 0) return
    if (bulkAction === "modifier") {
      handleOpenEdit()
    } else if (bulkAction === "supprimer") {
      setConfirmOpen(true)
    }
  }

  async function executeDelete(): Promise<void> {
    try {
      await deleteThemes([...selectedIds])
      await queryClient.invalidateQueries({ queryKey: ["themes"] })
      setSelectedIds(new Set())
    } catch (error) {
      console.error("Erreur lors de la suppression :", error)
    }
  }

  return (
    <>
      {/* Liste des thèmes */}
      <Card className="rounded-xl border border-slate-400 px-4 py-6 lg:col-span-2">
        <CardHeader className="flex-row items-center space-y-0 border-b">
          <div className="flex items-center justify-between gap-6">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher des thèmes…"
                className="border border-slate-300 py-4 pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-3">
          <Select
            value={bulkAction}
            onValueChange={(value) => setBulkAction(value as BulkAction)}
          >
            <SelectTrigger className="w-44 border border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modifier">Modifier</SelectItem>
              <SelectItem value="supprimer">Supprimer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyBulk}
            disabled={selectedIds.size === 0}
          >
            Appliquer
          </Button>
          {selectedIds.size > 0 && (
            <span className="text-xs text-slate-500">
              {selectedIds.size} sélectionné(s)
            </span>
          )}
        </div>

        <CardContent className="p-0">
          <div className="max-h-90 overflow-x-auto overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-6">
                    <Checkbox
                      className="border border-gray-400"
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Tout sélectionner"
                    />
                  </TableHead>
                  <TableHead></TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
                      onClick={() => toggleSort("name")}
                    >
                      Nom <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Slug</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleList.map((t) => (
                  <TableRow key={t.id} className="group">
                    <TableCell className="pl-6">
                      <Checkbox
                        className="border border-gray-400"
                        checked={selectedIds.has(t.id)}
                        onCheckedChange={() => toggleSelectOne(t.id)}
                        aria-label={`Sélectionner ${t.name}`}
                      />
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: (t.depth || 0) * 20 }}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: t.color }}
                        />
                        <a
                          href="#"
                          className="font-medium text-cyan-700 hover:text-cyan-800 hover:underline"
                        >
                          {t.name}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs truncate text-sm text-slate-500 md:table-cell">
                      {t.description}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {t.slug}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
                {visibleList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-sm text-slate-400"
                    >
                      Aucun thème ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer <strong>{selectedIds.size} thème(s)</strong>.
              Cette action est irréversible et supprimera également tous les
              sous-thèmes associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 w-[30%] border-b-4 border-slate-900 bg-slate-200 hover:bg-slate-300 active:border-none">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 w-[30%] border-b-4 border-red-400 bg-rose-100 text-red-800 hover:bg-rose-200 hover:text-red-800 active:border-none"
              onClick={executeDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog sélection du thème à modifier (si plusieurs sélectionnés) */}
      <AlertDialog open={selectThemeOpen} onOpenChange={setSelectThemeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Quel thème voulez-vous modifier ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez sélectionné {selectedIds.size} thèmes. Choisissez celui
              à modifier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 px-6 py-2">
            {flatRows
              .filter((t) => selectedIds.has(t.id))
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => openEditForm(t.id)}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2.5 text-left text-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="font-medium text-slate-800">{t.name}</span>
                  <code className="ml-auto text-xs text-slate-400">
                    {t.slug}
                  </code>
                </button>
              ))}
          </div>
          <AlertDialogFooter className="px-6 pb-4">
            <AlertDialogCancel className="h-8 border-b-4 border-slate-900 bg-slate-200 hover:bg-slate-300 active:border-none">
              Annuler
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog formulaire de modification */}
      <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
        <AlertDialogContent className="max-w-xl bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier le thème</AlertDialogTitle>
            <AlertDialogDescription>
              Modifiez les attributs du thème puis enregistrez.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={editForm.handleSubmit(handleEditSubmit)}>
            <div className="space-y-4 px-6 py-2">
              {/* Nom */}
              <div className="space-y-1.5">
                <label className="text-sm leading-none font-medium">Nom</label>
                <Input
                  placeholder="Ex. Procédure de dédouanement"
                  className="border border-slate-300"
                  {...editForm.register("nom")}
                />
                {editForm.formState.errors.nom && (
                  <p className="text-xs font-medium text-red-500">
                    {editForm.formState.errors.nom.message}
                  </p>
                )}
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-sm leading-none font-medium">Slug</label>
                <Input
                  placeholder="ex-procedure-dedouanement"
                  className="border border-slate-300 font-mono text-sm"
                  {...editForm.register("slug")}
                />
                {editForm.formState.errors.slug && (
                  <p className="text-xs font-medium text-red-500">
                    {editForm.formState.errors.slug.message}
                  </p>
                )}
              </div>

              {/* Thème parent */}
              <div className="space-y-1.5">
                <label className="text-sm leading-none font-medium">
                  Thème parent
                </label>
                <Controller
                  control={editForm.control}
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
                        {flatRows
                          .filter((t) => t.id !== editThemeId)
                          .map((t) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              {"　".repeat(t.depth)}
                              {t.depth > 0 ? "↳ " : ""}
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm leading-none font-medium">
                  Description
                </label>
                <Textarea
                  rows={3}
                  placeholder="Décrivez brièvement ce thème…"
                  className="border border-slate-300"
                  {...editForm.register("description")}
                />
              </div>

              {/* Couleur */}
              <div className="space-y-1.5">
                <label className="text-sm leading-none font-medium">
                  Couleur
                </label>
                <Controller
                  control={editForm.control}
                  name="couleur"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={field.value ?? "#0E7490"}
                        onChange={field.onChange}
                        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-slate-200 p-1"
                      />
                      <Input
                        value={field.value ?? "#0E7490"}
                        onChange={field.onChange}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            <AlertDialogFooter className="gap-10 px-6 pt-2 pb-4">
              <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
              <Button
                type="submit"
                disabled={editForm.formState.isSubmitting}
                className="h-8 w-[30%] border-b-4 rounded-xl border-cyan-700 bg-cyan-100 text-cyan-950 hover:bg-cyan-800 active:border-none"
              >
                {editForm.formState.isSubmitting
                  ? "Enregistrement…"
                  : "Enregistrer"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
