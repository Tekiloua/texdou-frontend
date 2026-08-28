import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addUserRequest,
  deleteUsersRequest,
  fetchUsers,
  updateUserRequest,
} from "@/api/api"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from "lucide-react"
import { UserHeader } from "./user-header"
import { UserFiltre } from "./user-filtre"
import { useUserStore } from "./store/user-store"
import {
  EMPTY_FORM,
  ROLE_BADGE_CLASS,
  ROLE_LABELS,
  type UserFormValues,
  type UserRole,
} from "./types/user-types"

// ─── Rôles : icônes + badge ───────────────────────────────────────────────────

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  normal: <ShieldQuestion className="h-3 w-3" />,
  expert: <ShieldAlert className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        ROLE_BADGE_CLASS[role],
      ].join(" ")}
    >
      {ROLE_ICON[role]}
      {ROLE_LABELS[role]}
    </span>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export const Users = () => {
  const queryClient = useQueryClient()

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  })

  // ── Filtre (recherche + rôle) & sélection : état partagé via zustand ──
  const search = useUserStore((s) => s.search)
  const roleFilter = useUserStore((s) => s.roleFilter)
  const selectedIds = useUserStore((s) => s.selectedIds)
  const toggleSelected = useUserStore((s) => s.toggleSelected)
  const setSelectedIds = useUserStore((s) => s.setSelectedIds)
  const clearSelection = useUserStore((s) => s.clearSelection)

  const editingUser = useUserStore((s) => s.editingUser)
  const closeFormDialog = useUserStore((s) => s.closeFormDialog)
  const setFormError = useUserStore((s) => s.setFormError)

  const deleteConfirmOpen = useUserStore((s) => s.deleteConfirmOpen)
  const setDeleteConfirmOpen = useUserStore((s) => s.setDeleteConfirmOpen)

  const filteredUsers = useMemo(() => {
    if (!users) return []
    const term = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesSearch =
        term.length === 0 ||
        (u.username ?? "").toLowerCase().includes(term) ||
        u.numero.toLowerCase().includes(term)
      const matchesRole = roleFilter === "all" || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedIds.has(u.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const next = new Set(selectedIds)
      filteredUsers.forEach((u) => next.delete(u.id))
      setSelectedIds(next)
      return
    }
    const next = new Set(selectedIds)
    filteredUsers.forEach((u) => next.add(u.id))
    setSelectedIds(next)
  }

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] })

  const addMutation = useMutation({
    mutationFn: addUserRequest,
    onSuccess: () => {
      invalidateUsers()
      closeFormDialog()
    },
    onError: (err: any) => {
      setFormError(
        err?.response?.data?.detail ?? "Impossible de créer l'utilisateur."
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: Parameters<typeof updateUserRequest>[1]
    }) => updateUserRequest(id, data),
    onSuccess: () => {
      invalidateUsers()
      closeFormDialog()
    },
    onError: (err: any) => {
      setFormError(
        err?.response?.data?.detail ?? "Impossible de modifier l'utilisateur."
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteUsersRequest(ids),
    onSuccess: () => {
      invalidateUsers()
      clearSelection()
      setDeleteConfirmOpen(false)
    },
  })

  const openEditDialog = useUserStore((s) => s.openEditDialog)

  const initialValues: UserFormValues = useMemo(() => {
    if (!editingUser) return EMPTY_FORM
    return {
      username: editingUser.username ?? "",
      numero: editingUser.numero,
      password: "",
      role: editingUser.role,
    }
  }, [editingUser])

  const handleSubmit = (values: UserFormValues) => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          username: values.username || null,
          numero: Number(values.numero),
          role: values.role,
          ...(values.password ? { password: values.password } : {}),
        },
      })
    } else {
      addMutation.mutate({
        username: values.username || null,
        numero: Number(values.numero),
        password: values.password,
        role: values.role,
      })
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending
  const selectedCount = selectedIds.size

  return (
    <div className="w-full h-full p-6 sm:p-8 flex flex-col bg-slate-200 gap-2">
      <UserHeader
        totalCount={users?.length ?? 0}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isPending={isPending}
      />

      <UserFiltre onDeleteClick={() => setDeleteConfirmOpen(true)} />

      <div className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des utilisateurs…
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-red-500">
            Impossible de charger la liste des utilisateurs.
          </p>
        ) : filteredUsers.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            {users && users.length > 0
              ? "Aucun utilisateur ne correspond à ce filtre."
              : "Aucun utilisateur pour le moment."}
          </p>
        ) : (
          <div className="">
            <table className="w-full text-left text-sm ">
              <thead className="">
                <tr className="border-b border bg-slate-50 text-xs tracking-wide text-slate-400 uppercase">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Tout sélectionner"
                      className="border-slate-400 data-[state=checked]:border-cyan-700 data-[state=checked]:bg-cyan-700"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Matricule</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={[
                      "border-b border-slate-50 last:border-0 hover:bg-slate-50/60",
                      selectedIds.has(user.id) ? "bg-cyan-50/40" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleSelected(user.id)}
                        aria-label={`Sélectionner ${user.username ?? user.numero}`}
                        className="border-slate-400 data-[state=checked]:border-cyan-700 data-[state=checked]:bg-cyan-700"
                      />
                    </td>
                    <td className="max-w-sm px-4 py-3 text-slate-700">
                      {user.username || (
                        <span className="text-slate-400 italic">Sans nom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                      {user.numero}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          title="Modifier"
                          onClick={() => openEditDialog(user)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-cyan-700 hover:text-cyan-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer {selectedCount} utilisateur
              {selectedCount > 1 ? "s" : ""} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ces comptes seront définitivement supprimés. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="inline-flex h-9 w-24 items-center justify-center rounded-md border border-slate-400 bg-slate-200 px-4 text-sm font-medium hover:bg-slate-300 disabled:opacity-60"
            >
              Annuler
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(Array.from(selectedIds))}
              className="inline-flex h-9 items-center justify-center rounded-md bg-red-500 px-4 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              Supprimer
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}