export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_contracts")
    .select("*")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("client_contracts")
    .insert({ ...body, client_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contract: data });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const { id: _id, client_id: _cid, created_at: _ca, ...updates } = body;

  // upsert by client_id — one contract per client
  const { data: existing } = await supabase
    .from("client_contracts")
    .select("id")
    .eq("client_id", params.id)
    .maybeSingle();

  let result;
  if (existing?.id) {
    const { data, error } = await supabase
      .from("client_contracts")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  } else {
    const { data, error } = await supabase
      .from("client_contracts")
      .insert({ ...updates, client_id: params.id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    result = data;
  }

  return NextResponse.json({ contract: result });
}
