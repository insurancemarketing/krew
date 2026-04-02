/**
 * Supabase admin client using the service role key.
 * Server-side only — never import in client components.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _admin: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }
  _admin = createClient<Database>(url, key, { auth: { persistSession: false } });
  return _admin;
}
