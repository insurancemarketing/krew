export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();

  // Join agent_tracking with krew_contacts for name + utm_content
  const { data, error } = await supabase
    .from("agent_tracking")
    .select(`
      *,
      krew_contacts (
        first_name, last_name, email, utm_content
      )
    `)
    .eq("client_id", params.id)
    .order("hire_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agents: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("agent_tracking")
    .insert({ ...body, client_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agent: data });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const { id, client_id: _cid, created_at: _ca, krew_contacts: _kc, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("agent_tracking")
    .update(updates)
    .eq("id", id)
    .eq("client_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ agent: data });
}
