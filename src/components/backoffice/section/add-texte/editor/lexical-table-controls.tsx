"use client"

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactElement,
} from "react"
import { createPortal } from "react-dom"
import {
  $createParagraphNode,
  $getNodeByKey,
  $nodesOfType,
  COMMAND_PRIORITY_EDITOR,
  ElementNode,
  createCommand,
  type LexicalCommand,
} from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { mergeRegister } from "@lexical/utils"
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table"

// ─── Commandes ────────────────────────────────────────────────────────────

// Supprime UNE cellule précise (celle dont la clé est passée en argument) :
// - si c'est la seule cellule de sa ligne ET la seule ligne du tableau,
//   le tableau entier est supprimé (plus rien à afficher) ;
// - si c'est la seule cellule de sa ligne (mais qu'il reste d'autres
//   lignes), toute la ligne est supprimée (une ligne à 0 cellule n'a pas de
//   sens) ;
// - sinon, seule cette cellule est retirée de sa ligne.
export const REMOVE_TABLE_CELL_COMMAND: LexicalCommand<string> = createCommand(
  "REMOVE_TABLE_CELL_COMMAND"
)

// Insère (ou réutilise) un paragraphe vide juste avant/après le tableau.
export const INSERT_LINE_BEFORE_TABLE_COMMAND: LexicalCommand<string> =
  createCommand("INSERT_LINE_BEFORE_TABLE_COMMAND")
export const INSERT_LINE_AFTER_TABLE_COMMAND: LexicalCommand<string> =
  createCommand("INSERT_LINE_AFTER_TABLE_COMMAND")

// Redimensionne une COLONNE entière : applique la même largeur à la cellule
// de même index dans chaque ligne du tableau (une largeur de colonne n'a de
// sens qu'appliquée à toutes ses cellules à la fois, sinon les lignes ne
// s'alignent plus). `width` est en pixels.
export const RESIZE_TABLE_COLUMN_COMMAND: LexicalCommand<{
  tableKey: string
  columnIndex: number
  width: number
}> = createCommand("RESIZE_TABLE_COLUMN_COMMAND")

// Redimensionne la hauteur d'UNE ligne (toutes ses cellules suivent
// visuellement, comme la hauteur d'une colonne de layout). `height` en px.
export const RESIZE_TABLE_ROW_COMMAND: LexicalCommand<{
  rowKey: string
  height: number
}> = createCommand("RESIZE_TABLE_ROW_COMMAND")

// ─── Types ────────────────────────────────────────────────────────────────

interface CellButton {
  /** Clé Lexical de la cellule (pour REMOVE_TABLE_CELL_COMMAND) */
  cellKey: string
  /** Clé Lexical du tableau (pour INSERT_LINE_*) */
  tableKey: string
  /** Position de la cellule dans le viewport (getBoundingClientRect) */
  rect: DOMRect
  showBefore: boolean
  showAfter: boolean
}

// ─── Icônes inline ────────────────────────────────────────────────────────

const DELETE_SVG = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ─── Overlay portal ───────────────────────────────────────────────────────
//
// Rendu dans document.body, au-dessus de tout le DOM du tableau.
// Les boutons ne font PAS partie du contentEditable — zéro conflit avec
// les listeners de capture de @lexical/table.
//
// Important sur le positionnement : le conteneur racine ci-dessous est en
// `position: fixed; inset: 0`, donc son coin (0,0) correspond TOUJOURS au
// coin du viewport, quel que soit le défilement de la page. Comme
// `getBoundingClientRect()` renvoie déjà des coordonnées relatives au
// viewport, les boutons enfants (position: absolute à l'intérieur de ce
// conteneur fixed) doivent utiliser `rect.top`/`rect.left` TELS QUELS — sans
// y ajouter `window.scrollY`/`scrollX`. Ajouter le scroll ici décalait les
// boutons hors de la cellule dès que la page n'était pas tout en haut.

interface OverlayProps {
  buttons: CellButton[]
  onDelete: (cellKey: string) => void
  onBefore: (tableKey: string) => void
  onAfter: (tableKey: string) => void
}

function TableControlsOverlay({ buttons, onDelete, onBefore, onAfter }: OverlayProps) {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
      aria-hidden="true"
    >
      {buttons.map((b) => {
        const { rect, cellKey, tableKey, showBefore, showAfter } = b

        const baseStyle: CSSProperties = {
          position: "absolute",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: "none",
        }

        const btnClass = (variant: "delete" | "newline") =>
          variant === "delete"
            ? "flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
            : "flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold leading-none text-slate-400 shadow-sm transition-colors hover:border-cyan-700 hover:text-cyan-700 cursor-pointer"

        const btnStyle: CSSProperties = {
          position: "absolute",
          pointerEvents: "all",
        }

        return (
          <div key={cellKey} style={baseStyle}>
            {/* Bouton supprimer cette cellule — coin haut-droit de CHAQUE cellule */}
            <button
              type="button"
              title="Supprimer cette cellule"
              aria-label="Supprimer cette cellule"
              className={btnClass("delete")}
              style={{ ...btnStyle, top: 4, right: 4 }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete(cellKey)
              }}
            >
              {DELETE_SVG}
            </button>

            {/* Bouton insérer ligne AVANT — coin haut-gauche de la 1ère cellule */}
            {showBefore && (
              <button
                type="button"
                title="Ajouter une ligne avant le tableau"
                aria-label="Ajouter une ligne avant le tableau"
                className={btnClass("newline")}
                style={{ ...btnStyle, top: 4, left: 4 }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onBefore(tableKey)
                }}
              >
                <span aria-hidden="true">⏎</span>
              </button>
            )}

            {/* Bouton insérer ligne APRÈS — coin bas-droit de la dernière cellule */}
            {showAfter && (
              <button
                type="button"
                title="Ajouter une ligne après le tableau"
                aria-label="Ajouter une ligne après le tableau"
                className={btnClass("newline")}
                style={{ ...btnStyle, bottom: 4, right: 4 }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAfter(tableKey)
                }}
              >
                <span aria-hidden="true">⏎</span>
              </button>
            )}
          </div>
        )
      })}
    </div>,
    document.body
  )
}

// ─── Plugin principal ─────────────────────────────────────────────────────

export function TableControlsPlugin(): ReactElement | null {
  const [editor] = useLexicalComposerContext()
  const [buttons, setButtons] = useState<CellButton[]>([])
  const rafIdRef = useRef<number | null>(null)

  // Calcule la liste des boutons à partir du DOM Lexical actuel.
  const refresh = useCallback(() => {
    editor.getEditorState().read(() => {
      const next: CellButton[] = []

      // $nodesOfType : API publique Lexical, fiable dans tous les
      // environnements (contrairement à l'accès direct à un champ privé
      // de l'editorState).
      const cells = $nodesOfType(TableCellNode)

      for (const node of cells) {
        const row = node.getParent()
        if (!(row instanceof TableRowNode)) continue
        const table = row.getParent()
        if (!(table instanceof TableNode)) continue

        const cellKey = node.getKey()
        const tableKey = table.getKey()

        const cellDom = editor.getElementByKey(cellKey)
        if (!cellDom) continue

        // Applique la largeur de colonne / hauteur de ligne stockées sur les
        // nœuds comme styles DOM directs sur la cellule, comme
        // LayoutItemNode le fait pour ses propres colonnes. On ne s'appuie
        // pas sur le rendu interne de @lexical/table (variable selon les
        // versions) : on force le style nous-mêmes à chaque frame, ce qui
        // garantit un redimensionnement visuel fiable.
        const cellWidth = node.getWidth()
        if (cellWidth) {
          cellDom.style.width = `${cellWidth}px`
          cellDom.style.minWidth = `${cellWidth}px`
          cellDom.style.maxWidth = `${cellWidth}px`
        }
        const rowHeight = row.getHeight()
        const rowDom = editor.getElementByKey(row.getKey())
        if (rowDom) {
          rowDom.style.height = rowHeight ? `${rowHeight}px` : ""
        }

        const rect = cellDom.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue

        const rows = table.getChildren()
        const rowIndex = row.getIndexWithinParent()
        const colIndex = node.getIndexWithinParent()
        const isFirstRow = rowIndex === 0
        const isLastRow = rowIndex === rows.length - 1
        const lastRowCells =
          (rows[rows.length - 1] as TableRowNode | undefined)?.getChildrenSize() ?? 0
        const isFirstCol = colIndex === 0
        const isLastCol = colIndex === lastRowCells - 1

        next.push({
          cellKey,
          tableKey,
          rect,
          showBefore: isFirstRow && isFirstCol,
          showAfter: isLastRow && isLastCol,
        })
      }

      setButtons(next)
    })
  }, [editor])

  // Boucle continue (rAF) tant que le plugin est monté : recalcule la
  // position/présence des boutons à chaque frame. Plus robuste qu'un simple
  // registerUpdateListener — indépendant de tout ordre d'effets ou de
  // timing de commit DOM, et gère aussi le scroll/resize/zoom sans listener
  // dédié. Le coût est négligeable pour un nombre raisonnable de cellules.
  useEffect(() => {
    let cancelled = false

    const loop = () => {
      if (cancelled) return
      refresh()
      rafIdRef.current = requestAnimationFrame(loop)
    }
    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    }
  }, [refresh])

  // ─── Commandes ───────────────────────────────────────────────────────────

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<string>(
        REMOVE_TABLE_CELL_COMMAND,
        (cellKey) => {
          editor.update(() => {
            const cell = $getNodeByKey(cellKey)
            if (!(cell instanceof TableCellNode)) return
            const row = cell.getParent()
            if (!(row instanceof TableRowNode)) return
            const table = row.getParent()
            if (!(table instanceof TableNode)) return

            const isOnlyCellInRow = row.getChildrenSize() <= 1
            const isOnlyRowInTable = table.getChildrenSize() <= 1

            if (isOnlyCellInRow && isOnlyRowInTable) {
              // Dernière cellule du dernier restant : plus rien à garder.
              table.remove()
              return
            }

            if (isOnlyCellInRow) {
              // Dernière cellule de cette ligne : une ligne à 0 cellule
              // n'a pas de sens, on retire la ligne entière.
              row.remove()
              return
            }

            // Cas normal : on retire uniquement cette cellule.
            cell.remove()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),

      editor.registerCommand<string>(
        INSERT_LINE_BEFORE_TABLE_COMMAND,
        (tableKey) => {
          editor.update(() => {
            const table = $getNodeByKey(tableKey)
            if (!(table instanceof TableNode)) return

            const prev = table.getPreviousSibling()
            if (
              prev &&
              prev.getType() === "paragraph" &&
              (prev as ElementNode).isEmpty()
            ) {
              ;(prev as ElementNode).selectStart()
              return
            }

            const paragraph = $createParagraphNode()
            table.insertBefore(paragraph)
            paragraph.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),

      editor.registerCommand<{
        tableKey: string
        columnIndex: number
        width: number
      }>(
        RESIZE_TABLE_COLUMN_COMMAND,
        ({ tableKey, columnIndex, width }) => {
          editor.update(() => {
            const table = $getNodeByKey(tableKey)
            if (!(table instanceof TableNode)) return

            // Une largeur de colonne s'applique à la cellule de même index
            // dans CHAQUE ligne — sinon les colonnes des différentes lignes
            // ne s'aligneraient plus entre elles.
            for (const row of table.getChildren()) {
              if (!(row instanceof TableRowNode)) continue
              const cell = row.getChildren()[columnIndex]
              if (cell instanceof TableCellNode) {
                cell.setWidth(width)
              }
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),

      editor.registerCommand<{ rowKey: string; height: number }>(
        RESIZE_TABLE_ROW_COMMAND,
        ({ rowKey, height }) => {
          editor.update(() => {
            const row = $getNodeByKey(rowKey)
            if (row instanceof TableRowNode) {
              row.setHeight(height)
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),

      editor.registerCommand<string>(
        INSERT_LINE_AFTER_TABLE_COMMAND,
        (tableKey) => {
          editor.update(() => {
            const table = $getNodeByKey(tableKey)
            if (!(table instanceof TableNode)) return

            const next = table.getNextSibling()
            if (
              next &&
              next.getType() === "paragraph" &&
              (next as ElementNode).isEmpty()
            ) {
              ;(next as ElementNode).selectStart()
              return
            }

            const paragraph = $createParagraphNode()
            table.insertAfter(paragraph)
            paragraph.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      )
    )
  }, [editor])

  // ─── Handlers passés à l'overlay ─────────────────────────────────────────

  const handleDelete = useCallback(
    (cellKey: string) => editor.dispatchCommand(REMOVE_TABLE_CELL_COMMAND, cellKey),
    [editor]
  )
  const handleBefore = useCallback(
    (tableKey: string) => editor.dispatchCommand(INSERT_LINE_BEFORE_TABLE_COMMAND, tableKey),
    [editor]
  )
  const handleAfter = useCallback(
    (tableKey: string) => editor.dispatchCommand(INSERT_LINE_AFTER_TABLE_COMMAND, tableKey),
    [editor]
  )

  if (buttons.length === 0) return null

  return (
    <TableControlsOverlay
      buttons={buttons}
      onDelete={handleDelete}
      onBefore={handleBefore}
      onAfter={handleAfter}
    />
  )
}