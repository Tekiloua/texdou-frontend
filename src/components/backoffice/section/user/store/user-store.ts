import { create } from "zustand"
import type { RoleFilter, UserRecord } from "../types/user-types"

interface UserStoreState {
  // ── Filtre : nom OU numéro (même champ de recherche) + type d'utilisateur ──
  search: string
  roleFilter: RoleFilter
  setSearch: (search: string) => void
  setRoleFilter: (roleFilter: RoleFilter) => void

  // ── Sélection multiple (checkboxes) ──
  selectedIds: Set<number>
  toggleSelected: (id: number) => void
  setSelectedIds: (ids: Set<number>) => void
  clearSelection: () => void

  // ── Dialogue ajout/édition : `editingUser` null → mode "add", sinon "edit" ──
  formOpen: boolean
  editingUser: UserRecord | null
  formError: string | null
  setFormOpen: (open: boolean) => void
  setFormError: (message: string | null) => void
  openAddDialog: () => void
  openEditDialog: (user: UserRecord) => void
  closeFormDialog: () => void

  // ── Confirmation de suppression groupée ──
  deleteConfirmOpen: boolean
  setDeleteConfirmOpen: (open: boolean) => void
}

export const useUserStore = create<UserStoreState>((set) => ({
  search: "",
  roleFilter: "all",
  setSearch: (search) => set({ search }),
  setRoleFilter: (roleFilter) => set({ roleFilter }),

  selectedIds: new Set<number>(),
  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { selectedIds: next }
    }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: new Set() }),

  formOpen: false,
  editingUser: null,
  formError: null,
  setFormOpen: (open) => set({ formOpen: open }),
  setFormError: (message) => set({ formError: message }),
  openAddDialog: () => set({ editingUser: null, formError: null, formOpen: true }),
  openEditDialog: (user) => set({ editingUser: user, formError: null, formOpen: true }),
  closeFormDialog: () => set({ formOpen: false, editingUser: null, formError: null }),

  deleteConfirmOpen: false,
  setDeleteConfirmOpen: (open) => set({ deleteConfirmOpen: open }),
}))