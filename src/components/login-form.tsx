import { cn } from "@/lib/utils"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import api, { setAccessToken } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"
import type { FormEvent } from "react"
import { useState } from "react"
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react"

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  border: "1.5px solid #E4E9F7",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 13.5,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: "#1A1D2E",
  background: "#fff",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s",
}

const FieldInput = ({
  id,
  name,
  type = "text",
  placeholder,
  required,
  suffix,
}: {
  id: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  suffix?: React.ReactNode
}) => (
  <div className="relative">
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#4F7EF7"
        e.currentTarget.style.boxShadow = "0 0 0 3px #EBF2FF"
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#E4E9F7"
        e.currentTarget.style.boxShadow = "none"
      }}
    />
    {suffix && (
      <div className="absolute inset-y-0 right-3 flex items-center">{suffix}</div>
    )}
  </div>
)

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: { numero: string; password: string }) => {
      const response = await api.post("/login", data)
      return response.data
    },
    onSuccess: async (data) => {
      setAccessToken(data.access_token)
      const meRes = await api.get("/me")
      setUser({ numero: meRes.data.numero })
      navigate("/dashboard")
    },
    onError: () => {
      setError("Numéro ou mot de passe incorrect.")
    },
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    mutation.mutate({
      numero: form.get("numero") as string,
      password: form.get("password") as string,
    })
  }

  return (
    <div
      className={cn("w-full max-w-sm", className)}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      {...props}
    >
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div
          className="flex items-center justify-center rounded-[14px]"
          style={{ width: 52, height: 52, background: "#4F7EF7" }}
        >
          <Sparkles className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "#1A1D2E" }}>
            Connexion
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: "#8892B0" }}>
            Accédez à votre espace TEXDOU
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Numéro IM */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="numero"
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "#8892B0" }}
          >
            Numéro IM
          </label>
          <FieldInput
            id="numero"
            name="numero"
            placeholder="ex : 123456"
            required
          />
        </div>

        {/* Mot de passe */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "#8892B0" }}
            >
              Mot de passe
            </label>
            <a
              href="#"
              className="text-xs font-semibold no-underline transition-opacity hover:opacity-70"
              style={{ color: "#4F7EF7" }}
            >
              Mot de passe oublié ?
            </a>
          </div>
          <FieldInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="transition-colors"
                style={{ color: "#8892B0" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-[10px] px-4 py-3 text-sm font-semibold"
            style={{ background: "#FDECEA", color: "#A32D2D" }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-[10px] py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "#4F7EF7", height: 46 }}
          onMouseEnter={(e) =>
            !mutation.isPending && (e.currentTarget.style.background = "#3D6EE5")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "#4F7EF7")
          }
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {mutation.isPending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: "#E4E9F7" }} />
        <span className="text-[11px] font-semibold" style={{ color: "#B0B8D0" }}>
          ou
        </span>
        <div className="h-px flex-1" style={{ background: "#E4E9F7" }} />
      </div>

      <p className="text-center text-sm font-medium" style={{ color: "#8892B0" }}>
        Pas encore de compte ?{" "}
        <Link
          to="/register"
          className="font-bold no-underline transition-opacity hover:opacity-70"
          style={{ color: "#4F7EF7" }}
        >
          S'inscrire
        </Link>
      </p>
    </div>
  )
}