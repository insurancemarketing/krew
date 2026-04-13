export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("creative_library")
    .select("*")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creatives: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("creative_library")
    .insert({ ...body, client_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creative: data });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const { id, client_id: _cid, created_at: _ca, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("creative_library")
    .update(updates)
    .eq("id", id)
    .eq("client_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creative: data });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const creativeId = searchParams.get("creativeId");

  if (!creativeId) return NextResponse.json({ error: "creativeId required" }, { status: 400 });

  const { error } = await supabase
    .from("creative_library")
    .delete()
    .eq("id", creativeId)
    .eq("client_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
