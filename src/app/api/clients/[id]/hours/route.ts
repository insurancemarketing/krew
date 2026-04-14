export const dynamic = "force-dynamic";
/**
 * GET    /api/clients/[id]/hours           — list hours entries
 * POST   /api/clients/[id]/hours           — add entry
 * DELETE /api/clients/[id]/hours?entryId=  — delete entry
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
      .from("hours_log")
      .select("id, log_date, hours, task_description, created_at")
      .eq("client_id", params.id)
      .order("log_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ entries: data ?? [] });
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
      .from("hours_log")
      .insert({
        client_id: params.id,
        log_date: body.log_date ?? new Date().toISOString().split("T")[0],
        hours: parseFloat(body.hours) || 0,
        task_description: body.task_description ?? null,
      })
      .select("id, log_date, hours, task_description, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entryId = request.nextUrl.searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });
    const db = createAdminClient();
    const { error } = await db
      .from("hours_log")
      .delete()
      .eq("id", entryId)
      .eq("client_id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
