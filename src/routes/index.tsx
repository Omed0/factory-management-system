import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

// Wrapped in createServerFn so Vite does not statically import supabase.server.ts
// (which imports node/bun-only APIs) into the client bundle.
const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSupabaseServer } = await import('~/lib/supabase.server')
  const sb = getSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return { authenticated: !!user }
})

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    if (!context.settings?.setup_completed) {
      throw redirect({ to: '/setup' })
    }
    const { authenticated } = await checkAuth()
    throw redirect({ to: authenticated ? '/app/dashboard' : '/login' })
  },
})
