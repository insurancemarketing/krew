import { NextRequest, NextResponse } from "next/server";
import { syncGHLContacts } from "@/lib/sync/ghl-sync";

/**
 * GET /api/cron/sync
 *
 * Runs every 6 hours via a Vercel cron job (vercel.json) or external scheduler.
 * Secured by a shared secret in the Authorization header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Sync GHL Contacts
  try {
    const ghlResult = await syncGHLContacts();
    results.ghl = ghlResult;
    if (ghlResult.errors.length) errors.push(...ghlResult.errors);
  } catch (err) {
    errors.push(`GHL sync threw: ${String(err)}`);
    results.ghl = { error: String(err) };
  }

  return NextResponse.json({
    ok: errors.length === 0,
    timestamp: new Date().toISOString(),
    results,
    errors,
  });
}
