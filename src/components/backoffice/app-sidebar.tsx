import * as React from "react"

import { NavMain } from "@/components/backoffice/nav-main"
import { NavSecondary } from "@/components/backoffice/nav-secondary"
import { NavUser } from "@/components/backoffice/nav-user"
import { useAuthStore } from "@/store/useAuthStore"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SquaresFourIcon, UsersIcon, GearIcon } from "@phosphor-icons/react"
import {
  Book,
  Bot,
  Database,
  Eye,
  FolderTree,
  Gauge,
  PlusIcon,
  RotateCcwClock,
  Tags,
  TypeOutline,
} from "lucide-react"

const data = {
  navMain: [
    {
      title: "Apercu",
      url: "/douane/backoffice/apercu",
      icon: <Eye />,
      accessibility: "normal,admin,expert",
    },

    {
      title: "Chatbot",
      url: "/douane/backoffice/chatbot",
      icon: <Bot />,
      accessibility: "normal,admin,expert",
    },
    {
      title: "Tous les textes",
      url: "/douane/backoffice/",
      icon: <SquaresFourIcon />,
      accessibility: "normal,admin,expert",
    },
    {
      title: "Ajouter",
      url: "/douane/backoffice/add-texte",
      icon: <PlusIcon />,
      accessibility: "admin,expert",
    },
    {
      title: "Catégories de texte",
      url: "/douane/backoffice/add-categorie",
      icon: <FolderTree />,
      accessibility: "admin,expert",
    },
    {
      title: "Statuts de texte",
      url: "/douane/backoffice/add-statut",
      icon: <Tags />,
      accessibility: "admin,expert",
    },
    {
      title: "Thème de texte",
      url: "/douane/backoffice/add-theme",
      icon: <TypeOutline />,
      accessibility: "admin,expert",
    },
    {
      title: "Utilisateurs",
      url: "/douane/backoffice/users",
      icon: <UsersIcon />,
      // Route backend protégée par require_admin_or_expert (voir
      // user_route.py) : admin et expert y ont accès.
      accessibility: "admin,expert",
    },
    {
      title: "Historiques",
      url: "/douane/backoffice/historiques",
      icon: <RotateCcwClock />,
      accessibility: "admin,expert",
    },
    {
      title: "Consommations",
      url: "/douane/backoffice/consommations",
      icon: <Gauge />,
      accessibility: "expert",
    },
    {
      title: "BDD Véctorielle",
      url: "/douane/backoffice/bdd-vectorielle",
      icon: <Database />,
      accessibility: "expert",
    },
  ],
  navSecondary: [
    {
      title: "Paramètres",
      url: "#",
      icon: <GearIcon />,
      accessibilty: "normal",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore()
  if (!user) return <div>User manquant</div>
  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="bg-sidebar-background border-r border-sidebar-foreground/5"
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarGroupLabel className="mt-2 ml-2 font-extrabold text-sidebar-foreground data-[slot=sidebar-menu-button]:p-1.5!">
            <Book className="mr-2 size-10" />
            <span className="text-[16px]">TEXDOU</span>
          </SidebarGroupLabel>
        </SidebarMenuItem>
      </SidebarMenu>

      <SidebarContent className="border-sidebar-border">
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}