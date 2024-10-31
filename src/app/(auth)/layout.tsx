import '@/styles/globals.css';

import { PropsWithChildren } from 'react';

const AuthLayout = ({ children }: PropsWithChildren) => {
    return (
        <html suppressHydrationWarning>
            <body>
                {children}
            </body>
        </html>
    );
};

export default AuthLayout;
