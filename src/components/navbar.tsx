import { Link } from "react-router-dom"
import { BookAIcon, Bot, File } from "lucide-react"
import { useLocation } from "react-router-dom"

export default function Navbar() {
  const location = useLocation()
  return (
    <div className="fixed z-20 flex h-[8vh] w-full items-center justify-between border-b bg-slate-50 px-10">
      <div className="flex cursor-pointer items-center gap-1">
        <BookAIcon className="size-5" />
        <span className="text-lg font-bold">TEXDOU</span>
      </div>
      <div className="liens flex items-center gap-6 text-sm">
        <Link
          to={"/chatbot"}
          className={`flex items-center gap-1 ${location.pathname == "/chatbot" ? "font-bold" : "font-normal text-gray-400"}`}
        >
          <Bot
            className={`size-6 ${location.pathname == "/chatbot" ? "font-bold" : "font-normal text-gray-400"}`}
          />{" "}
          <span className="mt-1">Chatbot</span>
        </Link>
        <Link
          to={"/documents"}
          className={`flex items-center gap-1 ${location.pathname == "/documents" ? "font-bold" : "font-normal text-gray-400"}`}
        >
          <File
            className={`size-5 ${location.pathname == "/documents" ? "font-bold" : "font-normal text-gray-400"}`}
          />{" "}
          <span className="mt-1">Documents</span>
        </Link>
      </div>
    </div>
  )
}
