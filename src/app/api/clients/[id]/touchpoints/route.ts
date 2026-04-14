export const dynamic = "force-dynamic";
/**
 * GET  /api/clients/[id]/touchpoints  — list touchpoints
 * POST /api/clients/[id]/touchpoints  — add touchpoint
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("client_touchpoints")
      .select("id, touchpoint_date, type, notes, action_items, created_at")
      .eq("client_id", params.id)
      .order("touchpoint_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ touchpoints: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = createAdminClient();
    const { data, error } = await db
      .from("client_touchpoints")
      .insert({
        client_id: params.id,
        touchpoint_date: body.touchpoint_date ?? new Date().toISOString().split("T")[0],
        type: body.type ?? "call",
        notes: body.notes ?? null,
        action_items: body.action_items ?? null,
      })
      .select("id, touchpoint_date, type, notes, action_items, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ touchpoint: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const db = createAdminClient();
    const { error } = await db
      .from("client_touchpoints")
      .delete()
      .eq("id", id)
      .eq("client_id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
