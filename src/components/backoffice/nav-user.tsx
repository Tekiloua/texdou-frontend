import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { logoutRequest } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
import { useSidebar } from "@/components/ui/sidebar"
import {
  UserCircleIcon,
  CreditCardIcon,
  SignOutIcon,
} from "@phosphor-icons/react"
import { Loader2 } from "lucide-react"

export function NavUser({
  user,
}: {
  user: {
    numero: string
    username?: string
    role: string
  }
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      setUser(null)
      setConfirmOpen(false)
      setSheetOpen(false)
      navigate("/", { replace: true })
    },
  })
  if (!user.username) return <div>Erreur , utilisateur sans nom</div>
  return (
    <div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <div className="flex cursor-pointer items-center gap-2 rounded-lg transition-colors hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <Avatar className="h-8 w-8 rounded-lg grayscale">
              {/* <AvatarImage src={user.avatar} alt={user.name} /> */}
              <AvatarFallback className="rounded-lg">
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {user.username}
            </span>
          </div>
        </SheetTrigger>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="bg-white text-foreground"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-9 w-9 rounded-lg grayscale">
                {/* <AvatarImage src={user.avatar} alt={user.name} /> */}
                <AvatarFallback className="rounded-lg">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold">{user.username}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.numero}
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-4">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <UserCircleIcon />
              {user.username}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <CreditCardIcon />
              Modifier Profil
            </button>

            <div className="my-2 h-px bg-border" />

            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => setConfirmOpen(true)}
            >
              <SignOutIcon />
              Se déconnecter
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation de déconnexion */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez être déconnecté de votre session. Vous devrez vous
              reconnecter pour accéder au backoffice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <div className="w-full flex items-center justify-between gap-6 px-[22%]">
              <AlertDialogCancel
                className="h-7 w-32 border bg-slate-300 rounded-2xl hover:bg-slate-400"
                disabled={logoutMutation.isPending}
              >
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={logoutMutation.isPending}
                onClick={(e) => {
                  e.preventDefault()
                  logoutMutation.mutate()
                }}
                className="h-8 w-32"
                variant={"secondary"}
              >
                {logoutMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Se déconnecter
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
