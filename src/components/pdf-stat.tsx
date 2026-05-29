import { useState, useRef, useEffect, useCallback } from "react"
import React from "react"
import axios from "axios"
import {
  FileText, Eye, Sun, Contrast, Activity,
  RotateCw, Ruler, Languages, CheckCircle, AlertCircle,
  Timer, BookOpen, FileCheck, Type, BarChart3, ScanText,
  X, RefreshCw, Clock, Zap, ArrowUpRight,
} from "lucide-react"

// ─── Types API réelle (réponse de pdf_stats) ─────────────────────────────────

interface TesseractData {
  ocr_confidence: number
  texte: string
  oov_rate: number
}

interface ApiPage {
  page: number
  dpi: number
  blur: number
  largeur: number
  hauteur: number
  contrast: number
  brightness: number
  skew: number
  noise_score: number
  black_pixel_ratio: number
  entropy: number
  lighting_uniformity: number
  langue: string
  time: number
  WER: number | null
  CER: number | null
  tesseract_data: TesseractData
}

interface ApiStats {
  filename: string
  type: string
  categorie: string
  taille_mb: number
  nbpage: number
  pages: ApiPage[]
}

// ─── Types internes (vue) ─────────────────────────────────────────────────────

interface PageAnalysis {
  page_num: number
  dimensions: string
  blur_score: number
  blur_label: string
  brightness: number
  contrast: number
  skew_angle: number
  noise_score: number
  black_pixel_ratio: number
  entropy: number
  lighting_uniformity: number
  langue: string
  analysis_time_s: number
  ocr_confidence: number
  oov_rate: number
  texte_preview: string
  WER: number | null
  CER: number | null
}

interface AnalysisResult {
  file_name: string
  file_size_mb: number
  page_count: number
  categorie: string
  type: string
  avg_blur: number
  avg_brightness: number
  avg_contrast: number
  avg_noise: number
  avg_skew: number
  avg_confidence: number
  total_time_s: number
  pages: PageAnalysis[]
}

// ─── Mapping réponse API → AnalysisResult ────────────────────────────────────

function mapApiStats(api: ApiStats): AnalysisResult {
  const pages: PageAnalysis[] = api.pages.map((p) => {
    const blurLabel =
      p.blur > 600 ? "Net" : p.blur > 300 ? "Correct" : "Flou"
    return {
      page_num: p.page,
      dimensions: `${p.largeur}×${p.hauteur} px`,
      blur_score: Math.round(p.blur),
      blur_label: blurLabel,
      brightness: p.brightness,
      contrast: p.contrast,
      skew_angle: p.skew,
      noise_score: p.noise_score,
      black_pixel_ratio: p.black_pixel_ratio,
      entropy: p.entropy,
      lighting_uniformity: p.lighting_uniformity,
      langue: p.langue,
      analysis_time_s: p.time,
      ocr_confidence: p.tesseract_data.ocr_confidence,
      oov_rate: p.tesseract_data.oov_rate,
      texte_preview: p.tesseract_data.texte.trim().slice(0, 200),
      WER: p.WER,
      CER: p.CER,
    }
  })

  const n = pages.length || 1
  const avg = (key: keyof PageAnalysis) =>
    parseFloat(
      (pages.reduce((s, p) => s + (p[key] as number), 0) / n).toFixed(2)
    )

  return {
    file_name: api.filename,
    file_size_mb: api.taille_mb,
    page_count: api.nbpage,
    categorie: api.categorie,
    type: api.type,
    avg_blur: avg("blur_score"),
    avg_brightness: avg("brightness"),
    avg_contrast: avg("contrast"),
    avg_noise: avg("noise_score"),
    avg_skew: avg("skew_angle"),
    avg_confidence: avg("ocr_confidence"),
    total_time_s: parseFloat(
      pages.reduce((s, p) => s + p.analysis_time_s, 0).toFixed(2)
    ),
    pages,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (s: number) =>
  s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (file: File): string => {
  if (file.type.startsWith("image/")) return "🖼️"
  if (file.type === "application/pdf") return "📑"
  if (file.type.includes("word")) return "📝"
  if (file.type.includes("sheet") || file.type.includes("excel")) return "📊"
  return "📄"
}

type QualityLevel = "good" | "mid" | "bad"

const qualityLevel = (label: string): QualityLevel => {
  const l = label?.toLowerCase() ?? ""
  if (["net", "bon", "élevé", "excel", "faible", "good", "high", "low"].some((k) => l.includes(k))) return "good"
  if (["moyen", "correct", "medium"].some((k) => l.includes(k))) return "mid"
  return "bad"
}

// ─── Design sub-components ────────────────────────────────────────────────────

type PillVariant = "blue" | "teal" | "amber" | "red" | "pink" | "purple"

const PILL_CLASSES: Record<PillVariant, string> = {
  blue:   "bg-[#EBF2FF] text-[#185FA5]",
  teal:   "bg-[#E1F5EE] text-[#0F6E56]",
  amber:  "bg-[#FAEEDA] text-[#854F0B]",
  red:    "bg-[#FDECEA] text-[#A32D2D]",
  pink:   "bg-[#FBEAF0] text-[#993556]",
  purple: "bg-[#F0EBFF] text-[#5B2FA0]",
}

const pillVariant = (level: QualityLevel): PillVariant =>
  level === "good" ? "teal" : level === "mid" ? "amber" : "red"

const Pill = ({
  children,
  variant = "blue",
}: {
  children: React.ReactNode
  variant?: PillVariant
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PILL_CLASSES[variant]}`}
  >
    {children}
  </span>
)

const StatCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  suffix = "",
  sub,
  trend,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  suffix?: string
  sub?: string
  trend?: string
}) => (
  <div className="bg-white border border-[#E4E9F7] rounded-[14px] px-4.5 py-4 transition-all duration-180 hover:border-[#C8D9FA] hover:shadow-[0_4px_16px_-4px_rgba(79,126,247,0.12)]">
    <div className="flex items-center justify-between mb-3">
      <div
        className="w-9.5 h-9.5 rounded-[10px] flex items-center justify-center"
        style={{ background: iconBg }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      {trend && (
        <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#0F6E56]">
          <ArrowUpRight size={12} />
          {trend}
        </span>
      )}
    </div>
    <div className="text-[28px] font-extrabold text-[#1A1D2E] leading-none mt-3">
      {value}
      <span className="text-base font-bold text-[#8892B0] ml-0.5">{suffix}</span>
    </div>
    <div className="text-xs font-semibold text-[#8892B0] mt-1">{label}</div>
    {sub && <div className="text-[11px] text-[#C0C8DC] mt-0.5">{sub}</div>}
  </div>
)

const MetricRow = ({
  label,
  value,
  badge,
  badgeVariant = "blue",
}: {
  label: string
  value: string | number
  badge?: string
  badgeVariant?: PillVariant
}) => (
  <div className="flex items-center justify-between py-2 border-b border-[#F0F4FF] last:border-b-0">
    <span className="text-[12.5px] text-[#6B7290] font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[12.5px] font-bold text-[#1A1D2E]">{value}</span>
      {badge && <Pill variant={badgeVariant}>{badge}</Pill>}
    </div>
  </div>
)

// ─── FilePreview (extrait du file-uploader) ───────────────────────────────────

const FilePreview = ({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  React.useEffect(() => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
    return undefined
  }, [file])

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#F0F4FF",
        border: "1.5px solid #E4E9F7",
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
        animation: "fadeSlideIn .25s ease",
      }}
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          style={{
            width: 44, height: 44, objectFit: "cover",
            borderRadius: 8, border: "1.5px solid #E4E9F7", flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 44, height: 44, background: "#EBF2FF", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}
        >
          {getFileIcon(file)}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
          fontWeight: 700, color: "#1A1D2E",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {file.name}
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11, color: "#8892B0", marginTop: 2,
        }}>
          {formatSize(file.size)}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        style={{
          width: 28, height: 28, borderRadius: 8,
          border: "1.5px solid #E4E9F7", background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#8892B0", flexShrink: 0, transition: "all .15s",
        }}
        aria-label="Supprimer le fichier"
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "#FDECEA"
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#f5c6c6"
          ;(e.currentTarget as HTMLButtonElement).style.color = "#A32D2D"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "#fff"
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = "#E4E9F7"
          ;(e.currentTarget as HTMLButtonElement).style.color = "#8892B0"
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Uploader intégré ─────────────────────────────────────────────────────────

type ToastState = { message: string; type: "success" | "error" } | null

const Toast = ({
  state,
  onClose,
}: {
  state: ToastState
  onClose: () => void
}) => {
  if (!state) return null
  const isSuccess = state.type === "success"
  return (
    <div
      style={{
        position: "fixed", top: 24, right: 24, zIndex: 9999,
        background: isSuccess ? "#E6F9F1" : "#FDECEA",
        border: `1.5px solid ${isSuccess ? "#b3e9d5" : "#f5c6c6"}`,
        borderRadius: 12, padding: "12px 18px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 4px 24px rgba(79,126,247,.10)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        animation: "fadeSlideIn .2s ease", minWidth: 260,
      }}
      role="alert"
    >
      <span style={{ fontSize: 18 }}>{isSuccess ? "✅" : "❌"}</span>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: isSuccess ? "#0F6E56" : "#A32D2D", flex: 1,
      }}>
        {state.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#8892B0", fontSize: 18, lineHeight: 1, padding: 0,
        }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  )
}

interface FileUploaderProps {
  onResult: (result: AnalysisResult) => void
  onLoading: (loading: boolean) => void
  onError: (err: string | null) => void
}

const FileUploader = ({ onResult, onLoading, onError }: FileUploaderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging]       = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [progress, setProgress]           = useState(0)
  const [toast, setToast]                 = useState<ToastState>(null)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    const incoming = Array.from(files)
    setSelectedFiles((prev) => [
      ...prev,
      ...incoming.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size)),
    ])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleUpload = async () => {
    if (!selectedFiles.length) return
    // On ne traite que le premier fichier PDF pour l'analyse
    const file = selectedFiles[0]

    setUploading(true)
    setProgress(0)
    onLoading(true)
    onError(null)

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90 }
        return p + 10
      })
    }, 200)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await axios.post<{ stats: ApiStats }>(
        "http://localhost:8000/upload-file-analyse",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )

      clearInterval(interval)
      setProgress(100)

      const result = mapApiStats(response.data.stats)
      onResult(result)
      setToast({ message: `Analyse de « ${file.name} » terminée !`, type: "success" })
      setSelectedFiles([])
      setProgress(0)
    } catch (err: unknown) {
      clearInterval(interval)
      const message =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : "Échec de l'analyse. Vérifiez que le serveur est démarré."
      setToast({ message, type: "error" })
      onError(message)
      setProgress(0)
    } finally {
      setUploading(false)
      onLoading(false)
    }
  }

  const hasFiles  = selectedFiles.length > 0
  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .uploader-zone:hover  { border-color: #4F7EF7 !important; background: #F7F9FF !important; }
        .uploader-btn:not(:disabled):hover  { background: #3D6EE5 !important; }
        .uploader-btn:not(:disabled):active { transform: scale(.97); }
      `}</style>

      <div
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: "#fff",
          border: "1.5px solid #E4E9F7",
          borderRadius: 14,
          padding: "28px 28px 24px",
          width: "100%",
          boxShadow: "0 2px 16px rgba(79,126,247,.07)",
          animation: "fadeSlideIn .3s ease",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, background: "#EBF2FF", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              📁
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1D2E", lineHeight: 1.2 }}>
                Importer un PDF
              </div>
              <div style={{ fontSize: 11.5, color: "#8892B0", marginTop: 1 }}>
                Fichier PDF — max 50 MB
              </div>
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleFileChange}
          aria-label="Sélection de fichier PDF"
        />
        <div
          className="uploader-zone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          style={{
            border: `2px dashed ${isDragging ? "#4F7EF7" : "#C8CDE0"}`,
            borderRadius: 12,
            background: isDragging ? "#EBF2FF" : "#F4F6FF",
            padding: "28px 20px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all .18s",
            marginBottom: 16, userSelect: "none",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8, lineHeight: 1 }}>
            {isDragging ? "📂" : "☁️"}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1D2E", marginBottom: 4 }}>
            {isDragging ? "Relâchez pour ajouter" : "Glissez-déposez votre PDF ici"}
          </div>
          <div style={{ fontSize: 12, color: "#8892B0" }}>
            ou{" "}
            <span style={{ color: "#4F7EF7", fontWeight: 700, textDecoration: "underline" }}>
              parcourez
            </span>{" "}
            vos dossiers
          </div>
        </div>

        {/* File list */}
        {hasFiles && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 10,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "3px 10px",
                borderRadius: 20, background: "#EBF2FF", color: "#185FA5",
              }}>
                {selectedFiles.length} fichier{selectedFiles.length > 1 ? "s" : ""} sélectionné{selectedFiles.length > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 11, color: "#8892B0", fontWeight: 600 }}>
                Total : {formatSize(totalSize)}
              </span>
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {selectedFiles.map((file, idx) => (
                <FilePreview
                  key={file.name + file.size}
                  file={file}
                  onRemove={() => handleRemoveFile(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div style={{
            height: 6, background: "#E4E9F7", borderRadius: 99,
            overflow: "hidden", marginBottom: 14,
          }}>
            <div style={{
              height: "100%", width: `${progress}%`,
              background: "#4F7EF7", borderRadius: 99, transition: "width .3s ease",
            }} />
          </div>
        )}

        {/* Upload button */}
        <button
          type="button"
          className="uploader-btn"
          disabled={!hasFiles || uploading}
          onClick={handleUpload}
          style={{
            width: "100%", height: 42,
            background: hasFiles && !uploading ? "#4F7EF7" : "#E4E9F7",
            border: "none", borderRadius: 10,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14, fontWeight: 700,
            color: hasFiles && !uploading ? "#fff" : "#B0B8D0",
            cursor: hasFiles && !uploading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, transition: "background .15s",
          }}
        >
          {uploading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Analyse en cours…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 4v12M8 8l4-4 4 4" />
              </svg>
              Lancer l'analyse {hasFiles ? `(${selectedFiles.length})` : ""}
            </>
          )}
        </button>

        {/* Format footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginTop: 14, flexWrap: "wrap",
        }}>
          {["PDF"].map((fmt) => (
            <span key={fmt} style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px",
              borderRadius: 20, background: "#F4F6FF",
              color: "#8892B0", border: "1px solid #E4E9F7",
            }}>
              {fmt}
            </span>
          ))}
        </div>
      </div>

      <Toast state={toast} onClose={() => setToast(null)} />
    </>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "ocr" | "pages"

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Métriques globales", icon: BarChart3 },
  { id: "ocr",      label: "Analyse OCR",        icon: ScanText  },
  { id: "pages",    label: "Détail pages",        icon: FileText  },
]

// ─── Spinner ──────────────────────────────────────────────────────────────────

const spinnerStyle = `
  @keyframes pdfSpin { to { transform: rotate(360deg); } }
  .spinner-ring   { animation: pdfSpin .9s linear infinite; }
  .spinner-ring-2 { animation: pdfSpin 1.4s linear infinite reverse; }
`

// ─── Main component ───────────────────────────────────────────────────────────

export default function PDFStats() {
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [elapsed, setElapsed]     = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      intervalRef.current = setInterval(
        () => setElapsed((p) => parseFloat((p + 0.1).toFixed(1))),
        100
      )
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [loading])

  const handleResult = useCallback((r: AnalysisResult) => {
    setResult(r)
    setActiveTab("overview")
  }, [])

  const reset = () => { setResult(null); setError(null); setElapsed(0) }

  return (
    <>
      <style>{spinnerStyle}</style>

      <div className="max-w-225 mx-auto px-6 pt-7 pb-12 flex flex-col gap-5 font-['Plus_Jakarta_Sans',sans-serif]">

        {/* En-tête */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-extrabold text-[#1A1D2E] leading-tight">Analyse PDF</h1>
            <p className="text-[13.5px] text-[#6B7290] mt-1">
              Inspectez la qualité visuelle et textuelle de vos documents.
            </p>
          </div>
          {result && (
            <button
              className="h-9.5 px-4 bg-white border border-[#E4E9F7] rounded-[10px] text-[13.5px] font-semibold text-[#6B7290] cursor-pointer inline-flex items-center gap-2 transition-all duration-150 hover:border-[#4F7EF7] hover:text-[#4F7EF7]"
              onClick={reset}
            >
              <RefreshCw size={15} /> Nouvelle analyse
            </button>
          )}
        </div>

        {/* ── Zone upload (masquée une fois un résultat reçu) ── */}
        {!result && (
          <FileUploader
            onResult={handleResult}
            onLoading={setLoading}
            onError={setError}
          />
        )}

        {/* ── Chargement ── */}
        {loading && (
          <div className="bg-white border border-[#E4E9F7] rounded-[14px] px-5.5 py-6 flex items-center gap-4.5">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <div className="spinner-ring absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-[#4F7EF7]" />
              <div className="spinner-ring-2 absolute inset-1.75 rounded-full border-[2.5px] border-transparent border-t-[#C8DCF7]" />
              <Timer size={20} style={{ color: "#4F7EF7", position: "relative", zIndex: 1 }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[#1A1D2E]">Analyse en cours…</p>
              <p className="text-xs text-[#8892B0] mt-0.5">Traitement OCR page par page</p>
            </div>
            <div className="ml-auto text-[22px] font-extrabold text-[#4F7EF7] tabular-nums">
              {formatTime(elapsed)}
            </div>
          </div>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div className="bg-[#FDECEA] border border-[#FCA5A5] rounded-xl px-4.5 py-3.5 flex items-center gap-2.5 text-[13.5px] text-[#A32D2D] font-semibold">
            <AlertCircle size={16} style={{ color: "#A32D2D" }} />
            <p>{error}</p>
          </div>
        )}

        {/* ── Résultats ── */}
        {result && !loading && (
          <>
            {/* Bandeau document */}
            <div className="bg-white border border-[#E4E9F7] rounded-xl px-4.5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 shrink-0 bg-[#EBF2FF] rounded-[10px] flex items-center justify-center">
                <FileText size={20} style={{ color: "#4F7EF7" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1D2E] whitespace-nowrap overflow-hidden text-ellipsis">
                  {result.file_name}
                </p>
                <p className="text-xs text-[#8892B0] mt-0.5">
                  {result.page_count} pages · {result.file_size_mb} MB · {result.type}
                  {result.categorie !== "Autres" && ` · ${result.categorie}`}
                  {" · analysé en "}{formatTime(result.total_time_s)}
                </p>
              </div>
              <Pill variant="blue">{result.page_count} p.</Pill>
              {result.categorie !== "Autres" && (
                <Pill variant="purple">{result.categorie}</Pill>
              )}
            </div>

            {/* Onglets */}
            <div className="flex gap-0.5 border-b border-[#E4E9F7]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={[
                    "inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold bg-transparent border-0 cursor-pointer border-b-2 -mb-[1.5px] transition-all duration-150",
                    activeTab === t.id
                      ? "text-[#4F7EF7] border-[#4F7EF7]"
                      : "text-[#6B7290] border-transparent hover:text-[#1A1D2E]",
                  ].join(" ")}
                  onClick={() => setActiveTab(t.id)}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Onglet Métriques globales ── */}
            {activeTab === "overview" && (
              <div className="flex flex-col gap-3.5">
                <p className="text-[11.5px] font-extrabold text-[#8892B0] uppercase tracking-[0.07em]">
                  Qualité visuelle
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-2">
                  <StatCard icon={Eye}      iconBg="#EBF2FF" iconColor="#4F7EF7"  label="Netteté moyenne"    value={result.avg_blur}       sub="Score de flou Laplacian" />
                  <StatCard icon={Sun}      iconBg="#FAEEDA" iconColor="#BA7517"  label="Luminosité moyenne" value={result.avg_brightness}  suffix="%" sub="Idéal : 40–70%" />
                  <StatCard icon={Contrast} iconBg="#E1F5EE" iconColor="#1D9E75"  label="Contraste moyen"    value={result.avg_contrast}    sub="Écart-type intensités" />
                  <StatCard icon={Activity} iconBg="#FBEAF0" iconColor="#D4547A"  label="Bruit moyen"        value={result.avg_noise}       sub="Idéal : < 3" />
                  <StatCard icon={RotateCw} iconBg="#F0EBFF" iconColor="#8B5CF6"  label="Inclinaison moy."   value={result.avg_skew}        suffix="°" sub="Idéal : < 2°" />
                  <StatCard icon={CheckCircle} iconBg="#EBF2FF" iconColor="#4F7EF7" label="Confiance OCR moy." value={result.avg_confidence} suffix="%" sub="Tesseract" />
                </div>

                <p className="text-[11.5px] font-extrabold text-[#8892B0] uppercase tracking-[0.07em] mt-5">
                  Performances
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <div className="flex items-center gap-2.5 bg-white border border-[#E4E9F7] rounded-xl px-4 py-3 flex-[1_1_160px]">
                    <Clock size={16} style={{ color: "#4F7EF7" }} />
                    <div>
                      <p className="text-[11px] text-[#8892B0] font-semibold">Durée totale</p>
                      <p className="text-base font-extrabold text-[#1A1D2E] mt-px">
                        {formatTime(result.total_time_s)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white border border-[#E4E9F7] rounded-xl px-4 py-3 flex-[1_1_160px]">
                    <Zap size={16} style={{ color: "#1D9E75" }} />
                    <div>
                      <p className="text-[11px] text-[#8892B0] font-semibold">Moy. par page</p>
                      <p className="text-base font-extrabold text-[#1A1D2E] mt-px">
                        {result.page_count > 0
                          ? `${((result.total_time_s / result.page_count) * 1000).toFixed(0)} ms`
                          : "–"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white border border-[#E4E9F7] rounded-xl px-4 py-3 flex-[1_1_160px]">
                    <Ruler size={16} style={{ color: "#8B5CF6" }} />
                    <div>
                      <p className="text-[11px] text-[#8892B0] font-semibold">Pages analysées</p>
                      <p className="text-base font-extrabold text-[#1A1D2E] mt-px">
                        {result.pages.length} / {result.page_count}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Onglet OCR ── */}
            {activeTab === "ocr" && (
              <div className="flex flex-col gap-3.5">
                <p className="text-[11.5px] font-extrabold text-[#8892B0] uppercase tracking-[0.07em]">
                  Résumé OCR
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-2">
                  <StatCard
                    icon={FileCheck} iconBg="#EBF2FF" iconColor="#4F7EF7"
                    label="Pages analysées"
                    value={`${result.pages.length}/${result.page_count}`}
                    sub="Couverture complète"
                  />
                  <StatCard
                    icon={CheckCircle} iconBg="#E1F5EE" iconColor="#1D9E75"
                    label="Confiance OCR moy."
                    value={result.avg_confidence} suffix="%"
                    sub="Précision Tesseract"
                  />
                  <StatCard
                    icon={BookOpen} iconBg="#F0EBFF" iconColor="#8B5CF6"
                    label="OOV moyen"
                    value={`${(result.pages.reduce((s, p) => s + p.oov_rate, 0) / (result.pages.length || 1) * 100).toFixed(1)}%`}
                    sub="Taux mots hors vocab."
                  />
                  <StatCard
                    icon={Timer} iconBg="#FAEEDA" iconColor="#BA7517"
                    label="Temps total OCR"
                    value={formatTime(result.total_time_s)}
                    sub="Toutes pages"
                  />
                </div>

                <p className="text-[11.5px] font-extrabold text-[#8892B0] uppercase tracking-[0.07em] mt-5">
                  Détail par page
                </p>
                <div className="flex flex-col gap-2.5">
                  {result.pages.map((page, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#E4E9F7] rounded-[14px] px-4.5 py-4 transition-colors duration-150 hover:border-[#C8D9FA]"
                    >
                      <div className="flex items-center justify-between gap-2.5 flex-wrap mb-3">
                        <span className="text-sm font-extrabold text-[#1A1D2E]">Page {page.page_num}</span>
                        <div className="flex gap-1.5 flex-wrap">
                          <Pill variant="blue">
                            <Languages size={10} /> {page.langue || "–"}
                          </Pill>
                          <Pill
                            variant={
                              page.ocr_confidence >= 80 ? "teal"
                              : page.ocr_confidence >= 50 ? "amber"
                              : "red"
                            }
                          >
                            <CheckCircle size={10} />
                            {page.ocr_confidence}% confiance
                          </Pill>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3 max-[600px]:grid-cols-2">
                        <div>
                          <p className="text-[11px] text-[#8892B0] font-semibold">OOV rate</p>
                          <p className="text-[13px] font-bold text-[#1A1D2E] mt-px">
                            {(page.oov_rate * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#8892B0] font-semibold">WER</p>
                          <p className="text-[13px] font-bold text-[#1A1D2E] mt-px">
                            {page.WER !== null ? `${page.WER}` : "–"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[#8892B0] font-semibold">CER</p>
                          <p className="text-[13px] font-bold text-[#1A1D2E] mt-px">
                            {page.CER !== null ? `${page.CER}` : "–"}
                          </p>
                        </div>
                      </div>

                      {page.texte_preview && (
                        <div className="bg-[#F7F9FF] border border-[#E4E9F7] rounded-lg px-3 py-2.5">
                          <p className="text-[10.5px] text-[#8892B0] font-bold mb-1">Aperçu texte OCR :</p>
                          <p className="text-xs text-[#6B7290] leading-relaxed italic">
                            "{page.texte_preview}{page.texte_preview.length >= 200 ? "…" : ""}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Onglet Détail pages ── */}
            {activeTab === "pages" && (
              <div className="flex flex-col gap-3.5">
                <p className="text-[11.5px] font-extrabold text-[#8892B0] uppercase tracking-[0.07em]">
                  Analyse page par page
                </p>
                <div className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1">
                  {result.pages.map((page, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#E4E9F7] rounded-[14px] px-4.5 py-4 transition-all duration-180 hover:border-[#C8D9FA] hover:shadow-[0_4px_16px_-4px_rgba(79,126,247,0.10)]"
                    >
                      {/* En-tête */}
                      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F0F4FF]">
                        <span className="text-sm font-extrabold text-[#1A1D2E]">Page {page.page_num}</span>
                        <span className="text-[11px] text-[#C0C8DC] font-semibold font-mono">
                          {page.dimensions}
                        </span>
                      </div>

                      {/* Métriques visuelles */}
                      <div className="flex flex-col">
                        <MetricRow
                          label="Netteté (blur)"
                          value={page.blur_score}
                          badge={page.blur_label}
                          badgeVariant={pillVariant(qualityLevel(page.blur_label))}
                        />
                        <MetricRow label="Luminosité"        value={`${page.brightness}%`} />
                        <MetricRow label="Contraste"         value={page.contrast.toFixed(1)} />
                        <MetricRow label="Inclinaison"       value={`${page.skew_angle}°`} />
                        <MetricRow label="Bruit"             value={page.noise_score} />
                        <MetricRow label="Ratio pixels noirs" value={`${(page.black_pixel_ratio * 100).toFixed(1)}%`} />
                        <MetricRow label="Entropie"          value={page.entropy} />
                        <MetricRow label="Uniformité lumière" value={`${(page.lighting_uniformity * 100).toFixed(1)}%`} />
                        <MetricRow label="Temps analyse"     value={`${page.analysis_time_s.toFixed(3)} s`} />
                      </div>

                      {/* Section OCR */}
                      <div className="mt-3 pt-3 border-t border-[#F0F4FF] flex flex-col">
                        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4F7EF7] uppercase tracking-[0.06em] mb-1.5">
                          <Languages size={12} /> OCR
                        </p>
                        <MetricRow
                          label="Confiance"
                          value={`${page.ocr_confidence}%`}
                          badge={
                            page.ocr_confidence >= 80 ? "Élevée"
                            : page.ocr_confidence >= 50 ? "Moyenne"
                            : "Faible"
                          }
                          badgeVariant={
                            page.ocr_confidence >= 80 ? "teal"
                            : page.ocr_confidence >= 50 ? "amber"
                            : "red"
                          }
                        />
                        <MetricRow label="OOV rate" value={`${(page.oov_rate * 100).toFixed(1)}%`} />
                        <MetricRow label="Langue"   value={page.langue || "–"} />
                        {page.WER !== null && (
                          <MetricRow label="WER" value={page.WER} />
                        )}
                        {page.CER !== null && (
                          <MetricRow label="CER" value={page.CER} />
                        )}
                        {page.texte_preview && (
                          <div className="mt-2 bg-[#F7F9FF] border border-[#E4E9F7] rounded-lg px-2.5 py-2 text-[11px] text-[#6B7290] italic leading-normal">
                            "{page.texte_preview.substring(0, 160)}{page.texte_preview.length > 160 ? "…" : ""}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}