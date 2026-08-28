import { FileText, Plus } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

export function TextesHeader({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-50/20 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-700 text-white shadow-sm shadow-teal-600/20">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-300">
            Textes juridiques
          </h1>
          <p className="text-sm text-slate-500">
            Gérez et classifiez vos textes douaniers
          </p>
        </div>
      </div>
      {isAdmin && (
        <Link to="/douane/backoffice/add-texte">
          <Button className="gap-1 border border-b-4 border-foreground/20 bg-slate-100 text-slate-900 hover:bg-slate-200">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </Link>
      )}
    </div>
  )
}