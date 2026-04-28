import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";

export function getSupabaseBrowser() {
  return createClient<Database, "public", "public">(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  );
}
