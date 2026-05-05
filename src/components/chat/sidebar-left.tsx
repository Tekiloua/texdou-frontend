"use client"

import * as React from "react"

import { NavMain } from "@/components/chat/nav-main"
import { NavSecondary } from "@/components/chat/nav-secondary"
import { TeamSwitcher } from "@/components/chat/team-switcher"
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

// This is sample data.
const data = {
  teams: [
    {
      name: "Acme Inc",
      logo: <CommandIcon />,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: <WaveformIcon />,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: <CommandIcon />,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Search",
      url: "#",
      icon: <MagnifyingGlassIcon />,
    },
    {
      title: "Ask AI",
      url: "#",
      icon: <SparkleIcon />,
    },
    {
      title: "FAQ",
      url: "#",
      icon: <QuestionMarkIcon />,
      isActive: true,
    },
    {
      title: "Paramètre",
      url: "#",
      icon: <GearIcon />,
      badge: "10",
    },
  ],
  navSecondary: [],
}

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="mt-20 border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
