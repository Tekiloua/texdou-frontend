import { cn } from "@/lib/utils"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import api, { fetchMe } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"
import type { UserRole } from "@/store/useAuthStore"
import { useState } from "react"
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// ─── Schéma de validation ─────────────────────────────────────────────────────

const registerSchema = z.object({
  numero: z
    .string()
    .length(6, "Le numéro IM doit contenir exactement 6 caractères."),
  username: z
    .string()
    .min(2, "Le nom d'utilisateur doit contenir au moins 2 caractères."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
})

type RegisterFormValues = z.infer<typeof registerSchema>

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

// ─── RegisterForm ─────────────────────────────────────────────────────────────

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  })

  const mutation = useMutation<LoginResponse, Error, RegisterFormValues>({
    mutationFn: async (data) => {
      // 1) Créer le compte
      await api.post("/register", {
        username: data.username,
        numero: Number(data.numero),
        password: data.password,
      })

      // 2) Login immédiat
      const loginRes = await api.post<LoginResponse>("/login", {
        numero: data.numero,
        password: data.password,
      })
      return loginRes.data
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
        setUser({ numero: "", role: data.role })
      }

      toast.success("Compte créé avec succès !", {
        description: "Bienvenue sur votre espace TEXDOU.",
      })

      navigate("/dashboard", { replace: true })
    },

    onError: (err: any) => {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail

      if (status === 400 && detail) {
        toast.error("Inscription impossible", {
          description: detail,
        })
      } else if (status === 409) {
        toast.error("Numéro déjà utilisé", {
          description: "Ce numéro IM est associé à un compte existant.",
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

  const onSubmit = (values: RegisterFormValues) => {
    mutation.mutate(values)
  }

  return (
    <div
      className={cn(
        "w-full max-w-sm font-['Plus_Jakarta_Sans',sans-serif]",
        className
      )}
      {...props}
    >
      {/* ── Brand ── */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-13 w-13 items-center justify-center rounded-[14px] bg-[#4F7EF7] shadow-[0_4px_16px_rgba(79,126,247,0.35)]">
          <Sparkles className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1D2E]">
            Créer un compte
          </h1>
          <p className="mt-1 text-sm font-medium text-[#8892B0]">
            Rejoignez TEXDOU dès aujourd'hui
          </p>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Numéro IM */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="numero"
            className="text-[11px] font-bold tracking-[0.18em] text-[#8892B0] uppercase"
          >
            Numéro IM
          </label>
          <FieldInput
            id="numero"
            placeholder="ex : 123456"
            maxLength={6}
            error={errors.numero?.message}
            {...register("numero")}
          />
        </div>

        {/* Nom d'utilisateur */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="username"
            className="text-[11px] font-bold tracking-[0.18em] text-[#8892B0] uppercase"
          >
            Nom d'utilisateur
          </label>
          <FieldInput
            id="username"
            placeholder="ex : Rakoto"
            error={errors.username?.message}
            {...register("username")}
          />
        </div>

        {/* Mot de passe */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-[11px] font-bold tracking-[0.18em] text-[#8892B0] uppercase"
          >
            Mot de passe
          </label>
          <FieldInput
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            error={errors.password?.message}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[#8892B0] transition-colors hover:text-[#4F7EF7]"
                tabIndex={-1}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
            className="pr-10"
            {...register("password")}
          />
          {!errors.password && (
            <p className="text-[11px] font-medium text-[#B0B8D0]">
              Minimum 8 caractères recommandés.
            </p>
          )}
        </div>

        {/* Bouton submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className={cn(
            "mt-1 flex h-11.5 w-full items-center justify-center gap-2 rounded-[10px]",
            "text-sm font-bold text-white transition-all duration-150",
            "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
            "bg-[#4F7EF7] shadow-[0_2px_12px_rgba(79,126,247,0.30)] hover:bg-[#3D6EE5]"
          )}
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {mutation.isPending ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      {/* ── Séparateur ── */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E4E9F7]" />
        <span className="text-[11px] font-semibold text-[#B0B8D0]">ou</span>
        <div className="h-px flex-1 bg-[#E4E9F7]" />
      </div>

      {/* ── Connexion ── */}
      <p className="text-center text-sm font-medium text-[#8892B0]">
        Déjà un compte ?{" "}
        <Link
          to="/login"
          className="font-bold text-[#4F7EF7] no-underline transition-opacity hover:opacity-70"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}