export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  let query = supabase
    .from("hours_log")
    .select("*")
    .eq("client_id", params.id)
    .order("log_date", { ascending: false });

  if (month) {
    const start = `${month}-01`;
    const end = new Date(
      parseInt(month.split("-")[0]),
      parseInt(month.split("-")[1]),
      0
    )
      .toISOString()
      .slice(0, 10);
    query = query.gte("log_date", start).lte("log_date", end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hours: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("hours_log")
    .insert({ ...body, client_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");

  if (!entryId) return NextResponse.json({ error: "entryId required" }, { status: 400 });

  const { error } = await supabase
    .from("hours_log")
    .delete()
    .eq("id", entryId)
    .eq("client_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
