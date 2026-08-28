import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Users as UsersIcon, UserPlus, Loader2 } from "lucide-react"
import { useUserStore } from "./store/user-store"
import {
  EMPTY_FORM,
  type UserFormValues,
  type UserRole,
} from "./types/user-types"

// ─── Formulaire d'ajout / édition ────────────────────────────────────────────
// Un seul et même formulaire pour les deux cas : en édition, le mot de passe
// est optionnel (vide = inchangé) et le numéro/username sont pré-remplis.

function UserFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  isPending,
  errorMessage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  initialValues: UserFormValues
  onSubmit: (values: UserFormValues) => void
  isPending: boolean
  errorMessage: string | null
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({ values: initialValues })

  const role = watch("role")

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset(EMPTY_FORM)
      }}
    >
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "add"
              ? "Ajouter un utilisateur"
              : "Modifier l'utilisateur"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "add"
              ? "Créez un compte et attribuez-lui directement un rôle."
              : "Laissez le mot de passe vide pour ne pas le modifier."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          id="user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="username" className="text-xs text-slate-500">
              Nom d'utilisateur
            </Label>
            <Input
              id="username"
              {...register("username")}
              placeholder="Ex. Jean Rakoto"
              className="mt-1 border-slate-400 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
            />
          </div>

          <div>
            <Label htmlFor="numero" className="text-xs text-slate-500">
              Matricule (numéro)
            </Label>
            <Input
              id="numero"
              type="number"
              {...register("numero", {
                required: "Le matricule est requis",
                validate: (v) =>
                  (Number(v) >= 100_000 && Number(v) < 1_000_000) ||
                  "Doit être compris entre 100000 et 999999",
              })}
              placeholder="Ex. 100042"
              className="mt-1 border-slate-400 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
            />
            {errors.numero && (
              <p className="mt-1 text-xs text-red-500">
                {errors.numero.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="role" className="text-xs text-slate-500">
              Rôle
            </Label>
            <Select
              value={role}
              onValueChange={(value) => setValue("role", value as UserRole)}
            >
              <SelectTrigger
                id="role"
                className="mt-1 border-slate-400 focus:ring-cyan-700/30"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Champ mot de passe ajouté */}
          <div className="sm:col-span-2">
            <Label htmlFor="password" className="text-xs text-slate-500">
              Mot de passe{" "}
              {mode === "add" && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password", {
                required: mode === "add" ? "Le mot de passe est requis" : false,
                minLength: {
                  value: 4,
                  message:
                    "Le mot de passe doit contenir au moins 4 caractères",
                },
              })}
              placeholder={
                mode === "add"
                  ? "Entrez un mot de passe"
                  : "Laissez vide pour ne pas modifier"
              }
              className="mt-1 border-slate-400 focus-visible:border-cyan-700 focus-visible:ring-cyan-700/30"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 sm:col-span-2">
              {errorMessage}
            </p>
          )}
        </form>

        <AlertDialogFooter>
          <div className="flex w-full items-center px-[25%] justify-between gap-4">
            <AlertDialogCancel
              disabled={isPending}
              className="flex h-8 items-center justify-center rounded-md border border-slate-400 bg-slate-200 px-4 text-sm font-medium hover:bg-slate-300 disabled:opacity-60"
            >
              Annuler
            </AlertDialogCancel>
            <button
              type="submit"
              form="user-form"
              disabled={isPending}
              className="inline-flex h-8 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-medium text-white transition-colors hover:bg-cyan-800 disabled:opacity-60"
            >
              {isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {mode === "add" ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── En-tête de la section ────────────────────────────────────────────────────

export function UserHeader({
  totalCount,
  initialValues,
  onSubmit,
  isPending,
}: {
  totalCount: number
  initialValues: UserFormValues
  onSubmit: (values: UserFormValues) => void
  isPending: boolean
}) {
  const formOpen = useUserStore((s) => s.formOpen)
  const setFormOpen = useUserStore((s) => s.setFormOpen)
  const editingUser = useUserStore((s) => s.editingUser)
  const formError = useUserStore((s) => s.formError)
  const openAddDialog = useUserStore((s) => s.openAddDialog)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-sm">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Utilisateurs
            </h1>
            <p className="text-sm text-slate-500">
              {totalCount} compte{totalCount > 1 ? "s" : ""} enregistré
              {totalCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={openAddDialog}
          className="border border-b-4 border-slate-400 bg-slate-100 text-slate-900 hover:bg-slate-200"
        >
          <UserPlus className="mr-1.5 h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editingUser ? "edit" : "add"}
        initialValues={initialValues}
        onSubmit={onSubmit}
        isPending={isPending}
        errorMessage={formError}
      />
    </>
  )
}
