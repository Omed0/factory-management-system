'use client';

import { ReactNode, useEffect } from 'react';

import ChangeCurrency from '../change-currency';
import { ThemeProvider } from '../theme-provider';
import { ThemeSwitcher } from '../theme-switcher';
import { AppSidebar } from './app-sidebar';
import { Footer } from './footer';

import FormDollar from '@/components/layout/form-dollar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import FullscreenComponent from '@/hooks/use-fullscreen';
import { useDollar } from '@/hooks/useDollar';
import { useAuthUser } from '@/hooks/useSession';
import { LoginUserType } from '@/server/access-layer/user';

export default function CustomLayout({
  children,
  session,
  dollar,
}: {
  children: ReactNode;
  session: LoginUserType;
  dollar: number;
}) {
  const { setData } = useAuthUser();
  const { setData: setDollar } = useDollar();

  useEffect(() => {
    setData(session);
  }, [session, setData]);

  useEffect(() => {
    setDollar({ dollar });
  }, [dollar, setDollar]);

  return (
    <SidebarProvider className="relative max-w-full">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <ThemeProvider attribute="class">
          <div className="flex items-center justify-between pe-2">
            <SidebarTrigger className="size-9" />
            <div className="mt-1 flex items-center gap-4">
              <ThemeSwitcher className="fixed bottom-5 end-5 z-20" />
              <ChangeCurrency />
              <FullscreenComponent />
              <FormDollar dollar={dollar} />
            </div>
          </div>
          {children}
          <Footer />
        </ThemeProvider>
      </div>
    </SidebarProvider>
  );
}
