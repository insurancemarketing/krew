export const dynamic = "force-dynamic";
/**
 * GET  /api/clients  — list all clients (api keys masked)
 * POST /api/clients  — create client
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/encrypt";

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e.message) return String(e.message);
    if (e.error) return String(e.error);
    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }
  return String(err);
}

export async function GET() {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_clients")
      .select("id, name, client_type, ghl_location_id, hired_tag, payout_per_hire, fb_spend_manual, last_synced, sync_status, sync_error, created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ clients: data ?? [] });
  } catch (err) {
    console.error("[clients GET]", err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ghl_api_key, ghl_location_id, hired_tag, payout_per_hire, client_type } = body;

    if (!name || !ghl_api_key || !ghl_location_id) {
      return NextResponse.json(
        { error: "name, ghl_api_key, and ghl_location_id are required" },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const baseInsert = {
      name: name.trim(),
      ghl_api_key: encrypt(ghl_api_key.trim()),
      ghl_location_id: ghl_location_id.trim(),
      hired_tag: (hired_tag ?? "recruitment - hire made").trim(),
      payout_per_hire: parseFloat(payout_per_hire ?? "0") || 0,
    };

    // Try with client_type first; if the column doesn't exist (migration 003
    // not applied yet), retry without it.
    let { data, error } = await db
      .from("krew_clients")
      .insert({ ...baseInsert, client_type: client_type ?? "insurance_recruiting" })
      .select("id, name, ghl_location_id, hired_tag, payout_per_hire, created_at")
      .single();

    if (error && /client_type/i.test(errMsg(error))) {
      ({ data, error } = await db
        .from("krew_clients")
        .insert(baseInsert)
        .select("id, name, ghl_location_id, hired_tag, payout_per_hire, created_at")
        .single());
    }

    if (error) throw error;
    return NextResponse.json({ client: data }, { status: 201 });
  } catch (err) {
    console.error("[clients POST]", err);
    return NextResponse.json({ error: errMsg(err) }, { status: 500 });
  }
}
