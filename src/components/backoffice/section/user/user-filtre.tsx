import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Trash2 } from "lucide-react"
import { useUserStore } from "./store/user-store"
import type { RoleFilter } from "./types/user-types"

// ─── Barre de filtre : recherche nom/numéro + type + suppression groupée
//     (visible seulement s'il y a une sélection) ─────────────────────────────

export function UserFiltre({ onDeleteClick }: { onDeleteClick: () => void }) {
  const search = useUserStore((s) => s.search)
  const setSearch = useUserStore((s) => s.setSearch)
  const roleFilter = useUserStore((s) => s.roleFilter)
  const setRoleFilter = useUserStore((s) => s.setRoleFilter)
  const selectedCount = useUserStore((s) => s.selectedIds.size)

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-50 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou numéro…"
          className="h-9 border-slate-400 pl-8 text-sm focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
        />
      </div>

      <Select
        value={roleFilter}
        onValueChange={(v) => setRoleFilter(v as RoleFilter)}
      >
        <SelectTrigger className="h-9 w-[170px] border-slate-300 text-sm focus:ring-cyan-700/30">
          <SelectValue placeholder="Type d'utilisateur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="expert">Expert</SelectItem>
          <SelectItem value="admin">Administrateur</SelectItem>
        </SelectContent>
      </Select>

      {/* La suppression n'est plus une icône par ligne : elle apparaît ici
          uniquement quand au moins un utilisateur est coché. */}
      {selectedCount > 0 && (
        <Button
          type="button"
          onClick={onDeleteClick}
          className="h-9 bg-red-500 text-white hover:bg-red-600"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Supprimer ({selectedCount})
        </Button>
      )}
    </div>
  )
}