"use client"

import * as React from "react"
import { NavMain } from "@/components/chat/nav-main"
import { NavSecondary } from "@/components/chat/nav-secondary"
// import { TeamSwitcher } from "@/components/chat/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  CommandIcon,
  WaveformIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  GearIcon,
  QuestionMarkIcon,
} from "@phosphor-icons/react"

const data = {
  teams: [
    { name: "Acme Inc", logo: <CommandIcon />, plan: "Enterprise" },
    { name: "Acme Corp.", logo: <WaveformIcon />, plan: "Startup" },
    { name: "Evil Corp.", logo: <CommandIcon />, plan: "Free" },
  ],
  navMain: [
    { title: "Recherche", url: "#", icon: <MagnifyingGlassIcon /> },
    { title: "Texdou AI", url: "#", icon: <SparkleIcon />, isActive: true },
    { title: "FAQ", url: "#", icon: <QuestionMarkIcon /> },
    { title: "Paramètres", url: "#", icon: <GearIcon />, badge: "10" },
  ],
  navSecondary: [],
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="mt-15 border-r border-stone-200 bg-background"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      {...props}
    >
      <SidebarHeader className="border-b border-stone-200 pb-3">
        {/* <TeamSwitcher teams={data.teams} /> */}
        {/* Section label */}
        <p className="mt-3 px-2 text-[9px] font-semibold tracking-[0.2em] text-stone-400 uppercase">
          Navigation
        </p>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
