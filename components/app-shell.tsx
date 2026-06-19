"use client"

import { type CSSProperties } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/reports/current", label: "Report", icon: FileText },
]

export function AppShell({
  actions,
  children,
}: {
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <SidebarProvider style={{ "--sidebar-width": "14rem" } as CSSProperties}>
      <Sidebar>
        <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground">
              K
            </span>
            <span className="font-mono text-base font-semibold tracking-tight">koin</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="py-3">
            <SidebarMenu className="gap-1.5">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="font-mono hover:bg-sidebar-accent/40 data-[active=true]:bg-primary/10 data-[active=true]:font-medium data-[active=true]:text-primary data-[active=true]:[&>svg]:text-primary"
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>

          {actions ? (
            <SidebarGroup className="mt-1">
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent className="flex flex-col gap-2 px-2 pt-1">{actions}</SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>

        <SidebarFooter>
          <Badge variant="outline" className="w-fit gap-1.5 font-mono text-[11px] font-normal text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            private · runs in your browser
          </Badge>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-mono text-sm font-semibold tracking-tight lg:hidden">koin</span>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
