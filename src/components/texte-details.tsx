import { fetchTexteById } from "@/api/api"
import type { TexteType } from "@/types"
import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { useState } from "react"
import {
  ArrowLeft,
  FileText,
  BookOpen,
  FileArchive,
  LoaderCircle,
  Hash,
} from "lucide-react"

// ── Statut styles ──
const statusStyles: Record<number, { pill: string; dot: string }> = {
  1: { pill: "bg-[#FAEEDA] text-[#854F0B]", dot: "#BA7517" },
  2: { pill: "bg-[#E6F9F1] text-[#0F6E56]", dot: "#1D9E75" },
  3: { pill: "bg-[#FDECEA] text-[#A32D2D]", dot: "#E24B4A" },
}

type TabValue = "officiel" | "resume" | "pdf"

const tabs: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "officiel", label: "Texte officiel", icon: BookOpen },
  { value: "resume", label: "Résumé", icon: FileText },
  { value: "pdf", label: "Document PDF", icon: FileArchive },
]

export const TexteDetails = () => {
  return (
    <div
      className="min-h-screen px-4 py-8 md:px-10 lg:px-16"
      style={{ background: "#F0F4FF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="mx-auto max-w-4xl">
        <BackLink />
        <TabsNav />
      </div>
    </div>
  )
}

const BackLink = () => (
  <Link
    to="/documents"
    className="mb-6 inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-xs font-bold uppercase tracking-widest no-underline transition-all"
    style={{ background: "#fff", color: "#6B7290", border: "1.5px solid #E4E9F7" }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "#4F7EF7"
      e.currentTarget.style.color = "#4F7EF7"
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "#E4E9F7"
      e.currentTarget.style.color = "#6B7290"
    }}
  >
    <ArrowLeft className="size-3.5" />
    Retour aux documents
  </Link>
)

const TabsNav = () => {
  const [active, setActive] = useState<TabValue>("officiel")

  return (
    <div
      className="overflow-hidden rounded-[16px] border bg-white"
      style={{ borderColor: "#E4E9F7" }}
    >
      {/* Tab bar */}
      <div
        className="flex overflow-x-auto border-b"
        style={{ borderColor: "#E4E9F7" }}
      >
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActive(value)}
            className="flex shrink-0 items-center gap-2 border-b-2 px-5 py-4 text-sm font-bold transition-all"
            style={
              active === value
                ? { borderColor: "#4F7EF7", color: "#4F7EF7", background: "#fafbff" }
                : { borderColor: "transparent", color: "#8892B0", background: "transparent" }
            }
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {active === "resume" && <Resume />}
        {active === "officiel" && <Officiel />}
        {active === "pdf" && <PdfView />}
      </div>
    </div>
  )
}

const useTexte = () => {
  const { id } = useParams()
  return useQuery<TexteType>({
    queryKey: ["texte", id],
    queryFn: () => fetchTexteById(id as string),
  })
}

const LoadingState = () => (
  <div className="flex h-60 items-center justify-center">
    <LoaderCircle className="animate-spin" style={{ color: "#4F7EF7" }} />
  </div>
)

const ErrorState = () => (
  <div className="flex h-60 items-center justify-center text-sm font-semibold" style={{ color: "#8892B0" }}>
    Une erreur est survenue lors du chargement.
  </div>
)

const DocHeader = ({ texte }: { texte: TexteType }) => {
  const statusStyle = statusStyles[texte.statut_id ?? 0] ?? {
    pill: "bg-stone-100 text-stone-500",
    dot: "#aaa",
  }

  return (
    <div className="mb-6 border-b pb-6" style={{ borderColor: "#F0F4FF" }}>
      {/* Meta badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {texte.categorie_id && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ background: "#EBF2FF", color: "#185FA5" }}
          >
            <FileText className="size-3" />
            Catégorie {texte.categorie_id}
          </span>
        )}
        {texte.statut_id && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${statusStyle.pill}`}
          >
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: statusStyle.dot }}
            />
            Statut {texte.statut_id}
          </span>
        )}
        {texte.numero && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-mono font-semibold"
            style={{ background: "#F4F6FF", color: "#8892B0" }}
          >
            <Hash className="size-3" />
            {texte.numero}
          </span>
        )}
      </div>

      {/* Title */}
      <h1
        className="text-xl font-extrabold leading-snug sm:text-2xl md:text-3xl"
        style={{ color: "#1A1D2E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {texte.titre}
      </h1>
    </div>
  )
}

const Resume = () => {
  const { data, isLoading, error } = useTexte()
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState />
  if (!data) return null

  return (
    <div>
      <DocHeader texte={data} />
      <div
        className="rounded-[12px] border-l-4 bg-[#F4F6FF] p-5"
        style={{ borderColor: "#4F7EF7" }}
      >
        <p
          className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: "#8892B0" }}
        >
          Résumé
        </p>
        {data.resume?.trim() ? (
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed"
            style={{ color: "#1A1D2E" }}
            dangerouslySetInnerHTML={{ __html: data.resume }}
          />
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
  if (error) return <ErrorState />
  if (!data) return null

  return (
    <div>
      <DocHeader texte={data} />
      {data.contenu_html ? (
        <div
          className="prose prose-sm max-w-none text-sm leading-loose"
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

const PdfView = () => {
  const { data, isLoading, error } = useTexte()
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState />
  if (!data) return null

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div
        className="flex items-center justify-center rounded-[14px]"
        style={{ width: 56, height: 56, background: "#EBF2FF" }}
      >
        <FileArchive className="size-7" style={{ color: "#4F7EF7" }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "#6B7290" }}>
        Le document PDF n'est pas encore disponible.
      </p>
    </div>
  )
}