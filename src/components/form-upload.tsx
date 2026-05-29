import { Component } from "./file-uploader"

const FormUpload = () => {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#F0F4FF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Page header */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#1A1D2E",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Importer des documents
            </h1>
            <p style={{ fontSize: 13.5, color: "#6B7290", marginTop: 4, margin: "4px 0 0" }}>
              Ajoutez vos fichiers pour les intégrer à votre espace.
            </p>
          </div>

          {/* Status pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              padding: "4px 11px",
              borderRadius: 20,
              background: "#E6F9F1",
              color: "#0F6E56",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#1D9E75",
                display: "inline-block",
              }}
            />
            Actif
          </span>
        </div>
      </div>

      {/* Uploader card */}
      <Component />

      {/* Info footer */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          marginTop: 16,
          background: "#fff",
          border: "1.5px solid #E4E9F7",
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            background: "#EBF2FF",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ℹ️
        </div>
        <div>
          <div
            style={{ fontSize: 12.5, fontWeight: 700, color: "#1A1D2E", marginBottom: 2 }}
          >
            À propos de l'import
          </div>
          <div style={{ fontSize: 12, color: "#6B7290", lineHeight: 1.6 }}>
            Les fichiers sont analysés et indexés automatiquement après l'envoi.
            Taille maximale : <strong style={{ color: "#1A1D2E" }}>5 MB</strong> par fichier.
            Formats acceptés : PNG, JPG, PDF, DOCX, XLSX.
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormUpload