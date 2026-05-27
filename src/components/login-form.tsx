import { cn } from "@/lib/utils"
import { Link, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import api, { setAccessToken } from "@/api/api"
import { useAuthStore } from "@/store/useAuthStore"
import type { FormEvent } from "react"
import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

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

      // Récupère les infos utilisateur après connexion
      const meRes = await api.get("/me")
      setUser({ numero: meRes.data.numero })

      navigate("/dashboard")
    },
    onError: (error:any) => {
      console.log(error)
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
    <div className={cn("w-full max-w-sm", className)} {...props}>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Accédez à votre espace TEXDOU</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Numéro IM */}
        <div className="space-y-1.5">
          <label htmlFor="numero" className="block text-sm font-medium text-foreground">
            Numéro IM
          </label>
          <input
            id="numero"
            name="numero"
            type="text"
            placeholder="ex: 123456"
            required
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none ring-0 transition placeholder:text-muted-foreground focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
          />
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <a href="#" className="text-xs text-amber-700 hover:underline dark:text-amber-500">
              Mot de passe oublié ?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-700"
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {mutation.isPending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/register" className="font-medium text-amber-700 hover:underline dark:text-amber-500">
          S'inscrire
        </Link>
      </p>
    </div>
  )
}