'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
    }[];
  }[];
}) {

  const pathname = usePathname()
  const currentPath = `/${pathname.split("/")[1]}`
  //const currentSubPath = `/${pathname.split("/")[2]}`

  return (
    <SidebarGroup>
      <SidebarGroupLabel>پەیجەکان</SidebarGroupLabel>
      <SidebarMenu className='gap-2'>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;
          return (
            <Collapsible
              asChild
              key={item.title}
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem className={cn("", {
                "text-blue-500 hover:text-blue-700": currentPath.includes(item.url)
              })}>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} className="h-9 hover:text-inherit">
                    <Link className="flex items-center gap-2" href={item.url}>
                      {item.icon && <item.icon className="size-5" />}
                      <span>{item.title}</span>
                    </Link>
                    {hasSubItems && (
                      <ChevronRight
                        className="hover:bg-background ms-auto rounded-full transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {hasSubItems && (
                  <CollapsibleContent>
                    <SidebarMenuSub className='mx-1.5 px-1.5'>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem
                          key={subItem.title}
                        >
                          {subItem.icon && <subItem.icon className="size-5" />}
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
