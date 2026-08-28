import { useEffect, useState } from "react"
import { FileUp, X, FileText } from "lucide-react"

interface UploadDocumentProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  // Appelé pour chaque fichier nouvellement sélectionné (pas pour les
  // fichiers déjà présents dans `files` au montage) — sert à déclencher
  // l'analyse de qualité en direct (mini console) dès l'import, avant même
  // l'enregistrement du texte. Voir useDocumentAnalysis.
  onFilePicked?: (file: File) => void
}

// ── Miniatures des fichiers importés (image et PDF) ─────────────────────────
// pdfjs-dist est chargé dynamiquement et mis en cache dans ce module (pas
// besoin de le recharger à chaque miniature) : ça évite d'alourdir le bundle
// initial pour une fonctionnalité qui ne sert qu'à l'aperçu du formulaire.
// Le worker est chargé depuis un CDN pour éviter d'avoir à configurer le
// bundler (Vite) pour copier le fichier worker en asset séparé.
let pdfjsLoader: Promise<typeof import("pdfjs-dist")> | null = null
function loadPdfJs() {
  if (!pdfjsLoader) {
    pdfjsLoader = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      return pdfjs
    })
  }
  return pdfjsLoader
}

// Rend la première page d'un PDF dans un <canvas> hors-écran et retourne une
// data URL PNG, utilisable comme n'importe quelle image de miniature.
async function renderPdfThumbnail(file: File): Promise<string> {
  const pdfjs = await loadPdfJs()
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  // On cible ~200px de large pour une miniature nette sans être trop lourde.
  const scale = 200 / viewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement("canvas")
  canvas.width = scaledViewport.width
  canvas.height = scaledViewport.height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Contexte canvas indisponible")

  await page.render({ canvas, viewport: scaledViewport }).promise

  return canvas.toDataURL("image/png")
}

// Miniature d'un fichier importé : image (aperçu direct) ou PDF (rendu de la
// première page). En cas d'échec du rendu PDF (pdfjs-dist absent du projet,
// ou fichier corrompu), on retombe sur une carte avec icône plutôt que de
// planter l'aperçu.
function FileThumbnail({ file }: { file: File }) {
  const isImage = file.type.startsWith("image/")
  const isPdf = file.type === "application/pdf"
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file)
      setThumbUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (isPdf) {
      let cancelled = false
      setPdfError(false)
      renderPdfThumbnail(file)
        .then((dataUrl) => {
          if (!cancelled) setThumbUrl(dataUrl)
        })
        .catch((err) => {
          console.error("Aperçu PDF impossible :", err)
          if (!cancelled) setPdfError(true)
        })
      return () => {
        cancelled = true
      }
    }
  }, [file, isImage, isPdf])

  if (thumbUrl) {
    return (
      <img
        src={thumbUrl}
        alt={file.name}
        className="h-full w-full object-cover"
      />
    )
  }

  // Repli (PDF pas encore rendu, en erreur, ou type de fichier inattendu).
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-slate-100 text-slate-400">
      <FileText className="h-6 w-6" />
      {isPdf && !pdfError && <span className="text-[10px]">Génération…</span>}
    </div>
  )
}

// ── Zone d'import de documents source (images, PDF) ─────────────────────────
// Composant autonome, séparé de LexicalDocEditor : gère la grille de
// miniatures des fichiers déjà importés et la zone de dépôt permettant d'en
// ajouter d'autres. Ne connaît rien de l'éditeur Lexical — uniquement de la
// liste de `File[]` qu'il fait vivre via `onFilesChange`, et déclenche
// optionnellement `onFilePicked` pour chaque nouveau fichier (analyse de
// qualité en direct, voir useDocumentAnalysis).
export function UploadDocument({
  files,
  onFilesChange,
  onFilePicked,
}: UploadDocumentProps) {
  return (
    <div className="border-b border-foreground/20 bg-muted px-5 py-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-foreground/70 uppercase">
        Documents source (images, PDF)
      </p>

      {/* Grille de miniatures des fichiers déjà importés */}
      {files.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-foreground/20 bg-background"
            >
              <FileThumbnail file={file} />
              {/* Nom + taille, visibles en permanence en bas de la miniature */}
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-1 text-[10px] text-white">
                {file.name}
              </div>
              <button
                type="button"
                onClick={() =>
                  onFilesChange(files.filter((_, i) => i !== index))
                }
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                title="Retirer le fichier"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zone de dépôt, toujours visible pour permettre d'ajouter d'autres fichiers */}
      <label
        htmlFor="files-upload-inline"
        className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-cyan-700 bg-cyan-50/40 px-4 py-3 text-sm transition-colors hover:bg-cyan-50"
      >
        <FileUp className="h-5 w-5 shrink-0 text-slate-400" />
        <span className="text-slate-600">
          Cliquez pour joindre des fichiers (plusieurs autorisés)
        </span>
        <span className="ml-auto text-xs text-slate-400">
          Formats : images, .pdf
        </span>
        <input
          id="files-upload-inline"
          type="file"
          accept="application/pdf,.pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            if (picked.length === 0) return
            onFilesChange([...files, ...picked])
            // Lance l'analyse de qualité (mini console) pour chaque fichier
            // fraîchement importé — indépendamment de l'ajout à la liste des
            // fichiers ci-dessus, pour ne jamais bloquer l'import si
            // l'analyse échoue.
            picked.forEach((file) => onFilePicked?.(file))
            // Permet de réimporter un fichier du même nom juste après
            // l'avoir retiré (sinon le navigateur ignore l'événement
            // "change" si la sélection est identique à la précédente).
            e.target.value = ""
          }}
        />
      </label>
    </div>
  )
}