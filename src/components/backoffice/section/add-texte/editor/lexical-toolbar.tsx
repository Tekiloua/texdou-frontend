import React, { useCallback, useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns2,
  Columns3,
  Table,
  Image as ImageIcon,
} from "lucide-react"
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from "@lexical/rich-text"
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list"
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection"
import { $findMatchingParent, mergeRegister } from "@lexical/utils"
import { INSERT_TABLE_COMMAND, TableCellNode, TableRowNode, TableNode } from "@lexical/table"
import {
  $isLayoutContainerNode,
  $isLayoutItemNode,
  INSERT_LAYOUT_COMMAND,
  UPDATE_LAYOUT_COMMAND,
  SET_LAYOUT_ITEM_BG_COMMAND,
  SET_LAYOUT_ITEM_HEIGHT_COMMAND,
  LayoutItemNode,
  LayoutContainerNode,
  REMOVE_LAYOUT_COMMAND,
} from "./lexical-layout"
import {
  RESIZE_TABLE_COLUMN_COMMAND,
  RESIZE_TABLE_ROW_COMMAND,
} from "./lexical-table-controls"
import { INSERT_IMAGE_COMMAND } from "./lexical-image"

// Valeurs de départ utilisées quand une cellule/ligne n'a pas encore de
// largeur/hauteur explicite (comportement "auto" d'origine).
const DEFAULT_TABLE_COLUMN_WIDTH = 120
const DEFAULT_TABLE_ROW_HEIGHT = 40

const DEFAULT_FONT_SIZE = 14

// ─── Toolbar Lexical ───────────────────────────────────────────────────────────

type BlockType = "paragraph" | "h2" | "h3" | "quote" | "bullet" | "number"

function ToolbarButton({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={[
        "flex h-7 w-7 items-center justify-center rounded transition-colors",
        active
          ? "text-foreground bg-cyan-700"
          : "text-foreground/70 hover:bg-cyan-700 hover:text-foreground",
      ].join(" ")}
    >
      {icon}
    </button>
  )
}

function LexicalToolbar() {
  const [editor] = useLexicalComposerContext()

  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isStrike, setIsStrike] = useState(false)
  const [blockType, setBlockType] = useState<BlockType>("paragraph")
  const [align, setAlign] = useState<"left" | "center" | "right">("left")
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE)

  // ── Insertion d'image (fichier local converti en data URL) ──
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  // ── Dialogue d'insertion de mise en page (colonnes) ──
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false)
  const [customColumnCount, setCustomColumnCount] = useState<number>(4)

  // ── Dialogue d'insertion de tableau (lignes × colonnes) ──
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [tableRowCount, setTableRowCount] = useState<number>(3)
  const [tableColumnCount, setTableColumnCount] = useState<number>(3)

  // ── Inspecteur de tableau ──
  // Renseigné quand le curseur se trouve dans une cellule de tableau, pour
  // pouvoir redimensionner la colonne (largeur) et la ligne (hauteur)
  // courantes — pendant équivalent du panneau de colonnes de layout.
  const [activeTableKey, setActiveTableKey] = useState<string | null>(null)
  const [activeTableRowKey, setActiveTableRowKey] = useState<string | null>(null)
  const [activeTableColumnIndex, setActiveTableColumnIndex] = useState<number>(0)
  const [activeTableColumnWidth, setActiveTableColumnWidth] = useState<number | null>(null)
  const [activeTableRowHeight, setActiveTableRowHeight] = useState<number | null>(null)

  // ── Inspecteur de mise en page (colonnes) ──
  // Renseigné quand le curseur se trouve à l'intérieur d'une mise en page,
  // pour pouvoir agrandir/rétrécir les colonnes et changer leur couleur de fond.
  const [activeContainerKey, setActiveContainerKey] = useState<string | null>(null)
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null)
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0)
  const [columnFr, setColumnFr] = useState<number[]>([])
  const [activeItemBg, setActiveItemBg] = useState<string>("#ffffff")
  // Hauteur minimale (px) de la colonne active ; null = hauteur automatique.
  const [activeItemMinHeight, setActiveItemMinHeight] = useState<number | null>(null)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return

    setIsBold(selection.hasFormat("bold"))
    setIsItalic(selection.hasFormat("italic"))
    setIsStrike(selection.hasFormat("strikethrough"))

    const anchorNode = selection.anchor.getNode()
    const targetNode =
      anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow()

    if ($isListNode(targetNode)) {
      setBlockType(targetNode.getListType() === "number" ? "number" : "bullet")
    } else {
      const parentList = $findMatchingParent(anchorNode, (n) => $isListNode(n))
      if (parentList && $isListNode(parentList)) {
        setBlockType(parentList.getListType() === "number" ? "number" : "bullet")
      } else if ($isHeadingNode(targetNode)) {
        setBlockType(targetNode.getTag() === "h2" ? "h2" : "h3")
      } else if (targetNode.getType() === "quote") {
        setBlockType("quote")
      } else {
        setBlockType("paragraph")
      }
    }

    const elementNode = $findMatchingParent(
      anchorNode,
      (n) => n instanceof ElementNode && !(n instanceof LayoutItemNode) && !(n instanceof LayoutContainerNode)
    )
    const formatType =
      (elementNode && "getFormatType" in elementNode
        ? (elementNode as ElementNode).getFormatType()
        : "") || "left"
    setAlign(formatType === "center" || formatType === "right" ? formatType : "left")

    const size = $getSelectionStyleValueForProperty(selection, "font-size", `${DEFAULT_FONT_SIZE}px`)
    const parsed = parseInt(size, 10)
    setFontSize(Number.isNaN(parsed) ? DEFAULT_FONT_SIZE : parsed)

    // Détection de la mise en page (colonnes) active sous le curseur
    const layoutItem = $findMatchingParent(anchorNode, (n) => $isLayoutItemNode(n))
    if (layoutItem && $isLayoutItemNode(layoutItem)) {
      const container = layoutItem.getParent()
      if ($isLayoutContainerNode(container)) {
        setActiveContainerKey(container.getKey())
        setActiveItemKey(layoutItem.getKey())
        setActiveItemIndex(container.getChildren().findIndex((c) => c.getKey() === layoutItem.getKey()))
        const fr = container
          .getTemplateColumns()
          .trim()
          .split(/\s+/)
          .map((token) => parseFloat(token) || 1)
        setColumnFr(fr)
        setActiveItemBg(layoutItem.getBackgroundColor() ?? "#ffffff")
        const minHeight = layoutItem.getMinHeight()
        setActiveItemMinHeight(minHeight ? parseInt(minHeight, 10) || null : null)
      }
    } else {
      setActiveContainerKey(null)
      setActiveItemKey(null)
    }

    // Détection de la cellule de tableau active sous le curseur
    const tableCell = $findMatchingParent(anchorNode, (n) => n instanceof TableCellNode)
    if (tableCell instanceof TableCellNode) {
      const row = tableCell.getParent()
      if (row instanceof TableRowNode) {
        const table = row.getParent()
        if (table instanceof TableNode) {
          setActiveTableKey(table.getKey())
          setActiveTableRowKey(row.getKey())
          setActiveTableColumnIndex(tableCell.getIndexWithinParent())
          setActiveTableColumnWidth(tableCell.getWidth() ?? null)
          setActiveTableRowHeight(row.getHeight() ?? null)
        }
      }
    } else {
      setActiveTableKey(null)
      setActiveTableRowKey(null)
    }
  }, [])

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar())
      }),
      editor.registerCommand(
        FORMAT_TEXT_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        COMMAND_PRIORITY_LOW
      )
    )
  }, [editor, updateToolbar])

  const setBlock = (type: BlockType) => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      if (type === "bullet") {
        if (blockType === "bullet") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        } else {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        return
      }
      if (type === "number") {
        if (blockType === "number") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
        } else {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        return
      }
      if (type === "quote") {
        $setBlocksType(selection, () =>
          blockType === "quote" ? $createParagraphNode() : $createQuoteNode()
        )
        return
      }
      if (type === "h2" || type === "h3") {
        $setBlocksType(selection, () =>
          blockType === type ? $createParagraphNode() : $createHeadingNode(type)
        )
        return
      }
      $setBlocksType(selection, () => $createParagraphNode())
    })
  }

  const setAlignment = (value: "left" | "center" | "right") => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, value)
  }

  const applyFontSize = (value: number) => {
    editor.update(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      $patchStyleText(selection, { "font-size": `${value}px` })
    })
  }

  // Insère une mise en page à `count` colonnes de largeur égale.
  const insertLayout = (count: number) => {
    const safeCount = Math.min(6, Math.max(2, Math.round(count) || 2))
    editor.dispatchCommand(
      INSERT_LAYOUT_COMMAND,
      Array.from({ length: safeCount }, () => "1fr").join(" ")
    )
    setLayoutDialogOpen(false)
  }

  // Redimensionne la colonne `index` du layout actif : on ajuste sa valeur
  // "fr" relative aux autres colonnes (min 0.3fr pour ne jamais la faire
  // disparaître complètement).
  const resizeColumn = (index: number, delta: number) => {
    if (!activeContainerKey || columnFr.length === 0) return
    const next = columnFr.map((v, i) => (i === index ? Math.max(0.3, +(v + delta).toFixed(2)) : v))
    setColumnFr(next)
    editor.dispatchCommand(UPDATE_LAYOUT_COMMAND, {
      containerKey: activeContainerKey,
      templateColumns: next.map((v) => `${v}fr`).join(" "),
    })
  }

  // Ajuste la hauteur minimale de la colonne active, par pas de `delta` px.
  // En dessous de 40px on considère que l'utilisateur veut revenir à une
  // hauteur automatique (pas de contrainte, comportement d'origine).
  const resizeColumnHeight = (delta: number) => {
    if (!activeItemKey) return
    const base = activeItemMinHeight ?? 120
    const next = Math.max(0, base + delta)
    const minHeight = next < 40 ? null : next
    setActiveItemMinHeight(minHeight)
    editor.dispatchCommand(SET_LAYOUT_ITEM_HEIGHT_COMMAND, {
      itemKey: activeItemKey,
      minHeight: minHeight ? `${minHeight}px` : null,
    })
  }

  const setColumnBg = (color: string) => {
    if (!activeItemKey) return
    setActiveItemBg(color)
    editor.dispatchCommand(SET_LAYOUT_ITEM_BG_COMMAND, { itemKey: activeItemKey, color })
  }

  const removeActiveLayout = () => {
    if (!activeContainerKey) return
    editor.dispatchCommand(REMOVE_LAYOUT_COMMAND, activeContainerKey)
    setActiveContainerKey(null)
    setActiveItemKey(null)
  }

  // Insère un tableau au nombre de lignes/colonnes choisi dans le dialogue,
  // à l'endroit du curseur.
  const insertTable = () => {
    const safeRows = Math.min(20, Math.max(1, Math.round(tableRowCount) || 1))
    const safeColumns = Math.min(20, Math.max(1, Math.round(tableColumnCount) || 1))
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: String(safeColumns),
      rows: String(safeRows),
    })
    setTableDialogOpen(false)
  }

  // Redimensionne la colonne active du tableau (largeur, en px). Miroir de
  // `resizeColumn` pour les layouts, mais en pixels plutôt qu'en fr : une
  // colonne de tableau n'a pas de largeur relative aux autres, chaque
  // cellule a sa propre largeur fixe.
  const resizeTableColumn = (delta: number) => {
    if (!activeTableKey) return
    const base = activeTableColumnWidth ?? DEFAULT_TABLE_COLUMN_WIDTH
    const next = Math.max(40, base + delta)
    setActiveTableColumnWidth(next)
    editor.dispatchCommand(RESIZE_TABLE_COLUMN_COMMAND, {
      tableKey: activeTableKey,
      columnIndex: activeTableColumnIndex,
      width: next,
    })
  }

  // Redimensionne la ligne active du tableau (hauteur, en px). Miroir de
  // `resizeColumnHeight` pour les layouts.
  const resizeTableRow = (delta: number) => {
    if (!activeTableRowKey) return
    const base = activeTableRowHeight ?? DEFAULT_TABLE_ROW_HEIGHT
    const next = Math.max(24, base + delta)
    setActiveTableRowHeight(next)
    editor.dispatchCommand(RESIZE_TABLE_ROW_COMMAND, {
      rowKey: activeTableRowKey,
      height: next,
    })
  }

  // Lit le fichier image choisi et l'insère en data URL (pas d'infra
  // d'upload dédiée ici — le HTML généré embarque directement l'image).
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // permet de re-sélectionner le même fichier ensuite
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : ""
      if (!src) return
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src,
        altText: file.name,
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <ToolbarButton
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        icon={<Bold className="h-3.5 w-3.5" />}
        title="Gras"
      />
      <ToolbarButton
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        icon={<Italic className="h-3.5 w-3.5" />}
        title="Italique"
      />
      <ToolbarButton
        active={isStrike}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        icon={<Strikethrough className="h-3.5 w-3.5" />}
        title="Barré"
      />
      <div className="mx-1 h-5 w-px bg-slate-200" />
      <ToolbarButton
        active={blockType === "h2"}
        onClick={() => setBlock("h2")}
        icon={<Heading2 className="h-3.5 w-3.5" />}
        title="Titre 2"
      />
      <ToolbarButton
        active={blockType === "h3"}
        onClick={() => setBlock("h3")}
        icon={<Heading3 className="h-3.5 w-3.5" />}
        title="Titre 3"
      />
      <div className="mx-1 h-5 w-px bg-slate-200" />
      <ToolbarButton
        active={blockType === "bullet"}
        onClick={() => setBlock("bullet")}
        icon={<List className="h-3.5 w-3.5" />}
        title="Liste à puces"
      />
      <ToolbarButton
        active={blockType === "number"}
        onClick={() => setBlock("number")}
        icon={<ListOrdered className="h-3.5 w-3.5" />}
        title="Liste numérotée"
      />
      <ToolbarButton
        active={blockType === "quote"}
        onClick={() => setBlock("quote")}
        icon={<Quote className="h-3.5 w-3.5" />}
        title="Citation"
      />
      <div className="mx-1 h-5 w-px bg-slate-200" />
      <ToolbarButton
        active={align === "left"}
        onClick={() => setAlignment("left")}
        icon={<AlignLeft className="h-3.5 w-3.5" />}
        title="Aligner à gauche"
      />
      <ToolbarButton
        active={align === "center"}
        onClick={() => setAlignment("center")}
        icon={<AlignCenter className="h-3.5 w-3.5" />}
        title="Centrer"
      />
      <ToolbarButton
        active={align === "right"}
        onClick={() => setAlignment("right")}
        icon={<AlignRight className="h-3.5 w-3.5" />}
        title="Aligner à droite"
      />
      <div className="mx-1 h-5 w-px bg-slate-200" />
      <div className="flex items-center gap-1 px-1" title="Taille de police">
        <Input
          type="number"
          min={8}
          max={96}
          value={fontSize}
          onChange={(e) => {
            const value = Number(e.target.value)
            if (!value) return
            applyFontSize(value)
          }}
          className="h-7 w-16 border-slate-200 px-2 text-xs"
        />
        <span className="text-xs text-slate-400">px</span>
      </div>
      <div className="mx-1 h-5 w-px bg-slate-200" />
      {/* ── Système de layout Lexical : insertion de colonnes ── */}
      <ToolbarButton
        active={false}
        onClick={() => setLayoutDialogOpen(true)}
        icon={<Columns3 className="h-3.5 w-3.5" />}
        title="Insérer une mise en page en colonnes"
      />
      <ToolbarButton
        active={false}
        onClick={() => setTableDialogOpen(true)}
        icon={<Table className="h-3.5 w-3.5" />}
        title="Insérer un tableau"
      />
      <ToolbarButton
        active={false}
        onClick={() => imageInputRef.current?.click()}
        icon={<ImageIcon className="h-3.5 w-3.5" />}
        title="Insérer une image"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <AlertDialog open={layoutDialogOpen} onOpenChange={setLayoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insérer une mise en page</AlertDialogTitle>
            <AlertDialogDescription>
              Choisissez le nombre de colonnes de la mise en page à insérer à
              l'endroit du curseur.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-2 py-2">
            <button
              type="button"
              onClick={() => insertLayout(2)}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 transition-colors hover:border-cyan-700 hover:bg-cyan-50/50"
            >
              <Columns2 className="h-6 w-6 text-cyan-700" />
              <span className="text-sm font-medium text-slate-700">2 colonnes</span>
            </button>
            <button
              type="button"
              onClick={() => insertLayout(3)}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 transition-colors hover:border-cyan-700 hover:bg-cyan-50/50"
            >
              <Columns3 className="h-6 w-6 text-cyan-700" />
              <span className="text-sm font-medium text-slate-700">3 colonnes</span>
            </button>
          </div>

          <div className="flex items-end gap-2 rounded-lg border border-slate-200 p-3">
            <div className="flex-1">
              <Label htmlFor="custom-columns" className="text-xs text-slate-500">
                Nombre de colonnes personnalisé
              </Label>
              <Input
                id="custom-columns"
                type="number"
                min={2}
                max={6}
                value={customColumnCount}
                onChange={(e) => setCustomColumnCount(Number(e.target.value) || 2)}
                className="mt-1 h-8 border-slate-200 text-sm"
              />
            </div>
            <Button
              type="button"
              onClick={() => insertLayout(customColumnCount)}
              className="h-8 bg-cyan-700 text-white hover:bg-cyan-800"
            >
              Créer
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insérer un tableau</AlertDialogTitle>
            <AlertDialogDescription>
              Choisissez le nombre de lignes et de colonnes du tableau à
              insérer à l'endroit du curseur.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label htmlFor="table-row-count" className="text-xs text-slate-500">
                Lignes
              </Label>
              <Input
                id="table-row-count"
                type="number"
                min={1}
                max={20}
                value={tableRowCount}
                onChange={(e) => setTableRowCount(Number(e.target.value) || 1)}
                className="mt-1 h-8 border-slate-200 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="table-column-count" className="text-xs text-slate-500">
                Colonnes
              </Label>
              <Input
                id="table-column-count"
                type="number"
                min={1}
                max={20}
                value={tableColumnCount}
                onChange={(e) => setTableColumnCount(Number(e.target.value) || 1)}
                className="mt-1 h-8 border-slate-200 text-sm"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button
              type="button"
              onClick={insertTable}
              className="h-8 bg-cyan-700 text-white hover:bg-cyan-800"
            >
              Créer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-1 h-5 w-px bg-slate-200" />
      <ToolbarButton
        active={false}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        icon={<Undo className="h-3.5 w-3.5" />}
        title="Annuler"
      />
      <ToolbarButton
        active={false}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        icon={<Redo className="h-3.5 w-3.5" />}
        title="Rétablir"
      />

      {/* ── Panneau d'inspection : visible seulement quand le curseur est
          dans une mise en page (colonnes). Permet d'agrandir/rétrécir
          chaque colonne et de changer sa couleur de fond. ── */}
      {activeContainerKey && columnFr.length > 0 && (
        <div className="mt-1.5 flex w-full flex-wrap items-center gap-2 rounded-md border border-cyan-100 bg-cyan-50/60 px-2 py-1.5">
          <span className="text-[11px] font-medium text-cyan-800">Colonnes :</span>
          {columnFr.map((fr, i) => (
            <div
              key={i}
              className={[
                "flex items-center gap-1 rounded border bg-white px-1.5 py-0.5",
                i === activeItemIndex ? "border-cyan-600" : "border-slate-200",
              ].join(" ")}
            >
              <span className="text-[11px] text-slate-500">C{i + 1}</span>
              <button
                type="button"
                title="Rétrécir cette colonne"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => resizeColumn(i, -0.2)}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              >
                −
              </button>
              <span className="w-8 text-center text-[11px] tabular-nums text-slate-600">
                {fr.toFixed(1)}fr
              </span>
              <button
                type="button"
                title="Agrandir cette colonne"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => resizeColumn(i, 0.2)}
                className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              >
                +
              </button>
            </div>
          ))}

          <div className="mx-1 h-4 w-px bg-cyan-200" />

          <label
            title="Couleur de fond de la colonne sélectionnée"
            className="flex cursor-pointer items-center gap-1.5 rounded border border-slate-200 bg-white px-1.5 py-0.5"
          >
            <span className="text-[11px] text-slate-500">Fond C{activeItemIndex + 1}</span>
            <span
              className="h-3.5 w-3.5 rounded-full border border-slate-300"
              style={{ backgroundColor: activeItemBg }}
            />
            <input
              type="color"
              value={activeItemBg === "transparent" ? "#ffffff" : activeItemBg}
              onChange={(e) => setColumnBg(e.target.value)}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColumnBg("transparent")}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
            title="Retirer la couleur de fond"
          >
            Aucune
          </button>

          <div className="mx-1 h-4 w-px bg-cyan-200" />

          <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
            <span className="text-[11px] text-slate-500">Hauteur C{activeItemIndex + 1}</span>
            <button
              type="button"
              title="Réduire la hauteur de cette colonne"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeColumnHeight(-20)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              step={20}
              placeholder="auto"
              value={activeItemMinHeight ?? ""}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") {
                  setActiveItemMinHeight(null)
                  if (activeItemKey) {
                    editor.dispatchCommand(SET_LAYOUT_ITEM_HEIGHT_COMMAND, {
                      itemKey: activeItemKey,
                      minHeight: null,
                    })
                  }
                  return
                }
                const value = Math.max(0, Number(raw) || 0)
                setActiveItemMinHeight(value)
                if (activeItemKey) {
                  editor.dispatchCommand(SET_LAYOUT_ITEM_HEIGHT_COMMAND, {
                    itemKey: activeItemKey,
                    minHeight: `${value}px`,
                  })
                }
              }}
              className="h-5 w-14 rounded border border-slate-200 px-1 text-center text-[11px] tabular-nums text-slate-600 [appearance:textfield] focus:border-cyan-600 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[11px] text-slate-400">px</span>
            <button
              type="button"
              title="Augmenter la hauteur de cette colonne"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeColumnHeight(20)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              +
            </button>
            {activeItemMinHeight !== null && (
              <button
                type="button"
                title="Revenir à une hauteur automatique"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setActiveItemMinHeight(null)
                  if (activeItemKey) {
                    editor.dispatchCommand(SET_LAYOUT_ITEM_HEIGHT_COMMAND, {
                      itemKey: activeItemKey,
                      minHeight: null,
                    })
                  }
                }}
                className="ml-0.5 rounded px-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                auto
              </button>
            )}
          </div>

          <div className="mx-1 h-4 w-px bg-cyan-200" />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={removeActiveLayout}
            className="ml-auto rounded border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
            title="Supprimer cette mise en page"
          >
            Supprimer la mise en page
          </button>
        </div>
      )}

      {/* ── Panneau d'inspection : visible quand le curseur est dans une
          cellule de tableau. Permet d'agrandir/rétrécir la largeur de la
          colonne courante et la hauteur de la ligne courante — même
          principe que le panneau de colonnes de layout ci-dessus. ── */}
      {activeTableKey && (
        <div className="mt-1.5 flex w-full flex-wrap items-center gap-2 rounded-md border border-cyan-100 bg-cyan-50/60 px-2 py-1.5">
          <span className="text-[11px] font-medium text-cyan-800">Tableau :</span>

          <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
            <span className="text-[11px] text-slate-500">
              Largeur colonne {activeTableColumnIndex + 1}
            </span>
            <button
              type="button"
              title="Rétrécir cette colonne"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeTableColumn(-20)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              −
            </button>
            <span className="w-10 text-center text-[11px] tabular-nums text-slate-600">
              {activeTableColumnWidth ?? DEFAULT_TABLE_COLUMN_WIDTH}px
            </span>
            <button
              type="button"
              title="Agrandir cette colonne"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeTableColumn(20)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5">
            <span className="text-[11px] text-slate-500">Hauteur ligne</span>
            <button
              type="button"
              title="Réduire la hauteur de cette ligne"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeTableRow(-10)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              −
            </button>
            <span className="w-10 text-center text-[11px] tabular-nums text-slate-600">
              {activeTableRowHeight ?? DEFAULT_TABLE_ROW_HEIGHT}px
            </span>
            <button
              type="button"
              title="Augmenter la hauteur de cette ligne"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => resizeTableRow(10)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


export { LexicalToolbar, ToolbarButton, DEFAULT_FONT_SIZE }