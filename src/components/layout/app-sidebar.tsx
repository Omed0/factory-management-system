'use client';

import * as React from 'react';
import {
  Building2,
  LayoutDashboard,
  PackageSearch,
  ReceiptText,
  Settings,
  SquareKanban,
  TicketPercent,
  UserRound,
  UserRoundMinus,
  Users,
} from 'lucide-react';

import { Brand } from '@/components/layout/brand';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuthUser } from '@/hooks/useSession';

const data = {
  navMain: [
    {
      title: 'سەرەکی',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'فرۆشتنەکان',
      url: '/customer',
      icon: UserRound,
    },
    {
      title: 'کڕینەکان',
      url: '/company',
      icon: Building2,
    },
    {
      title: 'کارمەندەکان',
      url: '/employee',
      icon: Users,
    },
    {
      title: 'خەرجیەکان',
      url: '/expense',
      icon: TicketPercent,
    },
    {
      title: 'بەرهەمەکان',
      url: '/product',
      icon: PackageSearch,
    },
    {
      title: 'ڕاپۆرتات',
      url: '/report',
      icon: SquareKanban,
      isActive: true,
      items: [
        {
          title: 'قەرز',
          url: '/report/loan',
        },
        {
          title: 'کڕین',
          url: '/report/purchase',
        },
        {
          title: 'خەرجی',
          url: '/report/expense',
        },
        {
          title: 'فرۆشتن',
          url: '/report/sale',
        },
        {
          title: 'وەصڵی سەربەخۆ',
          url: '/report/self-invoice',
        },
        {
          title: 'کەشف حسابی کەسی',
          url: '/report/person',
        },
        {
          title: 'کەشف حساب کارمەند',
          url: '/report/employee',
        },
        {
          title: 'کەشف حساب قاسە',
          url: '/report/each-action',
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useAuthUser();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Brand />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session} />
      </SidebarFooter>
      {/*<SidebarRail />*/}
    </Sidebar>
  );
}
