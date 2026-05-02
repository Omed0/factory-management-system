import { createFileRoute, useRouter } from '@tanstack/react-router';
import { invalidateSettingsCache } from '~/routes/__root';
import { createServerFn } from '@tanstack/react-start';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSupabaseServer } from '~/lib/supabase.server';
import { loadSiteSettings } from '~/lib/site-settings';
import { LANG_META } from '~/lib/i18n';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

const SettingsSchema = z.object({
  factory_name: z.string().min(2),
  legal_name: z.string().nullish().transform((v) => v || null),
  tagline: z.string().nullish().transform((v) => v || null),
  logo_url: z.string().nullish().transform((v) => v || null),
  favicon_url: z.string().nullish().transform((v) => v || null),
  primary_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  address: z.string().nullish().transform((v) => v || null),
  city: z.string().nullish().transform((v) => v || null),
  country: z.string().min(1),
  phone: z.string().nullish().transform((v) => v || null),
  email: z.union([z.string().email(), z.literal('')]).nullish().transform((v) => v || null),
  tax_id: z.string().nullish().transform((v) => v || null),
  language: z.enum(['ckb', 'ar', 'en']),
  base_currency: z.string().min(3).max(4),
  display_currency: z.string().min(3).max(4),
  default_dollar_rate: z.coerce.number().positive(),
  fiscal_year_start_month: z.coerce.number().int().min(1).max(12),
});

const updateBranding = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => SettingsSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'settings', p_action: 'write' });
    if (!ok) throw new Error('Forbidden');
    const direction = data.language === 'en' ? 'ltr' : 'rtl';
    const { error } = await sb.from('site_settings').update({ ...data, direction }).eq('id', 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const Route = createFileRoute('/app/settings/branding')({
  loader: async () => ({ settings: await loadSiteSettings() }),
  component: BrandingTab,
});

function BrandingTab() {
  const { settings } = Route.useLoaderData();
  const { i18n } = useTranslation();
  const router = useRouter();
  const [logoPreview, setLogoPreview] = useState<string | null>(settings?.logo_url ?? null);

  const form = useForm({
    defaultValues: {
      factory_name: settings?.factory_name ?? 'My Factory',
      legal_name: settings?.legal_name ?? '',
      tagline: settings?.tagline ?? '',
      logo_url: settings?.logo_url ?? '',
      favicon_url: settings?.favicon_url ?? '',
      primary_color: settings?.primary_color ?? '#0ea5e9',
      accent_color: settings?.accent_color ?? '#22c55e',
      address: settings?.address ?? '',
      city: settings?.city ?? '',
      country: settings?.country ?? 'Iraq',
      phone: settings?.phone ?? '',
      email: settings?.email ?? '',
      tax_id: settings?.tax_id ?? '',
      language: (i18n.language ?? settings?.language ?? 'ckb') as 'ckb' | 'ar' | 'en',
      base_currency: settings?.base_currency ?? 'IQD',
      display_currency: settings?.display_currency ?? 'IQD',
      default_dollar_rate: settings?.default_dollar_rate ?? 1500,
      fiscal_year_start_month: settings?.fiscal_year_start_month ?? 1,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateBranding({ data: value });
        invalidateSettingsCache();
        toast.success('Branding updated');
        router.invalidate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    },
  });

  const onLogoUpload = async (file: File) => {
    const { getSupabaseBrowser } = await import('~/lib/supabase.browser');
    const sb = getSupabaseBrowser();
    const path = `logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await sb.storage.from('branding').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = sb.storage.from('branding').getPublicUrl(path);
    form.setFieldValue('logo_url', data.publicUrl);
    setLogoPreview(data.publicUrl);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
      className="space-y-6 max-w-3xl"
    >
      <Card>
        <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field form={form} name="factory_name" label="Factory name" />
          <Field form={form} name="legal_name" label="Legal name (optional)" />
          <Field form={form} name="tagline" label="Tagline" />

          <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
            <div className="size-20 rounded-md border border-border bg-muted overflow-hidden">
              {logoPreview ? <img src={logoPreview} alt="logo" className="size-full object-contain" /> : <span className="text-xs grid place-items-center size-full text-muted-foreground">No logo</span>}
            </div>
            <label className="cursor-pointer flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4" />
              <span>Upload logo</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onLogoUpload(f); }} />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <ColorField form={form} name="primary_color" label="Primary color" />
          <ColorField form={form} name="accent_color" label="Accent color" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Place</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field form={form} name="address" label="Address" />
          <Field form={form} name="city" label="City" />
          <Field form={form} name="country" label="Country" />
          <Field form={form} name="phone" label="Phone" />
          <Field form={form} name="email" label="Email" />
          <Field form={form} name="tax_id" label="Tax ID" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Locale & currency</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <form.Field name="language">
            {(f) => (
              <div className="grid gap-1.5">
                <Label>Language</Label>
                <Select
                  value={f.state.value}
                  onValueChange={(v) => {
                    f.handleChange(v as 'ckb' | 'ar' | 'en')
                    void i18n.changeLanguage(v)
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANG_META.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <CurrencySelect form={form} name="base_currency" label="Base currency" />
          <CurrencySelect form={form} name="display_currency" label="Display currency" />
          <Field form={form} name="default_dollar_rate" label="Default USD rate" type="number" />
          <Field form={form} name="fiscal_year_start_month" label="Fiscal year start month" type="number" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={form.state.isSubmitting}>
          {form.state.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

// Small generic field components — could be promoted to ~/components/forms.tsx later.
function Field({ form, name, label, type = 'text' }: any) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label htmlFor={name}>{label}</Label>
          {type === 'textarea'
            ? <Textarea id={name} value={f.state.value ?? ''} onChange={(e) => f.handleChange(e.target.value)} />
            : <Input id={name} type={type} value={f.state.value ?? ''} onChange={(e) => f.handleChange(type === 'number' ? Number(e.target.value) : e.target.value)} />}
        </div>
      )}
    </form.Field>
  );
}

function ColorField({ form, name, label }: any) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label htmlFor={name}>{label}</Label>
          <div className="flex items-center gap-2">
            <input type="color" id={name} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)}
              className="h-10 w-10 rounded border border-border" />
            <Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} className="font-mono" />
          </div>
        </div>
      )}
    </form.Field>
  );
}

function SelectField({ form, name, label, options }: any) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label>{label}</Label>
          <Select value={f.state.value} onValueChange={(v) => f.handleChange(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map((o: any) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </form.Field>
  );
}

const CURRENCIES = [
  { code: 'IQD', label: 'IQD — Iraqi Dinar' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'TRY', label: 'TRY — Turkish Lira' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'KWD', label: 'KWD — Kuwaiti Dinar' },
  { code: 'IRR', label: 'IRR — Iranian Rial' },
];

function CurrencySelect({ form, name, label }: any) {
  return (
    <form.Field name={name}>
      {(f: any) => (
        <div className="grid gap-1.5">
          <Label>{label}</Label>
          <Select value={f.state.value} onValueChange={(v) => f.handleChange(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </form.Field>
  );
}
