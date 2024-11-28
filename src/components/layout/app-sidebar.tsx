"use client"

import * as React from "react"
import {
  Building2,
  PackageSearch,
  ShoppingCart,
  SquareKanban,
  Users,
  TicketPercent,
  Settings,
  BellDot,
  UserRound,
  Trash,
  LayoutDashboard,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSetting } from "@/components/layout/nav-settings"
import { NavUser } from "@/components/layout/nav-user"
import { Brand } from "@/components/layout/brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { useAuthUser } from "@/hooks/useSession"

const data = {
  navMain: [
    {
      title: "سەرەکی",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "کڕیارەکان",
      url: "/customer",
      icon: UserRound,
    },
    {
      title: "کۆمپانیاکان",
      url: "/company",
      icon: Building2,
    },
    {
      title: "کارمەندەکان",
      url: "/employee",
      icon: Users,
    },
    {
      title: "خەرجیەکان",
      url: "/expense",
      icon: TicketPercent,
    },
    {
      title: "بەرهەمەکان",
      url: "/product",
      icon: PackageSearch,
    },
    {
      title: "ڕاپۆرتات",
      url: "/report",
      icon: SquareKanban,
      items: [
        {
          title: "کڕین",
          url: "/report?report=purchase",
        },
        {
          title: "خەرجی",
          url: "/report?report=expense",
        },
        {
          title: "فرۆشتن",
          url: "/report?report=sale",
        },
        {
          title: "بەپێی مەواد",
          url: "/report/product",
        },
      ],
    },
  ],
  settings: [
    {
      name: "ڕێکخستنی سیستەم",
      url: "/setting",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useAuthUser()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSetting settings={data.settings} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session} />
      </SidebarFooter>
      {/*<SidebarRail />*/}
    </Sidebar>
  )
}
