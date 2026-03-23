import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-side Supabase client using the service role key.
// NEVER import this in client components.
export function createServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}
