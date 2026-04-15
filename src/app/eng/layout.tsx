'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Inbox, Wrench, BarChart3, Search } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

const NAV_ITEMS = [
  { href: '/eng/providers', label: 'Providers', icon: Building2, hasBadge: false },
  { href: '/eng/requests', label: 'Requests', icon: Inbox, hasBadge: true },
  { href: '/eng/fixes', label: 'Fixes', icon: Wrench, hasBadge: true },
  { href: '/eng/accuracy', label: 'Accuracy', icon: BarChart3, hasBadge: true },
  { href: '/eng/discovery', label: 'Discovery', icon: Search, hasBadge: false },
] as const

export default function EngLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/eng" className="flex items-center gap-2 font-semibold text-sm">
            <span className="text-primary font-extrabold">m</span>
            <span>eng</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              {NAV_ITEMS.map(({ href, label, icon: Icon, hasBadge }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {hasBadge && <SidebarMenuBadge>0</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Billing Intelligence Playground</span>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
