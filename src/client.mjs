import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    client: {
        APP_URL: z.string().url().min(1),
    },
    experimental__runtimeEnv: {
        APP_URL: process.env.APP_URL,
    },
});
