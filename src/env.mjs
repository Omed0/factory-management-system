import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().url().min(1),
    SECRET: z.string().min(1),
    TOKEN_TELEGRAM: z.string().min(1),
    CHAT_ID: z.string().min(1),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_HOST: z.string().min(1),
    DB_NAME: z.string().min(1),
  },
  experimental__runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    SECRET: process.env.SECRET,
    TOKEN_TELEGRAM: process.env.TOKEN_TELEGRAM,
    CHAT_ID: process.env.CHAT_ID,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
  },
});
