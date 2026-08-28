import { useEffect } from "react"
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  ElementNode,
  createCommand,
  type LexicalCommand,
  type LexicalEditor as LexicalEditorType,
  type LexicalNode,
  type SerializedElementNode,
  type Spread,
} from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { mergeRegister } from "@lexical/utils"

// ─── Nœud image ─────────────────────────────────────────────────────────
// Même approche que LayoutContainerNode/LayoutItemNode (lexical-layout.tsx) :
// un ElementNode "feuille" (aucun enfant Lexical), dont createDOM() dessine
// directement l'<img> et un petit bouton "x" natif (non géré par Lexical,
// donc absent de l'export HTML). L'image ne contient pas de texte éditable,
// c'est un bloc autonome au même titre qu'un layout ou un tableau.

type SerializedImageNode = Spread<
  { src: string; altText: string; width: string | null; height: string | null },
  SerializedElementNode
>

// Taille minimale (px) sous laquelle on empêche l'image de descendre — au
// même titre que les 40px plancher des colonnes de tableau.
const MIN_IMAGE_SIZE = 40

export class ImageNode extends ElementNode {
  __src: string
  __altText: string
  __width: string | null
  __height: string | null

  constructor(
    src: string,
    altText: string,
    width: string | null = null,
    height: string | null = null,
    key?: string
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__width = width
    this.__height = height
  }

  static getType(): string {
    return "image"
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    )
  }

  canBeEmpty(): boolean {
    return true
  }

  isInline(): boolean {
    return false
  }

  isShadowRoot(): boolean {
    return true
  }

  createDOM(_config: unknown, editor: LexicalEditorType): HTMLElement {
    const wrapper = document.createElement("div")
    wrapper.setAttribute("data-lexical-image", "true")
    wrapper.contentEditable = "false"
    wrapper.className = "relative my-3 inline-block max-w-full"

    const img = document.createElement("img")
    img.src = this.__src
    img.alt = this.__altText
    img.draggable = false
    img.className = "block max-w-full rounded-md border border-slate-200"
    if (this.__width) img.style.width = this.__width
    if (this.__height) img.style.height = this.__height
    // Si largeur ET hauteur sont fixées explicitement (ex: via la poignée
    // de coin), l'image ne respecte plus forcément son ratio d'origine —
    // "cover" recadre proprement au lieu de l'étirer/écraser. Tant qu'une
    // seule dimension est fixée, on laisse l'autre en auto (ratio préservé
    // nativement par le navigateur), donc pas besoin d'object-fit.
    img.style.objectFit = this.__width && this.__height ? "cover" : ""
    wrapper.appendChild(img)

    // Bouton "x" (coin haut-droit) pour supprimer l'image — même style que
    // le bouton de suppression de colonne du système de layout.
    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.contentEditable = "false"
    deleteBtn.title = "Supprimer l'image"
    deleteBtn.setAttribute("aria-label", "Supprimer l'image")
    deleteBtn.setAttribute("data-lexical-image-delete", "true")
    deleteBtn.style.position = "absolute"
    deleteBtn.style.right = "6px"
    deleteBtn.style.top = "6px"
    deleteBtn.className =
      "z-10 flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-red-500 hover:text-white"
    deleteBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'

    const key = this.getKey()
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    deleteBtn.addEventListener("mousedown", stop)
    deleteBtn.addEventListener("click", (e) => {
      stop(e)
      editor.dispatchCommand(REMOVE_IMAGE_COMMAND, key)
    })
    wrapper.appendChild(deleteBtn)

    // Bouton "⏎" (coin haut-gauche) : insère un retour à la ligne juste
    // AVANT l'image — même principe que le bouton équivalent du layout
    // (INSERT_LINE_BEFORE_LAYOUT_COMMAND) et du tableau
    // (INSERT_LINE_BEFORE_TABLE_COMMAND).
    const beforeBtn = document.createElement("button")
    beforeBtn.type = "button"
    beforeBtn.contentEditable = "false"
    beforeBtn.title = "Ajouter un retour à la ligne avant cette image"
    beforeBtn.setAttribute(
      "aria-label",
      "Ajouter un retour à la ligne avant cette image"
    )
    beforeBtn.setAttribute("data-lexical-image-newline-before", "true")
    beforeBtn.style.position = "absolute"
    beforeBtn.style.left = "6px"
    beforeBtn.style.top = "6px"
    beforeBtn.className =
      "z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold leading-none text-slate-400 shadow-sm transition-colors hover:border-cyan-700 hover:text-cyan-700"
    beforeBtn.innerHTML = '<span aria-hidden="true">⏎</span>'
    beforeBtn.addEventListener("mousedown", stop)
    beforeBtn.addEventListener("click", (e) => {
      stop(e)
      editor.dispatchCommand(INSERT_LINE_BEFORE_IMAGE_COMMAND, key)
    })
    wrapper.appendChild(beforeBtn)

    // Bouton "⏎" (coin bas-droit) : insère un retour à la ligne juste
    // APRÈS l'image.
    const afterBtn = document.createElement("button")
    afterBtn.type = "button"
    afterBtn.contentEditable = "false"
    afterBtn.title = "Ajouter un retour à la ligne après cette image"
    afterBtn.setAttribute(
      "aria-label",
      "Ajouter un retour à la ligne après cette image"
    )
    afterBtn.setAttribute("data-lexical-image-newline-after", "true")
    afterBtn.style.position = "absolute"
    afterBtn.style.right = "6px"
    afterBtn.style.bottom = "6px"
    afterBtn.className =
      "z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold leading-none text-slate-400 shadow-sm transition-colors hover:border-cyan-700 hover:text-cyan-700"
    afterBtn.innerHTML = '<span aria-hidden="true">⏎</span>'
    afterBtn.addEventListener("mousedown", stop)
    afterBtn.addEventListener("click", (e) => {
      stop(e)
      editor.dispatchCommand(INSERT_LINE_AFTER_IMAGE_COMMAND, key)
    })
    wrapper.appendChild(afterBtn)

    // Bouton "réinitialiser la taille" (coin bas-gauche, seul coin encore
    // libre) : revient à la taille naturelle de l'image (width/height
    // remis à null → plus aucune contrainte de style).
    const resetBtn = document.createElement("button")
    resetBtn.type = "button"
    resetBtn.contentEditable = "false"
    resetBtn.title = "Réinitialiser la taille de l'image"
    resetBtn.setAttribute("aria-label", "Réinitialiser la taille de l'image")
    resetBtn.setAttribute("data-lexical-image-reset-size", "true")
    resetBtn.style.position = "absolute"
    resetBtn.style.left = "6px"
    resetBtn.style.bottom = "6px"
    resetBtn.className =
      "z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition-colors hover:border-cyan-700 hover:text-cyan-700"
    resetBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7"></path><path d="M3 16v-4h4"></path></svg>'
    resetBtn.addEventListener("mousedown", stop)
    resetBtn.addEventListener("click", (e) => {
      stop(e)
      editor.dispatchCommand(SET_IMAGE_SIZE_COMMAND, {
        nodeKey: key,
        width: null,
        height: null,
      })
    })
    wrapper.appendChild(resetBtn)

    // ── Poignées de redimensionnement ──────────────────────────────────
    // Trois poignées, comme un éditeur d'images classique : une sur le bord
    // droit (largeur seule), une sur le bord bas (hauteur seule), une au
    // coin bas-droit (les deux à la fois). Éléments DOM natifs, non gérés
    // par Lexical — le drag manipule directement le style de l'<img> pour
    // un rendu fluide, et ne committe la taille finale dans l'état Lexical
    // (via SET_IMAGE_SIZE_COMMAND) qu'au relâchement de la souris.
    const startResize = (mode: "width" | "height" | "both", downEvent: MouseEvent) => {
      downEvent.preventDefault()
      downEvent.stopPropagation()

      const rect = img.getBoundingClientRect()
      const startX = downEvent.clientX
      const startY = downEvent.clientY
      const startWidth = rect.width
      const startHeight = rect.height

      const prevCursor = document.body.style.cursor
      const prevUserSelect = document.body.style.userSelect
      document.body.style.cursor =
        mode === "width" ? "ew-resize" : mode === "height" ? "ns-resize" : "nwse-resize"
      document.body.style.userSelect = "none"

      const onMove = (moveEvent: MouseEvent) => {
        if (mode === "width" || mode === "both") {
          const nextWidth = Math.max(MIN_IMAGE_SIZE, startWidth + (moveEvent.clientX - startX))
          img.style.width = `${nextWidth}px`
        }
        if (mode === "height" || mode === "both") {
          const nextHeight = Math.max(MIN_IMAGE_SIZE, startHeight + (moveEvent.clientY - startY))
          img.style.height = `${nextHeight}px`
        }
        if (mode === "both") {
          img.style.objectFit = "cover"
        }
      }

      const onUp = () => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        document.body.style.cursor = prevCursor
        document.body.style.userSelect = prevUserSelect

        const payload: { nodeKey: string; width?: string | null; height?: string | null } = {
          nodeKey: key,
        }
        if (mode === "width" || mode === "both") payload.width = img.style.width
        if (mode === "height" || mode === "both") payload.height = img.style.height
        editor.dispatchCommand(SET_IMAGE_SIZE_COMMAND, payload)
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    }

    const HANDLE_BASE_CLASS =
      "absolute z-10 border border-cyan-700 bg-white shadow-sm transition-colors hover:bg-cyan-700"

    // Poignée bord droit — largeur seule.
    const widthHandle = document.createElement("div")
    widthHandle.contentEditable = "false"
    widthHandle.title = "Redimensionner la largeur"
    widthHandle.setAttribute("data-lexical-image-resize-width", "true")
    widthHandle.className = HANDLE_BASE_CLASS + " rounded-sm"
    widthHandle.style.right = "-4px"
    widthHandle.style.top = "50%"
    widthHandle.style.width = "7px"
    widthHandle.style.height = "32px"
    widthHandle.style.transform = "translateY(-50%)"
    widthHandle.style.cursor = "ew-resize"
    widthHandle.addEventListener("mousedown", (e) => startResize("width", e))
    wrapper.appendChild(widthHandle)

    // Poignée bord bas — hauteur seule.
    const heightHandle = document.createElement("div")
    heightHandle.contentEditable = "false"
    heightHandle.title = "Redimensionner la hauteur"
    heightHandle.setAttribute("data-lexical-image-resize-height", "true")
    heightHandle.className = HANDLE_BASE_CLASS + " rounded-sm"
    heightHandle.style.bottom = "-4px"
    heightHandle.style.left = "50%"
    heightHandle.style.width = "32px"
    heightHandle.style.height = "7px"
    heightHandle.style.transform = "translateX(-50%)"
    heightHandle.style.cursor = "ns-resize"
    heightHandle.addEventListener("mousedown", (e) => startResize("height", e))
    wrapper.appendChild(heightHandle)

    // Poignée coin bas-droit — largeur + hauteur ensemble.
    const cornerHandle = document.createElement("div")
    cornerHandle.contentEditable = "false"
    cornerHandle.title = "Redimensionner (largeur + hauteur)"
    cornerHandle.setAttribute("data-lexical-image-resize-corner", "true")
    cornerHandle.className = HANDLE_BASE_CLASS + " rounded-full"
    cornerHandle.style.right = "-4px"
    cornerHandle.style.bottom = "-4px"
    cornerHandle.style.width = "10px"
    cornerHandle.style.height = "10px"
    cornerHandle.style.cursor = "nwse-resize"
    cornerHandle.addEventListener("mousedown", (e) => startResize("both", e))
    wrapper.appendChild(cornerHandle)

    return wrapper
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement): boolean {
    if (prevNode.__src !== this.__src || prevNode.__altText !== this.__altText) {
      // Source différente : plus simple de recréer le DOM que de patcher.
      return true
    }
    if (prevNode.__width !== this.__width || prevNode.__height !== this.__height) {
      const img = dom.querySelector("img")
      if (img) {
        img.style.width = this.__width ?? ""
        img.style.height = this.__height ?? ""
        img.style.objectFit = this.__width && this.__height ? "cover" : ""
      }
    }
    return false
  }

  setWidth(width: string | null): void {
    const writable = this.getWritable()
    writable.__width = width
  }

  setHeight(height: string | null): void {
    const writable = this.getWritable()
    writable.__height = height
  }

  // Export HTML propre (voir LayoutContainerNode.exportDOM) : juste l'<img>,
  // sans les boutons/poignées qui ne sont que des repères d'édition.
  exportDOM(): { element: HTMLElement } {
    const img = document.createElement("img")
    img.src = this.__src
    img.alt = this.__altText
    if (this.__width) img.style.width = this.__width
    if (this.__height) img.style.height = this.__height
    if (this.__width && this.__height) img.style.objectFit = "cover"
    return { element: img }
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    return $createImageNode(
      serialized.src,
      serialized.altText,
      serialized.width,
      serialized.height
    )
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    }
  }
}

export function $createImageNode(
  src: string,
  altText = "",
  width: string | null = null,
  height: string | null = null
): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, width, height))
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}

// ─── Commandes ────────────────────────────────────────────────────────────

export const INSERT_IMAGE_COMMAND: LexicalCommand<{
  src: string
  altText?: string
}> = createCommand("INSERT_IMAGE_COMMAND")

export const REMOVE_IMAGE_COMMAND: LexicalCommand<string> =
  createCommand("REMOVE_IMAGE_COMMAND")

// Applique une nouvelle largeur et/ou hauteur (en px, ex "240px") à une
// image. Un champ omis (`undefined`) laisse la dimension correspondante
// inchangée — utilisé par les poignées "largeur seule" / "hauteur seule".
// Passer `null` explicitement réinitialise cette dimension (taille auto),
// ce qu'utilise le bouton de réinitialisation.
export const SET_IMAGE_SIZE_COMMAND: LexicalCommand<{
  nodeKey: string
  width?: string | null
  height?: string | null
}> = createCommand("SET_IMAGE_SIZE_COMMAND")

// Insère (ou réutilise) un paragraphe vide juste avant/après l'image —
// miroir de INSERT_LINE_BEFORE/AFTER_LAYOUT_COMMAND (lexical-layout.tsx) et
// INSERT_LINE_BEFORE/AFTER_TABLE_COMMAND (lexical-table-controls.tsx).
export const INSERT_LINE_BEFORE_IMAGE_COMMAND: LexicalCommand<string> =
  createCommand("INSERT_LINE_BEFORE_IMAGE_COMMAND")
export const INSERT_LINE_AFTER_IMAGE_COMMAND: LexicalCommand<string> =
  createCommand("INSERT_LINE_AFTER_IMAGE_COMMAND")

export function ImagePlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error("ImagePlugin: ImageNode non enregistré sur l'éditeur")
    }

    return mergeRegister(
      editor.registerCommand<{ src: string; altText?: string }>(
        INSERT_IMAGE_COMMAND,
        ({ src, altText }) => {
          editor.update(() => {
            const node = $createImageNode(src, altText ?? "")
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              $insertNodes([node])
            } else {
              // Pas de sélection active (ex: focus perdu pendant le choix
              // du fichier) : on insère quand même, à la fin du document.
              $insertNodes([node])
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        REMOVE_IMAGE_COMMAND,
        (nodeKey) => {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if ($isImageNode(node)) node.remove()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<{
        nodeKey: string
        width?: string | null
        height?: string | null
      }>(
        SET_IMAGE_SIZE_COMMAND,
        ({ nodeKey, width, height }) => {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if (!$isImageNode(node)) return
            if (width !== undefined) node.setWidth(width)
            if (height !== undefined) node.setHeight(height)
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        INSERT_LINE_BEFORE_IMAGE_COMMAND,
        (nodeKey) => {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if (!$isImageNode(node)) return

            const prev = node.getPreviousSibling()
            if (
              prev &&
              prev.getType() === "paragraph" &&
              (prev as ElementNode).isEmpty()
            ) {
              ;(prev as ElementNode).selectStart()
              return
            }

            const paragraph = $createParagraphNode()
            node.insertBefore(paragraph)
            paragraph.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        INSERT_LINE_AFTER_IMAGE_COMMAND,
        (nodeKey) => {
          editor.update(() => {
            const node = $getNodeByKey(nodeKey)
            if (!$isImageNode(node)) return

            const next = node.getNextSibling()
            if (
              next &&
              next.getType() === "paragraph" &&
              (next as ElementNode).isEmpty()
            ) {
              ;(next as ElementNode).selectStart()
              return
            }

            const paragraph = $createParagraphNode()
            node.insertAfter(paragraph)
            paragraph.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      )
    )
  }, [editor])

  return null
}