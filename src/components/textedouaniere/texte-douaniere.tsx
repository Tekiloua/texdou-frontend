import { useLocation, Link } from "react-router"
import { ArrowRight, LoaderCircle, FileText, Calendar } from "lucide-react"
import { Filtre } from "../Filter/filtre"
import { useEffect, useState } from "react"
import {
  fetchTextesPublics,
  fetchCategories,
  fetchStatuts,
  fetchThemes,
  fetchTextes,
} from "@/api/api"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { TexteType, CategorieType, StatutType, ThemeType } from "@/types"
import { useFilteredTextes } from "@/hooks/useFiltre"
import { useFiltre } from "@/store/useFiltre"
import { decodeTitle } from "@/hooks/decode-html"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuthStore } from "@/store/useAuthStore"

// Category header accent colours (matching the teal/green from reference image)
const catAccents = [
  "#0E7490",
  // , "#0F6E56", "#854F0B", "#7C3AED"
]
const catHeaderBg = [
  "bg-[#0E7490]",
  // "bg-[#0F6E56]",
  // "bg-[#854F0B]",
  // "bg-[#7C3AED]",
]

const statusStyles: Record<
  number,
  { label: string; bg: string; text: string; dot: string }
> = {
  1: { label: "En projet", bg: "#FAEEDA", text: "#854F0B", dot: "#BA7517" },
  2: { label: "En vigueur", bg: "#DCFCE7", text: "#166534", dot: "#16A34A" },
  3: { label: "Abrogé", bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
}

// ── Texte ──────────────────────────────────────────────────────────────
const Texte = ({
  id,
  titre,
  resume,
  date_mise_en_vigueur,
  statut_id,
  categorie_id,
  index = 0,
}: TexteType & { index?: number }) => {
  const queryClient = useQueryClient()

  const { data: dataCategories } = useQuery<CategorieType[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    initialData: () =>
      queryClient.getQueryData<CategorieType[]>(["categories"]),
  })
  const { data: dataStatuts } = useQuery<StatutType[]>({
    queryKey: ["statuts"],
    queryFn: fetchStatuts,
    initialData: () => queryClient.getQueryData<StatutType[]>(["statuts"]),
  })

  const categorie = dataCategories?.find((c) => c.id === categorie_id)?.nom
  const statut = dataStatuts?.find((s) => s.id === statut_id)
  const statusStyle = statusStyles[statut_id ?? 0] ?? {
    label: "—",
    bg: "#F1F5F9",
    text: "#64748B",
    dot: "#94A3B8",
  }

  const headerBg = catHeaderBg[index % catHeaderBg.length]
  const accent = catAccents[index % catAccents.length]

  return (
    <Link
      to={`/douane/texdou/${id}`}
      className="group flex flex-col overflow-hidden rounded-[5px] border border-slate-400 bg-white no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ minHeight: 200 }}
    >
      {/* ── Card header band (like the teal band in the reference) ── */}
      <div
        className={`${headerBg} flex items-center justify-between px-4 py-3`}
      >
        <div className="flex items-center gap-2">
          {categorie && (
            <span className="text-[13px] font-bold tracking-widest text-white/90 uppercase">
              {categorie}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-white/70">
          {date_mise_en_vigueur && (
            <span className="flex items-center gap-1 text-[13px] font-semibold">
              <Calendar className="size-3" />
              {format(date_mise_en_vigueur, "dd / MM / yyyy", { locale: fr })}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 text-center text-[14px] leading-snug font-bold text-slate-800">
          {decodeTitle(titre)}
        </h2>
        <p className="line-clamp-3 flex-1 text-[14px] leading-relaxed text-slate-500">
          {resume?.trim()
            ? decodeTitle(resume.slice(0, 200)) + "…"
            : "Aucun résumé disponible pour ce document."}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-row-reverse items-center justify-between border-t border-slate-100 px-4 py-2.5">
        {/* Status badge */}
        <span
          className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-bold"
          style={{ background: statusStyle.bg, color: statusStyle.text }}
        >
          <span
            className="inline-block size-1.5 rounded-full"
            style={{ background: statusStyle.dot }}
          />
          {statut?.nom ?? "—"}
        </span>

        {/* Read link */}
        <span
          className="flex items-center gap-1 text-[12px] font-bold transition-colors group-hover:underline"
          style={{ color: accent }}
        >
          En savoir plus
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

// ── DocumentList ───────────────────────────────────────────────────────────
const PAGES_PER_WINDOW = 10

export const TexteDouaniere = () => {
  const location = useLocation()
  const { updateCategorie, updateMotsCles, updateStatut } = useFiltre()
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [pageWindow, setPageWindow] = useState<number>(0) // which group of 10 page buttons is visible
  const { user } = useAuthStore()
  
  const {
    data: dataCategories,
    isLoading: isLoadingCategories,
    error: errorFetchCategories,
  } = useQuery<CategorieType[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })
  
  const {
    data: dataThemes,
    isLoading: isLoadingThemes,
    error: errorFetchThemes,
  } = useQuery<ThemeType[]>({ queryKey: ["themes"], queryFn: fetchThemes })
  
  const {
    data: dataStatuts,
    isLoading: isLoadingStatuts,
    error: errorFetchStatuts,
  } = useQuery<StatutType[]>({ queryKey: ["statuts"], queryFn: fetchStatuts })
  
  const {
    data: dataTextes,
    isLoading: isLoadingTextes,
    error: errorFetchTextes,
  } = useQuery<TexteType[]>({
    queryKey: user?.role != "normal" ? ["textes"] : ["textes-publics"],
    queryFn: user?.role != "normal" ? fetchTextes : fetchTextesPublics,
  })

  const nbDocInPage = 6
  const dataTextesFiltered = useFilteredTextes(dataTextes || [])
  const nbPage = Math.ceil(dataTextesFiltered.length / nbDocInPage)

  useEffect(() => {
    if (currentPage >= nbPage) {
      setCurrentPage(0)
      setPageWindow(0)
    }
  }, [nbPage, currentPage])

  useEffect(() => {
    updateCategorie(undefined)
    updateStatut(undefined)
    updateMotsCles(undefined)
  }, [location])

  if (
    isLoadingTextes ||
    isLoadingCategories ||
    isLoadingStatuts ||
    isLoadingThemes
  )
    return (
      <div className="flex h-[90vh] w-full flex-col items-center justify-center gap-3 bg-slate-50">
        <LoaderCircle className="size-6 animate-spin text-cyan-600" />
        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
          Chargement
        </p>
      </div>
    )

  if (
    errorFetchTextes ||
    errorFetchCategories ||
    errorFetchStatuts ||
    errorFetchThemes
  )
    return (
      <div className="flex h-[90vh] items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Une erreur est survenue.
      </div>
    )

  if (!dataTextes || !dataCategories || !dataStatuts || !dataThemes) return null

  const paginated = dataTextesFiltered.slice(
    currentPage * nbDocInPage,
    currentPage * nbDocInPage + nbDocInPage
  )

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* ── Page header ── */}
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
              Textes Douanières
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-cyan-50 px-3.5 py-1.5 text-[12px] font-bold text-cyan-700 ring-1 ring-cyan-200 sm:self-auto">
            <FileText className="size-3.5" />
            {dataTextesFiltered.length} texte
            {dataTextesFiltered.length > 1 ? "s" : ""}
          </span>
        </header>

        {/* ── Filter panel ── */}
        <div className="mb-7 overflow-hidden rounded-[5px] shadow-sm">
          <Filtre
            dataCategories={dataCategories}
            dataStatuts={dataStatuts}
            dataThemes={dataThemes}
            docTrouver={dataTextesFiltered.length}
          />
        </div>

        {/* ── Section header ── */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-slate-700">
            Derniers documents
          </p>
          {nbPage > 1 && (
            <p className="text-[11px] font-semibold text-slate-400">
              Page {currentPage + 1} / {nbPage}
            </p>
          )}
        </div>

        {/* ── Grid ── */}
        {nbPage > 0 ? (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {paginated.map((texte, i) => (
              <Texte
                key={texte.id ?? i}
                id={texte.id}
                index={i}
                titre={texte.titre}
                categorie_id={texte.categorie_id}
                date_mise_en_vigueur={texte.date_mise_en_vigueur}
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
        {nbPage > 1 &&
          (() => {
            const windowStart = pageWindow * PAGES_PER_WINDOW
            const windowEnd = Math.min(windowStart + PAGES_PER_WINDOW, nbPage)
            const hasPrevWindow = pageWindow > 0
            const hasNextWindow = windowEnd < nbPage

            const goToPage = (p: number) => {
              setCurrentPage(p)
              // keep the window in sync if needed (shouldn't happen normally but safety)
              const targetWindow = Math.floor(p / PAGES_PER_WINDOW)
              if (targetWindow !== pageWindow) setPageWindow(targetWindow)
            }

            return (
              <div className="mt-10 flex flex-col items-center gap-3">
                {/* Page buttons row */}
                <div className="flex items-center gap-1.5">
                  {/* ← previous window */}
                  <button
                    onClick={() => {
                      const newWindow = pageWindow - 1
                      setPageWindow(newWindow)
                      // jump to last page of the previous window
                      const lastPageOfWindow =
                        newWindow * PAGES_PER_WINDOW + PAGES_PER_WINDOW - 1
                      setCurrentPage(Math.min(lastPageOfWindow, nbPage - 1))
                    }}
                    disabled={!hasPrevWindow}
                    title="10 pages précédentes"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-500 shadow-sm transition-all hover:border-cyan-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-25"
                  >
                    «
                  </button>

                  {/* ← previous page */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    title="Page précédente"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-500 shadow-sm transition-all hover:border-cyan-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-25"
                  >
                    ‹
                  </button>

                  {/* numbered page buttons (current window of 10) */}
                  {Array.from({ length: windowEnd - windowStart }, (_, i) => {
                    const pageIndex = windowStart + i
                    const isActive = currentPage === pageIndex
                    return (
                      <button
                        key={pageIndex}
                        onClick={() => goToPage(pageIndex)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                          isActive
                            ? "bg-cyan-700 text-white shadow-md shadow-cyan-200"
                            : "border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                        }`}
                      >
                        {pageIndex + 1}
                      </button>
                    )
                  })}

                  {/* → next page */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === nbPage - 1}
                    title="Page suivante"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-500 shadow-sm transition-all hover:border-cyan-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-25"
                  >
                    ›
                  </button>

                  {/* → next window */}
                  <button
                    onClick={() => {
                      const newWindow = pageWindow + 1
                      setPageWindow(newWindow)
                      // jump to first page of the next window
                      setCurrentPage(newWindow * PAGES_PER_WINDOW)
                    }}
                    disabled={!hasNextWindow}
                    title="10 pages suivantes"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-bold text-slate-500 shadow-sm transition-all hover:border-cyan-400 hover:text-cyan-600 disabled:pointer-events-none disabled:opacity-25"
                  >
                    »
                  </button>
                </div>

                {/* Info line */}
                {/* <p className="text-[11px] font-semibold text-slate-400">
                Page{" "}
                <span className="font-extrabold text-slate-600">{currentPage + 1}</span>
                {" "}sur{" "}
                <span className="font-extrabold text-slate-600">{nbPage}</span>
                {nbPage > PAGES_PER_WINDOW && (
                  <span className="ml-2 text-slate-300">
                    — groupe {pageWindow + 1} / {Math.ceil(nbPage / PAGES_PER_WINDOW)}
                  </span>
                )}
              </p> */}
              </div>
            )
          })()}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
const NoDocumentFound = () => (
  <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex size-12 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-200">
      <FileText className="size-5 text-cyan-600" />
    </div>
    <p className="text-[16px] font-semibold text-slate-400">
      Aucun texte trouvé
    </p>
  </div>
)
