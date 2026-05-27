import {
  Bot,
  MessageCircle,
  FileText,
  Search,
  Calculator,
  Route,
  History,
  ArrowRight,
} from "lucide-react";

export default function HeroSection({  }) {
  return (
    <div className="text-center px-8 py-16">
      <h2 className="sr-only">
        Page d'accueil de TEXDOU — assistant IA pour la douane malagasy
      </h2>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-[#FAC775] bg-[#FAEEDA] px-4 py-1 text-xs font-medium uppercase tracking-wider text-[#854F0B] mb-6">
        <Bot size={14} />
        Assistant IA douanier
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-gray-900 mb-4">
        Comprendre la douane
        <br />
        malagasy, <span className="text-[#BA7517]">sans effort</span>
      </h1>

      {/* Subtitle */}
      <p className="max-w-xl mx-auto text-gray-600 leading-7 text-base mb-8">
        TEXDOU est votre assistant intelligent pour toutes vos questions sur
        les réglementations, tarifs et procédures douanières de Madagascar.
      </p>

      {/* CTA */}
      <div className="flex flex-wrap justify-center gap-3 mb-14">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-[#BA7517] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#854F0B]"
        >
          <MessageCircle size={16} />
          Poser une question
        </button>

        <button
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
        >
          <FileText size={16} />
          Parcourir les documents
        </button>
      </div>

      {/* Demo Chat */}
      <div className="mx-auto mb-12 max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
        {/* Bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-400"></div>
          <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>

          <span className="ml-2 text-xs text-gray-500">
            TEXDOU — Chatbot
          </span>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-3 p-4">
          <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#BA7517] px-4 py-3 text-sm leading-6 text-white">
            Quel est le taux de droits de douane pour l'importation de riz ?
          </div>

          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800">
            Selon le tarif douanier malagasy en vigueur, le riz (position
            tarifaire <strong className="text-[#BA7517]">1006</strong>) est
            soumis à un droit de douane de{" "}
            <strong className="text-[#BA7517]">20%</strong> de la valeur CIF,
            plus la TVA applicable.
            <br />
            <br />
            Souhaitez-vous connaître les exemptions possibles ou les procédures
            d'importation ?
            <span className="ml-1 inline-block h-3 animate-pulse bg-[#BA7517]" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid gap-4 px-2 md:grid-cols-2 lg:grid-cols-4 mb-12">
        {[
          {
            icon: Search,
            title: "Textes réglementaires",
            desc: "Accédez aux lois, décrets et circulaires douanières classés et indexés.",
          },
          {
            icon: Calculator,
            title: "Tarifs & taxes",
            desc: "Obtenez les taux de droits, TVA et redevances applicables à vos marchandises.",
          },
          {
            icon: Route,
            title: "Procédures douanières",
            desc: "Guide étape par étape pour l'import, l'export et le transit.",
          },
          {
            icon: History,
            title: "Historique & veille",
            desc: "Suivez l'évolution des textes réglementaires au fil du temps.",
          },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAEEDA]">
                <Icon size={18} className="text-[#854F0B]" />
              </div>

              <h3 className="mb-1 text-sm font-medium text-gray-900">
                {item.title}
              </h3>

              <p className="text-sm leading-6 text-gray-500">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Questions */}
      <div className="px-2 pb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          Questions fréquentes
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {[
            {
              label: "Documents requis à l'importation",
              prompt:
                "Quels documents sont requis pour importer des marchandises à Madagascar ?",
            },
            {
              label: "Régimes suspensifs",
              prompt:
                "Quels sont les régimes douaniers suspensifs disponibles à Madagascar ?",
            },
            {
              label: "Calcul de la valeur en douane",
              prompt:
                "Comment calculer la valeur en douane d'une marchandise importée ?",
            },
            {
              label: "Marchandises interdites",
              prompt:
                "Quelles marchandises sont interdites ou soumises à restriction à Madagascar ?",
            },
            {
              label: "Agrément OEA",
              prompt:
                "Comment obtenir un agrément d'opérateur économique agréé (OEA) à Madagascar ?",
            },
            {
              label: "Recours & litiges",
              prompt:
                "Quelle est la procédure de recours en cas de litige douanier à Madagascar ?",
            },
          ].map((q, index) => (
            <button
              key={index}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 transition hover:border-[#BA7517] hover:text-[#BA7517]"
            >
              <ArrowRight size={12} />
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-8 mb-8 h-px bg-gray-200"></div>

      {/* Footer */}
      <div className="px-8 pb-8 text-center text-xs text-gray-500">
        TEXDOU — Plateforme d'assistance douanière malagasy · Données non
        contractuelles, à vérifier auprès de la Direction Générale des Douanes
      </div>
    </div>
  );
}