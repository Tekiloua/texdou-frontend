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

function App() {
  useInitAuth()
  const user = useAuthStore((state) => state.user)

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "#F0F4FF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <Navbar />

      {/* Content pushed below fixed navbar (height 62px) */}
      <main className="flex-1" style={{ paddingTop: 62 }}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/upload"
            element={<UploadForm />}
          />

          <Route path="/stats" element={<Stats />} />

          <Route
            path="/chatbot"
            element={user ? <Chatbot /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={user ? <DocumentList /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/documents/:id"
            element={user ? <TexteDetails /> : <Navigate to="/login" replace />}
          />

          <Route path="/login" element={<AuthPage><LoginForm /></AuthPage>} />
          <Route path="/register" element={<AuthPage><RegisterForm /></AuthPage>} />
        </Routes>
      </main>
    </div>
  )
}

/** Centered wrapper for login / register pages */
const AuthPage = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-full w-full items-center justify-center px-4 py-12">
    <div
      className="w-full max-w-md rounded-[16px] border bg-white p-8 shadow-sm"
      style={{ borderColor: "#E4E9F7" }}
    >
      {children}
    </div>
  </div>
)

export default App