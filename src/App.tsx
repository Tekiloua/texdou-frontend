import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import TexteDetails from "./components/texte-details"
import TexteList from "./components/texte-list"
import Navbar from "./components/navbar"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
       <div>
        <Navbar />
         <Routes>
          <Route path="/documents" element={<TexteList />} />
          <Route path="/documents/:id" element={<TexteDetails />} />
        </Routes>
       </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
