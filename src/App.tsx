import { Chatbot } from "./components/backoffice/chatbot/chatbot"
import { Navigate, Route, Routes } from "react-router"
import { LoginForm } from "./components/login-form"
import { useInitAuth } from "./auth/useInitAuth"
import { useAuthStore } from "./store/useAuthStore"
import { TexteDouaniere } from "./components/textedouaniere/texte-douaniere"
import { TexteDouaniereDetails } from "./components/textedouaniere/texte-douaniere-details"
import { BackOffice } from "./components/backoffice/backoffice"
import { CategorySection } from "./components/backoffice/section/categorie/categorie-section"
import { ThemeSection } from "./components/backoffice/section/theme/theme-section"
import { TextesSection } from "./components/backoffice/section/textes/textes-section"
import { AddTexteSection } from "./components/backoffice/section/add-texte/add-texte-section"
import { StatutSection } from "./components/backoffice/section/statut/statut-section"
import ProtectedRoute from "./components/protected-route"
import Home from "./components/home"
import { Users } from "./components/backoffice/section/user/users-section"
import { ConsommationSection } from "./components/backoffice/section/consommation/consommation-section"
import { HistoriqueSection } from "./components/backoffice/section/historique/historique-section"
import { ApercuSection } from "./components/backoffice/section/apercu/apercu-section"
import { ApercuSectionDetails } from "./components/backoffice/section/apercu/apercu-section-details"
import { BDDVectorielle } from "./components/backoffice/section/bdd_vectorielle/bdd-vectorielle-section"

// ─── Chemins publics centralisés ────────────────────────────────────────────

export default function App() {
  useInitAuth()
  const { isInitializing } = useAuthStore()

  // On attend que l'appel initial à /me soit terminé avant de rendre les routes.
  // Sans ça, React voit user=null pendant ~200ms et redirige vers /login
  // même si l'utilisateur est bien connecté (F5, retour d'onglet...).
  if (isInitializing) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#F0F4FF" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "#E4E9F7", borderTopColor: "#4F7EF7" }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <main className="flex-1">
        <Routes>
          {/* ── Publiques ─────────────────────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/douane/texdou" element={<TexteDouaniere />} />
          <Route
            path="/douane/texdou/:id"
            element={<TexteDouaniereDetails />}
          />

          {/* ── Backoffice (privé) ───────────────────────────────────
              Toute la branche /douane/backoffice/* est protégée : le
              layout parent est enveloppé dans ProtectedRoute, donc
              toutes les routes filles (rendues via <Outlet />) héritent
              automatiquement de la protection. Pas besoin de re-wrapper
              chaque enfant individuellement. */}
          <Route
            path="/douane/backoffice"
            element={
              <ProtectedRoute>
                <BackOffice />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<TextesSection />} />
            <Route path="apercu" element={<ApercuSection />}>
              <Route path=":id" element={<ApercuSectionDetails/>}/>
            </Route>
            <Route path="bdd-vectorielle" element={<BDDVectorielle/>}>

            </Route>
            <Route path="add-categorie" element={<CategorySection />} />
            <Route path="add-texte" element={<AddTexteSection />} />
            <Route path="edit-texte/:id" element={<AddTexteSection />} />
            <Route path="add-theme" element={<ThemeSection />} />
            <Route path="add-statut" element={<StatutSection />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="users" element={<Users />} />
            <Route path="historiques" element={<HistoriqueSection />} />
            <Route path="consommations" element={<ConsommationSection />} />
          </Route>

          {/* Authentification — route canonique = ROUTES.login ("/login") */}
          <Route path="/douane/manager" element={<LoginForm />} />

          {/* ── Fallback ──────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
