import CustomLayout from '@/components/layout/customLayout';
import '@/styles/globals.css';

import { PropsWithChildren } from 'react';


const RootLayout = ({ children }: PropsWithChildren) => {
    return (
        <html suppressHydrationWarning>
            <body className="w-full">
                <CustomLayout>
                    {children}
                </CustomLayout>
            </body>
        </html>
    );
};

export default RootLayout;
