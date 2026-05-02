import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Factory, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getSupabaseServer } from '~/lib/supabase.server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { TextField } from '~/components/form-fields'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const login = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => LoginSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { error } = await sb.auth.signInWithPassword(data)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (!context.settings?.setup_completed) throw redirect({ to: '/setup' })
  },
  component: Login,
})

function Login() {
  const router = useRouter()
  const { settings } = Route.useRouteContext()
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      try {
        await login({ data: value })
        await router.invalidate()
        router.navigate({ to: '/app/dashboard' })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('auth.signInFailed'))
      }
    },
  })

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{settings?.factory_name ?? 'Factory'}</h1>
            {settings?.tagline && (
              <p className="text-sm text-muted-foreground mt-0.5">{settings.tagline}</p>
            )}
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('auth.signIn')}</CardTitle>
            <CardDescription>{t('auth.signInDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
            >
              <TextField form={form} name="email"    label={t('auth.email')}    type="email"    required />
              <TextField form={form} name="password" label={t('auth.password')} type="password" required />

              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(submitting) => (
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
