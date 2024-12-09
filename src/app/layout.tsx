import '@/styles/globals.css';

import { PropsWithChildren, useId } from 'react';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { siteConfig } from '@/lib/constant';
import { fonts } from '@/lib/fonts';
import { cn } from '@/lib/utils';

export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(siteConfig.url()),
  title: {
    default: 'Factory System Management',
    template: `%s | Factory System Management`,
  },
  description:
    'Factory System Management is a system that helps you manage your factory and its employees',
  keywords: siteConfig.keywords(),
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon-16x16.png',
    apple: '/favicon/apple-touch-icon.png',
  },
});

const MainLayout = ({ children }: PropsWithChildren) => {
  const id = useId();
  return (
    <html suppressHydrationWarning lang="ckb">
      <body className={cn('min-h-screen', fonts)}>
        {children}
        <Toaster key={id} duration={3000} />
      </body>
    </html>
  );
};

export default MainLayout;
