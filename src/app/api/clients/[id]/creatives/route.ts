export const dynamic = "force-dynamic";
/**
 * GET    /api/clients/[id]/creatives  — list creatives for client
 * POST   /api/clients/[id]/creatives  — create creative
 * PUT    /api/clients/[id]/creatives  — update creative (pass id in body)
 * DELETE /api/clients/[id]/creatives?id=  — delete creative
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
      .from("creative_library")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ creatives: data ?? [] });
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
      .from("creative_library")
      .insert({
        client_id: params.id,
        ad_name: body.ad_name ?? "",
        utm_content: body.utm_content ?? null,
        creative_type: body.creative_type ?? "video",
        concept_name: body.concept_name ?? null,
        hook_summary: body.hook_summary ?? null,
        thumbnail_url: body.thumbnail_url ?? null,
        notes: body.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ creative: data }, { status: 201 });
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
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    const fields = ["ad_name", "utm_content", "creative_type", "concept_name", "hook_summary", "thumbnail_url", "notes"];
    fields.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });

    const { data, error } = await db
      .from("creative_library")
      .update(updates)
      .eq("id", body.id)
      .eq("client_id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ creative: data });
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
      .from("creative_library")
      .delete()
      .eq("id", id)
      .eq("client_id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
