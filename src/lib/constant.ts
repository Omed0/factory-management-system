import { env } from '@/client.mjs';

export const siteConfig = {
  title: '',
  description: '',
  keywords: () => [],
  url: () => env.APP_URL,
};
