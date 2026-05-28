import { useLocation } from "react-router-dom"
import { ArrowRight, LoaderCircle, FileText, Hash } from "lucide-react"
import { Filtre } from "./filtre"
import { useEffect, useState } from "react"
import { fetchTextes, fetchCategories, fetchStatuts, fetchThemes } from "@/api/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { TexteType, CategorieType, StatutType, ThemeType } from "@/types"
import { Link } from "react-router-dom"
import { useFilteredTextes } from "@/hooks/useFiltre"
import { useFiltre } from "@/store/useFiltre"

// ── Statut styles aligned with proposal palette ──
const statusStyles: Record<number, { pill: string; dot: string }> = {
  1: { pill: "bg-[#FAEEDA] text-[#854F0B]", dot: "#BA7517" },   // En projet / amber
  2: { pill: "bg-[#E6F9F1] text-[#0F6E56]", dot: "#1D9E75" },  // En vigueur / teal
  3: { pill: "bg-[#FDECEA] text-[#A32D2D]", dot: "#E24B4A" },  // Abrogé / red
}

// Category color pills cycling through proposal palette
const catPillColors = [
  "bg-[#EBF2FF] text-[#185FA5]",
  "bg-[#E1F5EE] text-[#0F6E56]",
  "bg-[#FAEEDA] text-[#854F0B]",
  "bg-[#FBEAF0] text-[#993556]",
]

const TexteItem = ({
  id,
  titre,
  resume,
  numero,
  statut_id,
  categorie_id,
  index = 0,
}: TexteType & { index?: number }) => {
  const queryClient = useQueryClient()

  const { data: dataCategories } = useQuery<CategorieType[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    initialData: () => queryClient.getQueryData<CategorieType[]>(["categories"]),
  })

  const { data: dataStatuts } = useQuery<StatutType[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
    initialData: () => queryClient.getQueryData<StatutType[]>(["statuts"]),
  })

  const categorie = dataCategories?.find((c) => c.id === categorie_id)?.nom
  const statut = dataStatuts?.find((s) => s.id === statut_id)?.nom
  const statusStyle = statusStyles[statut_id ?? 0] ?? {
    pill: "bg-stone-100 text-stone-500",
    dot: "#aaa",
  }
  const catColor = catPillColors[index % catPillColors.length]

  return (
    <Link
      to={`/documents/${id}`}
      className="group flex flex-col gap-3 rounded-[14px] border bg-white p-5 no-underline transition-all duration-200"
      style={{
        borderColor: "#E4E9F7",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        minHeight: 220,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = "#4F7EF7"
        el.style.boxShadow = "0 0 0 3px #EBF2FF"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = "#E4E9F7"
        el.style.boxShadow = "none"
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        {categorie && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${catColor}`}>
            <FileText className="size-3 shrink-0" />
            {categorie}
          </span>
        )}
        {numero && (
          <span className="font-mono text-[11px] font-semibold" style={{ color: "#C0C8DC" }}>
            #{numero}
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        className="line-clamp-3 text-sm font-bold leading-snug"
        style={{ color: "#1A1D2E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {titre}
      </h2>

      {/* Resume */}
      <p className="line-clamp-3 flex-1 text-xs leading-relaxed" style={{ color: "#6B7290" }}>
        {resume?.trim()
          ? resume.slice(0, 200) + "…"
          : "Aucun résumé disponible pour ce document."}
      </p>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t pt-3"
        style={{ borderColor: "#F0F4FF" }}
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle.pill}`}
        >
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: statusStyle.dot }}
          />
          {statut ?? "—"}
        </span>
        <span
          className="flex items-center gap-1 text-xs font-bold transition-colors"
          style={{ color: "#4F7EF7" }}
        >
          Lire
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export const DocumentList = () => {
  const location = useLocation()
  const { updateCategorie, updateMotsCles, updateStatut } = useFiltre()
  const [currentPage, setCurrentPage] = useState<number>(0)

  const { data: dataCategories, isLoading: isLoadingCategories, error: errorFetchCategories } =
    useQuery<CategorieType[]>({ queryKey: ["categories"], queryFn: fetchCategories })
  const { data: dataThemes, isLoading: isLoadingThemes, error: errorFetchThemes } =
    useQuery<ThemeType[]>({ queryKey: ["themes"], queryFn: fetchThemes })
  const { data: dataStatuts, isLoading: isLoadingStatuts, error: errorFetchStatuts } =
    useQuery<StatutType[]>({ queryKey: ["statuts"], queryFn: fetchStatuts })
  const { data: dataTextes, isLoading: isLoadingTextes, error: errorFetchTextes } =
    useQuery<TexteType[]>({ queryKey: ["textes"], queryFn: fetchTextes })

  const nbDocInPage = 6
  const dataTextesFiltered = useFilteredTextes(dataTextes || [])
  const nbPage = Math.ceil(dataTextesFiltered.length / nbDocInPage)

  useEffect(() => {
    if (currentPage >= nbPage) setCurrentPage(0)
  }, [nbPage, currentPage])

  useEffect(() => {
    updateCategorie(undefined)
    updateStatut(undefined)
    updateMotsCles(undefined)
  }, [location])

  if (isLoadingTextes || isLoadingCategories || isLoadingStatuts || isLoadingThemes)
    return (
      <div
        className="flex h-[90vh] w-full flex-col items-center justify-center gap-3"
        style={{ background: "#F0F4FF" }}
      >
        <LoaderCircle className="animate-spin" style={{ color: "#4F7EF7" }} />
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8892B0" }}>
          Chargement
        </p>
      </div>
    )

  if (errorFetchTextes || errorFetchCategories || errorFetchStatuts || errorFetchThemes)
    return (
      <div
        className="flex h-[90vh] items-center justify-center text-sm font-semibold"
        style={{ color: "#6B7290", background: "#F0F4FF" }}
      >
        Une erreur est survenue.
      </div>
    )

  if (!dataTextes || !dataCategories || !dataStatuts || !dataThemes) return null

  const paginated = dataTextesFiltered.slice(
    currentPage * nbDocInPage,
    currentPage * nbDocInPage + nbDocInPage
  )

  return (
    <div
      className="min-h-screen px-4 py-8 md:px-8 lg:px-12"
      style={{ background: "#F0F4FF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#8892B0" }}>
              Bibliothèque
            </p>
            <h1
              className="text-2xl font-extrabold sm:text-3xl"
              style={{ color: "#1A1D2E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Documents officiels
            </h1>
          </div>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold"
            style={{ background: "#EBF2FF", color: "#4F7EF7" }}
          >
            <FileText className="size-4" />
            {dataTextesFiltered.length} document{dataTextesFiltered.length !== 1 ? "s" : ""}
          </span>
        </header>

        {/* Filter */}
        <div className="mb-6">
          <Filtre
            dataCategories={dataCategories}
            dataStatuts={dataStatuts}
            dataThemes={dataThemes}
          />
        </div>

        {/* Section title */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-extrabold" style={{ color: "#1A1D2E" }}>
            Derniers documents
          </p>
          {nbPage > 1 && (
            <p className="text-xs font-semibold" style={{ color: "#8892B0" }}>
              Page {currentPage + 1} / {nbPage}
            </p>
          )}
        </div>

        {/* Grid */}
        {nbPage > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((texte, i) => (
              <TexteItem
                key={texte.id ?? i}
                id={texte.id}
                index={i}
                titre={texte.titre}
                categorie_id={texte.categorie_id}
                numero={texte.numero}
                resume={texte.resume}
                statut_id={texte.statut_id}
              />
            ))}
          </div>
        ) : (
          <NoDocumentFound />
        )}

        {/* Pagination */}
        {nbPage > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1.5">
            {Array.from({ length: nbPage }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-bold transition-all"
                style={
                  currentPage === i
                    ? { background: "#4F7EF7", color: "#fff" }
                    : { background: "#fff", color: "#6B7290", border: "1.5px solid #E4E9F7" }
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const NoDocumentFound = () => (
  <div
    className="flex h-72 flex-col items-center justify-center gap-3 rounded-[14px] border bg-white"
    style={{ borderColor: "#E4E9F7" }}
  >
    <div
      className="flex items-center justify-center rounded-[12px]"
      style={{ width: 48, height: 48, background: "#EBF2FF" }}
    >
      <FileText className="size-6" style={{ color: "#4F7EF7" }} />
    </div>
    <p className="text-sm font-semibold" style={{ color: "#8892B0" }}>
      Aucun document trouvé
    </p>
  </div>
)