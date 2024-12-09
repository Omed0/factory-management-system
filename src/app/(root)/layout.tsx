import '@/styles/globals.css';

import { PropsWithChildren, Suspense } from 'react';

import { getDollarActions } from '@/actions/boxes';
import CustomLayout from '@/components/layout/customLayout';
import ProviderReactQuery from '@/components/layout/provider-react-query';
import { getSession } from '@/lib/cookies';

async function RootLayout({ children }: PropsWithChildren) {
  const session = await getSession();
  const { success, data, message } = await getDollarActions();
  if (!success || !data?.dollar)
    throw new Error(message || 'دۆلار کێشەی تیایە');

  return (
    <html>
      <body className="w-full">
        <ProviderReactQuery>
          <Suspense fallback={"چاوەڕوانبە..."}>
            <CustomLayout session={session} dollar={data.dollar}>
              {children}
            </CustomLayout>
          </Suspense>
        </ProviderReactQuery>
      </body>
    </html>
  );
}

export default RootLayout;
