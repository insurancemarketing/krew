export const dynamic = "force-dynamic";
/**
 * GET  /api/clients/[id]  — get single client
 * PUT  /api/clients/[id]  — update client
 * DELETE /api/clients/[id] — delete client and all its contacts/spend
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encrypt";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_clients")
      .select("id, name, ghl_location_id, hired_tag, payout_per_hire, fb_spend_manual, last_synced, sync_status, sync_error, created_at")
      .eq("id", params.id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ client: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, ghl_api_key, ghl_location_id, hired_tag, payout_per_hire } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (ghl_location_id !== undefined) updates.ghl_location_id = ghl_location_id.trim();
    if (hired_tag !== undefined) updates.hired_tag = hired_tag.trim();
    if (payout_per_hire !== undefined) updates.payout_per_hire = parseFloat(payout_per_hire) || 0;
    if (ghl_api_key !== undefined && ghl_api_key.trim()) {
      updates.ghl_api_key = encrypt(ghl_api_key.trim());
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_clients")
      .update(updates)
      .eq("id", params.id)
      .select("id, name, ghl_location_id, hired_tag, payout_per_hire, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    // Cascade deletes contacts + spend via FK constraints
    const { error } = await db.from("krew_clients").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
