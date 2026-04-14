export const dynamic = "force-dynamic";
/**
 * GET  /api/clients/[id]/lead-quality  — list lead quality rows (optionally by month)
 * POST /api/clients/[id]/lead-quality  — upsert row
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function calcQuality(leads: number, booked: number, showed: number, closed: number, policiesSold: number) {
  const bookRate = leads > 0 ? booked / leads : 0;
  const showRate = booked > 0 ? showed / booked : 0;
  const closeRate = showed > 0 ? closed / showed : 0;
  const policyRate = closed > 0 ? policiesSold / closed : 0;
  const qualityScore = (bookRate * 0.25 + showRate * 0.25 + closeRate * 0.25 + policyRate * 0.25) * 100;
  return { book_rate: bookRate, show_rate: showRate, close_rate: closeRate, policy_rate: policyRate, quality_score: qualityScore };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const month = req.nextUrl.searchParams.get("month");
    let query = db
      .from("lead_quality_by_ad")
      .select("*")
      .eq("client_id", params.id)
      .order("quality_score", { ascending: false });
    if (month) query = query.eq("month", month.length === 7 ? `${month}-01` : month);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
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
    const monthRaw: string = body.month ?? new Date().toISOString().slice(0, 7);
    const month = monthRaw.length === 7 ? `${monthRaw}-01` : monthRaw;
    const leads = parseInt(body.leads ?? "0", 10) || 0;
    const booked = parseInt(body.booked ?? "0", 10) || 0;
    const showed = parseInt(body.showed ?? "0", 10) || 0;
    const closed = parseInt(body.closed ?? "0", 10) || 0;
    const policiesSold = parseInt(body.policies_sold ?? "0", 10) || 0;
    const calculated = calcQuality(leads, booked, showed, closed, policiesSold);

    const { data, error } = await db
      .from("lead_quality_by_ad")
      .upsert(
        {
          client_id: params.id,
          utm_content: body.utm_content ?? "(No UTM)",
          month,
          leads,
          booked,
          showed,
          closed,
          policies_sold: policiesSold,
          ...calculated,
        },
        { onConflict: "client_id,utm_content,month" }
      )
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ row: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
