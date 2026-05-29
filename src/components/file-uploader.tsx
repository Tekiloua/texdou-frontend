import React, { useRef, useState } from "react"
import axios from "axios"

// ── Types ──────────────────────────────────────────────────────────────────
type ToastState = { message: string; type: "success" | "error" } | null

// ── Helpers ────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file: File): string {
  if (file.type.startsWith("image/")) return "🖼️"
  if (file.type === "application/pdf") return "📑"
  if (file.type.includes("word")) return "📝"
  if (file.type.includes("sheet") || file.type.includes("excel")) return "📊"
  if (file.type.includes("zip") || file.type.includes("rar")) return "🗜️"
  return "📄"
}

// ── FilePreview ────────────────────────────────────────────────────────────
interface FilePreviewProps {
  file: File
  onRemove: () => void
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove }) => {
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
      {/* Thumbnail or icon */}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          style={{
            width: 44,
            height: 44,
            objectFit: "cover",
            borderRadius: 8,
            border: "1.5px solid #E4E9F7",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 44,
            height: 44,
            background: "#EBF2FF",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {getFileIcon(file)}
        </div>
      )}

      {/* Meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: "#1A1D2E",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {file.name}
        </div>
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11,
            color: "#8892B0",
            marginTop: 2,
          }}
        >
          {formatSize(file.size)}
        </div>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "1.5px solid #E4E9F7",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#8892B0",
          flexShrink: 0,
          transition: "all .15s",
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

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast: React.FC<{ state: ToastState; onClose: () => void }> = ({ state, onClose }) => {
  if (!state) return null
  const isSuccess = state.type === "success"
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        background: isSuccess ? "#E6F9F1" : "#FDECEA",
        border: `1.5px solid ${isSuccess ? "#b3e9d5" : "#f5c6c6"}`,
        borderRadius: 12,
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 24px rgba(79,126,247,.10)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        animation: "fadeSlideIn .2s ease",
        minWidth: 260,
      }}
      role="alert"
    >
      <span style={{ fontSize: 18 }}>{isSuccess ? "✅" : "❌"}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: isSuccess ? "#0F6E56" : "#A32D2D", flex: 1 }}>
        {state.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#8892B0",
          fontSize: 18,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export const Component = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setUploading(true)
    setProgress(0)

    // Fake progress animation
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90 }
        return p + 10
      })
    }, 120)

    try {
      await Promise.all(
        selectedFiles.map((file) => {
          const formData = new FormData()
          formData.append("file", file)
          return axios.post("http://localhost:8000/upload-file-analyse", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        })
      )
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => {
        setToast({ message: `${selectedFiles.length} fichier(s) envoyé(s) avec succès !`, type: "success" })
        setSelectedFiles([])
        setProgress(0)
        setUploading(false)
      }, 300)
    } catch {
      clearInterval(interval)
      setToast({ message: "Échec de l'envoi. Réessayez.", type: "error" })
      setProgress(0)
      setUploading(false)
    }
  }

  const hasFiles = selectedFiles.length > 0
  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .upload-zone-inner:hover { border-color: #4F7EF7 !important; background: #F7F9FF !important; }
        .upload-btn:not(:disabled):hover { background: #3D6EE5 !important; }
        .upload-btn:not(:disabled):active { transform: scale(.97); }
      `}</style>

      {/* Card */}
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: "#fff",
          border: "1.5px solid #E4E9F7",
          borderRadius: 14,
          padding: "28px 28px 24px",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 2px 16px rgba(79,126,247,.07)",
          animation: "fadeSlideIn .3s ease",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: "#EBF2FF",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              📁
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1A1D2E", lineHeight: 1.2 }}>
                Importer des fichiers
              </div>
              <div style={{ fontSize: 11.5, color: "#8892B0", marginTop: 1 }}>
                PNG, JPG, PDF, DOCX — max 5 MB / fichier
              </div>
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          style={{ display: "none" }}
          onChange={handleFileChange}
          multiple
          aria-label="Sélection de fichier"
        />
        <div
          className="upload-zone-inner"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          style={{
            border: `2px dashed ${isDragging ? "#4F7EF7" : "#C8CDE0"}`,
            borderRadius: 12,
            background: isDragging ? "#EBF2FF" : "#F4F6FF",
            padding: "28px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all .18s",
            marginBottom: 16,
            userSelect: "none",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8, lineHeight: 1 }}>
            {isDragging ? "📂" : "☁️"}
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1A1D2E", marginBottom: 4 }}>
            {isDragging ? "Relâchez pour ajouter" : "Glissez-déposez vos fichiers ici"}
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
            {/* Summary pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "#EBF2FF",
                  color: "#185FA5",
                }}
              >
                {selectedFiles.length} fichier{selectedFiles.length > 1 ? "s" : ""} sélectionné{selectedFiles.length > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 11, color: "#8892B0", fontWeight: 600 }}>
                Total : {formatSize(totalSize)}
              </span>
            </div>

            {/* Individual file rows */}
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {selectedFiles.map((file, idx) => (
                <FilePreview key={file.name + file.size} file={file} onRemove={() => handleRemoveFile(idx)} />
              ))}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div
            style={{
              height: 6,
              background: "#E4E9F7",
              borderRadius: 99,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#4F7EF7",
                borderRadius: 99,
                transition: "width .3s ease",
              }}
            />
          </div>
        )}

        {/* Upload button */}
        <button
          type="button"
          className="upload-btn"
          disabled={!hasFiles || uploading}
          onClick={handleUpload}
          style={{
            width: "100%",
            height: 42,
            background: hasFiles && !uploading ? "#4F7EF7" : "#E4E9F7",
            border: "none",
            borderRadius: 10,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: hasFiles && !uploading ? "#fff" : "#B0B8D0",
            cursor: hasFiles && !uploading ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background .15s",
          }}
        >
          {uploading ? (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Envoi en cours…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 4v12M8 8l4-4 4 4" />
              </svg>
              Envoyer {hasFiles ? `(${selectedFiles.length})` : ""}
            </>
          )}
        </button>

        {/* Accepted formats footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          {["PNG", "JPG", "PDF", "DOCX", "XLSX"].map((fmt) => (
            <span
              key={fmt}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 20,
                background: "#F4F6FF",
                color: "#8892B0",
                border: "1px solid #E4E9F7",
              }}
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      <Toast state={toast} onClose={() => setToast(null)} />
    </>
  )
}