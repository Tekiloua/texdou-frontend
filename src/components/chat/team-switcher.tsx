"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
}) {
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  if (!activeTeam) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="w-fit gap-2 px-2 py-1.5 hover:bg-stone-100 data-[state=open]:bg-stone-100"
              style={{ borderRadius: 0 }}
            >
              {/* Logo square */}
              <div
                className="flex size-5 items-center justify-center bg-stone-900 text-white"
                style={{ borderRadius: 0 }}
              >
                {activeTeam.logo}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs leading-tight font-medium text-stone-800">
                  {activeTeam.name}
                </span>
                <span className="text-[9px] tracking-wide text-stone-400 uppercase">
                  {activeTeam.plan}
                </span>
              </div>
              <CaretDownIcon className="ml-1 text-stone-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56 border border-stone-200 bg-white shadow-lg"
            align="start"
            side="bottom"
            sideOffset={4}
            style={{ borderRadius: 0, fontFamily: "'DM Sans', sans-serif" }}
          >
            <DropdownMenuLabel className="px-3 py-2 text-[9px] font-semibold tracking-[0.2em] text-stone-400 uppercase">
              Équipes
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                style={{ borderRadius: 0 }}
              >
                <div className="flex size-5 items-center justify-center border border-stone-200 bg-stone-50">
                  {team.logo}
                </div>
                <span className="flex-1">{team.name}</span>
                <DropdownMenuShortcut className="text-xs text-stone-300">
                  ⌘{index + 1}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-stone-100" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:bg-stone-50"
              style={{ borderRadius: 0 }}
            >
              <div className="flex size-5 items-center justify-center border border-dashed border-stone-300">
                <PlusIcon className="size-3" />
              </div>
              <span className="text-xs">Ajouter une équipe</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
