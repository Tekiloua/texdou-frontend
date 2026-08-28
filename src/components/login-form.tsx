import { cn } from "@/lib/utils"
import { useNavigate } from "react-router"
import { useMutation } from "@tanstack/react-query"
import api, { fetchMe } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"
import type { UserRole } from "@/store/useAuthStore"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// ─── Schéma de validation ─────────────────────────────────────────────────────

const loginSchema = z.object({
  numero: z
    .string()
    .length(6, "Le numéro matricule doit contenir exactement 6 caractères."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ─── Types API ────────────────────────────────────────────────────────────────

type LoginResponse = {
  role: UserRole
}

// ─── Composant champ de saisie ────────────────────────────────────────────────

const FieldInput = ({
  id,
  type = "text",
  placeholder,
  suffix,
  error,
  ...rest
}: {
  id: string
  type?: string
  placeholder?: string
  suffix?: React.ReactNode
  error?: string
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="flex flex-col gap-1">
    <div className="relative">
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        {...rest}
        className={cn(
          "h-11 w-full rounded-[10px] border-[1.5px] px-3.5 text-[13.5px]",
          "bg-white font-['Plus_Jakarta_Sans',sans-serif] text-[#1A1D2E] outline-none",
          "transition-[border-color,box-shadow] duration-150",
          "placeholder:text-[#C0C8DC]",
          "focus:border-[#4F7EF7] focus:shadow-[0_0_0_3px_#EBF2FF]",
          error
            ? "border-[#E05858] focus:border-[#E05858] focus:shadow-[0_0_0_3px_#FEE8E8]"
            : "border-[#E4E9F7]",
          rest.className
        )}
      />
      {suffix && (
        <div className="absolute inset-y-0 right-3 flex items-center">
          {suffix}
        </div>
      )}
    </div>
    {error && (
      <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-[#E05858]">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
        {error}
      </p>
    )}
  </div>
)

// ─── LoginForm ────────────────────────────────────────────────────────────────

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange", // valide au blur, pas à chaque frappe
  })

  const mutation = useMutation<LoginResponse, Error, LoginFormValues>({
    mutationFn: async (data) => {
      const response = await api.post<LoginResponse>("/login", data)
      return response.data
    },

    onSuccess: async (data) => {
      try {
        const me = await fetchMe()
        setUser({
          numero: me.numero,
          username: me.username,
          role: me.role,
        })
      } catch {
        // Fallback : données minimales du /login
        setUser({ numero: "", role: data.role })
      }

      toast.success("Connexion réussie !", {
        description: "Bienvenue sur votre espace TEXDOU.",
      })

      navigate("/douane/backoffice", { replace: true })
    },

    onError: (err: any) => {
      const status = err?.response?.status

      if (status === 401) {
        toast.error("Identifiants incorrects", {
          description: "Identifiant ou mot de passe invalide.",
        })
      } else if (status === 422) {
        toast.error("Données invalides", {
          description: "Veuillez vérifier les informations saisies.",
        })
      } else if (status === 0 || !status) {
        toast.error("Serveur inaccessible", {
          description:
            "Impossible de contacter le serveur. Réessayez plus tard.",
        })
      } else {
        toast.error("Erreur inattendue", {
          description: `Une erreur est survenue (${status}). Veuillez réessayer.`,
        })
      }
    },
  })

  const onSubmit = (values: LoginFormValues) => {
    mutation.mutate(values)
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-400 bg-white p-8 shadow-2xl">
        <div
          className={cn(
            "w-full max-w-sm font-['Plus_Jakarta_Sans',sans-serif]",
            className
          )}
          {...props}
        >
          {/* ── Brand ── */}
          <div className="mb-2 flex flex-col items-center gap-3 text-center">
            {/* <div className="flex h-13 w-13 items-center justify-center rounded-[14px] bg-[#4F7EF7] shadow-[0_4px_16px_rgba(79,126,247,0.35)]">
          <Sparkles className="size-6 text-white" />
        </div> */}
            <div className="size-40">
              <img src="/logo-dgd.png" alt="Logo" className="" />
            </div>
            {/* <h1 className="text-2xl font-extrabold text-[#1A1D2E]">Connexion</h1> */}
          </div>

          {/* ── Formulaire ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
            onSubmitCapture={(e) => e.preventDefault()}
          >
            {/* Numéro matricule */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="numero"
                className="text-lg font-bold tracking-[0.04em] text-[#8892B0]"
              >
                Identifiant
              </label>
              <FieldInput
                id="numero"
                placeholder="ex : 123456"
                className="border border-slate-400"
                maxLength={6}
                error={errors.numero?.message}
                {...register("numero", {
                  validate: (value) => {
                    if (!value) return true // champ vide → pas d'erreur
                    if (value.length !== 6)
                      return "Le numéro matricule doit contenir exactement 6 caractères."
                    return true
                  },
                })}
              />
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-lg font-bold tracking-[0.04em] text-[#8892B0]"
                >
                  Mot de passe
                </label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-semibold text-[#4F7EF7] no-underline transition-opacity hover:opacity-70"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <FieldInput
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="border border-slate-400"
                error={errors.password?.message}
                // suffix={
                //   <button
                //     type="button"
                //     onClick={() => setShowPassword((v) => !v)}
                //     className="text-[#8892B0] transition-colors hover:text-[#4F7EF7]"
                //     tabIndex={-1}
                //     aria-label={
                //       showPassword
                //         ? "Masquer le mot de passe"
                //         : "Afficher le mot de passe"
                //     }
                //   >
                //     {showPassword ? (
                //       <EyeOff className="size-4" />
                //     ) : (
                //       <Eye className="size-4" />
                //     )}
                //   </button>
                // }
                // Ajout d'un padding droit pour ne pas chevaucher l'icône œil
                {...register("password", {
                  validate: (value) => {
                    if (!value) return true // champ vide → pas d'erreur
                    if (value.length < 8)
                      return "Le mot de passe doit contenir au moins 8 caractères."
                    return true
                  },
                })}
              />
            </div>

            {/* Bouton submit */}
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleSubmit(onSubmit)}
              className={cn(
                "mt-1 flex h-11.5 w-full items-center justify-center gap-2 rounded-[10px]",
                "text-sm font-bold text-white transition-all duration-150",
                "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                "bg-[#4F7EF7] shadow-[0_2px_12px_rgba(79,126,247,0.30)] hover:bg-[#3D6EE5]"
              )}
            >
              {mutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {mutation.isPending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
