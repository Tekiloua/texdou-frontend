import { useEffect } from "react"
// ── Lexical (cœur + plugins officiels) ────────────────────────────────────
// npm install lexical @lexical/react @lexical/rich-text @lexical/list
//             @lexical/selection @lexical/utils @lexical/html
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getNodeByKey,
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  ElementNode,
  type LexicalNode,
  type LexicalEditor as LexicalEditorType,
  type SerializedElementNode,
  type Spread,
  createCommand,
  type LexicalCommand,
} from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { mergeRegister } from "@lexical/utils"

// ─── Construction de l'arbre à partir des données réelles (API) ──────────────

type SerializedLayoutContainerNode = Spread<
  { templateColumns: string },
  SerializedElementNode
>

export class LayoutContainerNode extends ElementNode {
  __templateColumns: string

  constructor(templateColumns: string, key?: string) {
    super(key)
    this.__templateColumns = templateColumns
  }

  static getType(): string {
    return "layout-container"
  }

  static clone(node: LayoutContainerNode): LayoutContainerNode {
    return new LayoutContainerNode(node.__templateColumns, node.__key)
  }

  createDOM(_config: unknown, editor: LexicalEditorType): HTMLElement {
    const dom = document.createElement("div")
    dom.style.display = "grid"
    dom.style.gridTemplateColumns = this.__templateColumns
    dom.style.gap = "16px"
    // Par défaut une grille CSS étire chaque colonne à la hauteur de la
    // plus grande ("align-items: stretch" implicite) — c'est ce qui
    // empêchait toute réduction de hauteur de faire un quelconque effet
    // visuel : la colonne réduite était quand même étirée par ses voisines.
    // "start" laisse chaque colonne prendre sa propre hauteur.
    dom.style.alignItems = "start"
    dom.setAttribute("data-lexical-layout-container", "true")
    dom.className = "relative my-3"

    // Bouton "⏎" affiché sous le layout pour insérer un saut de ligne
    // (paragraphe) juste après le conteneur, permettant de reprendre la
    // rédaction en dehors des colonnes sans avoir à naviguer au clavier.
    // Élément DOM natif non géré par Lexical, comme le bouton de
    // suppression de colonne — donc non éditable et absent de l'export.
    const newlineBtn = document.createElement("button")
    newlineBtn.type = "button"
    newlineBtn.contentEditable = "false"
    newlineBtn.title = "Ajouter un retour à la ligne après ce layout"
    newlineBtn.setAttribute(
      "aria-label",
      "Ajouter un retour à la ligne après ce layout"
    )
    newlineBtn.setAttribute("data-lexical-layout-container-newline", "true")
    // Placement en overlay, ancré au coin bas-droit du conteneur (donc
    // visuellement sur le coin bas-droit de la dernière colonne, sur la
    // même ligne que le layout) — un élément absolute sort du flux de la
    // grille, donc il ne crée pas de ligne supplémentaire sous le layout.
    newlineBtn.style.position = "absolute"
    newlineBtn.style.right = "6px"
    newlineBtn.style.bottom = "6px"
    newlineBtn.className =
      "z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold leading-none text-slate-400 shadow-sm transition-colors hover:border-cyan-700 hover:text-cyan-700"
    newlineBtn.innerHTML = '<span aria-hidden="true">⏎</span>'

    const key = this.getKey()
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    newlineBtn.addEventListener("mousedown", stop)
    newlineBtn.addEventListener("click", (e) => {
      stop(e)
      editor.dispatchCommand(INSERT_LINE_AFTER_LAYOUT_COMMAND, key)
    })

    dom.appendChild(newlineBtn)
    return dom
  }

  updateDOM(prevNode: LayoutContainerNode, dom: HTMLElement): boolean {
    if (prevNode.__templateColumns !== this.__templateColumns) {
      dom.style.gridTemplateColumns = this.__templateColumns
    }
    return false
  }

  setTemplateColumns(templateColumns: string): void {
    const writable = this.getWritable()
    writable.__templateColumns = templateColumns
  }

  getTemplateColumns(): string {
    return this.getLatest().__templateColumns
  }

  static importJSON(
    serialized: SerializedLayoutContainerNode
  ): LayoutContainerNode {
    return $createLayoutContainerNode(serialized.templateColumns)
  }

  exportJSON(): SerializedLayoutContainerNode {
    return {
      ...super.exportJSON(),
      type: "layout-container",
      version: 1,
      templateColumns: this.__templateColumns,
    }
  }

  canBeEmpty(): boolean {
    return false
  }

  isShadowRoot(): boolean {
    return true
  }

  // Rendu utilisé par $generateHtmlFromNodes (export HTML vers la BDD /
  // prévisualisation détachée de l'éditeur). Par défaut Lexical retombe sur
  // createDOM() pour l'export, qui contient le bouton "⏎" — un simple
  // élément d'aide à l'édition, sans valeur dans le HTML final. On fournit
  // donc ici un DOM minimal : juste la grille CSS, aucun bouton.
  exportDOM(): { element: HTMLElement } {
    const element = document.createElement("div")
    element.style.display = "grid"
    element.style.gridTemplateColumns = this.__templateColumns
    element.style.gap = "16px"
    element.style.alignItems = "start"
    element.setAttribute("data-lexical-layout-container", "true")
    return { element }
  }
}

export function $createLayoutContainerNode(
  templateColumns: string
): LayoutContainerNode {
  return $applyNodeReplacement(new LayoutContainerNode(templateColumns))
}

export function $isLayoutContainerNode(
  node: LexicalNode | null | undefined
): node is LayoutContainerNode {
  return node instanceof LayoutContainerNode
}

type SerializedLayoutItemNode = Spread<
  { backgroundColor: string | null; minHeight: string | null },
  SerializedElementNode
>

export class LayoutItemNode extends ElementNode {
  __backgroundColor: string | null
  __minHeight: string | null

  constructor(
    backgroundColor: string | null = null,
    minHeight: string | null = null,
    key?: string
  ) {
    super(key)
    this.__backgroundColor = backgroundColor
    this.__minHeight = minHeight
  }

  static getType(): string {
    return "layout-item"
  }

  static clone(node: LayoutItemNode): LayoutItemNode {
    return new LayoutItemNode(
      node.__backgroundColor,
      node.__minHeight,
      node.__key
    )
  }

  createDOM(_config: unknown, editor: LexicalEditorType): HTMLElement {
    const dom = document.createElement("div")
    dom.setAttribute("data-lexical-layout-item", "true")
    dom.className =
      "relative min-w-0 rounded-md border border-dashed border-slate-300 p-3 pt-6"
    if (this.__backgroundColor) {
      dom.style.backgroundColor = this.__backgroundColor
    }
    if (this.__minHeight) {
      // "height" (et non "min-height") : min-height n'est qu'un plancher,
      // le contenu peut toujours pousser la colonne plus haut. "height"
      // fixe une taille réelle, et l'overflow masque ce qui dépasse — donc
      // la colonne rétrécit vraiment, quelle que soit la quantité de texte.
      dom.style.height = this.__minHeight
      dom.style.minHeight = "0"
      dom.style.overflow = "hidden"
      // Une colonne réduite en hauteur perd son sens si le texte reste
      // collé en haut — on centre verticalement son contenu.
      dom.style.display = "flex"
      dom.style.flexDirection = "column"
      dom.style.justifyContent = "center"
    }

    // Bouton "⏎" (coin haut-gauche), affiché uniquement sur la première
    // colonne : insère un retour à la ligne juste AVANT le layout entier,
    // pour reprendre la rédaction au-dessus des colonnes. C'est le miroir
    // du bouton équivalent du conteneur (coin bas-droit), qui lui insère
    // une ligne APRÈS le layout. Élément DOM natif, non géré par Lexical,
    // donc absent de l'export HTML comme le bouton de suppression.
    if (this.getIndexWithinParent() === 0) {
      const container = this.getParent()
      const containerKey = container ? container.getKey() : null
      if (containerKey) {
        const newlineBeforeBtn = document.createElement("button")
        newlineBeforeBtn.type = "button"
        newlineBeforeBtn.contentEditable = "false"
        newlineBeforeBtn.title = "Ajouter un retour à la ligne avant ce layout"
        newlineBeforeBtn.setAttribute(
          "aria-label",
          "Ajouter un retour à la ligne avant ce layout"
        )
        newlineBeforeBtn.setAttribute(
          "data-lexical-layout-item-newline-before",
          "true"
        )
        newlineBeforeBtn.style.position = "absolute"
        newlineBeforeBtn.style.left = "6px"
        newlineBeforeBtn.style.top = "6px"
        newlineBeforeBtn.className =
          "z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold leading-none text-slate-400 shadow-sm transition-colors hover:border-cyan-700 hover:text-cyan-700"
        newlineBeforeBtn.innerHTML = '<span aria-hidden="true">⏎</span>'

        const stopBefore = (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
        }
        newlineBeforeBtn.addEventListener("mousedown", stopBefore)
        newlineBeforeBtn.addEventListener("click", (e) => {
          stopBefore(e)
          editor.dispatchCommand(
            INSERT_LINE_BEFORE_LAYOUT_COMMAND,
            containerKey
          )
        })

        dom.appendChild(newlineBeforeBtn)
      }
    }

    // Bouton "X" rouge (coin haut-droit) pour supprimer cette colonne
    // spécifique. C'est un élément DOM natif, non géré par Lexical (donc
    // non éditable et non affecté par le contenu texte), positionné en
    // absolute pour rester ancré au coin peu importe l'ordre de
    // réconciliation des enfants Lexical à l'intérieur de ce conteneur.
    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.contentEditable = "false"
    deleteBtn.title = "Supprimer cette colonne"
    deleteBtn.setAttribute("aria-label", "Supprimer cette colonne")
    deleteBtn.setAttribute("data-lexical-layout-item-delete", "true")
    deleteBtn.className =
      "absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 shadow-sm transition-colors hover:bg-red-500 hover:text-white"
    deleteBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'

    const key = this.getKey()
    const stop = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }
    deleteBtn.addEventListener("mousedown", stop)
    deleteBtn.addEventListener("click", (e) => {
      stop(e)
      editor.dispatchCommand(REMOVE_LAYOUT_ITEM_COMMAND, key)
    })

    dom.appendChild(deleteBtn)
    return dom
  }

  updateDOM(prevNode: LayoutItemNode, dom: HTMLElement): boolean {
    if (prevNode.__backgroundColor !== this.__backgroundColor) {
      dom.style.backgroundColor = this.__backgroundColor ?? ""
    }
    if (prevNode.__minHeight !== this.__minHeight) {
      dom.style.height = this.__minHeight ?? ""
      dom.style.minHeight = this.__minHeight ? "0" : ""
      dom.style.overflow = this.__minHeight ? "hidden" : ""
      dom.style.display = this.__minHeight ? "flex" : ""
      dom.style.flexDirection = this.__minHeight ? "column" : ""
      dom.style.justifyContent = this.__minHeight ? "center" : ""
    }
    return false
  }

  setBackgroundColor(color: string | null): void {
    const writable = this.getWritable()
    writable.__backgroundColor = color
  }

  getBackgroundColor(): string | null {
    return this.getLatest().__backgroundColor
  }

  setMinHeight(minHeight: string | null): void {
    const writable = this.getWritable()
    writable.__minHeight = minHeight
  }

  getMinHeight(): string | null {
    return this.getLatest().__minHeight
  }

  exportJSON(): SerializedLayoutItemNode {
    return {
      ...super.exportJSON(),
      type: "layout-item",
      version: 1,
      backgroundColor: this.__backgroundColor,
      minHeight: this.__minHeight,
    }
  }

  static importJSON(serialized: SerializedLayoutItemNode): LayoutItemNode {
    return $createLayoutItemNode(
      serialized.backgroundColor ?? null,
      serialized.minHeight ?? null
    )
  }

  isShadowRoot(): boolean {
    return true
  }

  // Export HTML propre (voir LayoutContainerNode.exportDOM) : on garde la
  // couleur de fond et la hauteur réduite, qui sont un choix de mise en
  // forme voulu par l'utilisateur, mais on retire la bordure pointillée et
  // le bouton "✕", qui ne sont que des repères d'édition.
  exportDOM(): { element: HTMLElement } {
    const element = document.createElement("div")
    element.setAttribute("data-lexical-layout-item", "true")
    if (this.__backgroundColor) {
      element.style.backgroundColor = this.__backgroundColor
    }
    if (this.__minHeight) {
      element.style.height = this.__minHeight
      element.style.minHeight = "0"
      element.style.overflow = "hidden"
      element.style.display = "flex"
      element.style.flexDirection = "column"
      element.style.justifyContent = "center"
    }
    return { element }
  }
}

export function $createLayoutItemNode(
  backgroundColor: string | null = null,
  minHeight: string | null = null
): LayoutItemNode {
  return $applyNodeReplacement(new LayoutItemNode(backgroundColor, minHeight))
}

export function $isLayoutItemNode(
  node: LexicalNode | null | undefined
): node is LayoutItemNode {
  return node instanceof LayoutItemNode
}

// Commande Lexical : insère une mise en page à N colonnes à la position du
// curseur. Le payload est la valeur CSS grid-template-columns, ex "1fr 1fr".
export const INSERT_LAYOUT_COMMAND: LexicalCommand<string> = createCommand(
  "INSERT_LAYOUT_COMMAND"
)

// Commande : change le gabarit de colonnes (largeurs) d'un conteneur existant.
export const UPDATE_LAYOUT_COMMAND: LexicalCommand<{
  containerKey: string
  templateColumns: string
}> = createCommand("UPDATE_LAYOUT_COMMAND")

// Commande : change la couleur de fond d'une colonne (LayoutItemNode).
export const SET_LAYOUT_ITEM_BG_COMMAND: LexicalCommand<{
  itemKey: string
  color: string | null
}> = createCommand("SET_LAYOUT_ITEM_BG_COMMAND")

// Commande : change la hauteur minimale d'une colonne (LayoutItemNode).
// `null` revient à une hauteur automatique (pas de contrainte).
export const SET_LAYOUT_ITEM_HEIGHT_COMMAND: LexicalCommand<{
  itemKey: string
  minHeight: string | null
}> = createCommand("SET_LAYOUT_ITEM_HEIGHT_COMMAND")

// Commande : supprime entièrement une mise en page (le conteneur et ses colonnes).
export const REMOVE_LAYOUT_COMMAND: LexicalCommand<string> = createCommand(
  "REMOVE_LAYOUT_COMMAND"
)

// Commande : supprime une seule colonne (LayoutItemNode) au sein d'un
// layout, en réajustant automatiquement le gabarit de colonnes du
// conteneur. Si c'est la dernière colonne restante, le conteneur entier
// est supprimé (un layout à 0 colonne n'a pas de sens).
export const REMOVE_LAYOUT_ITEM_COMMAND: LexicalCommand<string> = createCommand(
  "REMOVE_LAYOUT_ITEM_COMMAND"
)

// Commande : insère (ou réutilise) un paragraphe vide juste après le
// conteneur de layout et y place le curseur, pour reprendre la rédaction
// en dehors des colonnes.
export const INSERT_LINE_AFTER_LAYOUT_COMMAND: LexicalCommand<string> =
  createCommand("INSERT_LINE_AFTER_LAYOUT_COMMAND")

// Commande miroir : insère (ou réutilise) un paragraphe vide juste AVANT le
// conteneur de layout, pour pouvoir écrire une ligne au-dessus des colonnes
// sans avoir à naviguer au clavier jusque là.
export const INSERT_LINE_BEFORE_LAYOUT_COMMAND: LexicalCommand<string> =
  createCommand("INSERT_LINE_BEFORE_LAYOUT_COMMAND")

export function LayoutPlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([LayoutContainerNode, LayoutItemNode])) {
      throw new Error(
        "LayoutPlugin: LayoutContainerNode/LayoutItemNode non enregistrés sur l'éditeur"
      )
    }

    return mergeRegister(
      editor.registerCommand<string>(
        INSERT_LAYOUT_COMMAND,
        (templateColumns) => {
          editor.update(() => {
            const container = $createLayoutContainerNode(templateColumns)
            const columnCount = templateColumns.trim().split(/\s+/).length
            const items = Array.from({ length: columnCount }, () => {
              const item = $createLayoutItemNode()
              item.append($createParagraphNode())
              return item
            })
            container.append(...items)
            $insertNodes([container])
            // Ajoute automatiquement un saut de ligne (paragraphe vide) après
            // le layout, pour ne jamais rester "coincé" dans les colonnes et
            // pouvoir reprendre la rédaction normalement juste après.
            const trailingParagraph = $createParagraphNode()
            container.insertAfter(trailingParagraph)
            items[0]?.getFirstDescendant()?.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<{ containerKey: string; templateColumns: string }>(
        UPDATE_LAYOUT_COMMAND,
        ({ containerKey, templateColumns }) => {
          editor.update(() => {
            const container = $getNodeByKey(containerKey)
            if ($isLayoutContainerNode(container)) {
              container.setTemplateColumns(templateColumns)
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<{ itemKey: string; color: string | null }>(
        SET_LAYOUT_ITEM_BG_COMMAND,
        ({ itemKey, color }) => {
          editor.update(() => {
            const item = $getNodeByKey(itemKey)
            if ($isLayoutItemNode(item)) {
              item.setBackgroundColor(color)
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<{ itemKey: string; minHeight: string | null }>(
        SET_LAYOUT_ITEM_HEIGHT_COMMAND,
        ({ itemKey, minHeight }) => {
          editor.update(() => {
            const item = $getNodeByKey(itemKey)
            if ($isLayoutItemNode(item)) {
              item.setMinHeight(minHeight)
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        REMOVE_LAYOUT_COMMAND,
        (containerKey) => {
          editor.update(() => {
            const container = $getNodeByKey(containerKey)
            if ($isLayoutContainerNode(container)) {
              container.remove()
            }
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        REMOVE_LAYOUT_ITEM_COMMAND,
        (itemKey) => {
          editor.update(() => {
            const item = $getNodeByKey(itemKey)
            if (!$isLayoutItemNode(item)) return
            const container = item.getParent()
            if (!$isLayoutContainerNode(container)) return

            const siblings = container.getChildren()
            // Dernière colonne restante : on supprime le layout entier.
            if (siblings.length <= 1) {
              container.remove()
              return
            }

            const index = siblings.findIndex(
              (c) => c.getKey() === item.getKey()
            )
            const cols = container.getTemplateColumns().trim().split(/\s+/)
            if (index >= 0 && index < cols.length) {
              cols.splice(index, 1)
            }
            item.remove()
            container.setTemplateColumns(cols.join(" ") || "1fr")
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        INSERT_LINE_AFTER_LAYOUT_COMMAND,
        (containerKey) => {
          editor.update(() => {
            const container = $getNodeByKey(containerKey)
            if (!$isLayoutContainerNode(container)) return

            // Réutilise le paragraphe vide déjà présent juste après le
            // layout (celui inséré automatiquement à la création) plutôt
            // que d'en empiler un nouveau à chaque clic.
            const next = container.getNextSibling()
            if (
              next &&
              next.getType() === "paragraph" &&
              (next as ElementNode).isEmpty()
            ) {
              ;(next as ElementNode).selectStart()
              return
            }

            const paragraph = $createParagraphNode()
            container.insertAfter(paragraph)
            paragraph.selectStart()
          })
          return true
        },
        COMMAND_PRIORITY_EDITOR
      ),
      editor.registerCommand<string>(
        INSERT_LINE_BEFORE_LAYOUT_COMMAND,
        (containerKey) => {
          editor.update(() => {
            const container = $getNodeByKey(containerKey)
            if (!$isLayoutContainerNode(container)) return

            // Réutilise le paragraphe vide déjà présent juste avant le
            // layout, s'il y en a un, plutôt que d'en empiler un nouveau.
            const prev = container.getPreviousSibling()
            if (
              prev &&
              prev.getType() === "paragraph" &&
              (prev as ElementNode).isEmpty()
            ) {
              ;(prev as ElementNode).selectStart()
              return
            }

            const paragraph = $createParagraphNode()
            container.insertBefore(paragraph)
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