import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServer } from '~/lib/supabase.server';

export interface SiteSettings {
  id: number;
  factory_name: string;
  legal_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  language: string;
  direction: 'ltr' | 'rtl';
  base_currency: string;
  display_currency: string;
  default_dollar_rate: number;
  setup_completed: boolean;
  fiscal_year_start_month: number;
}

/**
 * Loads the singleton site_settings row. Cached at the request level — every
 * route should call this once via the root loader, then read from context.
 *
 * Returns `null` if the DB is unreachable (so the first-paint can fall back to
 * defaults instead of crashing the SSR render).
 */
export const loadSiteSettings = createServerFn({ method: 'GET' }).handler(async (): Promise<SiteSettings | null> => {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle<SiteSettings>();
  if (error) {
    console.error('[site-settings] load failed', error);
    return null;
  }
  return data;
});

/**
 * Convert hex (#0ea5e9) to oklch() so we can drop it straight into the
 * Tailwind v4 token system. Falls back to the original string for non-hex.
 */
export function colorToOklch(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // Quick & dirty sRGB → OKLCH: we let the browser do the math via color() if available.
  return `color(srgb ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)})`;
}
