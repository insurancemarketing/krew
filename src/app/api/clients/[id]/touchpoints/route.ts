export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_touchpoints")
    .select("*")
    .eq("client_id", params.id)
    .order("touchpoint_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ touchpoints: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("client_touchpoints")
    .insert({ ...body, client_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ touchpoint: data });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const tpId = searchParams.get("tpId");

  if (!tpId) return NextResponse.json({ error: "tpId required" }, { status: 400 });

  const { error } = await supabase
    .from("client_touchpoints")
    .delete()
    .eq("id", tpId)
    .eq("client_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
