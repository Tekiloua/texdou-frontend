import React, { useRef, useState } from "react"
import axios from "axios"

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  React.useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    }
    setPreviewUrl(null)
    return undefined
  }, [file])

  return (
    <div className="animate-fade-in mb-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 shadow-sm">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          className="h-16 w-16 rounded-md border border-gray-200 object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gray-200 text-xl text-gray-500">
          <span role="img" aria-label="file">
            📄
          </span>
        </div>
      )}
      <div className="flex-1 truncate">
        <div className="truncate font-medium text-gray-800">{file.name}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="ml-2 flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 shadow-sm transition hover:bg-red-100"
        aria-label="Remove file"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

interface ToastProps {
  message: string
  type: "success" | "error"
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => (
  <div
    className={`animate-fade-in fixed top-6 right-6 z-50 rounded px-4 py-3 text-white shadow-lg ${type === "success" ? "bg-green-600" : "bg-red-600"}`}
    role="alert"
  >
    <div className="flex items-center gap-2">
      {type === "success" ? "✅" : "❌"}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-3 text-lg text-white/80 hover:text-white"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  </div>
)

export const Component = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    const fileArr = Array.from(files)
    setSelectedFiles((prev) => [
      ...prev,
      ...fileArr.filter(
        (f) => !prev.some((p) => p.name === f.name && p.size === f.size)
      ),
    ])
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFiles(event.target.files)
    }
    // Reset input value so the same file can be selected again
    event.target.value = ""
  }

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    // Also reset the file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // const handleUpload = () => {
  //   if (selectedFiles.length === 0) return;
  //   setUploading(true);
  //   setProgress(0);
  //   const interval = setInterval(() => {
  //     setProgress((prev) => {
  //       if (prev >= 100) {
  //         clearInterval(interval);
  //         setUploading(false);
  //         setToast({ message: 'Files uploaded successfully!', type: 'success' });
  //         setSelectedFiles([]);
  //         return 100;
  //       }
  //       return prev + 10;
  //     });
  //   }, 120);
  // };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)

    try {
      await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData()
          formData.append("file", file)

          return axios.post("http://localhost:8000/upload-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        })
      )
      setToast({ message: "Upload success!", type: "success" })
      setSelectedFiles([])
    } catch (err) {
      setToast({ message: "Upload failed!", type: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-center justify-center px-4">
      <div className="animate-fade-in w-full max-w-md rounded-2xl border border-gray-100 bg-white p-10 shadow-xl">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-gray-900">
          Upload Files
        </h1>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          aria-label="File input"
          multiple
        />
        <div
          className={`mb-5 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-400"}`}
          style={{ minHeight: 120 }}
          onClick={handleButtonClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center py-6">
            <span className="mb-2 animate-bounce text-4xl">📁</span>
            <span className="font-medium text-gray-700">
              Drag & drop files here, or{" "}
              <span className="text-blue-600 underline">browse</span>
            </span>
            <span className="mt-1 text-xs text-gray-400">
              (PNG, JPG, PDF, etc. up to 5MB each)
            </span>
          </div>
        </div>
        {selectedFiles.length === 1 && (
          <div className="mb-4">
            <FilePreview
              file={selectedFiles[0]}
              onRemove={() => handleRemoveFile(0)}
            />
          </div>
        )}
        {selectedFiles.length > 1 && (
          <div className="mb-4" style={{ maxHeight: 180, overflowY: "auto" }}>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, idx) => (
                <span
                  key={file.name + file.size}
                  className="inline-flex max-w-xs items-center truncate rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 shadow-sm"
                  style={{ minWidth: 0 }}
                  title={file.name}
                >
                  <span className="max-w-[120px] truncate text-xs">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="ml-2 rounded-full border border-transparent p-0.5 text-red-600 transition hover:bg-red-100 focus:ring-2 focus:ring-red-200 focus:outline-none"
                    aria-label="Remove file"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        {uploading && (
          <div className="animate-fade-in mb-4 h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <button
          type="button"
          disabled={selectedFiles.length === 0 || uploading}
          onClick={handleUpload}
          className={`focus:ring-opacity-50 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-semibold shadow-lg transition focus:ring-2 focus:ring-gray-400 focus:outline-none ${
            selectedFiles.length > 0 && !uploading
              ? "bg-gray-700 text-white hover:bg-gray-800 active:scale-95"
              : "cursor-not-allowed bg-gray-300 text-gray-500"
          } `}
          style={{ minHeight: 40 }}
        >
          {uploading && (
            <svg
              className="h-6 w-6 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease;
        }
      `}</style> */}
    </div>
  )
}
