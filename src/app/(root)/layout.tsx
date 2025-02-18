import '@/styles/globals.css';
import '@/styles/print.css';

import { PropsWithChildren } from 'react';

import { getDollarActions } from '@/actions/boxes';
import CustomLayout from '@/components/layout/customLayout';
import ProviderReactQuery from '@/components/layout/provider-react-query';
import { getSession } from '@/lib/cookies';

export const dynamic = 'force-dynamic'

async function RootLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  const { data, message } = await getDollarActions();
  if (!data || !data.price) throw new Error(message);

  return (
    <html>
      <body className="w-full">
        <ProviderReactQuery>
          <CustomLayout session={session} dollar={(data.price || 0)}>
            {children}
          </CustomLayout>
        </ProviderReactQuery>
      </body>
    </html>
  );
}

export default RootLayout;

