import { DocumentList } from "./components/document-list"
import Navbar from "./components/navbar"
import { Chatbot } from "./components/chat/chatbot"
import { TexteDetails } from "./components/texte-details"
import { Route, Routes } from "react-router-dom"
import { LoginForm } from "./components/login-form"
import { RegisterForm } from "./components/register-form"

function App() {
  return (
    <div className="grid h-screen grid-rows-[auto_fr]">
      <Navbar />
      <div className="h-full pt-20">
        <Routes>
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="/documents" element={<DocumentList />} />
          <Route path="/documents/:id" element={<TexteDetails />} />
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
