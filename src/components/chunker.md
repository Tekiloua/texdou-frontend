# Types

```ts
type ToolMode = "select" | "sticker" | "arrow"

type StickerType =
  | "star"
  | "heart"
  | "badge"
  | "arrow_shape"
  | "check"
  | "pin"
  | "fire"
  | "flag"
```

```ts
interface ShapeItem {
  id: string
  type: StickerType | "text" | "arrow_draw" | "highlight"
  x: number
  y: number
  pageIndex: number
  size: number
  color: string
  text?: string
  points?: number[]
}
```

```ts
interface RectGroup {
  id: string
  color: string // couleur du rectangle
  cornerIds: [string, string, string, string]
}
```

```ts
interface CapturedImage {
  id: string
  dataUrl: string
  label: string
  timestamp: number
}
```

# Variables principales

- `pdfFile` : URL du fichier PDF.
- `PageThumbnailSidebar` : composant affichant les miniatures des pages dans la barre latérale gauche.
- `currentPage` : état indiquant la page actuellement visible.

# Variables d'état (`useState`)

- `pdfFile` : résultat de `URL.createObjectURL(...)` ou `null`.
- `pdfName` : nom du fichier importé.
- `numPages` : nombre total de pages du PDF.
- `pageDims` : objet contenant les dimensions des pages.

```ts
  //équivaut a faire
  //" Je définis un objet dont les clés sont des nombres et les valeurs sont des nombres. "
  const [pageDims, setPageDims] = useState<Record<number, number>>({})
  type PageDims = {
  [pageNumber: number]: number
}

const [pageDims, setPageDims] = useState<PageDims>({})
//Exemple de valeur valide :
{
  1: 842,
  2: 900,
  3: 780
}
```

- `shapes` : contenant les stickers posés sur les pages.
- `history` : tableau des actions effectuées (pour l'historique d'annulation : undo stack).
- `selectedId` : id du sticker séléctionné.
- `tool`: le toolMode ("select" ou "sticker")
- `activeStickerType` : type de sticker (par defaut "star")
- `zoom` : niveau de zoom (par defaut 1)
- `rectGroup` : est un tableau de RectGroup[] qui stocke toutes les zones de capture définies sur le PDF.
Chaque RectGroup ressemble à ça :
```ts
{
  id: "rect_1748700000000",
  color: "#4F7EF7",
  cornerIds: ["shape_1", "shape_2", "shape_3", "shape_4"]
}
```
Ce qu'il faut bien comprendre : rectGroups ne stocke aucune coordonnée. Il stocke uniquement les id des 4 stickers qui jouent le rôle de coins. Les coordonnées réelles du rectangle sont toujours lues depuis shapes au moment du rendu.
## Concrètement, ça sert à 3 choses :
1. Afficher le rectangle sur le canvas — dans PageCanvas, pour chaque RectGroup, on retrouve les 4 ShapeItem correspondants dans shapes, on calcule minX/maxX/minY/maxY, et on dessine un <Rect> Konva avec ces bornes. Si tu déplaces un sticker-coin, le rectangle se déforme automatiquement au prochain rendu puisqu'il relit les positions depuis shapes.
2. Afficher les 8 handles de resize — quand selectedRectId === rect.id, on calcule les 8 positions de handles (coins + milieux de côtés) depuis ces mêmes bornes, et on dessine des KonvaCircle draggables. Déplacer un handle appelle handleRectResize qui met à jour les coordonnées des ShapeItem concernés dans shapes, ce qui redessine le rectangle.
3. Permettre la capture PNG — handleValidateRect cherche dans rectGroups le groupe dont id === selectedRectId, récupère les 4 coins, calcule la zone à découper, lit le canvas PDF via querySelector("canvas") et fait le drawImage. Une fois la capture faite, le RectGroup est supprimé de rectGroups et ses 4 stickers-coins sont supprimés de shapes.


# Navigation

```ts
const [currentPage, setCurrentPage] = useState(1)
```

- `currentPage` représente la page actuellement visible dans le conteneur de scroll.
- Cette valeur est utilisée pour mettre en évidence la miniature correspondante dans `PageThumbnailSidebar`.
