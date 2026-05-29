import { useLocation } from "react-router-dom"
import { ArrowRight, LoaderCircle, FileText } from "lucide-react"
import { Filtre } from "./filtre"
import { useEffect, useState } from "react"
import { fetchTextes, fetchCategories, fetchStatuts, fetchThemes } from "@/api/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { TexteType, CategorieType, StatutType, ThemeType } from "@/types"
import { Link } from "react-router-dom"
import { useFilteredTextes } from "@/hooks/useFiltre"
import { useFiltre } from "@/store/useFiltre"

const statusStyles: Record<number, { pill: string; dot: string }> = {
  1: { pill: "bg-[#FAEEDA] text-[#854F0B]", dot: "#BA7517" },
  2: { pill: "bg-[#E6F9F1] text-[#0F6E56]", dot: "#1D9E75" },
  3: { pill: "bg-[#FDECEA] text-[#A32D2D]", dot: "#E24B4A" },
}

const catAccents = ["#4F7EF7", "#1D9E75", "#BA7517", "#993556"]
const catPills = [
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
  const statusStyle = statusStyles[statut_id ?? 0] ?? { pill: "bg-stone-100 text-stone-500", dot: "#aaa" }
  const accent = catAccents[index % catAccents.length]
  const catPill = catPills[index % catPills.length]

  return (
    <Link
      to={`/documents/${id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-5 no-underline transition-all duration-200"
      style={{ borderColor: "#E8EEF8", fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: 210 }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = accent
        el.style.boxShadow = `0 0 0 3px ${accent}22, 0 4px 20px ${accent}18`
        el.style.transform = "translateY(-1px)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = "#E8EEF8"
        el.style.boxShadow = "none"
        el.style.transform = "none"
      }}
    >
      {/* Accent top bar */}
      <span
        className="absolute inset-x-0 top-0 h-0.75 rounded-t-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: accent }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        {categorie && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${catPill}`}>
            <FileText className="size-3 shrink-0" />
            {categorie}
          </span>
        )}
        {numero && (
          <span className="font-mono text-[11px] font-semibold" style={{ color: "#C8D0E0" }}>
            #{numero}
          </span>
        )}
      </div>

      {/* Title */}
      <h2
        className="line-clamp-2 text-[13.5px] font-bold leading-snug"
        style={{ color: "#1A1D2E" }}
      >
        {titre}
      </h2>

      {/* Resume */}
      <p className="line-clamp-3 flex-1 text-[12px] leading-relaxed" style={{ color: "#7A82A0" }}>
        {resume?.trim()
          ? resume.slice(0, 180) + "…"
          : "Aucun résumé disponible pour ce document."}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "#F2F5FC" }}>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle.pill}`}>
          <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: statusStyle.dot }} />
          {statut ?? "—"}
        </span>
        <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color: accent }}>
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
      <div className="flex h-[90vh] w-full flex-col items-center justify-center gap-3" style={{ background: "#F2F5FC" }}>
        <LoaderCircle className="animate-spin" style={{ color: "#4F7EF7" }} />
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#A0ABBC" }}>
          Chargement
        </p>
      </div>
    )

  if (errorFetchTextes || errorFetchCategories || errorFetchStatuts || errorFetchThemes)
    return (
      <div className="flex h-[90vh] items-center justify-center text-sm font-semibold" style={{ color: "#7A82A0", background: "#F2F5FC" }}>
        Une erreur est survenue.
      </div>
    )

  if (!dataTextes || !dataCategories || !dataStatuts || !dataThemes) return null

  const paginated = dataTextesFiltered.slice(currentPage * nbDocInPage, currentPage * nbDocInPage + nbDocInPage)

  return (
    <div
      className="min-h-screen px-4 py-8 md:px-8 lg:px-12"
      style={{ background: "#F2F5FC", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="mx-auto max-w-7xl">

        {/* ── Header ── */}
        <header className="mb-7 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "#A0ABBC" }}>
              Bibliothèque
            </p>
            <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: "#1A1D2E" }}>
              Documents officiels
            </h1>
          </div>
          <span
            className="inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-[12px] font-bold sm:self-auto"
            style={{ background: "#EBF2FF", color: "#4F7EF7" }}
          >
            <FileText className="size-3.5" />
            {dataTextesFiltered.length} document{dataTextesFiltered.length !== 1 ? "s" : ""}
          </span>
        </header>

        {/* ── Filter bar ── */}
        <div
          className="mb-7 rounded-2xl border bg-white px-4 py-3.5"
          style={{ borderColor: "#E8EEF8", boxShadow: "0 2px 12px rgba(79,126,247,0.05)" }}
        >
          <Filtre
            dataCategories={dataCategories}
            dataStatuts={dataStatuts}
            dataThemes={dataThemes}
          />
        </div>

        {/* ── Section header ── */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[13px] font-extrabold" style={{ color: "#1A1D2E" }}>
            Derniers documents
          </p>
          {nbPage > 1 && (
            <p className="text-[11px] font-semibold" style={{ color: "#A0ABBC" }}>
              Page {currentPage + 1} / {nbPage}
            </p>
          )}
        </div>

        {/* ── Grid ── */}
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

        {/* ── Pagination ── */}
        {nbPage > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: "#fff", color: "#6B7290", border: "1.5px solid #E8EEF8" }}
            >
              ‹
            </button>
            {Array.from({ length: nbPage }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-bold transition-all"
                style={
                  currentPage === i
                    ? { background: "#4F7EF7", color: "#fff", boxShadow: "0 2px 8px rgba(79,126,247,0.3)" }
                    : { background: "#fff", color: "#7A82A0", border: "1.5px solid #E8EEF8" }
                }
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(nbPage - 1, p + 1))}
              disabled={currentPage === nbPage - 1}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: "#fff", color: "#6B7290", border: "1.5px solid #E8EEF8" }}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const NoDocumentFound = () => (
  <div
    className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border bg-white"
    style={{ borderColor: "#E8EEF8" }}
  >
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{ width: 52, height: 52, background: "#EBF2FF" }}
    >
      <FileText className="size-6" style={{ color: "#4F7EF7" }} />
    </div>
    <p className="text-[13px] font-semibold" style={{ color: "#A0ABBC" }}>
      Aucun document trouvé
    </p>
  </div>
)