import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const ALLOWED_KEYS = [
  "GHL_API_KEY",
  "GHL_LOCATION_ID",
  "FB_ACCESS_TOKEN",
  "FB_AD_ACCOUNT_ID",
];

/** GET /api/settings — return existing config values (keys only, values masked) */
export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("config")
    .select("key, value")
    .in("key", ALLOWED_KEYS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask values: return first 4 chars + ***
  const masked = ((data ?? []) as { key: string; value: string }[]).map((row) => ({
    key: row.key,
    value: row.value.length > 4 ? row.value.slice(0, 4) + "***" : "***",
    hasValue: Boolean(row.value),
  }));

  return NextResponse.json({ settings: masked });
}

/** POST /api/settings — upsert config values */
export async function POST(request: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServerClient();
  const errors: string[] = [];

  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) {
      const { error } = await supabase.from("config").upsert(
        { key, value: body[key] },
        { onConflict: "key" }
      );
      if (error) errors.push(`${key}: ${error.message}`);
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
