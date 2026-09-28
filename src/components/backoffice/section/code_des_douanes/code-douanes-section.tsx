import { useRef, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
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
import { Scale } from "lucide-react"
import {
  INITIAL_CHAPITRES,
  type Article,
  type ArticleFormValues,
  type Chapitre,
  type ChapitreFormValues,
  type DeleteTarget,
} from "./types/code-douane-types"
import { CodeDouanesListCard } from "./code-douanes-list-card"
import { ChapitreFormDialog } from "./chapitre-form-dialog"
import { ArticleFormDialog } from "./article-form-dialog"

/**
 * Prototype : les données sont en mémoire (useState).
 * Pour brancher le backend, remplacer les handlers par des appels API
 * + invalidateQueries (comme dans categorie-section).
 */
export const CodeDouanesSection = () => {
  const [chapitres, setChapitres] = useState<Chapitre[]>(INITIAL_CHAPITRES)
  const nextId = useRef(100)

  // Dialogs
  const [chapitreDialog, setChapitreDialog] = useState<{ open: boolean; chapitre?: Chapitre }>({ open: false })
  const [articleDialog, setArticleDialog] = useState<{
    open: boolean
    article?: Article
    chapitreId?: number
    /** Chapitre d'origine lors d'une modification (l'article peut changer de chapitre) */
    originChapitreId?: number
  }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

  // ---------- Chapitres ----------

  function saveChapitre(values: ChapitreFormValues) {
    const editing = chapitreDialog.chapitre
    if (editing) {
      setChapitres((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...values } : c)))
    } else {
      setChapitres((prev) => [...prev, { id: nextId.current++, ...values, articles: [] }])
    }
  }

  // ---------- Articles ----------

  function saveArticle(values: ArticleFormValues) {
    const { chapitre_id, ...fields } = values
    const editing = articleDialog.article

    setChapitres((prev) => {
      if (!editing) {
        return prev.map((c) =>
          c.id === chapitre_id
            ? { ...c, articles: [...c.articles, { id: nextId.current++, ...fields }] }
            : c
        )
      }
      // Modification (éventuellement avec changement de chapitre)
      const origin = articleDialog.originChapitreId
      if (origin === chapitre_id) {
        return prev.map((c) =>
          c.id === chapitre_id
            ? { ...c, articles: c.articles.map((a) => (a.id === editing.id ? { ...a, ...fields } : a)) }
            : c
        )
      }
      return prev.map((c) => {
        if (c.id === origin) return { ...c, articles: c.articles.filter((a) => a.id !== editing.id) }
        if (c.id === chapitre_id) return { ...c, articles: [...c.articles, { ...editing, ...fields }] }
        return c
      })
    })
  }

  // ---------- Suppression ----------

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.type === "chapitre") {
      setChapitres((prev) => prev.filter((c) => c.id !== deleteTarget.chapitreId))
    } else {
      setChapitres((prev) =>
        prev.map((c) =>
          c.id === deleteTarget.chapitreId
            ? { ...c, articles: c.articles.filter((a) => a.id !== deleteTarget.articleId) }
            : c
        )
      )
    }
    setDeleteTarget(null)
  }

  const deleteMessage =
    deleteTarget?.type === "chapitre"
      ? "Ce chapitre et tous ses articles seront supprimés."
      : "Cet article sera supprimé."

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full w-full flex-col items-center bg-slate-200 p-10 sm:p-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* En-tête */}
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-sm">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Code des douanes
              </h1>
              <p className="text-sm text-slate-500">
                Gérez les chapitres et les articles du Code des douanes
              </p>
            </div>
          </div>

          <CodeDouanesListCard
            chapitres={chapitres}
            onAddChapitre={() => setChapitreDialog({ open: true })}
            onEditChapitre={(c) => setChapitreDialog({ open: true, chapitre: c })}
            onDeleteChapitre={(c) => setDeleteTarget({ type: "chapitre", chapitreId: c.id })}
            onAddArticle={(chapitreId) => setArticleDialog({ open: true, chapitreId })}
            onEditArticle={(a, chapitreId) =>
              setArticleDialog({ open: true, article: a, chapitreId, originChapitreId: chapitreId })
            }
            onDeleteArticle={(a, chapitreId) =>
              setDeleteTarget({ type: "article", chapitreId, articleId: a.id })
            }
          />
        </div>
      </div>

      <ChapitreFormDialog
        open={chapitreDialog.open}
        onOpenChange={(open) => setChapitreDialog((s) => ({ ...s, open }))}
        chapitre={chapitreDialog.chapitre}
        onSubmit={saveChapitre}
      />

      <ArticleFormDialog
        open={articleDialog.open}
        onOpenChange={(open) => setArticleDialog((s) => ({ ...s, open }))}
        chapitres={chapitres}
        article={articleDialog.article}
        chapitreId={articleDialog.chapitreId}
        onSubmit={saveArticle}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMessage} Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 w-[30%] border-b-4 border-slate-900 bg-slate-200 hover:bg-slate-300 active:border-none">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 w-[30%] border-b-4 border-red-400 bg-rose-100 text-red-800 hover:bg-rose-200 hover:text-red-800 active:border-none"
              onClick={confirmDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}