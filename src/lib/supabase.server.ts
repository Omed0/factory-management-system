import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import type { CookieSerializeOptions } from "cookie-es";

import type { Database } from "~/lib/database.types";
import { env } from "~/lib/env.server";

// Internal URL (for server → Kong inside Docker), falls back to public URL.
const serverUrl = env.SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL;

/**
 * Per-request Supabase client that reads / writes session cookies.
 * Use inside createServerFn handlers and route loaders (RLS enforced).
 */
export function getSupabaseServer() {
  return createServerClient<Database, "public", Database["public"]>(serverUrl, env.PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const cookies = getCookies();
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options as CookieSerializeOptions);
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. Only use in trusted server code.
 * Never expose to the browser.
 */
export function getSupabaseAdmin() {
  return createClient<Database, "public", "public">(serverUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

