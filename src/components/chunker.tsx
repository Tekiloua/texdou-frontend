import { useState, useRef, useEffect, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Stage, Layer, Star, Circle, Arrow, Path, Transformer, Text as KonvaText, Rect, Circle as KonvaCircle } from "react-konva"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolMode = "select" | "sticker" | "arrow"

type StickerType = "star" | "heart" | "badge" | "arrow_shape" | "check" | "pin" | "fire" | "flag"

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
  // pageIndex removed — corners can span multiple pages, capture uses corner pages
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
  { type: "star",        emoji: "⭐", label: "Étoile"    },
  { type: "heart",       emoji: "❤️", label: "Cœur"      },
  { type: "badge",       emoji: "🔴", label: "Badge"     },
  { type: "check",       emoji: "✅", label: "Validé"    },
  { type: "pin",         emoji: "📌", label: "Épingle"   },
  { type: "fire",        emoji: "🔥", label: "Important" },
  { type: "flag",        emoji: "🚩", label: "Drapeau"   },
  { type: "arrow_shape", emoji: "➡️", label: "Flèche"    },
]

const COLORS = ["#4F7EF7","#1D9E75","#E24B4A","#F59E0B","#8B5CF6","#EC4899","#0EA5E9","#1A1D2E"]

// ─── StickerShape ─────────────────────────────────────────────────────────────

const StickerShape = ({
  item, isSelected, onSelect, onChange,
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
      return <Star {...common} numPoints={5} innerRadius={s * 0.4} outerRadius={s} fill={item.color} stroke="#fff" strokeWidth={2} />
    case "heart":
      return (
        <Path {...common}
          data="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          scaleX={s / 12} scaleY={s / 12} fill={item.color} offsetX={12} offsetY={12} />
      )
    case "badge":
      return <Circle {...common} radius={s} fill={item.color} stroke="#fff" strokeWidth={3} />
    case "check":
      return (
        <Path {...common}
          data="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
          scaleX={s / 10} scaleY={s / 10} fill={item.color} offsetX={12} offsetY={12} />
      )
    case "pin":
      return (
        <Path {...common}
          data="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
          scaleX={s / 12} scaleY={s / 12} fill={item.color} offsetX={12} offsetY={12} />
      )
    case "fire":
      return (
        <Path {...common}
          data="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-1 .23-1.98.68-2.83 1.23-.84.55-1.54 1.28-2.06 2.09-.55.85-.89 1.82-.96 2.82-.07.96.13 1.95.6 2.83-.17-.05-.34-.1-.51-.16-.62-.22-1.17-.54-1.65-.97-.46-.42-.83-.94-1.05-1.51-.2-.53-.28-1.1-.2-1.67-.65.44-1.2 1.03-1.57 1.72-.37.68-.55 1.44-.55 2.2 0 .98.24 1.93.67 2.78.42.83 1.03 1.56 1.78 2.11.75.56 1.63.93 2.56 1.07.37.06.74.1 1.12.1 2.06 0 3.96-.89 5.28-2.3.7-.76 1.24-1.7 1.52-2.71.28-1.01.28-2.08 0-3.09z"
          scaleX={s / 12} scaleY={s / 12} fill={item.color} offsetX={12} offsetY={12} />
      )
    case "flag":
      return (
        <Path {...common}
          data="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"
          scaleX={s / 12} scaleY={s / 12} fill={item.color} offsetX={12} offsetY={12} />
      )
    case "arrow_shape":
      return (
        <Arrow {...common}
          points={[0, 0, s * 2.5, 0]} fill={item.color} stroke={item.color}
          strokeWidth={s / 4} pointerLength={s / 2} pointerWidth={s / 2} />
      )
    case "text":
      return (
        <KonvaText {...common} text={item.text || "Texte"} fontSize={item.size}
          fill={item.color} fontFamily="Plus Jakarta Sans, sans-serif" fontStyle="bold" />
      )
    case "highlight":
      return (
        <Rect {...common} width={item.size * 5} height={item.size * 0.8}
          fill={item.color} opacity={0.35} cornerRadius={3} />
      )
    default:
      return null
  }
}

// ─── PageCanvas ───────────────────────────────────────────────────────────────

const HANDLE_SIZE = 7

const PageCanvas = ({
  pageIndex, pageWidth, pageHeight, shapes, selectedId, rectGroups, selectedRectId,
  onSelect, onShapeChange, onStageClick, onRectClick, onRectResize,
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
  onRectResize: (rectId: string, handleIndex: number, dx: number, dy: number) => void
}) => {
  const trRef = useRef<any>(null)
  const shapeRefs = useRef<Record<string, any>>({})
  const pageShapes = shapes.filter((s) => s.pageIndex === pageIndex)

  // Rects that have at least one corner on this page (for cross-page rects, show on first corner's page)
  const pageRects = rectGroups.filter((r) => {
    const corners = r.cornerIds.map(cid => shapes.find(s => s.id === cid)).filter(Boolean) as ShapeItem[]
    if (corners.length < 2) return false
    // Show rect on the page of its first corner
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
    const corners = rect.cornerIds.map(cid => shapes.find(s => s.id === cid)).filter(Boolean) as ShapeItem[]
    if (corners.length < 2) return null
    const xs = corners.map(c => c.x)
    const ys = corners.map(c => c.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    const w = Math.max(...xs) - x
    const h = Math.max(...ys) - y
    return { x, y, w, h }
  }

  // 8 handles: 0=TL 1=T 2=TR 3=R 4=BR 5=B 6=BL 7=L
  const getHandlePositions = (bounds: { x: number; y: number; w: number; h: number }) => {
    const { x, y, w, h } = bounds
    return [
      { x: x,       y: y       }, // TL
      { x: x+w/2,   y: y       }, // T
      { x: x+w,     y: y       }, // TR
      { x: x+w,     y: y+h/2   }, // R
      { x: x+w,     y: y+h     }, // BR
      { x: x+w/2,   y: y+h     }, // B
      { x: x,       y: y+h     }, // BL
      { x: x,       y: y+h/2   }, // L
    ]
  }

  const handleCursors = ["nw-resize","n-resize","ne-resize","e-resize","se-resize","s-resize","sw-resize","w-resize"]

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
                  // Move all 4 corners by same delta
                  const node = e.target
                  const dx = node.x() - bounds.x
                  const dy = node.y() - bounds.y
                  node.position({ x: bounds.x, y: bounds.y }) // reset visual
                  rect.cornerIds.forEach(cid => {
                    const corner = shapes.find(s => s.id === cid)
                    if (corner) onShapeChange(cid, { x: corner.x + dx, y: corner.y + dy })
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
                    if (stage) stage.container().style.cursor = handleCursors[hi]
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage()
                    if (stage) stage.container().style.cursor = "default"
                  }}
                  onDragMove={(e) => {
                    const node = e.target
                    const pos = node.position()
                    onRectResize(rect.id, hi, pos.x - hp.x, pos.y - hp.y)
                    node.position(hp) // keep visual at original while dragging (position is tracked via corners)
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

// ─── Main component ───────────────────────────────────────────────────────────

const PAGE_WIDTH = 794

// We need React for Fragment
import React from "react"

export const Chunker = () => {
  const [numPages, setNumPages] = useState(0)
  const [shapes, setShapes] = useState<ShapeItem[]>([])
  const [history, setHistory] = useState<ShapeItem[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<ToolMode>("select")
  const [activeStickerType, setActiveStickerType] = useState<StickerType>("star")
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

  // ─── Undo ─────────────────────────────────────────────────────────────────

  const pushHistory = useCallback((current: ShapeItem[]) => {
    setHistory(prev => [...prev.slice(-49), [...current]])
  }, [])

  const undo = useCallback(() => {
    setHistory(prev => {
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
        setShapes(prev => {
          pushHistory(prev)
          return prev.filter(s => s.id !== selectedId)
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
      if (tool === "select") { setSelectedId(null); return }
      const id = `shape_${Date.now()}`
      const newShape: ShapeItem = { id, type: activeStickerType, x, y, pageIndex, size: stickerSize, color: activeColor }
      setShapes(prev => { pushHistory(prev); return [...prev, newShape] })
      setSelectedId(id)
    },
    [tool, activeStickerType, stickerSize, activeColor, pushHistory]
  )

  const handleShapeChange = useCallback((id: string, attrs: Partial<ShapeItem>) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...attrs } : s)))
  }, [])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setShapes(prev => { pushHistory(prev); return prev.filter(s => s.id !== selectedId) })
    setSelectedId(null)
  }, [selectedId, pushHistory])

  // ─── Rect mode ───────────────────────────────────────────────────────────

  const toggleRectMode = () => {
    setRectMode(v => !v)
    setPendingCorners([])
    setSelectedRectId(null)
  }

  const handleStickerSelect = useCallback((id: string) => {
    if (!rectMode) {
      setSelectedId(id)
      return
    }
    setPendingCorners(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id)
      const next = [...prev, id]
      if (next.length === 4) {
        setShapes(currentShapes => {
          const rectId = `rect_${Date.now()}`
          const newRect: RectGroup = {
            id: rectId,
            color: activeColor,
            cornerIds: [next[0], next[1], next[2], next[3]] as [string, string, string, string],
          }
          setRectGroups(rg => [...rg, newRect])
          setSelectedRectId(rectId)
          setRectMode(false)
          return currentShapes
        })
        return []
      }
      return next
    })
  }, [rectMode, activeColor])

  // ─── Rect resize via handles ─────────────────────────────────────────────
  // Handle indices: 0=TL 1=T 2=TR 3=R 4=BR 5=B 6=BL 7=L
  // We move corners based on which edge/corner the handle touches

  const handleRectResize = useCallback((rectId: string, handleIndex: number, dx: number, dy: number) => {
    setShapes(prev => {
      const rect = rectGroups.find(r => r.id === rectId)
      if (!rect) return prev

      const corners = rect.cornerIds.map(cid => prev.find(s => s.id === cid)).filter(Boolean) as ShapeItem[]
      if (corners.length < 4) return prev

      const xs = corners.map(c => c.x)
      const ys = corners.map(c => c.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)

      // Determine which corners to move based on handle
      // Corners sorted as: TL, TR, BR, BL (by position)
      const tl = corners.find(c => c.x === minX && c.y === minY) || corners.find(c => c.x <= (minX + maxX)/2 && c.y <= (minY + maxY)/2)
      const tr = corners.find(c => c.x === maxX && c.y === minY) || corners.find(c => c.x > (minX + maxX)/2 && c.y <= (minY + maxY)/2)
      const br = corners.find(c => c.x === maxX && c.y === maxY) || corners.find(c => c.x > (minX + maxX)/2 && c.y > (minY + maxY)/2)
      const bl = corners.find(c => c.x === minX && c.y === maxY) || corners.find(c => c.x <= (minX + maxX)/2 && c.y > (minY + maxY)/2)

      const updates: Record<string, { x?: number; y?: number }> = {}
      const moveLeft = (id: string) => { if (id) updates[id] = { ...updates[id], x: (prev.find(s=>s.id===id)?.x||0)+dx } }
      const moveRight = (id: string) => { if (id) updates[id] = { ...updates[id], x: (prev.find(s=>s.id===id)?.x||0)+dx } }
      const moveTop = (id: string) => { if (id) updates[id] = { ...updates[id], y: (prev.find(s=>s.id===id)?.y||0)+dy } }
      const moveBottom = (id: string) => { if (id) updates[id] = { ...updates[id], y: (prev.find(s=>s.id===id)?.y||0)+dy } }

      if (handleIndex === 0) { // TL
        if (tl) { moveLeft(tl.id); moveTop(tl.id) }
        if (bl) moveLeft(bl.id)
        if (tr) moveTop(tr.id)
      } else if (handleIndex === 1) { // T
        if (tl) moveTop(tl.id)
        if (tr) moveTop(tr.id)
      } else if (handleIndex === 2) { // TR
        if (tr) { moveRight(tr.id); moveTop(tr.id) }
        if (br) moveRight(br.id)
        if (tl) moveTop(tl.id)
      } else if (handleIndex === 3) { // R
        if (tr) moveRight(tr.id)
        if (br) moveRight(br.id)
      } else if (handleIndex === 4) { // BR
        if (br) { moveRight(br.id); moveBottom(br.id) }
        if (tr) moveRight(tr.id)
        if (bl) moveBottom(bl.id)
      } else if (handleIndex === 5) { // B
        if (bl) moveBottom(bl.id)
        if (br) moveBottom(br.id)
      } else if (handleIndex === 6) { // BL
        if (bl) { moveLeft(bl.id); moveBottom(bl.id) }
        if (tl) moveLeft(tl.id)
        if (br) moveBottom(br.id)
      } else if (handleIndex === 7) { // L
        if (tl) moveLeft(tl.id)
        if (bl) moveLeft(bl.id)
      }

      return prev.map(s => {
        const upd = updates[s.id]
        if (upd) return { ...s, ...upd }
        return s
      })
    })
  }, [rectGroups])

  // ─── Rect: validate (capture PNG) — supports multi-page ──────────────────

  const handleValidateRect = useCallback(async () => {
    if (!selectedRectId) return
    const rect = rectGroups.find(r => r.id === selectedRectId)
    if (!rect) return

    const corners = rect.cornerIds.map(cid => shapes.find(s => s.id === cid)).filter(Boolean) as ShapeItem[]
    if (corners.length < 2) return

    // Group corners by page
    const byPage = new Map<number, ShapeItem[]>()
    for (const c of corners) {
      if (!byPage.has(c.pageIndex)) byPage.set(c.pageIndex, [])
      byPage.get(c.pageIndex)!.push(c)
    }

    // If all corners on same page — simple crop
    if (byPage.size === 1) {
      const pageCorners = corners
      const xs = pageCorners.map(c => c.x)
      const ys = pageCorners.map(c => c.y)
      const rx = Math.min(...xs), ry = Math.min(...ys)
      const rw = Math.max(...xs) - rx, rh = Math.max(...ys) - ry

      const pageIndex = pageCorners[0].pageIndex
      const pageEl = pageRefs.current[pageIndex]
      if (!pageEl) return
      const pdfCanvas = pageEl.querySelector("canvas") as HTMLCanvasElement | null
      if (!pdfCanvas) { alert("Canvas PDF introuvable."); return }

      const outCanvas = document.createElement("canvas")
      outCanvas.width = Math.max(1, Math.round(rw))
      outCanvas.height = Math.max(1, Math.round(rh))
      const ctx = outCanvas.getContext("2d")!
      ctx.drawImage(pdfCanvas, rx, ry, rw, rh, 0, 0, rw, rh)

      const dataUrl = outCanvas.toDataURL("image/png")
      const captured: CapturedImage = {
        id: `cap_${Date.now()}`,
        dataUrl,
        label: `Page ${pageIndex + 1} — ${new Date().toLocaleTimeString("fr-FR")}`,
        timestamp: Date.now(),
      }
      setCapturedImages(prev => [captured, ...prev])
    } else {
      // Multi-page: stitch canvases vertically
      const sortedPages = Array.from(byPage.keys()).sort((a, b) => a - b)
      const strips: { canvas: HTMLCanvasElement; w: number; h: number }[] = []
      let totalH = 0
      let maxW = 0

      for (const pgIdx of sortedPages) {
        const pgCorners = byPage.get(pgIdx)!
        const allXs = corners.map(c => c.x)
        const rx = Math.min(...allXs)
        const rw = Math.max(...allXs) - rx

        const ys = pgCorners.map(c => c.y)
        let ry: number, rh: number
        if (pgIdx === sortedPages[0]) {
          // top page: from corner y to bottom of page
          ry = Math.min(...ys)
          const pageEl = pageRefs.current[pgIdx]
          rh = pageEl ? pageEl.clientHeight - ry : Math.max(...ys) - ry
        } else if (pgIdx === sortedPages[sortedPages.length - 1]) {
          // bottom page: from top to corner y
          ry = 0
          rh = Math.max(...ys)
        } else {
          // middle pages: full height
          ry = 0
          const pageEl = pageRefs.current[pgIdx]
          rh = pageEl ? pageEl.clientHeight : 800
        }

        const pageEl = pageRefs.current[pgIdx]
        if (!pageEl) continue
        const pdfCanvas = pageEl.querySelector("canvas") as HTMLCanvasElement | null
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
      const pagesLabel = sortedPages.map(p => `p${p+1}`).join("+")
      const captured: CapturedImage = {
        id: `cap_${Date.now()}`,
        dataUrl,
        label: `Pages ${pagesLabel} — ${new Date().toLocaleTimeString("fr-FR")}`,
        timestamp: Date.now(),
      }
      setCapturedImages(prev => [captured, ...prev])
    }

    // Remove rect and its corners
    setShapes(prev => { pushHistory(prev); return prev.filter(s => !rect.cornerIds.includes(s.id)) })
    setRectGroups(prev => prev.filter(r => r.id !== selectedRectId))
    setSelectedRectId(null)
  }, [selectedRectId, rectGroups, shapes, pushHistory])

  const handleDeleteRect = useCallback(() => {
    if (!selectedRectId) return
    const rect = rectGroups.find(r => r.id === selectedRectId)
    if (!rect) return
    setShapes(prev => { pushHistory(prev); return prev.filter(s => !rect.cornerIds.includes(s.id)) })
    setRectGroups(prev => prev.filter(r => r.id !== selectedRectId))
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
      scrollRef.current.scrollTo({ top: ref.offsetTop - 16, behavior: "smooth" })
    }
  }

  const toolButtons: { id: ToolMode; icon: string; label: string }[] = [
    { id: "select",  icon: "↖",  label: "Sélection" },
    { id: "sticker", icon: "⭐", label: "Sticker"   },
  ]

  const downloadImage = (img: CapturedImage) => {
    const a = document.createElement("a")
    a.href = img.dataUrl
    a.download = `capture_${img.id}.png`
    a.click()
  }

  const deleteImage = (id: string) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id))
  }

  const showImagePanel = capturedImages.length > 0

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 62px)", background: "#F0F4FF", fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden" }}>

      {/* ══════════════ TOOLBAR ══════════════ */}
      <div style={{ flexShrink: 0, background: "#fff", borderBottom: "1.5px solid #E4E9F7", padding: "7px 14px", display: "flex", alignItems: "center", gap: 10, overflowX: "auto" }}>

        {/* Tool buttons */}
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {toolButtons.map(({ id, icon, label }) => (
            <button key={id} title={label} onClick={() => { setTool(id); setRectMode(false) }} style={{
              height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid",
              borderColor: tool === id && !rectMode ? "#4F7EF7" : "#E4E9F7",
              background: tool === id && !rectMode ? "#EBF2FF" : "#fff",
              color: tool === id && !rectMode ? "#4F7EF7" : "#6B7290",
              fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Undo */}
        <button onClick={undo} disabled={history.length === 0} title="Annuler (Ctrl+Z)" style={{
          height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid #E4E9F7",
          background: "#F7F9FF", color: history.length > 0 ? "#6B7290" : "#C0C8DC",
          fontSize: 12, fontWeight: 700, cursor: history.length > 0 ? "pointer" : "default",
          display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", flexShrink: 0,
          opacity: history.length > 0 ? 1 : 0.4, transition: "all 0.15s",
        }}>
          ↩ Annuler
        </button>

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Zone capture button */}
        <button onClick={toggleRectMode} title="Sélectionner 4 stickers pour délimiter une zone à capturer" style={{
          height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid",
          borderColor: rectMode ? "#1D9E75" : "#E4E9F7",
          background: rectMode ? "#E6F7F2" : "#F7F9FF",
          color: rectMode ? "#1D9E75" : "#6B7290",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", flexShrink: 0,
          transition: "all 0.15s",
        }}>
          <span style={{ fontSize: 14 }}>⬚</span>
          {rectMode ? `Zone (${pendingCorners.length}/4)` : "Zone"}
        </button>

        {/* Validate / delete rect */}
        {selectedRectId && !rectMode && (
          <>
            <button onClick={handleValidateRect} style={{
              height: 32, padding: "0 10px", borderRadius: 8,
              border: "1.5px solid #86EFAC", background: "#F0FDF4",
              color: "#166534", fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              fontFamily: "inherit", flexShrink: 0,
            }}>
              ✓ Valider
            </button>
            <button onClick={handleDeleteRect} style={{
              height: 32, padding: "0 10px", borderRadius: 8,
              border: "1.5px solid #FECACA", background: "#FDECEA",
              color: "#A32D2D", fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              fontFamily: "inherit", flexShrink: 0,
            }}>
              ✕ Suppr. zone
            </button>
          </>
        )}

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Sticker picker */}
        <div style={{
          display: "flex", gap: 3, flexShrink: 0, flexWrap: "nowrap",
          opacity: tool === "sticker" && !rectMode ? 1 : 0.3,
          pointerEvents: tool === "sticker" && !rectMode ? "auto" : "none",
          transition: "opacity 0.15s",
        }}>
          {STICKERS.map(({ type, emoji, label }) => (
            <button key={type} title={label} onClick={() => setActiveStickerType(type)} style={{
              width: 32, height: 32, borderRadius: 8, border: "1.5px solid",
              borderColor: activeStickerType === type ? "#4F7EF7" : "#E4E9F7",
              background: activeStickerType === type ? "#EBF2FF" : "#F7F9FF",
              fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {emoji}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Size slider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
          opacity: tool === "select" && !rectMode ? 0.3 : 1,
          pointerEvents: tool === "select" && !rectMode ? "none" : "auto",
          transition: "opacity 0.15s",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#8892B0", whiteSpace: "nowrap" }}>{stickerSize}px</span>
          <input type="range" min={10} max={80} value={stickerSize}
            onChange={(e) => setStickerSize(Number(e.target.value))}
            style={{ width: 80, accentColor: "#4F7EF7" }} />
        </div>

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Color picker */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          opacity: tool === "select" && !rectMode ? 0.3 : 1,
          pointerEvents: tool === "select" && !rectMode ? "none" : "auto",
          transition: "opacity 0.15s",
        }}>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setActiveColor(c)} style={{
              width: 18, height: 18, borderRadius: "50%", background: c,
              border: activeColor === c ? "2.5px solid #1A1D2E" : "2px solid #E4E9F7",
              cursor: "pointer", flexShrink: 0,
            }} />
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #E4E9F7", background: "#F7F9FF", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#6B7290", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7290", minWidth: 38, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #E4E9F7", background: "#F7F9FF", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#6B7290", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>

        <div style={{ width: 1, height: 24, background: "#E4E9F7", flexShrink: 0 }} />

        {/* Delete sticker */}
        <button onClick={deleteSelected} disabled={!selectedId || rectMode} style={{
          height: 32, padding: "0 10px", borderRadius: 8, border: "1.5px solid",
          borderColor: selectedId && !rectMode ? "#FECACA" : "#E4E9F7",
          background: selectedId && !rectMode ? "#FDECEA" : "#F7F9FF",
          color: selectedId && !rectMode ? "#A32D2D" : "#B0B8D0",
          fontSize: 11, fontWeight: 700, cursor: selectedId && !rectMode ? "pointer" : "default",
          display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", flexShrink: 0, transition: "all 0.15s",
        }}>
          🗑 Suppr.
        </button>

        {/* Page indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={() => scrollToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #E4E9F7", background: "#F7F9FF", cursor: "pointer", fontSize: 13, color: "#6B7290", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7290", whiteSpace: "nowrap" }}>{currentPage} / {numPages}</span>
          <button onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages} style={{ width: 26, height: 26, borderRadius: 6, border: "1.5px solid #E4E9F7", background: "#F7F9FF", cursor: "pointer", fontSize: 13, color: "#6B7290", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>

      {/* Rect mode hint banner */}
      {rectMode && (
        <div style={{
          background: "#E6F7F2", borderBottom: "1.5px solid #86EFAC",
          padding: "5px 16px", fontSize: 12, fontWeight: 600, color: "#166534",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 15 }}>⬚</span>
          Cliquez sur <strong>4 stickers existants</strong> pour délimiter la zone (peuvent être sur des pages différentes) — {pendingCorners.length} / 4 sélectionné{pendingCorners.length > 1 ? "s" : ""}
          <button onClick={toggleRectMode} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: 700, fontSize: 13, padding: 0 }}>✕ Annuler</button>
        </div>
      )}

      {/* ══════════════ BODY ══════════════ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left sidebar – page thumbnails */}
        <div style={{ width: 96, flexShrink: 0, background: "#fff", borderRight: "1.5px solid #E4E9F7", overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: numPages }, (_, i) => (
            <button key={i} onClick={() => scrollToPage(i + 1)} style={{
              width: "100%", borderRadius: 8, border: "1.5px solid",
              borderColor: currentPage === i + 1 ? "#4F7EF7" : "#E4E9F7",
              background: currentPage === i + 1 ? "#EBF2FF" : "#F7F9FF",
              cursor: "pointer", padding: "6px 4px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <div style={{ width: "100%", aspectRatio: "210/297", background: "#fff", border: "1px solid #E4E9F7", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <Document file="/public/note.pdf" loading="">
                  <Page pageNumber={i + 1} width={72} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: currentPage === i + 1 ? "#4F7EF7" : "#8892B0" }}>{i + 1}</span>
            </button>
          ))}
        </div>

        {/* PDF scroll area */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: "auto", overflowX: "auto", padding: "24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
          cursor: tool === "sticker" && !rectMode ? "crosshair" : rectMode ? "cell" : "default",
        }}>
          <Document
            file="/public/note.pdf"
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div style={{ color: "#8892B0", fontSize: 13, fontWeight: 600, padding: 40, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 20, height: 20, border: "2px solid #E4E9F7", borderTopColor: "#4F7EF7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Chargement du PDF…
              </div>
            }
          >
            {Array.from({ length: numPages }, (_, i) => {
              const scaledWidth = PAGE_WIDTH * zoom
              const pageH = pageDims[i] ? pageDims[i] * zoom : scaledWidth * 1.414

              return (
                <div key={i} ref={(el) => { pageRefs.current[i] = el }} style={{
                  position: "relative", width: scaledWidth,
                  boxShadow: "0 4px 24px rgba(79,126,247,0.10), 0 1px 4px rgba(0,0,0,0.08)",
                  borderRadius: 4, overflow: "hidden", flexShrink: 0,
                  border: currentPage === i + 1 ? "2px solid #4F7EF7" : "2px solid transparent",
                  transition: "border-color 0.2s",
                }}>
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
                      if (!rectMode) setSelectedRectId(prev => prev === rectId ? null : rectId)
                    }}
                    onRectResize={handleRectResize}
                  />
                  {/* Green ring on pending corners */}
                  {rectMode && pendingCorners.length > 0 && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }}>
                      {pendingCorners.map(cid => {
                        const s = shapes.find(sh => sh.id === cid && sh.pageIndex === i)
                        if (!s) return null
                        return (
                          <div key={cid} style={{
                            position: "absolute",
                            left: s.x - 8, top: s.y - 8,
                            width: 16, height: 16,
                            borderRadius: "50%",
                            border: "2.5px solid #1D9E75",
                            background: "rgba(29,158,117,0.15)",
                          }} />
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
          <div style={{
            width: 220, flexShrink: 0, background: "#fff", borderLeft: "1.5px solid #E4E9F7",
            overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1A1D2E", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Captures ({capturedImages.length})
              </span>
            </div>
            {capturedImages.map(img => (
              <div key={img.id} style={{
                borderRadius: 10, border: "1.5px solid #E4E9F7", overflow: "hidden",
                background: "#F7F9FF", boxShadow: "0 1px 4px rgba(79,126,247,0.07)",
              }}>
                {/* Thumbnail */}
                <div style={{ width: "100%", background: "#EEF1F8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", maxHeight: 140 }}>
                  <img
                    src={img.dataUrl}
                    alt={img.label}
                    style={{ width: "100%", height: "auto", maxHeight: 140, objectFit: "contain", display: "block" }}
                  />
                </div>
                {/* Label + actions */}
                <div style={{ padding: "7px 8px 8px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6B7290", marginBottom: 7, lineHeight: 1.4 }}>
                    {img.label}
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      onClick={() => downloadImage(img)}
                      style={{
                        flex: 1, height: 26, borderRadius: 6, border: "1.5px solid #86EFAC",
                        background: "#F0FDF4", color: "#166534", fontSize: 10, fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                        fontFamily: "inherit",
                      }}
                    >
                      ⬇ DL
                    </button>
                    <button
                      onClick={() => deleteImage(img.id)}
                      style={{
                        width: 26, height: 26, borderRadius: 6, border: "1.5px solid #FECACA",
                        background: "#FDECEA", color: "#A32D2D", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}