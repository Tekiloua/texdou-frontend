import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Baseline, PaintBucket } from "lucide-react"

import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $insertNodes,
} from "lexical"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
} from "@lexical/selection"
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html"
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table"
import { TablePlugin } from "@lexical/react/LexicalTablePlugin"

import {
  LayoutContainerNode,
  LayoutItemNode,
  LayoutPlugin,
} from "./lexical-layout"
import { ImageNode, ImagePlugin } from "./lexical-image"
import { TableControlsPlugin } from "./lexical-table-controls"
import { LexicalToolbar } from "./lexical-toolbar"
import { markdownToHtml } from "./markdown-to-html"
import type { PageFormat } from "../types/types"
import { PAGE_FORMATS } from "../types/types"

interface LexicalDocEditorProps {
  placeholder?: string
  minHeight?: number
  onChange?: (html: string) => void
  // Contenu HTML à charger dans l'éditeur au montage (mode édition d'un
  // texte existant). Peut arriver de façon asynchrone (après un fetch) :
  // le plugin applique la première valeur non vide qu'il reçoit, une seule
  // fois — les changements suivants (ex: saisie de l'utilisateur, qui
  // remonte via onChange puis redescend en tant que nouvelle prop si le
  // parent la renvoie) ne réinitialisent pas l'éditeur.
  initialHtml?: string
}

// Classes appliquées au contenu édité : Tailwind (preflight) retire par défaut
// la taille des titres, les puces des listes et le style des citations, donc
// même si Lexical produit bien les balises h2/h3/ul/ol, elles restent
// visuellement identiques à du texte normal. On restaure ce style ici via
// des sélecteurs descendants, sans dépendre du plugin @tailwindcss/typography.
// On force aussi `white-space: pre-wrap` et une hauteur minimale sur les
// paragraphes vides : par défaut le HTML collapse les espaces multiples et
// les sauts de ligne successifs (paragraphes vides), donc sans ça ce qui est
// tapé dans l'éditeur ET affiché dans la prévisualisation ne correspond pas
// à ce que l'utilisateur a réellement saisi.
const LEXICAL_CONTENT_CLASS = [
  "lexical-content outline-none text-slate-800 text-sm leading-relaxed break-words overflow-wrap-anywhere",
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:first:mt-0",
  "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:first:mt-0",
  "[&_p]:my-2 [&_p]:whitespace-pre-wrap [&_p:empty]:min-h-[1.5em]",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-0.5 [&_li]:whitespace-pre-wrap",
  "[&_li>p]:my-0",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-700 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500 [&_blockquote]:italic [&_blockquote]:whitespace-pre-wrap",
  "[&_strong]:font-semibold",
  // ── Tableaux ──
  // "box-border" est essentiel ici : avec table-fixed, le navigateur
  // répartit la largeur du tableau à parts égales entre colonnes ; si les
  // cellules restent en "content-box" (comportement par défaut), leur
  // padding et leur bordure s'ajoutent PAR-DESSUS cette largeur calculée
  // au lieu d'être inclus dedans, et l'écart s'accumule sur toutes les
  // colonnes jusqu'à faire déborder le tableau de la page. "max-w-full"
  // sur la table est un filet de sécurité supplémentaire.
  "[&_table]:my-3 [&_table]:w-full [&_table]:max-w-full [&_table]:table-fixed [&_table]:border-collapse [&_table]:box-border",
  "[&_td]:border [&_td]:border-foreground/20 [&_td]:p-2 [&_td]:align-top [&_td]:break-words [&_td]:box-border",
  "[&_th]:border [&_th]:border-foreground/20 [&_th]:p-2 [&_th]:bg-muted [&_th]:text-left [&_th]:font-semibold [&_th]:box-border",
].join(" ")

// En prévisualisation, les colonnes du système de layout ne doivent pas
// afficher la bordure pointillée qui sert de repère visuel pendant
// l'édition — on la neutralise ici plutôt que dans LEXICAL_CONTENT_CLASS,
// qui reste partagée avec la zone d'édition.
const LEXICAL_PREVIEW_EXTRA_CLASS =
  "[&_[data-lexical-layout-item]]:border-0 [&_[data-lexical-layout-item]]:p-0 " +
  "[&_[data-lexical-layout-item-delete]]:hidden [&_[data-lexical-layout-container-newline]]:hidden " +
  "[&_[data-lexical-layout-item-newline-before]]:hidden " +
  "[&_[data-lexical-image-delete]]:hidden [&_[data-lexical-image-newline-before]]:hidden " +
  "[&_[data-lexical-image-newline-after]]:hidden [&_[data-lexical-image-reset-size]]:hidden " +
  "[&_[data-lexical-image-resize-width]]:hidden [&_[data-lexical-image-resize-height]]:hidden " +
  "[&_[data-lexical-image-resize-corner]]:hidden"

const editorTheme = {
  paragraph: "",
  heading: { h2: "", h3: "" },
  quote: "",
  list: { ul: "", ol: "", listitem: "" },
  text: {
    bold: "font-semibold",
    italic: "italic",
    strikethrough: "line-through",
  },
}

function onLexicalError(error: Error) {
  console.error("Erreur éditeur Lexical:", error)
}

// Plugin interne : notifie le parent (HTML + vide/non-vide) à chaque
// changement de contenu, et garde `html` synchronisé pour l'onglet
// Prévisualisation.
function ChangeWatcherPlugin({
  onChange,
  onEmptyChange,
  onHtmlChange,
}: {
  onChange?: (html: string) => void
  onEmptyChange: (empty: boolean) => void
  onHtmlChange: (html: string) => void
}) {
  const [editor] = useLexicalComposerContext()

  const handleChange = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot()
      onEmptyChange(
        root.getTextContent().trim().length === 0 && root.getChildrenSize() <= 1
      )
      const html = $generateHtmlFromNodes(editor, null)
      onHtmlChange(html)
      onChange?.(html)
    })
  }, [editor, onChange, onEmptyChange, onHtmlChange])

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
}

// Plugin interne : injecte le HTML initial (mode édition) dans l'état
// Lexical. Comme ce HTML arrive souvent de façon asynchrone (fetch React
// Query), on ne peut pas le passer via `initialConfig.editorState` (lu une
// seule fois, avant que la donnée ne soit disponible) — on l'applique donc
// via un effet, déclenché dès que `initialHtml` devient non vide. Le ref
// garantit une application unique : sans ça, chaque frappe de l'utilisateur
// (onChange → store → re-render → nouvelle prop initialHtml identique au
// contenu déjà tapé) réinitialiserait l'éditeur et ferait sauter le curseur.
function InitialContentPlugin({ initialHtml }: { initialHtml?: string }) {
  const [editor] = useLexicalComposerContext()
  const appliedRef = useRef(false)

  useEffect(() => {
    if (appliedRef.current || !initialHtml || !initialHtml.trim()) return
    appliedRef.current = true

    editor.update(() => {
      const parser = new DOMParser()
      const dom = parser.parseFromString(initialHtml, "text/html")
      const nodes = $generateNodesFromDOM(editor, dom)
      const root = $getRoot()
      root.clear()
      root.select()
      $insertNodes(nodes)
    })
  }, [editor, initialHtml])

  return null
}

// Poignée impérative exposée via ref par LexicalDocEditor — permet à un
// parent (DocumentSection, bannière de validation) de déclencher une
// insertion de contenu au curseur, en dehors du flux normal de props
// (onChange / initialHtml) qui ne gère que le chargement initial complet.
export interface LexicalDocEditorHandle {
  // Convertit le Markdown extrait d'un document analysé (voir
  // useDocumentAnalysis.ts) en HTML puis en nœuds Lexical, et les insère à
  // la position actuelle du curseur (ou en fin de document si l'éditeur
  // n'a pas le focus / pas de sélection active) — sans toucher au reste du
  // contenu déjà présent.
  insertMarkdownAtCursor: (markdown: string) => void
}

// Plugin interne : porte l'implémentation de insertMarkdownAtCursor. Doit
// être monté à l'intérieur de <LexicalComposer> pour avoir accès au
// contexte de l'éditeur via useLexicalComposerContext.
const InsertAtCursorPlugin = forwardRef<LexicalDocEditorHandle>(
  function InsertAtCursorPlugin(_props, ref) {
    const [editor] = useLexicalComposerContext()

    useImperativeHandle(
      ref,
      () => ({
        insertMarkdownAtCursor: (markdown: string) => {
          if (!markdown.trim()) return
          editor.update(() => {
            const parser = new DOMParser()
            const dom = parser.parseFromString(
              markdownToHtml(markdown),
              "text/html"
            )
            const nodes = $generateNodesFromDOM(editor, dom)

            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              selection.insertNodes(nodes)
            } else {
              // Pas de sélection active dans l'éditeur (ex: focus encore
              // sur le bouton "Insérer" de la bannière) — on place le
              // curseur en fin de document plutôt que d'échouer
              // silencieusement.
              $getRoot().selectEnd()
              $insertNodes(nodes)
            }
          })
        },
      }),
      [editor]
    )

    return null
  }
)

// ── Options générales de l'éditeur : couleur du texte et couleur de fond
// de page ────────────────────────────────────────────────────────────────
// Pas de menu déroulant ni de modale : juste une icône suivie directement
// de son sélecteur de couleur natif, comme dans la plupart des éditeurs
// (icône "texte" pour la couleur du texte, icône "pot de peinture" pour le
// fond de la page). Ce sont des réglages généraux de l'éditeur, pas des
// réglages propres aux colonnes du layout.
function EditorAppearanceMenu({
  pageBg,
  onPageBgChange,
}: {
  pageBg: string
  onPageBgChange: (color: string) => void
}) {
  const [editor] = useLexicalComposerContext()
  const [textColor, setTextColor] = useState<string>("#1e293b")

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        setTextColor(
          $getSelectionStyleValueForProperty(selection, "color", "#1e293b")
        )
      })
    })
  }, [editor])

  const applyTextColor = (value: string) => {
    setTextColor(value)
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      $patchStyleText(selection, { color: value })
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Couleur du texte */}
      <label
        title="Couleur du texte"
        className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-foreground/20 px-1.5 hover:bg-slate-50"
      >
        <Baseline className="h-3.5 w-3.5 text-slate-500" />
        <input
          type="color"
          value={textColor}
          onChange={(e) => applyTextColor(e.target.value)}
          className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>

      {/* Couleur de fond de la page */}
      <label
        title="Couleur de fond de la page"
        className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 hover:bg-slate-50"
      >
        <PaintBucket className="h-3.5 w-3.5 text-slate-500" />
        <input
          type="color"
          value={pageBg}
          onChange={(e) => onPageBgChange(e.target.value)}
          className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
    </div>
  )
}

const LexicalDocEditor = forwardRef<LexicalDocEditorHandle, LexicalDocEditorProps>(
  function LexicalDocEditor(
    { placeholder = "Rédigez ici…", minHeight = 220, onChange, initialHtml },
    ref
  ) {
  const [tab, setTab] = useState<"editeur" | "apercu">("apercu")
  const [pageFormat, setPageFormat] = useState<PageFormat>("A4")
  const [isEmpty, setIsEmpty] = useState(true)
  const [html, setHtml] = useState("")
  const [showMargins, setShowMargins] = useState(false)
  // Couleur de fond générale de la page de l'éditeur (option globale, pas liée
  // aux colonnes) — blanc par défaut.
  const [pageBg, setPageBg] = useState<string>("#ffffff")
  // Marges de la page (en px), par défaut équivalentes aux px-[72px] py-[96px]
  // utilisées auparavant.
  const [margins, setMargins] = useState({
    top: 96,
    right: 72,
    bottom: 96,
    left: 72,
  })
  const pagePaddingStyle = {
    paddingTop: margins.top,
    paddingRight: margins.right,
    paddingBottom: margins.bottom,
    paddingLeft: margins.left,
  }

  const initialConfig = useMemo(
    () => ({
      namespace: "document-juridique",
      theme: editorTheme,
      onError: onLexicalError,
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LayoutContainerNode,
        LayoutItemNode,
        ImageNode,
        TableNode,
        TableRowNode,
        TableCellNode,
      ],
    }),
    []
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="overflow-hidden rounded-lg border border-foreground/80 bg-background shadow-sm transition-all focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-600/25">
        {/* ── Barre d'onglets ── */}
        <div className="flex items-center justify-between gap-2 border-b border-foreground/20 bg-background px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "editeur" | "apercu")}
            >
              <TabsList className="h-7 gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="editeur"
                  className="h-7 rounded-md border border-b-4 border-slate-400 px-2.5 text-xs font-medium text-slate-500 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm"
                >
                  Éditeur
                </TabsTrigger>
                <TabsTrigger
                  value="apercu"
                  className="h-7 rounded-md border border-b-4 border-slate-400 px-2.5 text-xs font-medium text-slate-500 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm"
                >
                  Prévisualisation
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Sélecteur de format de page */}
            <Select
              value={pageFormat}
              onValueChange={(v) => setPageFormat(v as PageFormat)}
            >
              <SelectTrigger className="h-7 w-40 border-slate-200 bg-white text-xs text-slate-600 focus:ring-cyan-700/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAGE_FORMATS) as PageFormat[]).map((fmt) => (
                  <SelectItem key={fmt} value={fmt} className="text-xs">
                    {PAGE_FORMATS[fmt].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Marges de la page */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMargins((v) => !v)}
                className={[
                  "h-7 rounded-md border border-b-3 border-slate-400 px-2 text-xs transition-colors",
                  showMargins
                    ? "border-cyan-700 bg-cyan-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                Marges
              </button>
              {showMargins && (
                <div className="absolute top-8 left-0 z-10 w-56 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Marges de la page (px)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["top", "Haut"],
                        ["right", "Droite"],
                        ["bottom", "Bas"],
                        ["left", "Gauche"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex flex-col gap-0.5 text-[11px] text-slate-500"
                      >
                        {label}
                        <Input
                          type="number"
                          min={0}
                          max={300}
                          value={margins[key]}
                          onChange={(e) =>
                            setMargins((m) => ({
                              ...m,
                              [key]: Number(e.target.value) || 0,
                            }))
                          }
                          className="h-7 border-slate-200 px-2 text-xs"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Options générales de l'éditeur (couleur du texte, fond de page) */}
            <EditorAppearanceMenu pageBg={pageBg} onPageBgChange={setPageBg} />
          </div>

          {tab === "editeur" && <LexicalToolbar />}
        </div>

        {/* ── Zone éditeur / prévisualisation — fond gris simulant une table lumineuse ──
            Important : les deux blocs (éditeur et prévisualisation) restent
            TOUJOURS montés ; on bascule uniquement leur visibilité via CSS
            ("hidden"). Démonter/remonter le bloc éditeur au changement
            d'onglet démonterait aussi RichTextPlugin, InitialContentPlugin,
            etc. — et comme InitialContentPlugin ne réapplique le HTML
            initial qu'une fois par MONTAGE (via un useRef), le remonter
            réappliquerait ce HTML initial (obsolète) par-dessus le contenu
            en cours d'édition, effaçant tout ce qui a été ajouté entre
            temps (ex: une image) alors même que l'aperçu — qui lit un state
            React indépendant — resterait correct. D'où le décalage observé. ── */}
        <div className="overflow-x-auto bg-slate-200 px-6 py-8">
          {/* Feuille A4 (ou autre format) — éditeur */}
          <div className={tab === "editeur" ? "" : "hidden"}>
            <div
              className="mx-auto shadow-xl"
              style={{ width: PAGE_FORMATS[pageFormat].widthPx }}
            >
              <div
                style={{
                  minHeight: Math.max(
                    minHeight,
                    PAGE_FORMATS[pageFormat].heightPx
                  ),
                  ...pagePaddingStyle,
                  backgroundColor: pageBg,
                }}
                className="relative cursor-text overflow-x-auto"
              >
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable
                      className={LEXICAL_CONTENT_CLASS + " min-h-[inherit]"}
                    />
                  }
                  placeholder={
                    <p
                      style={{ left: margins.left, top: margins.top }}
                      className="pointer-events-none absolute text-sm text-slate-300 select-none"
                    >
                      {placeholder}
                    </p>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <ListPlugin />
                <LayoutPlugin />
                <TablePlugin />
                <TableControlsPlugin />
                <ImagePlugin />
                <InitialContentPlugin initialHtml={initialHtml} />
                <InsertAtCursorPlugin ref={ref} />
                <ChangeWatcherPlugin
                  onChange={onChange}
                  onEmptyChange={setIsEmpty}
                  onHtmlChange={setHtml}
                />
              </div>
              {/* Étiquette format */}
              <p className="mt-2 text-center text-[11px] text-slate-400">
                {PAGE_FORMATS[pageFormat].label}
              </p>
            </div>
          </div>

          {/* ── Zone prévisualisation ── */}
          <div className={tab === "apercu" ? "" : "hidden"}>
            {isEmpty ? (
              <p className="text-center text-sm text-slate-400">
                Rien à prévisualiser pour l'instant.
              </p>
            ) : (
              <div
                className="mx-auto shadow-xl"
                style={{ width: PAGE_FORMATS[pageFormat].widthPx }}
              >
                <div
                  style={{
                    minHeight: Math.max(
                      minHeight,
                      PAGE_FORMATS[pageFormat].heightPx
                    ),
                    ...pagePaddingStyle,
                    backgroundColor: pageBg,
                  }}
                  className={
                    LEXICAL_CONTENT_CLASS +
                    " " +
                    LEXICAL_PREVIEW_EXTRA_CLASS +
                    " overflow-x-auto"
                  }
                  dangerouslySetInnerHTML={{ __html: html }}
                />
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  {PAGE_FORMATS[pageFormat].label}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LexicalComposer>
  )
  }
)

export { LexicalDocEditor }