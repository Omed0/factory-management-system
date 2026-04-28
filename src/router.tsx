import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import type { SiteSettings } from '~/lib/site-settings'

export type UserRole = 'OWNER' | 'ADMIN' | 'USER'

export interface RouterProfile {
  id: string
  name: string
  role: UserRole
}

export interface RouterContext {
  settings: SiteSettings | null
  // Populated by /app route beforeLoad; undefined outside the /app subtree.
  profile?: RouterProfile
  permissions?: string[]
}

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultErrorComponent: ({ error }) => (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 max-w-md w-full">
          <h2 className="font-semibold text-destructive mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">{(error as Error)?.message ?? 'Unexpected error'}</p>
        </div>
      </div>
    ),
    context: { settings: null } satisfies RouterContext,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

export function getRouter() {
  return createRouter()
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
