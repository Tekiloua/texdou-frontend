import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { deleteStatuts } from "@/api/api"
import {type BulkAction, type SortDirection,type SortKey, type StatutRow } from "./types/statut-types"

interface StatutTableProps {
  flatRows: StatutRow[]
}

/** Table des statuts : recherche, tri, sélection multiple et suppression groupée */
export function StatutTable({ flatRows }: StatutTableProps) {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState<string>("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [bulkAction, setBulkAction] = useState<BulkAction>("modifier")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const visibleList = useMemo<StatutRow[]>(() => {
    const q = search.trim().toLowerCase()

    let list = flatRows

    if (q) {
      list = flatRows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
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
    visibleList.length > 0 && visibleList.every((s) => selectedIds.has(s.id))

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
      return new Set(visibleList.map((s) => s.id))
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

  /** Ouvre le dialog de confirmation si l'action est "supprimer" */
  function handleApplyBulk(): void {
    if (bulkAction !== "supprimer" || selectedIds.size === 0) return
    setConfirmOpen(true)
  }

  /** Exécute la suppression après confirmation */
  async function executeDelete(): Promise<void> {
    try {
      await deleteStatuts([...selectedIds])
      await queryClient.invalidateQueries({ queryKey: ["statuts"] })
      setSelectedIds(new Set())
    } catch (error) {
      console.error("Erreur lors de la suppression :", error)
    }
  }

  return (
    <>
      <Card className="lg:col-span-2 rounded-xl px-4 py-8 border border-slate-400">
        <CardHeader className="flex-row items-center space-y-0 border-b">
          <div className="flex items-center justify-between gap-6">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher des statuts…"
                className="border border-slate-300 py-4 pl-9"
              />
            </div>
            <div className="flex w-80 items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs">Page 1 sur 1</span>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
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

        <CardContent className="overflow-x-auto p-0">
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
              {visibleList.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell className="pl-6">
                    <Checkbox
                      className="border border-gray-400"
                      checked={selectedIds.has(s.id)}
                      onCheckedChange={() => toggleSelectOne(s.id)}
                      aria-label={`Sélectionner ${s.name}`}
                    />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: (s.depth || 0) * 20 }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <a
                        href="#"
                        className="font-medium text-cyan-700 hover:text-cyan-800 hover:underline"
                      >
                        {s.name}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate text-sm text-slate-500 md:table-cell">
                    {s.description}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {s.slug}
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
                    Aucun statut ne correspond à votre recherche.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer <strong>{selectedIds.size} statut(s)</strong>.
              Cette action est irréversible et supprimera également tous les
              sous-statuts associés.
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
    </>
  )
}