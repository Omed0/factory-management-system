import { z } from 'zod'

const schema = z.object({
  // Supabase — internal URL used for server-to-server calls (inside Docker network)
  SUPABASE_URL: z.string().url().optional(),
  // Public URL — used by the browser and by SSR when building external links
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Cloudflare R2 (optional — only needed when backup_provider = 'r2')
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
})

function load() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    console.error('[env] Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    throw new Error('Missing or invalid environment variables — check .env.example')
  }
  return result.data
}

export const env = load()

export const supabaseUrl = env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL
