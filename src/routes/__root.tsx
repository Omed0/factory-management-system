import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { loadSiteSettings, colorToOklch, type SiteSettings } from '~/lib/site-settings'
import { setSSRLanguage } from '~/lib/i18n'
import type { RouterContext } from '~/router'
import appCss from '~/styles/app.css?url'

let _settings: SiteSettings | null | undefined = undefined

// Runs before first paint — prevents flash of wrong color scheme.
const themeInitScript = `try{var t=localStorage.getItem('theme'),d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}`

export function invalidateSettingsCache() {
  _settings = undefined
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    await setSSRLanguage()
    if (_settings === undefined) {
      _settings = await loadSiteSettings()
    }
    return { settings: _settings }
  },
  loader: ({ context }) => context.settings,
  staleTime: Infinity,
  head: ({ loaderData: settings }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: settings?.factory_name ?? 'Factory' },
      ...(settings?.tagline ? [{ name: 'description', content: settings.tagline }] : []),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      ...(settings?.favicon_url ? [{ rel: 'icon', href: settings.favicon_url }] : []),
    ],
  }),
  component: RootComponent,
  errorComponent: CustomErrorComponent,
  notFoundComponent: CustomNotFoundComponent,
})

function RootComponent() {
  const settings = Route.useLoaderData() as SiteSettings | null
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }))
  const { i18n } = useTranslation()

  useEffect(() => {
    const update = (lng: string) => {
      const dir = lng === 'en' ? 'ltr' : 'rtl'
      document.documentElement.lang = lng
      document.documentElement.dir = dir
    }
    i18n.on('languageChanged', update)
    return () => { i18n.off('languageChanged', update) }
  }, [i18n])

  const bodyStyle = settings
    ? ({
      '--color-primary': colorToOklch(settings.primary_color),
      '--color-accent': colorToOklch(settings.accent_color),
    } as React.CSSProperties)
    : undefined

  const lang = i18n.language || settings?.language || 'ckb'
  const dir = lang === 'en' ? 'ltr' : 'rtl'

  return (
    <html lang={lang} dir={dir}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body style={bodyStyle}>
        <QueryClientProvider client={qc}>
          <Outlet />
          <Toaster richColors position="top-center" />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}


function CustomErrorComponent({ error }: { error: Error }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <h3 className="font-semibold tracking-tight text-destructive flex items-center gap-2 text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {t('errors.unexpectedError')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('errors.unexpectedErrorDesc')}</p>
        </div>
        <div className="p-6 pt-0">
          <pre className="mt-2 max-h-62.5 overflow-auto rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            <code>{error.message}</code>
          </pre>
        </div>
        <div className="flex items-center p-6 pt-0">
          <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full">
            {t('errors.refreshPage')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomNotFoundComponent() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground shadow p-8 text-center flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-muted-foreground"><circle cx="12" cy="12" r="10" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
        </div>
        <h3 className="font-semibold tracking-tight text-2xl mb-2">{t('errors.pageNotFound')}</h3>
        <p className="text-sm text-muted-foreground mb-8">
          {t('errors.pageNotFoundDesc')}
        </p>
        <button onClick={() => window.history.back()} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full max-w-50">
          {t('errors.goBack')}
        </button>
      </div>
    </div>
  )
}
