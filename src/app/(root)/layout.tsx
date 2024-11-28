import '@/styles/globals.css';
import { PropsWithChildren } from 'react';
import CustomLayout from '@/components/layout/customLayout';
import { getSession } from '@/lib/cookies';
import ProviderReactQuery from '@/components/layout/provider-react-query';
import { getDollarActions } from '@/actions/boxes';


async function RootLayout({ children }: PropsWithChildren) {
    const session = await getSession()
    const { success, data, message } = await getDollarActions()
    if (!success || !data?.dollar) throw new Error(message || "دۆلار کێشەی تیایە")

    return (
        <html>
            <body className="w-full">
                <ProviderReactQuery>
                    <CustomLayout session={session} dollar={data.dollar}>
                        {children}
                    </CustomLayout>
                </ProviderReactQuery>
            </body>
        </html>
    );
};

export default RootLayout;
