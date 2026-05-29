import {
  Bot,
  MessageCircle,
  FileText,
  Search,
  Calculator,
  Route,
  History,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"

// ── Palette tokens (proposal)
const C = {
  blue: "#4F7EF7",
  blueDark: "#3D6EE5",
  bluePale: "#EBF2FF",
  blueBg: "#F0F4FF",
  teal: "#0F6E56",
  tealPale: "#E1F5EE",
  amber: "#BA7517",
  amberPale: "#FAEEDA",
  ink: "#1A1D2E",
  mid: "#6B7290",
  muted: "#8892B0",
  dim: "#B0B8D0",
  border: "#E4E9F7",
}

const FONT = "'Plus Jakarta Sans', sans-serif"

// ── Quick questions
const QUICK_QUESTIONS = [
  "Documents requis à l'importation",
  "Régimes suspensifs disponibles",
  "Calcul de la valeur en douane",
  "Marchandises interdites",
  "Agrément OEA",
  "Recours & litiges",
]

// ── Feature cards
const FEATURES = [
  {
    icon: Search,
    color: C.blue,
    bg: C.bluePale,
    title: "Textes réglementaires",
    desc: "Lois, décrets et circulaires classés, indexés et consultables en quelques clics.",
  },
  {
    icon: Calculator,
    color: C.teal,
    bg: C.tealPale,
    title: "Tarifs & taxes",
    desc: "Droits de douane, TVA et redevances applicables à vos marchandises.",
  },
  {
    icon: Route,
    color: "#854F0B",
    bg: C.amberPale,
    title: "Procédures douanières",
    desc: "Guide étape par étape pour l'import, l'export et le transit.",
  },
  {
    icon: History,
    color: "#993556",
    bg: "#FBEAF0",
    title: "Historique & veille",
    desc: "Suivez l'évolution des textes réglementaires au fil du temps.",
  },
]

// ── Stats
const STATS = [
  { value: "248", label: "Documents officiels", icon: FileText, color: C.blue, bg: C.bluePale },
  { value: "174", label: "Textes en vigueur", icon: Shield, color: C.teal, bg: C.tealPale },
  { value: "31", label: "Mises à jour / mois", icon: TrendingUp, color: "#854F0B", bg: C.amberPale },
  { value: "<2s", label: "Temps de réponse IA", icon: Zap, color: "#993556", bg: "#FBEAF0" },
]

export default function Home() {
  const [hoveredQ, setHoveredQ] = useState<number | null>(null)

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: C.blueBg, fontFamily: FONT }}
    >
      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative px-4 pt-16 pb-0 md:pt-24">
        {/* Background decoration */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, #BDD0FF 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ borderColor: "#C8D8FF", background: C.bluePale, color: C.blue }}
          >
            <Sparkles className="size-3.5" />
            Assistant IA douanier · Madagascar
          </div>

          {/* Headline */}
          <h1
            className="mb-5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl"
            style={{ color: C.ink }}
          >
            La douane malagasy,
            <br />
            <span
              className="relative inline-block"
              style={{ color: C.blue }}
            >
              enfin intelligible.
              {/* Underline accent */}
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 300 8"
                fill="none"
                preserveAspectRatio="none"
                style={{ height: 6 }}
              >
                <path
                  d="M2 5.5 C60 1.5 120 7 180 3.5 C220 1 270 6 298 4"
                  stroke={C.blue}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.4"
                />
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="mx-auto mb-10 max-w-xl text-base leading-7 sm:text-lg"
            style={{ color: C.mid }}
          >
            Recherchez, analysez et comprenez les textes officiels en quelques
            secondes grâce à l'IA de TEXDOU.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/chatbot"
              className="inline-flex items-center gap-2 rounded-[12px] px-6 py-3 text-sm font-bold text-white no-underline transition-all active:scale-[0.97]"
              style={{ background: C.blue, height: 48 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.blueDark)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.blue)}
            >
              <MessageCircle className="size-4" />
              Poser une question
            </Link>
            <Link
              to="/documents"
              className="inline-flex items-center gap-2 rounded-[12px] border px-6 py-3 text-sm font-bold no-underline transition-all active:scale-[0.97]"
              style={{
                borderColor: C.border,
                background: "#fff",
                color: C.ink,
                height: 48,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.blue
                e.currentTarget.style.color = C.blue
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.color = C.ink
              }}
            >
              <FileText className="size-4" />
              Parcourir les documents
            </Link>
          </div>
        </div>

        {/* ── Demo chat card ── */}
        <div className="relative mx-auto mt-14 max-w-2xl">
          {/* Floating glow */}
          <div
            className="pointer-events-none absolute inset-x-8 -top-4 h-8 blur-2xl"
            style={{ background: "#BDD0FF", opacity: 0.6 }}
          />
          <div
            className="overflow-hidden rounded-[20px] border bg-white shadow-xl"
            style={{ borderColor: C.border, boxShadow: "0 20px 60px -10px rgba(79,126,247,0.15)" }}
          >
            {/* Window bar */}
            <div
              className="flex items-center gap-2 border-b px-4 py-3"
              style={{ borderColor: C.border, background: "#FAFBFF" }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#F87171" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#FBBF24" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#34D399" }} />
              <div
                className="ml-3 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: C.bluePale, color: C.blue }}
              >
                <Sparkles className="size-3" />
                Texdou AI
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-4 p-5">
              {/* User */}
              <div className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-[14px] rounded-br-[4px] px-4 py-3 text-sm leading-6 text-white"
                  style={{ background: C.blue }}
                >
                  Quel est le taux de droits de douane pour l'importation de riz ?
                </div>
              </div>

              {/* Bot */}
              <div className="flex items-end gap-2.5">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: C.blue }}
                >
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <div
                  className="max-w-[80%] rounded-[14px] rounded-bl-[4px] border px-4 py-3 text-sm leading-6"
                  style={{ border: `1.5px solid ${C.border}`, background: "#F4F6FF", color: C.ink }}
                >
                  Selon le tarif douanier malagasy, le riz{" "}
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ background: C.bluePale, color: C.blue }}
                  >
                    pos. 1006
                  </span>{" "}
                  est soumis à un droit de douane de{" "}
                  <strong style={{ color: C.blue }}>20%</strong> de la valeur
                  CIF, plus la TVA applicable.
                  <span
                    className="ml-1 inline-block h-3.5 w-0.5 animate-pulse rounded-full align-middle"
                    style={{ background: C.blue }}
                  />
                </div>
              </div>
            </div>

            {/* Input stub */}
            <div className="border-t px-4 py-3" style={{ borderColor: C.border }}>
              <div
                className="flex items-center gap-3 rounded-[10px] border px-4 py-2.5"
                style={{ borderColor: C.border, background: "#F4F6FF" }}
              >
                <p className="flex-1 text-sm" style={{ color: C.dim }}>
                  Posez une question sur les textes officiels…
                </p>
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: C.blue }}
                >
                  <ArrowRight className="size-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS BAND
      ══════════════════════════════════════ */}
      <section className="mx-auto mt-16 max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ value, label, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-[14px] border bg-white py-5 text-center"
              style={{ borderColor: C.border }}
            >
              <div
                className="flex items-center justify-center rounded-[10px]"
                style={{ width: 38, height: 38, background: bg }}
              >
                <Icon className="size-4" style={{ color }} />
              </div>
              <span className="text-2xl font-extrabold" style={{ color: C.ink }}>
                {value}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: C.muted }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section className="mx-auto mt-16 max-w-5xl px-4">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: C.muted }}
          >
            Fonctionnalités
          </p>
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ color: C.ink }}>
            Tout ce dont vous avez besoin
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className="group flex flex-col gap-3 rounded-[14px] border bg-white p-5 transition-all duration-200"
              style={{ borderColor: C.border }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color
                e.currentTarget.style.boxShadow = `0 0 0 3px ${bg}`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <div
                className="flex items-center justify-center rounded-[10px]"
                style={{ width: 42, height: 42, background: bg }}
              >
                <Icon className="size-5" style={{ color }} />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold" style={{ color: C.ink }}>
                  {title}
                </h3>
                <p className="text-xs leading-5" style={{ color: C.mid }}>
                  {desc}
                </p>
              </div>
              <div
                className="mt-auto flex items-center gap-1 text-[11px] font-bold transition-opacity opacity-0 group-hover:opacity-100"
                style={{ color }}
              >
                En savoir plus <ChevronRight className="size-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          QUICK QUESTIONS
      ══════════════════════════════════════ */}
      <section className="mx-auto mt-16 max-w-3xl px-4 text-center">
        <p
          className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: C.muted }}
        >
          Questions fréquentes
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_QUESTIONS.map((q, i) => (
            <Link
              key={i}
              to="/chatbot"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold no-underline transition-all"
              style={{
                borderColor: hoveredQ === i ? C.blue : C.border,
                background: hoveredQ === i ? C.bluePale : "#fff",
                color: hoveredQ === i ? C.blue : C.mid,
              }}
              onMouseEnter={() => setHoveredQ(i)}
              onMouseLeave={() => setHoveredQ(null)}
            >
              <ArrowRight className="size-3 shrink-0" />
              {q}
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA BAND
      ══════════════════════════════════════ */}
      <section className="mx-auto mt-16 max-w-5xl px-4 pb-16">
        <div
          className="relative overflow-hidden rounded-[20px] px-8 py-12 text-center"
          style={{ background: C.blue }}
        >
          {/* Decorative circles */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20"
            style={{ background: "#fff" }}
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full opacity-10"
            style={{ background: "#fff" }}
          />

          <div className="relative">
            <div
              className="mx-auto mb-4 flex items-center justify-center rounded-[14px]"
              style={{ width: 52, height: 52, background: "rgba(255,255,255,0.2)" }}
            >
              <Bot className="size-6 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-extrabold text-white sm:text-3xl">
              Prêt à commencer ?
            </h2>
            <p className="mb-8 text-sm font-medium text-white opacity-80">
              Posez votre première question à Texdou AI maintenant.
            </p>
            <Link
              to="/chatbot"
              className="inline-flex items-center gap-2 rounded-[12px] bg-white px-7 py-3 text-sm font-bold no-underline transition-all active:scale-[0.97] hover:bg-[#F0F4FF]"
              style={{ color: C.blue, height: 48 }}
            >
              <Sparkles className="size-4" />
              Lancer Texdou AI
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER NOTE
      ══════════════════════════════════════ */}
      <footer
        className="border-t px-8 py-5 text-center text-[11px] font-medium"
        style={{ borderColor: C.border, color: C.dim }}
      >
        TEXDOU — Plateforme d'assistance douanière malagasy · Données non
        contractuelles, à vérifier auprès de la Direction Générale des Douanes
      </footer>
    </div>
  )
}