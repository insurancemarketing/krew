export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

function calcQuality(body: Record<string, number>) {
  const { leads = 0, booked = 0, showed = 0, closed = 0, policies_sold = 0 } = body;
  const book_rate = leads > 0 ? booked / leads : null;
  const show_rate = booked > 0 ? showed / booked : null;
  const close_rate = showed > 0 ? closed / showed : null;
  const policy_rate = leads > 0 ? policies_sold / leads : null;
  const quality_score =
    book_rate !== null && show_rate !== null && close_rate !== null && policy_rate !== null
      ? (book_rate * 0.25 + show_rate * 0.25 + close_rate * 0.25 + policy_rate * 0.25) * 100
      : null;
  return { book_rate, show_rate, close_rate, policy_rate, quality_score };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let query = supabase
    .from("lead_quality_by_ad")
    .select("*")
    .eq("client_id", params.id)
    .order("quality_score", { ascending: false });

  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quality: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const calculated = calcQuality(body);

  const { data, error } = await supabase
    .from("lead_quality_by_ad")
    .upsert(
      { ...body, ...calculated, client_id: params.id },
      { onConflict: "client_id,utm_content,month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quality: data });
}
