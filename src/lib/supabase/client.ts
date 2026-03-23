import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _client: ReturnType<typeof createClient<Database>> | null = null;

// Browser-side Supabase client using the public anon key.
// Safe to import in client components.
export function getSupabaseClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  _client = createClient<Database>(url, key, { auth: { persistSession: false } });
  return _client;
}
