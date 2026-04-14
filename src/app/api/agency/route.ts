export const dynamic = "force-dynamic";
/**
 * GET /api/agency — Mason's master agency dashboard data
 *
 * Returns all clients with:
 *   - contract info (retainer, fees, renewal, etc.)
 *   - latest monthly performance
 *   - churn risk score
 *   - last touchpoint date
 *   - hours logged this month
 *   - computed business metrics (LTV, LTGP:CAC, $/hr, etc.)
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  try {
    const db = createAdminClient();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Load all clients
    const { data: clients, error: clientErr } = await db
      .from("krew_clients")
      .select("id, name, client_type, last_synced")
      .order("created_at", { ascending: true });
    if (clientErr) throw clientErr;
    if (!clients?.length) return NextResponse.json({ clients: [], summary: null });

    const clientIds = clients.map((c) => c.id as string);

    // Parallel fetch everything
    const [
      { data: contracts },
      { data: performances },
      { data: touchpoints },
      { data: hoursRows },
      { data: prevPerformances },
    ] = await Promise.all([
      db.from("client_contracts").select("*").in("client_id", clientIds),
      db.from("monthly_performance").select("*").in("client_id", clientIds).eq("month", currentMonth),
      db.from("client_touchpoints").select("client_id, touchpoint_date").in("client_id", clientIds).order("touchpoint_date", { ascending: false }),
      db.from("hours_log").select("client_id, hours, log_date").in("client_id", clientIds).gte("log_date", currentMonth.slice(0, 7) + "-01"),
      // Previous month for MoM comparison
      db.from("monthly_performance").select("*").in("client_id", clientIds).lt("month", currentMonth).order("month", { ascending: false }),
    ]);

    // Index by client_id
    const contractMap = new Map((contracts ?? []).map((c) => [c.client_id as string, c]));
    const perfMap = new Map((performances ?? []).map((p) => [p.client_id as string, p]));

    // Last touchpoint per client
    const touchpointMap = new Map<string, string>();
    for (const t of touchpoints ?? []) {
      if (!touchpointMap.has(t.client_id as string)) {
        touchpointMap.set(t.client_id as string, t.touchpoint_date as string);
      }
    }

    // Hours this month per client
    const hoursMap = new Map<string, number>();
    for (const h of hoursRows ?? []) {
      const cid = h.client_id as string;
      hoursMap.set(cid, (hoursMap.get(cid) ?? 0) + (h.hours as number));
    }

    // Previous month per client
    const prevPerfMap = new Map<string, typeof prevPerformances extends Array<infer T> | null | undefined ? T : never>();
    for (const p of prevPerformances ?? []) {
      if (!prevPerfMap.has(p.client_id as string)) {
        prevPerfMap.set(p.client_id as string, p);
      }
    }

    let totalMRR = 0;
    let totalPerfRevenue = 0;

    const enriched = clients.map((c) => {
      const contract = contractMap.get(c.id as string);
      const perf = perfMap.get(c.id as string);
      const prevPerf = prevPerfMap.get(c.id as string);
      const lastTouch = touchpointMap.get(c.id as string);
      const hoursThisMonth = hoursMap.get(c.id as string) ?? 0;

      const retainer = parseFloat(String(contract?.monthly_retainer ?? 0)) || 0;
      const feeType = contract?.performance_fee_type ?? "per_hire";
      const feeAmount = parseFloat(String(contract?.performance_fee_amount ?? 0)) || 0;
      const adSpend = parseFloat(String(perf?.ad_spend ?? 0)) || 0;
      const cac = parseFloat(String(contract?.cac ?? 0)) || 0;
      const targetRate = parseFloat(String(contract?.target_hourly_rate ?? 150)) || 150;
      const hrsEstimate = parseFloat(String(contract?.hours_per_month_estimate ?? 0)) || 0;

      // Performance fee calculation
      let perfRevenue = 0;
      if (feeType === "per_hire") {
        perfRevenue = feeAmount * (parseInt(String(perf?.hires ?? 0), 10) || 0);
      } else if (feeType === "per_policy") {
        perfRevenue = feeAmount * (parseInt(String(perf?.policies_sold ?? 0), 10) || 0);
      } else if (feeType === "per_lead") {
        perfRevenue = feeAmount * (parseInt(String(perf?.leads ?? 0), 10) || 0);
      } else if (feeType === "percent_adspend") {
        perfRevenue = (feeAmount / 100) * adSpend;
      }

      const totalRevenue = retainer + perfRevenue;
      const revenuePerHour = hoursThisMonth > 0 ? totalRevenue / hoursThisMonth : 0;

      // LTV/LTGP/CAC estimates
      const avgMonthlyRevenue = retainer + (perfRevenue > 0 ? perfRevenue : feeAmount);
      const avgMonthsActive = 12; // estimate
      const ltv = avgMonthlyRevenue * avgMonthsActive;
      const serviceCost = hrsEstimate * targetRate;
      const grossMarginMonthly = totalRevenue > 0 ? (totalRevenue - serviceCost) / totalRevenue : 0;
      const ltgp = ltv * grossMarginMonthly;
      const ltgpCacRatio = cac > 0 ? ltgp / cac : 0;
      const monthlyGrossProfit = totalRevenue - serviceCost;
      const paybackMonths = cac > 0 && monthlyGrossProfit > 0 ? cac / monthlyGrossProfit : 0;

      // Churn risk score
      let churnScore = 0;
      const hires = parseInt(String(perf?.hires ?? 0), 10) || 0;
      const policies = parseInt(String(perf?.policies_sold ?? 0), 10) || 0;
      if (hires === 0 && policies === 0) churnScore += 20;

      if (prevPerf) {
        const prevHires = parseInt(String(prevPerf.hires ?? 0), 10) || 0;
        const prevPolicies = parseInt(String(prevPerf.policies_sold ?? 0), 10) || 0;
        const prevTotal = prevHires + prevPolicies;
        const currTotal = hires + policies;
        if (prevTotal > 0 && currTotal < prevTotal * 0.70) churnScore += 20;
      }

      if (contract?.contract_renewal) {
        const daysToRenewal = daysBetween(now, new Date(contract.contract_renewal as string));
        if (daysToRenewal >= 0 && daysToRenewal <= 30) churnScore += 15;
      }

      if (lastTouch) {
        const daysSinceTouch = daysBetween(new Date(lastTouch), now);
        if (daysSinceTouch > 7) churnScore += 15;
      } else {
        churnScore += 15;
      }

      const churnColor = churnScore <= 30 ? "green" : churnScore <= 60 ? "yellow" : "red";

      totalMRR += retainer;
      totalPerfRevenue += perfRevenue;

      const clientType = (c.client_type as string) ?? "insurance_recruiting";
      const leads = parseInt(String(perf?.leads ?? 0), 10) || 0;
      const adBudget = parseFloat(String(contract?.ad_budget_monthly ?? 0)) || 0;

      return {
        id: c.id,
        name: c.name,
        client_type: clientType,
        last_synced: c.last_synced,
        // contract
        retainer,
        performance_fee_type: feeType,
        performance_fee_amount: feeAmount,
        contract_renewal: contract?.contract_renewal ?? null,
        ad_budget_monthly: adBudget,
        status: contract?.status ?? "active",
        // this month performance
        ad_spend: adSpend,
        leads,
        appointments_set: parseInt(String(perf?.appointments_set ?? 0), 10) || 0,
        appointments_showed: parseInt(String(perf?.appointments_showed ?? 0), 10) || 0,
        policies_sold: parseInt(String(perf?.policies_sold ?? 0), 10) || 0,
        hires,
        premium_written: parseFloat(String(perf?.premium_written ?? 0)) || 0,
        cost_per_lead: perf?.cost_per_lead ? parseFloat(String(perf.cost_per_lead)) : 0,
        cost_per_policy: perf?.cost_per_policy ? parseFloat(String(perf.cost_per_policy)) : 0,
        show_rate: perf?.show_rate ? parseFloat(String(perf.show_rate)) : 0,
        close_rate: perf?.close_rate ? parseFloat(String(perf.close_rate)) : 0,
        roas: perf?.roas ? parseFloat(String(perf.roas)) : 0,
        // mason's business
        perf_revenue: perfRevenue,
        total_revenue: totalRevenue,
        hours_this_month: hoursThisMonth,
        revenue_per_hour: revenuePerHour,
        ltv,
        ltgp,
        ltgp_cac_ratio: ltgpCacRatio,
        payback_months: paybackMonths,
        cac,
        // health
        last_touchpoint: lastTouch ?? null,
        days_since_touchpoint: lastTouch ? daysBetween(new Date(lastTouch), now) : 999,
        churn_risk_score: churnScore,
        churn_risk_color: churnColor,
      };
    });

    const totalBlended = totalMRR + totalPerfRevenue;
    // Projected next month = avg of this + last (simple estimate)
    const projectedNext = totalBlended * 1.0; // placeholder — could be enhanced

    return NextResponse.json({
      clients: enriched,
      summary: {
        total_mrr: totalMRR,
        total_perf_revenue: totalPerfRevenue,
        total_blended: totalBlended,
        projected_next_month: projectedNext,
      },
    });
  } catch (err) {
    console.error("[agency GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
