import React, { useState, useRef, useEffect, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  Stage,
  Layer,
  Star,
  Circle,
  Arrow,
  Path,
  Transformer,
  Text as KonvaText,
  Rect,
  Circle as KonvaCircle,
} from "react-konva"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { cn } from "@/lib/utils"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface RectGroup {
  id: string
  color: string
  cornerIds: [string, string, string, string]
}

interface CapturedImage {
  id: string
  dataUrl: string
  label: string
  timestamp: number
}

// ─── Sticker catalog ──────────────────────────────────────────────────────────

const STICKERS: { type: StickerType; emoji: string; label: string }[] = [
  { type: "star", emoji: "⭐", label: "Étoile" },
  { type: "heart", emoji: "❤️", label: "Cœur" },
  { type: "badge", emoji: "🔴", label: "Badge" },
  { type: "check", emoji: "✅", label: "Validé" },
  { type: "pin", emoji: "📌", label: "Épingle" },
  { type: "fire", emoji: "🔥", label: "Important" },
  { type: "flag", emoji: "🚩", label: "Drapeau" },
  { type: "arrow_shape", emoji: "➡️", label: "Flèche" },
]

const COLORS = [
  "#4F7EF7",
  "#1D9E75",
  "#E24B4A",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#0EA5E9",
  "#1A1D2E",
]

// ─── Sub-components ───────────────────────────────────────────────────────────

// Toolbar separator
const Divider = () => <div className="h-6 w-px shrink-0 bg-[#E4E9F7]" />

// Single toolbar icon button
const ToolbarButton = ({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
  className = "",
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
  className?: string
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      `flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border-[1.5px] px-2.5 font-[inherit] text-xs font-bold whitespace-nowrap transition-all duration-150 ${active ? "border-[#4F7EF7] bg-[#EBF2FF] text-[#4F7EF7]" : "border-[#E4E9F7] bg-[#F7F9FF] text-[#6B7290]"} ${disabled ? "cursor-default opacity-40" : ""}`,
      className
    )}
  >
    {children}
  </button>
)

// Color dot picker
const ColorPicker = ({
  colors,
  active,
  onChange,
  disabled,
}: {
  colors: string[]
  active: string
  onChange: (c: string) => void
  disabled?: boolean
}) => (
  <div
    className={`flex shrink-0 items-center gap-1 transition-opacity duration-150 ${
      disabled ? "pointer-events-none opacity-30" : ""
    }`}
  >
    {colors.map((c) => (
      <button
        key={c}
        onClick={() => onChange(c)}
        className="h-4.5 w-4.5 shrink-0 cursor-pointer rounded-full"
        style={{
          background: c,
          border: active === c ? "2.5px solid #1A1D2E" : "2px solid #E4E9F7",
        }}
      />
    ))}
  </div>
)

// Zoom controls
const ZoomControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
}) => (
  <div className="flex shrink-0 items-center gap-1">
    <button
      onClick={onZoomOut}
      className="flex h-6.5 w-6.5 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-[#E4E9F7] bg-[#F7F9FF] text-sm font-bold text-[#6B7290]"
    >
      −
    </button>
    <span className="min-w-9.5 text-center text-[11px] font-bold text-[#6B7290]">
      {Math.round(zoom * 100)}%
    </span>
    <button
      onClick={onZoomIn}
      className="flex h-6.5 w-6.5 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-[#E4E9F7] bg-[#F7F9FF] text-sm font-bold text-[#6B7290]"
    >
      +
    </button>
  </div>
)

// Page navigator (prev/current/next)
const PageNavigator = ({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
}) => (
  <div className="ml-auto flex shrink-0 items-center gap-1.5">
    <button
      onClick={onPrev}
      disabled={current <= 1}
      className="flex h-6.5 w-6.5 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-[#E4E9F7] bg-[#F7F9FF] text-[13px] text-[#6B7290] disabled:opacity-40"
    >
      ‹
    </button>
    <span className="text-[11px] font-bold whitespace-nowrap text-[#6B7290]">
      {current} / {total}
    </span>
    <button
      onClick={onNext}
      disabled={current >= total}
      className="flex h-6.5 w-6.5 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-[#E4E9F7] bg-[#F7F9FF] text-[13px] text-[#6B7290] disabled:opacity-40"
    >
      ›
    </button>
  </div>
)

// PDF loading spinner
const PDFLoadingSpinner = () => (
  <div className="flex items-center gap-2.5 p-10 text-[13px] font-semibold text-[#8892B0]">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E4E9F7] border-t-[#4F7EF7]" />
    Chargement du PDF…
  </div>
)

// Captured image card
const CaptureCard = ({
  img,
  onDownload,
  onDelete,
}: {
  img: CapturedImage
  onDownload: () => void
  onDelete: () => void
}) => (
  <div className="overflow-hidden rounded-[10px] border-[1.5px] border-[#E4E9F7] bg-[#F7F9FF] shadow-sm">
    <div className="flex max-h-35 w-full items-center justify-center overflow-hidden bg-[#EEF1F8]">
      <img
        src={img.dataUrl}
        alt={img.label}
        className="block h-auto max-h-35 w-full object-contain"
      />
    </div>
    <div className="p-[7px_8px_8px]">
      <div className="mb-1.75 text-[10px] leading-snug font-semibold text-[#6B7290]">
        {img.label}
      </div>
      <div className="flex gap-1.25">
        <button
          onClick={onDownload}
          className="flex h-6.5 flex-1 cursor-pointer items-center justify-center gap-0.75 rounded-md border-[1.5px] border-[#86EFAC] bg-[#F0FDF4] font-[inherit] text-[10px] font-bold text-[#166534]"
        >
          ⬇ DL
        </button>
        <button
          onClick={onDelete}
          className="flex h-6.5 w-6.5 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-[#FECACA] bg-[#FDECEA] font-[inherit] text-xs font-bold text-[#A32D2D]"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
)

// ─── PDF Drop Zone ─────────────────────────────────────────────────────────────

const PDFDropZone = ({
  onFileLoaded,
}: {
  onFileLoaded: (url: string, name: string) => void
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file || file.type !== "application/pdf") return
    const url = URL.createObjectURL(file)
    onFileLoaded(url, file.name)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#F0F4FF]">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex w-120 max-w-[90vw] cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-12 transition-all duration-200 select-none ${
          isDragging
            ? "scale-[1.02] border-[#4F7EF7] bg-[#EBF2FF]"
            : "border-[#C5D3F0] bg-white hover:border-[#4F7EF7] hover:bg-[#F5F8FF]"
        }`}
      >
        <div className="text-6xl">📄</div>
        <div className="text-center">
          <p className="mb-1 text-[15px] font-bold text-[#1A1D2E]">
            {isDragging ? "Déposez votre PDF ici" : "Importer un PDF"}
          </p>
          <p className="text-[12px] text-[#8892B0]">
            Glissez-déposez un fichier PDF, ou cliquez pour parcourir
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px w-16 bg-[#E4E9F7]" />
          <span className="text-[11px] font-semibold text-[#B0B8D0]">
            PDF uniquement
          </span>
          <div className="h-px w-16 bg-[#E4E9F7]" />
        </div>
        <div className="flex h-9 items-center gap-2 rounded-xl bg-[#4F7EF7] px-5 text-[13px] font-bold text-white shadow-md shadow-blue-200">
          <span>📂</span> Choisir un fichier
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
    </div>
  )
}

// ─── StickerShape ─────────────────────────────────────────────────────────────

const StickerShape = ({
  item,
  // isSelected,
  onSelect,
  onChange,
}: {
  item: ShapeItem
  isSelected: boolean
  onSelect: () => void
  onChange: (attrs: Partial<ShapeItem>) => void
}) => {
  const shapeRef = useRef<any>(null)
  const s = item.size

  const common = {
    ref: shapeRef,
    x: item.x,
    y: item.y,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: any) => onChange({ x: e.target.x(), y: e.target.y() }),
  }

  switch (item.type) {
    case "star":
      return (
        <Star
          {...common}
          numPoints={5}
          innerRadius={s * 0.4}
          outerRadius={s}
          fill={item.color}
          stroke="#fff"
          strokeWidth={2}
        />
      )
    case "heart":
      return (
        <Path
          {...common}
          data="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          scaleX={s / 12}
          scaleY={s / 12}
          fill={item.color}
          offsetX={12}
          offsetY={12}
        />
      )
    case "badge":
      return (
        <Circle
          {...common}
          radius={s}
          fill={item.color}
          stroke="#fff"
          strokeWidth={3}
        />
      )
    case "check":
      return (
        <Path
          {...common}
          data="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
          scaleX={s / 10}
          scaleY={s / 10}
          fill={item.color}
          offsetX={12}
          offsetY={12}
        />
      )
    case "pin":
      return (
        <Path
          {...common}
          data="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
          scaleX={s / 12}
          scaleY={s / 12}
          fill={item.color}
          offsetX={12}
          offsetY={12}
        />
      )
    case "fire":
      return (
        <Path
          {...common}
          data="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-1 .23-1.98.68-2.83 1.23-.84.55-1.54 1.28-2.06 2.09-.55.85-.89 1.82-.96 2.82-.07.96.13 1.95.6 2.83-.17-.05-.34-.1-.51-.16-.62-.22-1.17-.54-1.65-.97-.46-.42-.83-.94-1.05-1.51-.2-.53-.28-1.1-.2-1.67-.65.44-1.2 1.03-1.57 1.72-.37.68-.55 1.44-.55 2.2 0 .98.24 1.93.67 2.78.42.83 1.03 1.56 1.78 2.11.75.56 1.63.93 2.56 1.07.37.06.74.1 1.12.1 2.06 0 3.96-.89 5.28-2.3.7-.76 1.24-1.7 1.52-2.71.28-1.01.28-2.08 0-3.09z"
          scaleX={s / 12}
          scaleY={s / 12}
          fill={item.color}
          offsetX={12}
          offsetY={12}
        />
      )
    case "flag":
      return (
        <Path
          {...common}
          data="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"
          scaleX={s / 12}
          scaleY={s / 12}
          fill={item.color}
          offsetX={12}
          offsetY={12}
        />
      )
    case "arrow_shape":
      return (
        <Arrow
          {...common}
          points={[0, 0, s * 2.5, 0]}
          fill={item.color}
          stroke={item.color}
          strokeWidth={s / 4}
          pointerLength={s / 2}
          pointerWidth={s / 2}
        />
      )
    case "text":
      return (
        <KonvaText
          {...common}
          text={item.text || "Texte"}
          fontSize={item.size}
          fill={item.color}
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontStyle="bold"
        />
      )
    case "highlight":
      return (
        <Rect
          {...common}
          width={item.size * 5}
          height={item.size * 0.8}
          fill={item.color}
          opacity={0.35}
          cornerRadius={3}
        />
      )
    default:
      return null
  }
}

// ─── PageCanvas ───────────────────────────────────────────────────────────────

const HANDLE_SIZE = 7

const PageCanvas = ({
  pageIndex,
  pageWidth,
  pageHeight,
  shapes,
  selectedId,
  rectGroups,
  selectedRectId,
  onSelect,
  onShapeChange,
  onStageClick,
  onRectClick,
  onRectResize,
}: {
  pageIndex: number
  pageWidth: number
  pageHeight: number
  shapes: ShapeItem[]
  selectedId: string | null
  rectGroups: RectGroup[]
  selectedRectId: string | null
  onSelect: (id: string | null) => void
  onShapeChange: (id: string, attrs: Partial<ShapeItem>) => void
  onStageClick: (pageIndex: number, x: number, y: number) => void
  onRectClick: (rectId: string) => void
  onRectResize: (
    rectId: string,
    handleIndex: number,
    dx: number,
    dy: number
  ) => void
}) => {
  const trRef = useRef<any>(null)
  const shapeRefs = useRef<Record<string, any>>({})
  const pageShapes = shapes.filter((s) => s.pageIndex === pageIndex)

  const pageRects = rectGroups.filter((r) => {
    const corners = r.cornerIds
      .map((cid) => shapes.find((s) => s.id === cid))
      .filter(Boolean) as ShapeItem[]
    if (corners.length < 2) return false
    return corners[0].pageIndex === pageIndex
  })

  useEffect(() => {
    if (selectedId && trRef.current) {
      const node = shapeRefs.current[selectedId]
      if (node) {
        trRef.current.nodes([node])
        trRef.current.getLayer()?.batchDraw()
      }
    } else if (trRef.current) {
      trRef.current.nodes([])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId])

  const getRectBounds = (rect: RectGroup) => {
    const corners = rect.cornerIds
      .map((cid) => shapes.find((s) => s.id === cid))
      .filter(Boolean) as ShapeItem[]
    if (corners.length < 2) return null
    const xs = corners.map((c) => c.x)
    const ys = corners.map((c) => c.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    const w = Math.max(...xs) - x
    const h = Math.max(...ys) - y
    return { x, y, w, h }
  }

  const getHandlePositions = (bounds: {
    x: number
    y: number
    w: number
    h: number
  }) => {
    const { x, y, w, h } = bounds
    return [
      { x: x, y: y },
      { x: x + w / 2, y: y },
      { x: x + w, y: y },
      { x: x + w, y: y + h / 2 },
      { x: x + w, y: y + h },
      { x: x + w / 2, y: y + h },
      { x: x, y: y + h },
      { x: x, y: y + h / 2 },
    ]
  }

  const handleCursors = [
    "nw-resize",
    "n-resize",
    "ne-resize",
    "e-resize",
    "se-resize",
    "s-resize",
    "sw-resize",
    "w-resize",
  ]

  return (
    <Stage
      width={pageWidth}
      height={pageHeight}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
      onClick={(e) => {
        const stage = e.target.getStage()
        const pos = stage?.getPointerPosition()
        if (e.target === stage && pos) {
          onStageClick(pageIndex, pos.x, pos.y)
        }
      }}
    >
      <Layer>
        {pageRects.map((rect) => {
          const bounds = getRectBounds(rect)
          if (!bounds) return null
          const isSelected = selectedRectId === rect.id
          const handles = isSelected ? getHandlePositions(bounds) : []

          return (
            <React.Fragment key={rect.id}>
              <Rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.w}
                height={bounds.h}
                fill={isSelected ? rect.color + "18" : "transparent"}
                stroke={rect.color}
                strokeWidth={isSelected ? 2.5 : 1.5}
                dash={isSelected ? undefined : [6, 3]}
                cornerRadius={3}
                opacity={isSelected ? 1 : 0.75}
                onClick={() => onRectClick(rect.id)}
                onTap={() => onRectClick(rect.id)}
                draggable={isSelected}
                onDragEnd={(e) => {
                  const node = e.target
                  const dx = node.x() - bounds.x
                  const dy = node.y() - bounds.y
                  node.position({ x: bounds.x, y: bounds.y })
                  rect.cornerIds.forEach((cid) => {
                    const corner = shapes.find((s) => s.id === cid)
                    if (corner)
                      onShapeChange(cid, { x: corner.x + dx, y: corner.y + dy })
                  })
                }}
              />
              {handles.map((hp, hi) => (
                <KonvaCircle
                  key={hi}
                  x={hp.x}
                  y={hp.y}
                  radius={HANDLE_SIZE}
                  fill="#fff"
                  stroke={rect.color}
                  strokeWidth={2}
                  draggable
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage()
                    if (stage)
                      stage.container().style.cursor = handleCursors[hi]
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage()
                    if (stage) stage.container().style.cursor = "default"
                  }}
                  onDragMove={(e) => {
                    const node = e.target
                    const pos = node.position()
                    onRectResize(rect.id, hi, pos.x - hp.x, pos.y - hp.y)
                    node.position(hp)
                  }}
                />
              ))}
            </React.Fragment>
          )
        })}

        {pageShapes.map((item) => (
          <StickerShape
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            onSelect={() => onSelect(item.id)}
            onChange={(attrs) => onShapeChange(item.id, attrs)}
          />
        ))}
        <Transformer ref={trRef} boundBoxFunc={(_, newBox) => newBox} />
      </Layer>
    </Stage>
  )
}

// ─── Page Thumbnail Sidebar ───────────────────────────────────────────────────

const PageThumbnailSidebar = ({
  numPages,
  currentPage,
  pdfFile,
  onScrollTo,
}: {
  numPages: number
  currentPage: number
  pdfFile: string
  onScrollTo: (page: number) => void
}) => (
  <div className="flex w-24 shrink-0 flex-col gap-2 overflow-y-auto border-r-[1.5px] border-[#E4E9F7] bg-white px-2 py-2.5">
    {Array.from({ length: numPages }, (_, i) => (
      <button
        key={i}
        onClick={() => onScrollTo(i + 1)}
        className={[
          "flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border-[1.5px] p-[6px_4px_4px] transition-colors",
          currentPage === i + 1
            ? "border-[#4F7EF7] bg-[#EBF2FF]"
            : "border-[#E4E9F7] bg-[#F7F9FF] hover:border-[#C5D3F0]",
        ].join(" ")}
      >
        <div
          className="relative w-full overflow-hidden rounded border border-[#E4E9F7] bg-white"
          style={{ aspectRatio: "210/297" }}
        >
          <Document file={pdfFile} loading="">
            <Page
              pageNumber={i + 1}
              width={72}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>
        <span
          className={`text-[9px] font-bold ${currentPage === i + 1 ? "text-[#4F7EF7]" : "text-[#8892B0]"}`}
        >
          {i + 1}
        </span>
      </button>
    ))}
  </div>
)

// ─── Captures Panel ───────────────────────────────────────────────────────────

const CapturesPanel = ({
  images,
  onDownload,
  onDelete,
}: {
  images: CapturedImage[]
  onDownload: (img: CapturedImage) => void
  onDelete: (id: string) => void
}) => (
  <div className="flex w-55 shrink-0 flex-col gap-2.5 overflow-y-auto border-l-[1.5px] border-[#E4E9F7] bg-white p-[12px_10px]">
    <div className="mb-1 flex items-center justify-between">
      <span className="text-[11px] font-extrabold tracking-[0.05em] text-[#1A1D2E] uppercase">
        Captures ({images.length})
      </span>
    </div>
    {images.map((img) => (
      <CaptureCard
        key={img.id}
        img={img}
        onDownload={() => onDownload(img)}
        onDelete={() => onDelete(img.id)}
      />
    ))}
  </div>
)

// ─── Main component ───────────────────────────────────────────────────────────

// const PAGE_WIDTH = 794
const PAGE_WIDTH = 1024

export const Chunker = () => {
  const [pdfFile, setPdfFile] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string>("")
  const [numPages, setNumPages] = useState(0)
  const [shapes, setShapes] = useState<ShapeItem[]>([])
  const [history, setHistory] = useState<ShapeItem[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<ToolMode>("select")
  const [activeStickerType, setActiveStickerType] =
    useState<StickerType>("star")
  const [stickerSize, setStickerSize] = useState(28)
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [zoom, setZoom] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageDims, setPageDims] = useState<Record<number, number>>({})
  const [rectGroups, setRectGroups] = useState<RectGroup[]>([])
  const [rectMode, setRectMode] = useState(false)
  const [pendingCorners, setPendingCorners] = useState<string[]>([])
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null)
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // ─── PDF import ───────────────────────────────────────────────────────────

  const handleFileLoaded = useCallback((url: string, name: string) => {
    setPdfFile(url)
    setPdfName(name)
    setShapes([])
    setHistory([])
    setSelectedId(null)
    setRectGroups([])
    setCapturedImages([])
    setCurrentPage(1)
    setNumPages(0)
  }, [])

  // ─── Undo ─────────────────────────────────────────────────────────────────

  const pushHistory = useCallback((current: ShapeItem[]) => {
    setHistory((prev) => [...prev.slice(-49), [...current]])
  }, [])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setShapes(last)
      setSelectedId(null)
      return prev.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        undo()
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setShapes((prev) => {
          pushHistory(prev)
          return prev.filter((s) => s.id !== selectedId)
        })
        setSelectedId(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedId, undo, pushHistory])

  // ─── Page render ─────────────────────────────────────────────────────────

  const handlePageRender = useCallback((pageIndex: number, height: number) => {
    setPageDims((prev) => ({ ...prev, [pageIndex]: height }))
  }, [])

  // ─── Stage click ─────────────────────────────────────────────────────────

  const handleStageClick = useCallback(
    (pageIndex: number, x: number, y: number) => {
      if (tool === "select") {
        setSelectedId(null)
        return
      }
      const id = `shape_${Date.now()}`
      const newShape: ShapeItem = {
        id,
        type: activeStickerType,
        x,
        y,
        pageIndex,
        size: stickerSize,
        color: activeColor,
      }
      setShapes((prev) => {
        pushHistory(prev)
        return [...prev, newShape]
      })
      setSelectedId(id)
    },
    [tool, activeStickerType, stickerSize, activeColor, pushHistory]
  )

  const handleShapeChange = useCallback(
    (id: string, attrs: Partial<ShapeItem>) => {
      setShapes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...attrs } : s))
      )
    },
    []
  )

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setShapes((prev) => {
      pushHistory(prev)
      return prev.filter((s) => s.id !== selectedId)
    })
    setSelectedId(null)
  }, [selectedId, pushHistory])

  // ─── Rect mode ───────────────────────────────────────────────────────────

  const toggleRectMode = () => {
    setRectMode((v) => !v)
    setPendingCorners([])
    setSelectedRectId(null)
  }

  const handleStickerSelect = useCallback(
    (id: string) => {
      if (!rectMode) {
        setSelectedId(id)
        return
      }
      setPendingCorners((prev) => {
        if (prev.includes(id)) return prev.filter((c) => c !== id)
        const next = [...prev, id]
        if (next.length === 4) {
          setShapes((currentShapes) => {
            const rectId = `rect_${Date.now()}`
            const newRect: RectGroup = {
              id: rectId,
              color: activeColor,
              cornerIds: [next[0], next[1], next[2], next[3]] as [
                string,
                string,
                string,
                string,
              ],
            }
            setRectGroups((rg) => [...rg, newRect])
            setSelectedRectId(rectId)
            setRectMode(false)
            return currentShapes
          })
          return []
        }
        return next
      })
    },
    [rectMode, activeColor]
  )

  // ─── Rect resize via handles ─────────────────────────────────────────────

  const handleRectResize = useCallback(
    (rectId: string, handleIndex: number, dx: number, dy: number) => {
      setShapes((prev) => {
        const rect = rectGroups.find((r) => r.id === rectId)
        if (!rect) return prev
        const corners = rect.cornerIds
          .map((cid) => prev.find((s) => s.id === cid))
          .filter(Boolean) as ShapeItem[]
        if (corners.length < 4) return prev
        const xs = corners.map((c) => c.x)
        const ys = corners.map((c) => c.y)
        const minX = Math.min(...xs),
          maxX = Math.max(...xs)
        const minY = Math.min(...ys),
          maxY = Math.max(...ys)
        const tl =
          corners.find((c) => c.x === minX && c.y === minY) ||
          corners.find(
            (c) => c.x <= (minX + maxX) / 2 && c.y <= (minY + maxY) / 2
          )
        const tr =
          corners.find((c) => c.x === maxX && c.y === minY) ||
          corners.find(
            (c) => c.x > (minX + maxX) / 2 && c.y <= (minY + maxY) / 2
          )
        const br =
          corners.find((c) => c.x === maxX && c.y === maxY) ||
          corners.find(
            (c) => c.x > (minX + maxX) / 2 && c.y > (minY + maxY) / 2
          )
        const bl =
          corners.find((c) => c.x === minX && c.y === maxY) ||
          corners.find(
            (c) => c.x <= (minX + maxX) / 2 && c.y > (minY + maxY) / 2
          )

        const updates: Record<string, { x?: number; y?: number }> = {}
        const moveLeft = (id: string) => {
          if (id)
            updates[id] = {
              ...updates[id],
              x: (prev.find((s) => s.id === id)?.x || 0) + dx,
            }
        }
        const moveRight = (id: string) => {
          if (id)
            updates[id] = {
              ...updates[id],
              x: (prev.find((s) => s.id === id)?.x || 0) + dx,
            }
        }
        const moveTop = (id: string) => {
          if (id)
            updates[id] = {
              ...updates[id],
              y: (prev.find((s) => s.id === id)?.y || 0) + dy,
            }
        }
        const moveBottom = (id: string) => {
          if (id)
            updates[id] = {
              ...updates[id],
              y: (prev.find((s) => s.id === id)?.y || 0) + dy,
            }
        }

        if (handleIndex === 0) {
          if (tl) {
            moveLeft(tl.id)
            moveTop(tl.id)
          }
          if (bl) moveLeft(bl.id)
          if (tr) moveTop(tr.id)
        } else if (handleIndex === 1) {
          if (tl) moveTop(tl.id)
          if (tr) moveTop(tr.id)
        } else if (handleIndex === 2) {
          if (tr) {
            moveRight(tr.id)
            moveTop(tr.id)
          }
          if (br) moveRight(br.id)
          if (tl) moveTop(tl.id)
        } else if (handleIndex === 3) {
          if (tr) moveRight(tr.id)
          if (br) moveRight(br.id)
        } else if (handleIndex === 4) {
          if (br) {
            moveRight(br.id)
            moveBottom(br.id)
          }
          if (tr) moveRight(tr.id)
          if (bl) moveBottom(bl.id)
        } else if (handleIndex === 5) {
          if (bl) moveBottom(bl.id)
          if (br) moveBottom(br.id)
        } else if (handleIndex === 6) {
          if (bl) {
            moveLeft(bl.id)
            moveBottom(bl.id)
          }
          if (tl) moveLeft(tl.id)
          if (br) moveBottom(br.id)
        } else if (handleIndex === 7) {
          if (tl) moveLeft(tl.id)
          if (bl) moveLeft(bl.id)
        }

        return prev.map((s) => {
          const upd = updates[s.id]
          return upd ? { ...s, ...upd } : s
        })
      })
    },
    [rectGroups]
  )

  // ─── Rect: validate (capture PNG) ────────────────────────────────────────

  const handleValidateRect = useCallback(async () => {
    if (!selectedRectId) return
    const rect = rectGroups.find((r) => r.id === selectedRectId)
    if (!rect) return
    const corners = rect.cornerIds
      .map((cid) => shapes.find((s) => s.id === cid))
      .filter(Boolean) as ShapeItem[]
    if (corners.length < 2) return

    const byPage = new Map<number, ShapeItem[]>()
    for (const c of corners) {
      if (!byPage.has(c.pageIndex)) byPage.set(c.pageIndex, [])
      byPage.get(c.pageIndex)!.push(c)
    }

    if (byPage.size === 1) {
      const pageCorners = corners
      const xs = pageCorners.map((c) => c.x)
      const ys = pageCorners.map((c) => c.y)
      const rx = Math.min(...xs),
        ry = Math.min(...ys)
      const rw = Math.max(...xs) - rx,
        rh = Math.max(...ys) - ry
      const pageEl = pageRefs.current[pageCorners[0].pageIndex]
      if (!pageEl) return
      const pdfCanvas = pageEl.querySelector(
        "canvas"
      ) as HTMLCanvasElement | null
      if (!pdfCanvas) {
        alert("Canvas PDF introuvable.")
        return
      }
      const outCanvas = document.createElement("canvas")
      outCanvas.width = Math.max(1, Math.round(rw))
      outCanvas.height = Math.max(1, Math.round(rh))
      const ctx = outCanvas.getContext("2d")!
      ctx.drawImage(pdfCanvas, rx, ry, rw, rh, 0, 0, rw, rh)
      const dataUrl = outCanvas.toDataURL("image/png")
      setCapturedImages((prev) => [
        {
          id: `cap_${Date.now()}`,
          dataUrl,
          label: `Page ${pageCorners[0].pageIndex + 1} — ${new Date().toLocaleTimeString("fr-FR")}`,
          timestamp: Date.now(),
        },
        ...prev,
      ])
    } else {
      const sortedPages = Array.from(byPage.keys()).sort((a, b) => a - b)
      const strips: { canvas: HTMLCanvasElement; w: number; h: number }[] = []
      let totalH = 0,
        maxW = 0
      for (const pgIdx of sortedPages) {
        const pgCorners = byPage.get(pgIdx)!
        const allXs = corners.map((c) => c.x)
        const rx = Math.min(...allXs),
          rw = Math.max(...allXs) - rx
        const ys = pgCorners.map((c) => c.y)
        let ry: number, rh: number
        if (pgIdx === sortedPages[0]) {
          ry = Math.min(...ys)
          const el = pageRefs.current[pgIdx]
          rh = el ? el.clientHeight - ry : Math.max(...ys) - ry
        } else if (pgIdx === sortedPages[sortedPages.length - 1]) {
          ry = 0
          rh = Math.max(...ys)
        } else {
          ry = 0
          const el = pageRefs.current[pgIdx]
          rh = el ? el.clientHeight : 800
        }
        const pageEl = pageRefs.current[pgIdx]
        if (!pageEl) continue
        const pdfCanvas = pageEl.querySelector(
          "canvas"
        ) as HTMLCanvasElement | null
        if (!pdfCanvas) continue
        const strip = document.createElement("canvas")
        strip.width = Math.max(1, Math.round(rw))
        strip.height = Math.max(1, Math.round(rh))
        const ctx = strip.getContext("2d")!
        ctx.drawImage(pdfCanvas, rx, ry, rw, rh, 0, 0, rw, rh)
        strips.push({ canvas: strip, w: strip.width, h: strip.height })
        totalH += strip.height
        maxW = Math.max(maxW, strip.width)
      }
      if (strips.length === 0) return
      const outCanvas = document.createElement("canvas")
      outCanvas.width = maxW
      outCanvas.height = totalH
      const ctx = outCanvas.getContext("2d")!
      let y = 0
      for (const strip of strips) {
        ctx.drawImage(strip.canvas, 0, y)
        y += strip.h
      }
      const dataUrl = outCanvas.toDataURL("image/png")
      const pagesLabel = sortedPages.map((p) => `p${p + 1}`).join("+")
      setCapturedImages((prev) => [
        {
          id: `cap_${Date.now()}`,
          dataUrl,
          label: `Pages ${pagesLabel} — ${new Date().toLocaleTimeString("fr-FR")}`,
          timestamp: Date.now(),
        },
        ...prev,
      ])
    }

    setShapes((prev) => {
      pushHistory(prev)
      return prev.filter((s) => !rect.cornerIds.includes(s.id))
    })
    setRectGroups((prev) => prev.filter((r) => r.id !== selectedRectId))
    setSelectedRectId(null)
  }, [selectedRectId, rectGroups, shapes, pushHistory])

  const handleDeleteRect = useCallback(() => {
    if (!selectedRectId) return
    const rect = rectGroups.find((r) => r.id === selectedRectId)
    if (!rect) return
    setShapes((prev) => {
      pushHistory(prev)
      return prev.filter((s) => !rect.cornerIds.includes(s.id))
    })
    setRectGroups((prev) => prev.filter((r) => r.id !== selectedRectId))
    setSelectedRectId(null)
  }, [selectedRectId, rectGroups, shapes, pushHistory])

  // ─── Scroll spy ──────────────────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      let found = 1
      for (let i = 0; i < numPages; i++) {
        const ref = pageRefs.current[i]
        if (ref && ref.offsetTop - el.scrollTop < 100) found = i + 1
      }
      setCurrentPage(found)
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [numPages])

  const scrollToPage = (n: number) => {
    const ref = pageRefs.current[n - 1]
    if (ref && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: ref.offsetTop - 16,
        behavior: "smooth",
      })
    }
  }

  const downloadImage = (img: CapturedImage) => {
    const a = document.createElement("a")
    a.href = img.dataUrl
    a.download = `capture_${img.id}.png`
    a.click()
  }

  const showImagePanel = capturedImages.length > 0
  const toolButtons: { id: ToolMode; icon: string; label: string }[] = [
    { id: "select", icon: "↖", label: "Sélection" },
    { id: "sticker", icon: "⭐", label: "Sticker" },
  ]

  // ─── No PDF loaded: show drop zone ───────────────────────────────────────

  if (!pdfFile) {
    return (
      <div
        className="flex h-[calc(100vh-62px)] flex-col overflow-hidden bg-[#F0F4FF] font-[Plus_Jakarta_Sans,sans-serif]"
        onDragOver={(e) => e.preventDefault()}
      >
        <PDFDropZone onFileLoaded={handleFileLoaded} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ─── PDF loaded: editor ───────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-62px)] flex-col overflow-hidden bg-[#F0F4FF] font-[Plus_Jakarta_Sans,sans-serif]">
      {/* ══════════════ TOOLBAR ══════════════ */}
      <div className="flex shrink-0 items-center gap-2.5 overflow-x-auto border-b-[1.5px] border-[#E4E9F7] bg-white px-3.5 py-1.75">
        {/* PDF name + change button */}
        <div className="flex max-w-45 shrink-0 items-center gap-2">
          <span
            className="truncate text-[11px] font-bold text-[#8892B0]"
            title={pdfName}
          >
            📄 {pdfName}
          </span>
          <button
            onClick={() => {
              setPdfFile(null)
              setPdfName("")
            }}
            title="Changer de PDF"
            className="h-5.5 shrink-0 cursor-pointer rounded-md border-[1.5px] border-[#E4E9F7] bg-[#F7F9FF] px-2 text-[10px] font-bold text-[#6B7290] transition-colors hover:border-[#4F7EF7] hover:text-[#4F7EF7]"
          >
            ↺
          </button>
        </div>

        <Divider />

        {/* Tool buttons */}
        <div className="flex shrink-0 gap-0.75">
          {toolButtons.map(({ id, icon, label }) => (
            <ToolbarButton
              key={id}
              active={tool === id && !rectMode}
              onClick={() => {
                setTool(id)
                setRectMode(false)
              }}
              title={label}
            >
              <span className="text-[13px]">{icon}</span>
              <span>{label}</span>
            </ToolbarButton>
          ))}
        </div>

        <Divider />

        {/* Undo */}
        <ToolbarButton
          onClick={undo}
          disabled={history.length === 0}
          title="Annuler (Ctrl+Z)"
        >
          ↩ Annuler
        </ToolbarButton>

        <Divider />

        {/* Zone capture button */}
        <button
          onClick={toggleRectMode}
          title="Sélectionner 4 stickers pour délimiter une zone à capturer"
          className={[
            "flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border-[1.5px] px-2.5 font-[inherit] text-xs font-bold transition-all duration-150",
            rectMode
              ? "border-[#1D9E75] bg-[#E6F7F2] text-[#1D9E75]"
              : "border-[#E4E9F7] bg-[#F7F9FF] text-[#6B7290]",
          ].join(" ")}
        >
          <span className="text-sm">⬚</span>
          {rectMode ? `Zone (${pendingCorners.length}/4)` : "Zone"}
        </button>

        {/* Validate / delete rect */}
        {selectedRectId && !rectMode && (
          <>
            <button
              onClick={handleValidateRect}
              className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border-[1.5px] border-[#86EFAC] bg-[#F0FDF4] px-2.5 font-[inherit] text-xs font-bold text-[#166534]"
            >
              ✓ Valider
            </button>
            <button
              onClick={handleDeleteRect}
              className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border-[1.5px] border-[#FECACA] bg-[#FDECEA] px-2.5 font-[inherit] text-xs font-bold text-[#A32D2D]"
            >
              ✕ Suppr. zone
            </button>
          </>
        )}

        <Divider />

        {/* Sticker picker */}
        <div
          className="flex shrink-0 flex-nowrap gap-0.75 transition-opacity duration-150"
          style={{
            opacity: tool === "sticker" && !rectMode ? 1 : 0.3,
            pointerEvents: tool === "sticker" && !rectMode ? "auto" : "none",
          }}
        >
          {STICKERS.map(({ type, emoji, label }) => (
            <button
              key={type}
              title={label}
              onClick={() => setActiveStickerType(type)}
              className={[
                "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-[1.5px] text-[15px]",
                activeStickerType === type
                  ? "border-[#4F7EF7] bg-[#EBF2FF]"
                  : "border-[#E4E9F7] bg-[#F7F9FF]",
              ].join(" ")}
            >
              {emoji}
            </button>
          ))}
        </div>

        <Divider />

        {/* Size slider */}
        <div
          className="flex shrink-0 items-center gap-1.5 transition-opacity duration-150"
          style={{
            opacity: tool === "select" && !rectMode ? 0.3 : 1,
            pointerEvents: tool === "select" && !rectMode ? "none" : "auto",
          }}
        >
          <span className="text-[10px] font-bold whitespace-nowrap text-[#8892B0]">
            {stickerSize}px
          </span>
          <input
            type="range"
            min={10}
            max={80}
            value={stickerSize}
            onChange={(e) => setStickerSize(Number(e.target.value))}
            className="w-20 accent-[#4F7EF7]"
          />
        </div>

        <Divider />

        {/* Color picker */}
        <ColorPicker
          colors={COLORS}
          active={activeColor}
          onChange={setActiveColor}
          disabled={tool === "select" && !rectMode}
        />

        <Divider />

        {/* Zoom */}
        <ZoomControls
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(2, z + 0.1))}
          onZoomOut={() => setZoom((z) => Math.max(0.5, z - 0.1))}
        />

        <Divider />

        {/* Delete sticker */}
        <button
          onClick={deleteSelected}
          disabled={!selectedId || rectMode}
          className={[
            "flex h-8 shrink-0 items-center gap-1 rounded-lg border-[1.5px] px-2.5 font-[inherit] text-[11px] font-bold transition-all duration-150",
            selectedId && !rectMode
              ? "cursor-pointer border-[#FECACA] bg-[#FDECEA] text-[#A32D2D]"
              : "cursor-default border-[#E4E9F7] bg-[#F7F9FF] text-[#B0B8D0]",
          ].join(" ")}
        >
          🗑 Suppr.
        </button>

        {/* Page navigator */}
        <PageNavigator
          current={currentPage}
          total={numPages}
          onPrev={() => scrollToPage(Math.max(1, currentPage - 1))}
          onNext={() => scrollToPage(Math.min(numPages, currentPage + 1))}
        />
      </div>

      {/* Rect mode hint banner */}
      {rectMode && (
        <div className="flex shrink-0 items-center gap-2 border-b-[1.5px] border-[#86EFAC] bg-[#E6F7F2] px-4 py-1.25 text-xs font-semibold text-[#166534]">
          <span className="text-[15px]">⬚</span>
          Cliquez sur <strong>4 stickers existants</strong> pour délimiter la
          zone (peuvent être sur des pages différentes) —{" "}
          {pendingCorners.length} / 4 sélectionné
          {pendingCorners.length > 1 ? "s" : ""}
          <button
            onClick={toggleRectMode}
            className="ml-auto cursor-pointer border-none bg-transparent p-0 text-[13px] font-bold text-[#166534]"
          >
            ✕ Annuler
          </button>
        </div>
      )}

      {/* ══════════════ BODY ══════════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar – page thumbnails */}
        <PageThumbnailSidebar
          numPages={numPages}
          currentPage={currentPage}
          pdfFile={pdfFile}
          onScrollTo={scrollToPage}
        />

        {/* PDF scroll area */}
        <div
          ref={scrollRef}
          className="flex flex-1 flex-col items-center gap-6 overflow-x-auto overflow-y-auto p-6"
          style={{
            cursor:
              tool === "sticker" && !rectMode
                ? "crosshair"
                : rectMode
                  ? "cell"
                  : "default",
          }}
        >
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<PDFLoadingSpinner />}
          >
            {Array.from({ length: numPages }, (_, i) => {
              const scaledWidth = PAGE_WIDTH * zoom
              const pageH = pageDims[i]
                ? pageDims[i] * zoom
                : scaledWidth * 1.414

              return (
                <div
                  key={i}
                  ref={(el) => {
                    pageRefs.current[i] = el
                  }}
                  className={`relative shrink-0 overflow-hidden rounded transition-[border-color] duration-200 ${
                    currentPage === i + 1
                      ? "border-2 border-[#4F7EF7]"
                      : "border-2 border-transparent"
                  }`}
                  style={{
                    width: scaledWidth,
                    boxShadow:
                      "0 4px 24px rgba(79,126,247,0.10), 0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  <Page
                    pageNumber={i + 1}
                    width={scaledWidth}
                    onRenderSuccess={(page) => handlePageRender(i, page.height)}
                  />
                  <PageCanvas
                    pageIndex={i}
                    pageWidth={scaledWidth}
                    pageHeight={pageH}
                    shapes={shapes}
                    selectedId={rectMode ? null : selectedId}
                    rectGroups={rectGroups}
                    selectedRectId={selectedRectId}
                    onSelect={handleStickerSelect}
                    onShapeChange={handleShapeChange}
                    onStageClick={handleStageClick}
                    onRectClick={(rectId) => {
                      if (!rectMode)
                        setSelectedRectId((prev) =>
                          prev === rectId ? null : rectId
                        )
                    }}
                    onRectResize={handleRectResize}
                  />
                  {/* Green ring on pending corners */}
                  {rectMode && pendingCorners.length > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-20">
                      {pendingCorners.map((cid) => {
                        const s = shapes.find(
                          (sh) => sh.id === cid && sh.pageIndex === i
                        )
                        if (!s) return null
                        return (
                          <div
                            key={cid}
                            className="absolute h-4 w-4 rounded-full"
                            style={{
                              left: s.x - 8,
                              top: s.y - 8,
                              border: "2.5px solid #1D9E75",
                              background: "rgba(29,158,117,0.15)",
                            }}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </Document>
        </div>

        {/* Right panel – captured images */}
        {showImagePanel && (
          <CapturesPanel
            images={capturedImages}
            onDownload={downloadImage}
            onDelete={(id) =>
              setCapturedImages((prev) => prev.filter((img) => img.id !== id))
            }
          />
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
