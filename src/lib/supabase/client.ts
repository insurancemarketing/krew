import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Browser-side Supabase client using the public anon key.
 * Returns null if NEXT_PUBLIC_SUPABASE_URL is missing or malformed —
 * callers should handle null gracefully (localStorage fallback).
 */
export function getSupabaseClient(): ReturnType<typeof createClient<Database>> | null {
  if (_client) return _client;

  // Use globalThis.process to avoid needing @types/node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (typeof globalThis !== "undefined" && (globalThis as any).process?.env) ?? {};
  const url: string = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key: string = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  console.log("[supabase/client] URL:", url || "(empty)");

  if (!url || !url.startsWith("http")) {
    console.error(
      "[supabase/client] Missing or invalid NEXT_PUBLIC_SUPABASE_URL:",
      JSON.stringify(url),
      "— Supabase writes will be skipped; data saved to localStorage only."
    );
    return null;
  }
  if (!key) {
    console.error(
      "[supabase/client] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase writes skipped."
    );
    return null;
  }

  _client = createClient<Database>(url, key, { auth: { persistSession: false } });
  return _client;
}
