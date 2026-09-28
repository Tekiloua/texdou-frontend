import {
  fetchTexteById,
  fetchTextePubliqueById,
  fetchDocumentsByTexteId,
  fetchReferencesByTexteId,
  fetchLiensUtilesByTexteId,
} from "@/api/api"
import type { DocumentType, TexteReferenceType, LienUtileType } from "@/api/api"
import type { TexteType } from "@/types"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link, useNavigate } from "react-router"
import { useState } from "react"
import {
  ArrowLeft,
  FileText,
  BookOpen,
  FileArchive,
  LoaderCircle,
  Hash,
  Link2,
  ExternalLink,
  FileTextIcon,
  Download,
} from "lucide-react"
import { decodeTitle } from "@/hooks/decode-html"
import { useAuthStore } from "@/store/useAuthStore"

// ── Statut styles ──
const statusStyles: Record<number, { pill: string; dot: string }> = {
  1: { pill: "bg-[#FAEEDA] text-[#854F0B]", dot: "#BA7517" },
  2: { pill: "bg-[#E6F9F1] text-[#0F6E56]", dot: "#1D9E75" },
  3: { pill: "bg-[#FDECEA] text-[#A32D2D]", dot: "#E24B4A" },
}

type TabValue = "officiel" | "resume" | "references" | "pdf" | "liens-utiles"

const tabs: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "officiel", label: "Texte officiel", icon: BookOpen },
  { value: "resume", label: "Résumé", icon: FileText },
  { value: "references", label: "Références", icon: Link2 },
  { value: "pdf", label: "Document PDF", icon: FileArchive },
  { value: "liens-utiles", label: "Liens Utiles", icon: ExternalLink },
]

export const TexteDouaniereDetails = () => {
  const { data, isLoading, error } = useTexte()
  return (
    <div
      className="min-h-screen px-3 py-5 sm:px-4 sm:py-8 md:px-10 lg:px-16"
      style={{
        background: "#F0F4FF",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <BackLink />

        {isLoading && (
          <div
            className="rounded-4 overflow-hidden border bg-white"
            style={{ borderColor: "#E4E9F7" }}
          >
            <LoadingState />
          </div>
        )}

        {!isLoading && (error || !data) && (
          <div
            className="rounded-4 overflow-hidden border bg-white"
            style={{ borderColor: "#E4E9F7" }}
          >
            <ErrorState error={error} />
          </div>
        )}

        {!isLoading && !error && data && <TabsNav />}
      </div>
    </div>
  )
}

const BackLink = () => {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-4 inline-flex items-center gap-1.5 rounded-[12px] border border-primary/40 px-2.5 py-1.5 text-[10px] font-bold tracking-wide uppercase no-underline transition-all hover:bg-slate-200 sm:mb-6 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs sm:tracking-widest"
    >
      <ArrowLeft className="size-3 shrink-0 sm:size-3.5" />
      <span className="whitespace-nowrap">Retour aux documents</span>
    </button>
  )
}

const TabsNav = () => {
  const [active, setActive] = useState<TabValue>("officiel")

  return (
    <div
      className="rounded-4 overflow-hidden border bg-white"
      style={{ borderColor: "#E4E9F7" }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: "#E4E9F7" }}>
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            title={label}
            onClick={() => setActive(value)}
            className="flex flex-1 shrink-0 items-center justify-center gap-0 border-b-2 px-2 py-3 text-xs font-bold whitespace-nowrap transition-all sm:flex-initial sm:justify-start sm:gap-2 sm:px-5 sm:py-4 sm:text-sm"
            style={
              active === value
                ? {
                    borderColor: "#4F7EF7",
                    color: "#4F7EF7",
                    background: "#fafbff",
                  }
                : {
                    borderColor: "transparent",
                    color: "#8892B0",
                    background: "transparent",
                  }
            }
          >
            <Icon className="size-4 shrink-0 sm:size-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {active === "resume" && <Resume />}
        {active === "officiel" && <Officiel />}
        {active === "references" && <References />}
        {active === "pdf" && <PdfView />}
        {active === "liens-utiles" && <LiensUtilesView />}
      </div>
    </div>
  )
}

const useTexte = () => {
  const { id } = useParams()
  const role = useAuthStore((s) => s.user?.role)
  const isNormal = role === "normal"

  return useQuery<TexteType>({
    queryKey: ["texte", isNormal ? "public" : "prive", id],
    queryFn: () =>
      isNormal
        ? fetchTextePubliqueById(id as string)
        : fetchTexteById(id as string),
    retry: false, // évite de retenter inutilement sur un 404
  })
}

const useDocuments = () => {
  const { id } = useParams()
  return useQuery<DocumentType[]>({
    queryKey: ["texte-documents", id],
    queryFn: () => fetchDocumentsByTexteId(id as string),
    enabled: !!id,
  })
}

const useReferences = () => {
  const { id } = useParams()
  return useQuery<TexteReferenceType[]>({
    queryKey: ["texte-references", id],
    queryFn: () => fetchReferencesByTexteId(id as string),
    enabled: !!id,
  })
}

const useLiensUtiles = () => {
  const { id } = useParams()
  return useQuery<LienUtileType[]>({
    queryKey: ["texte-liens-utiles", id],
    queryFn: () => fetchLiensUtilesByTexteId(id as string),
    enabled: !!id,
  })
}

const LoadingState = () => (
  <div className="flex h-60 items-center justify-center">
    <LoaderCircle className="animate-spin" style={{ color: "#4F7EF7" }} />
  </div>
)

const ErrorState = ({ error }: { error?: unknown }) => {
  const isNotFound = (error as any)?.response?.status === 404
  return (
    <div
      className="flex h-60 flex-col items-center justify-center gap-2 text-center"
      style={{ color: "#8892B0" }}
    >
      <FileText className="size-8" style={{ color: "#8892B0" }} />
      <p className="text-sm font-semibold">
        {isNotFound
          ? "Texte introuvable"
          : "Une erreur est survenue lors du chargement."}
      </p>
    </div>
  )
}

const DocHeader = ({ texte }: { texte: TexteType }) => {
  const statusStyle = statusStyles[texte.statut_id ?? 0] ?? {
    pill: "bg-stone-100 text-stone-500",
    dot: "#aaa",
  }

  return (
    <div
      className="mb-4 border-b pb-4 sm:mb-6 sm:pb-6"
      style={{ borderColor: "#F0F4FF" }}
    >
      {/* Meta badges */}
      <div className="mb-4 flex flex-wrap items-center gap-4 sm:gap-6">
        {texte.categorie && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
            style={{ background: "#EBF2FF", color: "#185FA5" }}
          >
            <FileText className="size-4" />
            {texte.categorie}
          </span>
        )}
        {texte.statut && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${statusStyle.pill}`}
            style={{ background: "#EBF2FF", color: "#185FA5" }}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: statusStyle.dot }}
            />
            {texte.statut}
          </span>
        )}
        {texte.numero && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-sm font-semibold"
            style={{ background: "#EBF2FF", color: "#185FA5" }}
          >
            <Hash className="size-4" />
            {texte.numero}
          </span>
        )}
      </div>

      {/* Title */}
      <h1
        className="text-lg leading-snug font-extrabold sm:text-2xl md:text-3xl"
        style={{
          color: "#1A1D2E",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {decodeTitle(texte.titre)}
      </h1>
    </div>
  )
}

const Resume = () => {
  const { data, isLoading, error } = useTexte()
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!data) return null

  return (
    <div>
      <div
        className="rounded-[12px] border-l-4 bg-[#F4F6FF] p-4 sm:p-5"
        style={{ borderColor: "#4F7EF7" }}
      >
        <p
          className="mb-2 text-base text-blue-800 font-bold tracking-[0.2em] uppercase"
          // style={{ color: "#185FA5" }}
        >
          Résumé
        </p>
        {data.resume?.trim() ? (
          <div className="prose prose-sm max-w-none text-base leading-relaxed">
            {decodeTitle(data.resume)}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: "#8892B0" }}>
            Aucun résumé disponible.
          </p>
        )}
      </div>
    </div>
  )
}

const Officiel = () => {
  const { data, isLoading, error } = useTexte()
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!data) return null

  return (
    <div className="max-h-142 overflow-y-auto">
      <DocHeader texte={data} />
      {data.contenu_html ? (
        <div
          className="prose prose-sm text-sm leading-loose"
          style={{ color: "#1A1D2E" }}
          dangerouslySetInnerHTML={{ __html: data.contenu_html }}
        />
      ) : (
        <p className="text-sm italic" style={{ color: "#8892B0" }}>
          Aucun contenu disponible.
        </p>
      )}
    </div>
  )
}

const References = () => {
  const { data: texte, isLoading: texteLoading, error: texteError } = useTexte()
  const {
    data: references,
    isLoading: refsLoading,
    error: refsError,
  } = useReferences()

  if (texteLoading || refsLoading) return <LoadingState />
  if (texteError) return <ErrorState error={texteError} />
  if (refsError) return <ErrorState error={refsError} />
  if (!texte) return null

  if (!references || references.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div
            className="flex items-center justify-center rounded-[14px]"
            style={{ width: 56, height: 56, background: "#EBF2FF" }}
          >
            <Link2 className="size-7" style={{ color: "#4F7EF7" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "#6B7290" }}>
            Aucune référence n'est disponible pour ce texte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-142 overflow-y-auto">
      <ul className="flex flex-col gap-2.5">
        {references.map((ref) => {
          // Si le texte référencé est dans notre base, on redirige vers sa page.
          // Sinon, on ouvre le lien_url externe s'il existe.
          const isInternal = !!ref.texte_lie_id
          const internalHref = `/douane/texdou/${ref.texte_lie_id}`
          const externalHref = ref.lien_url || "#"

          const sharedStyles = {
            borderColor: "#E4E9F7",
            color: "#1A1D2E",
          }

          const hoverEnter = (
            e: React.MouseEvent<HTMLAnchorElement | HTMLElement>
          ) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = "#4F7EF7"
          }
          const hoverLeave = (
            e: React.MouseEvent<HTMLAnchorElement | HTMLElement>
          ) => {
            ;(e.currentTarget as HTMLElement).style.borderColor = "#E4E9F7"
          }

          const inner = (
            <>
              {/* Icône */}
              <div
                className="flex shrink-0 items-center justify-center rounded-[10px]"
                style={{ width: 36, height: 36, background: "#EBF2FF" }}
              >
                <Link2 className="size-4" style={{ color: "#4F7EF7" }} />
              </div>

              {/* Infos */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: "#1A1D2E" }}
                >
                  {ref.titre || "Référence sans titre"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {ref.numero && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                      style={{ background: "#F4F6FF", color: "#8892B0" }}
                    >
                      <Hash className="size-2.5" />
                      {ref.numero}
                    </span>
                  )}
                  {ref.categorie && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "#EBF2FF", color: "#185FA5" }}
                    >
                      {ref.categorie}
                    </span>
                  )}
                  {ref.statut && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "#E6F9F1", color: "#0F6E56" }}
                    >
                      {ref.statut}
                    </span>
                  )}
                  {ref.date_mise_en_vigueur && (
                    <span className="text-[10px]" style={{ color: "#8892B0" }}>
                      En vigueur le {ref.date_mise_en_vigueur}
                    </span>
                  )}
                </div>
              </div>
            </>
          )

          return (
            <li key={ref.id}>
              {isInternal ? (
                <Link
                  to={internalHref}
                  className="flex items-center gap-2.5 rounded-[12px] border p-3 no-underline transition-all sm:gap-3 sm:p-4"
                  style={sharedStyles}
                  onMouseEnter={hoverEnter}
                  onMouseLeave={hoverLeave}
                >
                  {inner}
                </Link>
              ) : (
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-[12px] border p-3 no-underline transition-all sm:gap-3 sm:p-4"
                  style={sharedStyles}
                  onMouseEnter={hoverEnter}
                  onMouseLeave={hoverLeave}
                >
                  {inner}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const PdfView = () => {
  const { data: texte, isLoading: texteLoading, error: texteError } = useTexte()
  const {
    data: documents,
    isLoading: docsLoading,
    error: docsError,
  } = useDocuments()

  if (texteLoading || docsLoading) return <LoadingState />
  if (texteError) return <ErrorState error={texteError} />
  if (docsError) return <ErrorState error={docsError} />
  if (!texte) return null

  if (!documents || documents.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div
            className="flex items-center justify-center rounded-[14px]"
            style={{ width: 56, height: 56, background: "#EBF2FF" }}
          >
            <FileArchive className="size-7" style={{ color: "#4F7EF7" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "#6B7290" }}>
            Aucun document PDF n'est disponible pour ce texte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-142 overflow-y-auto">
      <ul className="flex flex-col gap-2.5">
        {documents.map((doc) => (
          <li key={doc.id}>
            <a
              href={doc.nouveau_chemin || doc.chemin_fichier || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-[12px] border-2 border-primary/40 p-3 text-sm font-semibold no-underline transition-all sm:gap-3 sm:p-4"
              style={{ color: "#1A1D2E" }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-[10px]"
                style={{ width: 36, height: 36, background: "#EBF2FF" }}
              >
                <FileTextIcon className="size-6" style={{ color: "#4F7EF7" }} />
              </div>
              <span className="truncate">{doc.nom || "Document sans nom"}</span>
              <Download className="ml-auto size-5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const LiensUtilesView = () => {
  const { data: texte, isLoading: texteLoading, error: texteError } = useTexte()
  const {
    data: liensUtiles,
    isLoading: liensLoading,
    error: liensError,
  } = useLiensUtiles()

  if (texteLoading || liensLoading) return <LoadingState />
  if (texteError) return <ErrorState error={texteError} />
  if (liensError) return <ErrorState error={liensError} />
  if (!texte) return null

  if (!liensUtiles || liensUtiles.length === 0) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div
            className="flex items-center justify-center rounded-[14px]"
            style={{ width: 56, height: 56, background: "#EBF2FF" }}
          >
            <ExternalLink className="size-7" style={{ color: "#4F7EF7" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "#6B7290" }}>
            Aucun lien utile n'est disponible pour ce texte.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-142 overflow-y-auto">
      <ul className="flex flex-col gap-2.5">
        {liensUtiles.map((lien) => (
          <li key={lien.id}>
            <a
              href={lien.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-[12px] border p-3 no-underline transition-all sm:gap-3 sm:p-4"
              style={{ borderColor: "#E4E9F7", color: "#1A1D2E" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#4F7EF7"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E4E9F7"
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-[10px]"
                style={{ width: 36, height: 36, background: "#EBF2FF" }}
              >
                <ExternalLink className="size-4" style={{ color: "#4F7EF7" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: "#1A1D2E" }}
                >
                  {lien.titre || "Lien sans titre"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {lien.entite && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "#EBF2FF", color: "#185FA5" }}
                    >
                      {lien.entite}
                    </span>
                  )}
                  {lien.url && (
                    <span
                      className="truncate text-[10px]"
                      style={{ color: "#8892B0" }}
                    >
                      {lien.url}
                    </span>
                  )}
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
