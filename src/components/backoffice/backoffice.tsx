import { AppSidebar } from "./app-sidebar"
import { SiteHeader } from "./site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { Outlet } from "react-router"

export const BackOffice = () => {
  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        {/* <SidebarInset className="h-svh overflow-hidden"> */}
        <SidebarInset className="overflow-hidden">
          <SiteHeader />
          {/* Seule cette zone scrolle : le SiteHeader reste toujours visible. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}