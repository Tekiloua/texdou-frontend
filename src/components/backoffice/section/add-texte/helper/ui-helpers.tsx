import React from "react"
import { Link } from "react-router"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

function SectionCard({ icon, title, subtitle, action, children }: SectionCardProps) {
  return (
    <div className="rounded-xl border border-foreground/20 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-foreground/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white">
            {icon}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-foreground/70">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ─── Bouton "Ajouter" (lien vers le formulaire de création) ──────────────────

function AddLinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-b-4 border-slate-400 px-2 text-xs font-medium text-slate-600 transition-colors hover:border-cyan-700 hover:text-cyan-700"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase"
    >
      {children}
    </Label>
  )
}

export { SectionCard, AddLinkButton, FieldLabel }