export const dynamic = "force-dynamic";
/**
 * GET  /api/clients  — list all clients (api keys masked)
 * POST /api/clients  — create client
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encrypt";

export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_clients")
      .select("id, name, ghl_location_id, hired_tag, payout_per_hire, fb_spend_manual, last_synced, sync_status, sync_error, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ clients: data ?? [] });
  } catch (err) {
    console.error("[clients GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ghl_api_key, ghl_location_id, hired_tag, payout_per_hire } = body;

    if (!name || !ghl_api_key || !ghl_location_id) {
      return NextResponse.json(
        { error: "name, ghl_api_key, and ghl_location_id are required" },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_clients")
      .insert({
        name: name.trim(),
        ghl_api_key: encrypt(ghl_api_key.trim()),
        ghl_location_id: ghl_location_id.trim(),
        hired_tag: (hired_tag ?? "recruitment - hire made").trim(),
        payout_per_hire: parseFloat(payout_per_hire ?? "0") || 0,
      })
      .select("id, name, ghl_location_id, hired_tag, payout_per_hire, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data }, { status: 201 });
  } catch (err) {
    console.error("[clients POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
