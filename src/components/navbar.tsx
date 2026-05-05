import { Link } from "react-router-dom"
import { BookAIcon, Bot, File, User, UserPlus, UserRound } from "lucide-react"
import { useLocation } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Navbar() {
  const location = useLocation()
  return (
    <div className="fixed z-10 flex w-full items-center justify-between border-b bg-slate-50 px-10 py-3">
      <div className="flex cursor-pointer items-center gap-1">
        <BookAIcon className="size-5" />
        <Link to={"/"}>
          <span className="text-lg font-bold">TEXDOU</span>
        </Link>
      </div>
      <div className="liens flex items-center gap-6 text-sm">
        {location.pathname != "/login" && location.pathname != "/register" && (
          <Link
            to={"/chatbot"}
            className={`flex items-center gap-1 ${location.pathname == "/chatbot" ? "font-bold" : "font-normal text-gray-400"}`}
          >
            <Bot
              className={`size-6 ${location.pathname == "/chatbot" ? "font-bold" : "font-normal text-gray-400"}`}
            />{" "}
            <span className="mt-1">Chatbot</span>
          </Link>
        )}

        {location.pathname != "/login" && location.pathname != "/register" && (
          <Link
            to={"/documents"}
            className={`flex items-center gap-1 ${location.pathname == "/documents" ? "font-bold" : "font-normal text-gray-400"}`}
          >
            <File
              className={`size-5 ${location.pathname == "/documents" ? "font-bold" : "font-normal text-gray-400"}`}
            />{" "}
            <span className="mt-1">Documents</span>
          </Link>
        )}
      </div>
      <DropDownLink />
    </div>
  )
}

const DropDownLink = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1">
        <span
          className={`mt-1 ${location.pathname == "/login" || location.pathname == "/register" ? "font-bold" : "font-normal text-gray-400"}`}
        >
          <UserRound />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white">
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Link
              to={"/login"}
              className={`flex items-center gap-1 ${location.pathname == "/login" ? "font-bold" : "font-normal"}`}
            >
              <span className="mt-1">Se connecter</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link
              to={"/register"}
              className={`flex items-center gap-1 ${location.pathname == "/register" ? "font-bold" : "font-normal"}`}
            >
              <span className="mt-1 text-amber-600">S'inscrire</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
