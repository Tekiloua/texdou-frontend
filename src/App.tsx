import { DocumentList } from "./components/document-list"
import Navbar from "./components/navbar"
import { Chatbot } from "./components/chat/chatbot"
import { TexteDetails } from "./components/texte-details"
import { Navigate, Route, Routes } from "react-router-dom"
import { LoginForm } from "./components/login-form"
import { RegisterForm } from "./components/register-form"
import UploadForm from "./components/form-upload"
import Stats from "./components/stats"
import Dashboard from "./components/dashboard"
import ProtectedRoute from "./components/protected-route"
import Home from "./components/home"
import { useInitAuth } from "./auth/useInitAuth"
import { useAuthStore } from "./store/useAuthStore"
import NotificationPanel from "./components/notification"
import PDFStats from "./components/pdf-stat"

function App() {
  useInitAuth()
  const { user, isInitializing } = useAuthStore()

  // On attend que le refresh initial soit terminé avant de rendre les routes.
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
      style={{ background: "#F0F4FF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <Navbar />

      <main className="flex-1" style={{ paddingTop: 62 }}>
        <Routes>
          {/* ── Publiques ─────────────────────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/login"    element={<AuthPage><LoginForm /></AuthPage>} />
          <Route path="/register" element={<AuthPage><RegisterForm /></AuthPage>} />

          {/* ── Protégées (tout utilisateur connecté) ─────────────── */}
          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <ProtectedRoute>
                <TexteDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pdf-stats"
            element={
              <ProtectedRoute>
                <PDFStats />
            //  </ProtectedRoute>
            }
          />
          <Route
            path="/notification"
            element={
              <ProtectedRoute>
                <NotificationPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadForm />
              </ProtectedRoute>
            }
          />

          {/* ── Protégée + rôle admin/expert (géré dans ProtectedRoute) ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="expert">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Fallback ──────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

/** Wrapper centré pour les pages login / register */
const AuthPage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-full w-full items-center justify-center px-4 py-12">
    <div
      className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"
      style={{ borderColor: "#E4E9F7" }}
    >
      {children}
    </div>
  </div>
)

export default App