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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "فرۆشتن",
      url: "/sale",
      icon: ShoppingCart,
      isActive: false,
      items: [
        {
          title: "زیادکردن",
          url: "/sale/add",
        },
        {
          title: "قەرزەکان",
          url: "/sale?type=loan",
        },
        {
          title: "کڕیارەکان",
          url: "/sale/customer",
        },
      ],
    },
    {
      title: "ڕاپۆرتەکان",
      url: "#",
      icon: SquareKanban,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
      ],
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
      title: "کارمەندەکان",
      url: "/employee",
      icon: Users,
    },
    {
      title: "کۆمپانیاکان",
      url: "/company",
      icon: Building2,
    },
  ],
  settings: [
    {
      name: "ڕێکخستنی سیستەم",
      url: "/setting",
      icon: Settings,
    },
    {
      name: "ئاگادارکردنەوەکان",
      url: "#",
      icon: BellDot,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavUser user={data.user} />
      </SidebarFooter>
      {/*<SidebarRail />*/}
    </Sidebar>
  )
}
