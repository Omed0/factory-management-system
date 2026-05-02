import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Factory, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getSupabaseAdmin } from '~/lib/supabase.server'
import { invalidateSettingsCache } from '~/routes/__root'
import { TextField, SelectField } from '~/components/form-fields'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'

const SetupSchema = z.object({
  factory_name:        z.string().min(2),
  tagline:             z.string().optional(),
  address:             z.string().optional(),
  city:                z.string().optional(),
  country:             z.string().default('Iraq'),
  phone:               z.string().optional(),
  email:               z.string().email().optional().or(z.literal('')),
  language:            z.enum(['ckb', 'ar', 'en']).default('ckb'),
  direction:           z.enum(['rtl', 'ltr']).default('rtl'),
  base_currency:       z.string().default('IQD'),
  default_dollar_rate: z.coerce.number().positive().default(1500),
  primary_color:       z.string().regex(/^#[0-9a-f]{6}$/i).default('#0ea5e9'),
  accent_color:        z.string().regex(/^#[0-9a-f]{6}$/i).default('#22c55e'),
  owner_name:          z.string().min(2),
  owner_email:         z.string().email(),
  owner_password:      z.string().min(8),
})

const completeSetup = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SetupSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin()

    // Server-side re-run guard — the beforeLoad check can be bypassed via direct POST.
    const { data: existing } = await admin.from('site_settings').select('setup_completed').eq('id', 1).single()
    if (existing?.setup_completed) throw new Error('Setup has already been completed')

    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email: data.owner_email,
      password: data.owner_password,
      email_confirm: true,
      user_metadata: { name: data.owner_name },
    })
    if (userErr) throw new Error(userErr.message)

    const { error: settingsErr } = await admin.from('site_settings').update({
      factory_name:        data.factory_name,
      tagline:             data.tagline || null,
      address:             data.address || null,
      city:                data.city || null,
      country:             data.country,
      phone:               data.phone || null,
      email:               data.email || null,
      language:            data.language,
      direction:           data.direction,
      base_currency:       data.base_currency,
      display_currency:    data.base_currency,
      default_dollar_rate: data.default_dollar_rate,
      primary_color:       data.primary_color,
      accent_color:        data.accent_color,
      setup_completed:     true,
    }).eq('id', 1)
    if (settingsErr) throw new Error(settingsErr.message)

    await admin.from('dollar').update({ price: data.default_dollar_rate }).eq('id', 1)

    return { ok: true, user_id: created.user!.id }
  })

export const Route = createFileRoute('/setup')({
  beforeLoad: ({ context }) => {
    if (context.settings?.setup_completed) throw redirect({ to: '/login' })
  },
  component: SetupWizard,
})

function ColorPicker({ form, name, label }: { form: any; name: string; label: string }) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label>{label}</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={f.state.value}
              onChange={(e) => f.handleChange(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
            />
            <span className="font-mono text-sm text-muted-foreground">{f.state.value}</span>
          </div>
        </div>
      )}
    </form.Field>
  )
}

function SetupWizard() {
  const router = useRouter()
  const { t } = useTranslation()

  const form = useForm({
    defaultValues: {
      factory_name: '', tagline: '', address: '', city: '', country: 'Iraq',
      phone: '', email: '', language: 'ckb' as const, direction: 'rtl' as const,
      base_currency: 'IQD', default_dollar_rate: 1500,
      primary_color: '#0ea5e9', accent_color: '#22c55e',
      owner_name: '', owner_email: '', owner_password: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await completeSetup({ data: value })
        invalidateSettingsCache()
        await router.invalidate()
        router.navigate({ to: '/login' })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Setup failed')
      }
    },
  })

  return (
    <div className="min-h-screen bg-muted/40 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('setup.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="space-y-5">

          {/* Factory Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('setup.factoryInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextField form={form} name="factory_name" label={t('setup.factoryName')} required />
              <TextField form={form} name="tagline" label={t('setup.tagline')} placeholder={t('setup.taglinePlaceholder')} />
              <div className="grid grid-cols-2 gap-3">
                <TextField form={form} name="country" label={t('setup.country')} />
                <TextField form={form} name="city" label={t('setup.city')} />
              </div>
              <TextField form={form} name="address" label={t('setup.address')} />
              <div className="grid grid-cols-2 gap-3">
                <TextField form={form} name="phone" label={t('setup.phone')} type="tel" />
                <TextField form={form} name="email" label={t('setup.email')} type="email" />
              </div>
            </CardContent>
          </Card>

          {/* Locale & Currency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('setup.localeAndCurrency')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <SelectField form={form} name="language" label={t('setup.language')} options={[
                  { value: 'ckb' as const, label: t('setup.kurdishSorani') },
                  { value: 'ar'  as const, label: t('setup.arabic') },
                  { value: 'en'  as const, label: t('setup.english') },
                ]} />
                <SelectField form={form} name="direction" label={t('setup.textDirection')} options={[
                  { value: 'rtl' as const, label: t('setup.rtl') },
                  { value: 'ltr' as const, label: t('setup.ltr') },
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField form={form} name="base_currency" label={t('setup.currencyCode')} placeholder="IQD" />
                <TextField form={form} name="default_dollar_rate" label={t('setup.usdRate')} type="number" required />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('setup.brandingColors')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <ColorPicker form={form} name="primary_color" label={t('setup.primaryColor')} />
                <ColorPicker form={form} name="accent_color" label={t('setup.accentColor')} />
              </div>
            </CardContent>
          </Card>

          {/* Owner Account */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('setup.ownerAccount')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextField form={form} name="owner_name" label={t('setup.fullName')} required />
              <TextField form={form} name="owner_email" label={t('setup.emailAddress')} type="email" required />
              <TextField form={form} name="owner_password" label={t('auth.password')} type="password" placeholder={t('setup.passwordPlaceholder')} required />
            </CardContent>
          </Card>

          <Separator />

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(submitting) => (
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? t('setup.creatingFactory') : t('setup.createFactory')}
              </Button>
            )}
          </form.Subscribe>

        </form>
      </div>
    </div>
  )
}
