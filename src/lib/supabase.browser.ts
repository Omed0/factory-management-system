import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "~/lib/database.types";

export function getSupabaseBrowser() {
  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  );
}
