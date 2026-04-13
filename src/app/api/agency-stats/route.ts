export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;

  // Fetch all active clients with contracts
  const [clientsRes, contractsRes, perfThisRes, perfLastRes, touchpointsRes, hoursRes] =
    await Promise.all([
      supabase.from("krew_clients").select("*").order("name"),
      supabase.from("client_contracts").select("*"),
      supabase.from("monthly_performance").select("*").eq("month", thisMonth),
      supabase.from("monthly_performance").select("*").eq("month", lastMonthStr),
      supabase
        .from("client_touchpoints")
        .select("client_id, touchpoint_date")
        .order("touchpoint_date", { ascending: false }),
      supabase
        .from("hours_log")
        .select("client_id, hours, log_date")
        .gte("log_date", thisMonth),
    ]);

  const clients = clientsRes.data ?? [];
  const contracts = contractsRes.data ?? [];
  const perfThis = perfThisRes.data ?? [];
  const perfLast = perfLastRes.data ?? [];
  const touchpoints = touchpointsRes.data ?? [];
  const hours = hoursRes.data ?? [];

  // Map last touchpoint per client
  const lastTouchMap: Record<string, string> = {};
  for (const tp of touchpoints) {
    if (!lastTouchMap[tp.client_id]) lastTouchMap[tp.client_id] = tp.touchpoint_date;
  }

  // Map hours this month per client
  const hoursMap: Record<string, number> = {};
  for (const h of hours) {
    hoursMap[h.client_id] = (hoursMap[h.client_id] ?? 0) + h.hours;
  }

  // Build per-client rows
  const rows = clients.map((client) => {
    const contract = contracts.find((c) => c.client_id === client.id);
    const perf = perfThis.find((p) => p.client_id === client.id);
    const prevPerf = perfLast.find((p) => p.client_id === client.id);
    const lastTouch = lastTouchMap[client.id] ?? null;
    const hoursThisMonth = hoursMap[client.id] ?? 0;

    const retainer = contract?.monthly_retainer ?? 0;
    const status = contract?.status ?? "active";

    // Performance fee calculation
    let perfFee = 0;
    if (contract) {
      const feeType = contract.performance_fee_type;
      const feeAmt = contract.performance_fee_amount ?? 0;
      if (feeType === "per_hire") perfFee = (perf?.hires ?? 0) * feeAmt;
      else if (feeType === "per_policy") perfFee = (perf?.policies_sold ?? 0) * feeAmt;
      else if (feeType === "per_lead") perfFee = (perf?.leads ?? 0) * feeAmt;
      else if (feeType === "percent_adspend")
        perfFee = ((perf?.ad_spend ?? 0) * feeAmt) / 100;
    }

    const totalRevenue = retainer + perfFee;
    const revenuePerHour = hoursThisMonth > 0 ? totalRevenue / hoursThisMonth : null;

    // LTV / LTGP
    const avgMonthsActive = 12; // assume 12 months default
    const ltv = totalRevenue * avgMonthsActive;
    const cac = contract?.cac ?? 0;
    const targetRate = contract?.target_hourly_rate ?? 150;
    const estimatedCost = hoursThisMonth * targetRate;
    const monthlyGrossProfit = totalRevenue - estimatedCost;
    const grossMargin = totalRevenue > 0 ? monthlyGrossProfit / totalRevenue : 0;
    const ltgp = ltv * grossMargin;
    const ltgpCacRatio = cac > 0 ? ltgp / cac : null;

    // Days since last touchpoint
    const daysSinceTouch = lastTouch
      ? Math.floor(
          (now.getTime() - new Date(lastTouch).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    // Days until renewal
    const daysUntilRenewal = contract?.contract_renewal
      ? Math.floor(
          (new Date(contract.contract_renewal).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    // Churn risk score
    let churnScore = contract?.churn_risk_score ?? 0;

    return {
      client,
      contract,
      perf,
      prevPerf,
      retainer,
      perfFee,
      totalRevenue,
      hoursThisMonth,
      revenuePerHour,
      ltv,
      cac,
      ltgp,
      ltgpCacRatio,
      monthlyGrossProfit,
      lastTouch,
      daysSinceTouch,
      daysUntilRenewal,
      churnScore,
      churnColor: churnScore <= 30 ? "green" : churnScore <= 60 ? "yellow" : "red",
      status,
    };
  });

  // Summary totals (active clients only)
  const activeRows = rows.filter((r) => r.status === "active");
  const totalMrr = activeRows.reduce((s, r) => s + r.retainer, 0);
  const totalPerfRevenue = activeRows.reduce((s, r) => s + r.perfFee, 0);
  const totalBlended = totalMrr + totalPerfRevenue;
  const projectedNextMonth = totalMrr; // conservative: retainer only

  return NextResponse.json({
    summary: { totalMrr, totalPerfRevenue, totalBlended, projectedNextMonth },
    rows,
    thisMonth,
    lastMonthStr,
  });
}
