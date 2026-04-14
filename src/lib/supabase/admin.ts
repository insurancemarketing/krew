/**
 * Supabase admin client using the service role key.
 * Server-side only — never import in client components.
 *
 * Returned as an untyped client because the agency-intelligence tables
 * (client_contracts, monthly_performance, agent_tracking, hours_log,
 * split_tests, creative_library, client_touchpoints, lead_quality_by_ad,
 * smart_alerts) are not present in the generated types. The routes
 * handle response shapes manually.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, any, any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any, any, any> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}
