import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  chromaApi,
  type ChunkItem,
  type StatsResponse,
  type PaginatedChunks,
  type SourceItem,
} from "@/api/api"

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(text: string | null, max = 150): string {
  if (!text) return "—"
  const cleaned = text
    .replace(/<!--.*?-->/gs, "")
    .replace(/\*+/g, "")
    .trim()
  return cleaned.length > max ? cleaned.slice(0, max) + "…" : cleaned
}

function basename(path: string | null): string {
  if (!path) return "—"
  return path.split(/[\\/]/).pop() ?? path
}

function buildPageWindow(current: number, total: number): number[] {
  const delta = 3
  const start = Math.max(1, current - delta)
  const end = Math.min(total, start + delta * 2)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="flex min-w-[150px] flex-1 flex-col gap-1 rounded-lg border border-slate-700 bg-card px-5 py-4">
      <span className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
        {label}
      </span>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  )
}

// ── ChunkModal ────────────────────────────────────────────────────────────────

function ChunkModal({
  chunk,
  onClose,
}: {
  chunk: ChunkItem
  onClose: () => void
}) {
  const metaRows = [
    { label: "ID interne", value: String(chunk.id) },
    { label: "Embedding ID", value: chunk.embedding_id },
    { label: "Créé le", value: chunk.created_at },
    { label: "Source", value: chunk.source ?? "—" },
    { label: "Pages", value: chunk.pages ?? "—" },
    { label: "Batch", value: chunk.batch ?? "—" },
    { label: "Inclus RAG", value: chunk.inclus === 1 ? "Oui" : "Non" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-y-hidden rounded-xl border border-slate-700 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-700 bg-sidebar px-6 py-2">
          <div>
            <span className="mb-1.5 inline-block rounded bg-sidebar px-2 py-0.5 text-[11px] font-bold text-sidebar-foreground">
              Chunk #{chunk.chunk_index ?? "?"}
            </span>
            <h2 className="text-[15px] leading-snug font-semibold text-sidebar-foreground">
              {basename(chunk.source)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 ml-4 text-lg leading-none text-slate-400 transition-colors hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-2.5 border-b border-slate-700 px-6 py-4">
          {metaRows.map(({ label, value }) => (
            <div key={label} className="flex gap-4 text-[13px]">
              <span className="w-28 shrink-0 text-foreground">{label}</span>
              <span className="font-mono text-xs break-all text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <span className="mb-3 block text-[11px] font-bold tracking-wider text-foreground uppercase">
            Contenu du chunk
          </span>
          <pre className="max-h-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-slate-300">
            {chunk.document ?? "Aucun contenu"}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ── ChromaViewer ──────────────────────────────────────────────────────────────

export const BDDVectorielle = () => {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [sourceFilter, setSourceFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [selectedChunk, setSelectedChunk] = useState<ChunkItem | null>(null)

  const statsQuery = useQuery<StatsResponse>({
    queryKey: ["chroma-stats"],
    queryFn: chromaApi.getStats,
    staleTime: 60_000,
  })

  const sourcesQuery = useQuery<SourceItem[]>({
    queryKey: ["chroma-sources"],
    queryFn: chromaApi.getSources,
    staleTime: 60_000,
  })

  const chunksQuery = useQuery<PaginatedChunks>({
    queryKey: ["chroma-chunks", page, pageSize, sourceFilter, activeSearch],
    queryFn: () =>
      chromaApi.getChunks({
        page,
        pageSize,
        source: sourceFilter,
        search: activeSearch,
      }),
    placeholderData: (prev) => prev,
  })

  const handleSearch = useCallback(() => {
    setPage(1)
    setActiveSearch(searchInput)
  }, [searchInput])

  const handleSourceChange = useCallback((val: string) => {
    setSourceFilter(val)
    setPage(1)
  }, [])

  const handleReset = () => {
    setSourceFilter("")
    setSearchInput("")
    setActiveSearch("")
    setPage(1)
  }

  const stats = statsQuery.data
  const chunks = chunksQuery.data

  return (
    <div className="min-h-screen font-sans text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b text-foreground backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-6">
          <span className="text-xl text-indigo-400">⬡</span>
          <div>
            <p className="text-sm leading-none font-bold tracking-tight">
              ChromaDB Explorer
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Visualisation des chunks RAG
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* ── Stats ── */}
        <section className="flex flex-wrap gap-3">
          {statsQuery.isLoading && (
            <div className="h-20 w-full animate-pulse rounded-lg" />
          )}
          {statsQuery.isError && (
            <div className="w-full rounded-lg border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-400">
              Impossible de charger les statistiques — vérifiez que l'API est
              accessible.
            </div>
          )}
          {stats && (
            <>
              <StatCard
                label="Chunks indexés"
                value={stats.total_chunks.toLocaleString("fr")}
              />
              <StatCard
                label="Sources (PDFs)"
                value={stats.total_sources.toLocaleString("fr")}
              />
              {stats.collections.map((c) => (
                <StatCard
                  key={c.id}
                  label={`Collection · ${c.name}`}
                  value={c.total_embeddings.toLocaleString("fr")}
                />
              ))}
            </>
          )}
        </section>

        {/* ── Filters ── */}
        <section className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[240px] flex-1 gap-2">
            <input
              type="text"
              placeholder="Rechercher dans le contenu…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-foreground transition-colors outline-none placeholder:text-slate-500 focus:border-indigo-500"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-indigo-400"
            >
              Rechercher
            </button>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => handleSourceChange(e.target.value)}
            className="min-w-[200px] cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-sm text-foreground/90 transition-colors outline-none focus:border-indigo-400"
          >
            <option value="">Toutes les sources</option>
            {(sourcesQuery.data ?? []).map((s) => (
              <option key={s.source} value={s.source}>
                {basename(s.source)} ({s.chunk_count})
              </option>
            ))}
          </select>

          {(activeSearch || sourceFilter) && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-foreground transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              ✕ Réinitialiser
            </button>
          )}
        </section>

        {/* ── Table ── */}
        <section className="overflow-hidden bg-card">
          {chunksQuery.isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
              <p className="text-sm">Chargement des chunks…</p>
            </div>
          )}

          {chunksQuery.isError && (
            <div className="m-4 rounded-lg border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm leading-relaxed text-red-400">
              Erreur lors du chargement des données. Vérifiez que l'API FastAPI
              est démarrée et que{" "}
              <code className="font-mono text-xs">VITE_API_URL</code> est
              correctement configuré.
            </div>
          )}

          {!chunksQuery.isLoading &&
            !chunksQuery.isError &&
            chunks?.items.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                <span className="text-3xl">◈</span>
                <p className="text-sm font-semibold text-slate-300">
                  Aucun chunk trouvé
                </p>
                <p className="text-xs">
                  Modifiez les filtres pour élargir la recherche
                </p>
              </div>
            )}

          {chunks && chunks.items.length > 0 && (
            <>
              {/* Bar */}
              <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  {chunks.total.toLocaleString("fr")} résultat
                  {chunks.total > 1 ? "s" : ""}
                  {chunksQuery.isFetching && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
                  )}
                </span>
                <span>
                  Page {chunks.page} / {chunks.total_pages}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-800 text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] font-semibold tracking-wider text-foreground uppercase">
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Source</th>
                      <th className="px-4 py-3 text-center">Chunk n°</th>
                      <th className="hidden min-w-[280px] px-4 py-3 text-left md:table-cell">
                        Aperçu
                      </th>
                      <th className="hidden px-4 py-3 text-left lg:table-cell">
                        Créé le
                      </th>
                      <th className="px-4 py-3 text-center">Inclus RAG</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {chunks.items.map((chunk) => (
                      <tr key={chunk.id} className="transition-colors">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-foreground/80">
                          {chunk.id}
                        </td>
                        <td
                          className="max-w-[180px] truncate px-4 py-3 font-medium text-foreground/80"
                          title={chunk.source ?? ""}
                        >
                          {basename(chunk.source)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {chunk.chunk_index !== null ? (
                            <span className="inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground/80">
                              {chunk.chunk_index}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="hidden max-w-sm px-4 py-3 text-xs leading-relaxed text-foreground/80 md:table-cell">
                          {truncate(chunk.document)}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs whitespace-nowrap text-foreground/80 lg:table-cell">
                          {chunk.created_at.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              chunk.inclus === 1
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-slate-500/15 text-slate-400"
                            }`}
                          >
                            {chunk.inclus === 1 ? "Inclus" : "Exclu"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedChunk(chunk)}
                            className="text-sm rounded-md border border-b-3 border-slate-600 px-4 py-0.5 text-foreground/80 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10"
                          >
                            Afficher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-1.5 border-t border-slate-700 px-5 py-4">
                {[
                  {
                    label: "«",
                    action: () => setPage(1),
                    disabled: chunks.page <= 1,
                  },
                  {
                    label: "‹",
                    action: () => setPage((p) => p - 1),
                    disabled: chunks.page <= 1,
                  },
                ].map(({ label, action, disabled }) => (
                  <button
                    key={label}
                    disabled={disabled}
                    onClick={action}
                    className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {label}
                  </button>
                ))}

                {buildPageWindow(chunks.page, chunks.total_pages).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[32px] rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      n === chunks.page
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400"
                    }`}
                  >
                    {n}
                  </button>
                ))}

                {[
                  {
                    label: "›",
                    action: () => setPage((p) => p + 1),
                    disabled: chunks.page >= chunks.total_pages,
                  },
                  {
                    label: "»",
                    action: () => setPage(chunks.total_pages),
                    disabled: chunks.page >= chunks.total_pages,
                  },
                ].map(({ label, action, disabled }) => (
                  <button
                    key={label}
                    disabled={disabled}
                    onClick={action}
                    className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-indigo-500 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {selectedChunk && (
        <ChunkModal
          chunk={selectedChunk}
          onClose={() => setSelectedChunk(null)}
        />
      )}
    </div>
  )
}