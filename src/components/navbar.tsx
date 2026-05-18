import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Link } from "react-router-dom"
import { BookAIcon, Bot, File, UserRound } from "lucide-react"
import { useLocation } from "react-router-dom"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"

export default function Navbar() {
  const location = useLocation()
  return (
    <div className="fixed z-10 flex w-full items-center justify-between border-b-2 border-card-foreground px-10 py-3 text-accent-foreground backdrop-blur-2xl">
      <div className="flex cursor-pointer items-center gap-1 text-amber-700 dark:text-accent">
        <BookAIcon className="size-5" />
        <Link to={"/"}>
          <span className="text-lg font-bold">TEXDOU</span>
        </Link>
      </div>
      <div className="liens flex items-center gap-6 text-sm">
        {location.pathname != "/login" && location.pathname != "/register" && (
          <Link
            to={"/chatbot"}
            className={`flex items-center gap-1 ${location.pathname == "/chatbot" ? "font-bold text-amber-700 dark:text-secondary" : "font-normal text-primary/70"}`}
          >
            <Bot
              className={`size-6 ${location.pathname == "/chatbot" ? "font-bold text-amber-700 dark:text-secondary" : "font-normal text-primary/70"}`}
            />{" "}
            <span className="mt-1">Chatbot</span>
          </Link>
        )}

        {location.pathname != "/login" && location.pathname != "/register" && (
          <Link
            to={"/documents"}
            className={`flex items-center gap-1 ${location.pathname == "/documents" ? "font-bold text-amber-700 dark:text-secondary" : "font-normal text-primary/70"}`}
          >
            <File
              className={`size-5 ${location.pathname == "/documents" ? "font-bold text-amber-700 dark:text-secondary" : "font-normal text-primary/70"}`}
            />{" "}
            <span className="mt-1">Documents</span>
          </Link>
        )}
      </div>
      <div className="flex">
        <ToogleMode />
        <Link to="/login">
          <Button
            className={`${location.pathname === "/login" ? "text-amber-700 dark:text-secondary" : "text-foreground"}`}
          >
            <UserRound className="size-6" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// const DropDownLink = () => {
//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger className="flex items-center text-accent-foreground">
//         <span
//           className={`mt-1 ${location.pathname == "/login" || location.pathname == "/register" ? "font-bold" : "font-normal text-gray-400"}`}
//         >
//           <UserRound className="text-accent-foreground" />
//         </span>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent className="bg-white">
//         <DropdownMenuGroup>
//           <DropdownMenuItem>
//             <Link
//               to={"/login"}
//               className={`flex items-center ${location.pathname == "/login" ? "font-bold" : "font-normal"}`}
//             >
//               <span className="mt-1">Se connecter</span>
//             </Link>
//           </DropdownMenuItem>
//           <DropdownMenuSeparator />
//           <DropdownMenuItem>
//             <Link
//               to={"/register"}
//               className={`flex items-center gap-1 ${location.pathname == "/register" ? "font-bold" : "font-normal"}`}
//             >
//               <span className="mt-1 text-amber-600">S'inscrire</span>
//             </Link>
//           </DropdownMenuItem>
//         </DropdownMenuGroup>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   )
// }

const ToogleMode = () => {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        {theme === "light" ? (
          <Moon className="size-5 text-primary" />
        ) : (
          <Sun className="size-5 text-primary" />
        )}
      </Button>
    </div>
  )
}
