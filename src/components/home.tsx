import { Shield, ArrowRight, FileText, Scale, Landmark } from "lucide-react"
import { Link } from "react-router"

// ── Palette tokens (ministériel)
const C = {
  blue: "#4F7EF7",
  blueDark: "#3D6EE5",
  bluePale: "#EBF2FF",
  blueBg: "#F0F4FF",
  ink: "#1A1D2E",
  mid: "#6B7290",
}

const HIGHLIGHTS = [
  {
    icon: FileText,
    title: "Textes officiels",
    desc: "Lois, décrets et circulaires classés et à jour.",
  },
  {
    icon: Scale,
    title: "Cadre juridique",
    desc: "Tarifs, régimes et procédures douanières clairs.",
  },
  {
    icon: Landmark,
    title: "Source institutionnelle",
    desc: "Publié et validé par la Direction Générale des Douanes.",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center overflow-x-hidden px-4">
      <section className="relative mx-auto w-full text-center">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-x-0 -top-20 h-72 opacity-40" />

        <div className="relative py-4 sm:px-14">
          {/* Visuel ministériel */}
          <div className="mx-auto mb-6 flex size-30 items-center justify-center rounded-full">
            <img src="/logo-dgd.png" />
          </div>

          {/* Badge */}
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold tracking-[0.18em] uppercase"
            style={{
              borderColor: "#C8D8FF",
              background: C.bluePale,
              color: C.blue,
            }}
          >
            Direction Générale des Douanes · Madagascar
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-3xl leading-[1.15] font-extrabold tracking-tight text-foreground sm:text-4xl">
            TEXDOU
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-3 max-w-2xl text-sm leading-7 text-foreground sm:text-base">
            La plateforme officielle de consultation des textes réglementaires
            douaniers malagasy : lois, décrets, circulaires et tarifs, classés
            et accessibles en toute simplicité.
          </p>
          <p
            className="mx-auto mb-9 max-w-2xl text-xs leading-6 sm:text-sm text-foreground"
          >
            Un point d'accès unique, pensé pour les agents de l'administration,
            les opérateurs économiques et tout citoyen souhaitant comprendre la
            réglementation douanière en vigueur à Madagascar.
          </p>

          {/* Points forts */}
          <div className="mb-9 grid grid-cols-1 gap-3 py-7 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-center gap-2 px-2 text-center"
              >
                <div
                  className="flex items-center justify-center rounded-[10px]"
                  style={{ width: 40, height: 40, background: C.bluePale }}
                >
                  <Icon className="size-4.5" style={{ color: C.blue }} />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {title}
                </h3>
                <p className="text-[14px] leading-5 text-foreground/60">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            to="/douane/texdou"
            className="inline-flex items-center gap-2 rounded-[12px] px-7 py-3 text-sm font-bold text-white no-underline transition-all active:scale-[0.97]"
            style={{ background: C.blue, height: 48 }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = C.blueDark)
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = C.blue)}
          >
            Consulter
            <ArrowRight className="size-4" />
          </Link>

          <p
            className="mt-5 text-[11px] font-medium"
            style={{ color: C.mid, opacity: 0.8 }}
          >
            Petites remarque qu'on aimerais affichées
          </p>
        </div>
      </section>
    </div>
  )
}
