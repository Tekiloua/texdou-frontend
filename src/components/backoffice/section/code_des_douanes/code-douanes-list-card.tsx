import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import type { Article, Chapitre } from "./types/code-douane-types"

interface Props {
  chapitres: Chapitre[]
  onAddChapitre: () => void
  onEditChapitre: (c: Chapitre) => void
  onDeleteChapitre: (c: Chapitre) => void
  onAddArticle: (chapitreId?: number) => void
  onEditArticle: (a: Article, chapitreId: number) => void
  onDeleteArticle: (a: Article, chapitreId: number) => void
}

/** Liste des chapitres (dépliables) et de leurs articles, avec recherche */
export const CodeDouanesListCard = ({
  chapitres,
  onAddChapitre,
  onEditChapitre,
  onDeleteChapitre,
  onAddArticle,
  onEditArticle,
  onDeleteArticle,
}: Props) => {
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const visible = useMemo<Chapitre[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return chapitres
    return chapitres
      .map((c) => {
        const chapMatch =
          c.titre.toLowerCase().includes(q) || c.numero.toLowerCase().includes(q)
        const articles = chapMatch
          ? c.articles
          : c.articles.filter(
              (a) =>
                a.titre.toLowerCase().includes(q) ||
                a.numero.toLowerCase().includes(q) ||
                a.contenu.toLowerCase().includes(q)
            )
        return { ...c, articles }
      })
      .filter((c) => c.articles.length > 0 || c.titre.toLowerCase().includes(q))
  }, [chapitres, search])

  function toggle(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Card className="rounded-xl border border-slate-400 px-4 py-8">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un chapitre ou un article…"
            className="border border-slate-300 py-4 pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => onAddArticle()}>
            <Plus className="h-4 w-4" /> Article
          </Button>
          <Button size="sm" className="gap-1 bg-cyan-700 hover:bg-cyan-800" onClick={onAddChapitre}>
            <Plus className="h-4 w-4" /> Chapitre
          </Button>
        </div>
      </CardHeader>

      <CardContent className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
        {visible.map((c) => {
          const isOpen = !collapsed.has(c.id) || search.trim() !== ""
          return (
            <div key={c.id} className="rounded-lg border border-slate-200">
              {/* En-tête du chapitre */}
              <div className="flex items-center gap-2 rounded-t-lg bg-slate-50 px-3 py-2">
                <button
                  onClick={() => toggle(c.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                  <BookOpen className="h-4 w-4 text-cyan-700" />
                  <span className="font-semibold text-slate-900">
                    Chapitre {c.numero} — {c.titre}
                  </span>
                  <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                    {c.articles.length} article(s)
                  </span>
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ajouter un article" onClick={() => onAddArticle(c.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier le chapitre" onClick={() => onEditChapitre(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" title="Supprimer le chapitre" onClick={() => onDeleteChapitre(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Articles */}
              {isOpen && (
                <div className="divide-y divide-slate-100">
                  {c.description && (
                    <p className="px-4 py-2 text-sm text-slate-500">{c.description}</p>
                  )}
                  {c.articles.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-cyan-700">
                          Article {a.numero} — {a.titre}
                        </p>
                        <p className="line-clamp-2 text-sm text-slate-500">{a.contenu}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier l'article" onClick={() => onEditArticle(a, c.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" title="Supprimer l'article" onClick={() => onDeleteArticle(a, c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {c.articles.length === 0 && (
                    <p className="px-4 py-4 text-center text-sm text-slate-400">
                      Aucun article dans ce chapitre.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {visible.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            Aucun résultat.
          </p>
        )}
      </CardContent>
    </Card>
  )
}