import { SidebarLeft } from "@/components/chat/sidebar-left"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { BotMessageSquare, CircleArrowUp, Plus } from "lucide-react"
import { Input } from "../ui/input"
import { useState } from "react"

export const Chatbot = () => {
  return (
    <div className="h-[90vh] overflow-hidden">
      <SidebarProvider>
        <SidebarLeft />
        <SidebarInset>
          <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="line-clamp-1">
                      Discussion avec Texdou AI
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-col gap-4">
            <div className="mx-auto flex h-[65vh] w-full max-w-4xl rounded-lg p-4 shadow-xs">
              <BotMessage
                message="D'apres cette question , il ya plusieurs reponse a cela , la premiere  : 
                "
              />
            </div>
            <InputChat />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

const InputChat = () => {
  const [questionUser, setQuestionUser] = useState<string>("")

  return (
    <div className="mx-auto w-180 rounded-full border border-slate-200 shadow-lg">
      <div className="flex h-16 items-center gap-4 px-4">
        <Plus className="size-5" />
        <Input
          className="text-sm h-14 rounded-full border-none px-2 shadow-none focus:outline-none focus-visible:ring-0"
          placeholder="Poser une question"
          onChange={(e) => {
            setQuestionUser(e.target.value)
          }}
        />
        <CircleArrowUp
          className={`size-10 ${questionUser != "" ? "fill-black text-white" : ""}`}
          strokeWidth={1}
        />
      </div>
    </div>
  )
}

interface BotMessageProps {
  message: string
}

const BotMessage = ({ message }: BotMessageProps) => {
  return (
    <div className="relative">
      <div className="flex h-fit max-w-100 rounded-[0px_20px_20px_20px] bg-slate-100 p-2 text-xs text-pretty text-gray-900">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 border-b py-0.5">
            <BotMessageSquare className="" />
            <span>Texdou AI</span>
          </div>
          <span className="ml-2">{message}</span>
        </div>
      </div>
    </div>
  )
}
