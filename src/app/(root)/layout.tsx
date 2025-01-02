import '@/styles/globals.css';

import { PropsWithChildren, Suspense } from 'react';

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
          <Suspense fallback={"چاوەڕوانبە..."}>
            <CustomLayout session={session} dollar={(data.price || 0)}>
              {children}
            </CustomLayout>
          </Suspense>
        </ProviderReactQuery>
      </body>
    </html>
  );
}

export default RootLayout;
