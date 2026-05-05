import { ArrowUp, Plus, Settings2 } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

export const Chatbot = () => {
  return (
    <div className="flex h-[90vh] w-full flex-col gap-5">
      <div className="mx-auto mt-6 w-full max-w-3xl flex-1 overflow-y-scroll border"></div>
      <InputChat />
    </div>
  )
}

const InputChat = () => {
  return (
    <div className="mx-auto w-180 rounded-xl bg-red-400 shadow-lg">
      <Input
        className="mx-[2%] mt-6 h-12 w-[96%] rounded-lg px-4"
        placeholder="Message"
      />
      <div className="flex h-12 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Plus className="size-5" />
          <div className="flex items-center gap-1">
            <Settings2 className="size-4" />
            <span className="text-xs">Tools</span>
          </div>
        </div>
        <Button className="rounded-xl" variant={"success"}>
          <ArrowUp className="" />
        </Button>
      </div>
    </div>
  )
}
