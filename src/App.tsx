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
    <div className="grid h-screen grid-rows-[auto_fr]">
      <Navbar />
      <div className="h-full pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/upload"
            element={user ? <UploadForm /> : <Navigate to="/login" replace />}
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </div>
    </div>
  )
}

const RegisterPage = () => {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="flex h-full max-w-lg items-center justify-center gap-6 rounded-xl p-6 md:p-10">
        <RegisterForm />
      </div>
    </div>
  )
}

const LoginPage = () => {
  return (
    <div className="flex h-full w-full justify-center">
      <div className="flex h-full max-w-lg items-center justify-center gap-6 rounded-xl p-6 md:p-10">
        <LoginForm />
      </div>
    </div>
  )
}

export default App
