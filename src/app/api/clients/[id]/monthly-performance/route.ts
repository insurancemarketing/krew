export const dynamic = "force-dynamic";
/**
 * GET  /api/clients/[id]/monthly-performance?month=YYYY-MM  — get one month (or all if no month param)
 * POST /api/clients/[id]/monthly-performance  — upsert monthly data
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function calcPerformance(body: Record<string, number>) {
  const adSpend = body.ad_spend ?? 0;
  const leads = body.leads ?? 0;
  const apptsSet = body.appointments_set ?? 0;
  const apptsShowed = body.appointments_showed ?? 0;
  const policiesSold = body.policies_sold ?? 0;
  const premiumWritten = body.premium_written ?? 0;
  const activePolicies = body.active_policies ?? 0;
  const policiesCancelled = body.policies_cancelled ?? 0;

  return {
    cost_per_lead: leads > 0 ? adSpend / leads : null,
    cost_per_appointment: apptsShowed > 0 ? adSpend / apptsShowed : null,
    cost_per_policy: policiesSold > 0 ? adSpend / policiesSold : null,
    show_rate: apptsSet > 0 ? apptsShowed / apptsSet : null,
    close_rate: apptsShowed > 0 ? policiesSold / apptsShowed : null,
    persistency_rate: activePolicies > 0
      ? (activePolicies - policiesCancelled) / activePolicies
      : null,
    roas: adSpend > 0 ? premiumWritten / adSpend : null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const month = req.nextUrl.searchParams.get("month");

    if (month) {
      // month param is YYYY-MM — convert to first-of-month date
      const monthDate = `${month}-01`;
      const { data, error } = await db
        .from("monthly_performance")
        .select("*")
        .eq("client_id", params.id)
        .eq("month", monthDate)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ performance: data ?? null });
    }

    // Return all months sorted desc
    const { data, error } = await db
      .from("monthly_performance")
      .select("*")
      .eq("client_id", params.id)
      .order("month", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ performance: data ?? [] });
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

    // month input comes as "YYYY-MM", store as "YYYY-MM-01"
    const monthRaw: string = body.month ?? new Date().toISOString().slice(0, 7);
    const month = monthRaw.length === 7 ? `${monthRaw}-01` : monthRaw;

    const nums = {
      ad_spend: parseFloat(body.ad_spend ?? "0") || 0,
      leads: parseInt(body.leads ?? "0", 10) || 0,
      appointments_set: parseInt(body.appointments_set ?? "0", 10) || 0,
      appointments_showed: parseInt(body.appointments_showed ?? "0", 10) || 0,
      policies_sold: parseInt(body.policies_sold ?? "0", 10) || 0,
      premium_written: parseFloat(body.premium_written ?? "0") || 0,
      avg_policy_value: parseFloat(body.avg_policy_value ?? "0") || 0,
      policies_cancelled: parseInt(body.policies_cancelled ?? "0", 10) || 0,
      active_policies: parseInt(body.active_policies ?? "0", 10) || 0,
      hires: parseInt(body.hires ?? "0", 10) || 0,
      active_agents: parseInt(body.active_agents ?? "0", 10) || 0,
      agents_churned: parseInt(body.agents_churned ?? "0", 10) || 0,
    };

    const calculated = calcPerformance(nums);

    const { data, error } = await db
      .from("monthly_performance")
      .upsert(
        { client_id: params.id, month, ...nums, ...calculated },
        { onConflict: "client_id,month" }
      )
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ performance: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
