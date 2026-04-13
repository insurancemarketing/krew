export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const [clientsRes, contractsRes, perfThisRes, perfLastRes, touchpointsRes, agentsRes] =
    await Promise.all([
      supabase.from("krew_clients").select("id, name"),
      supabase.from("client_contracts").select("*"),
      supabase.from("monthly_performance").select("*").eq("month", thisMonth),
      supabase.from("monthly_performance").select("*").eq("month", lastMonthStr),
      supabase
        .from("client_touchpoints")
        .select("client_id, touchpoint_date")
        .order("touchpoint_date", { ascending: false }),
      supabase
        .from("agent_tracking")
        .select("client_id, hire_date, policies_sold_30d, policies_sold_60d, policies_sold_90d, status")
        .eq("status", "active"),
    ]);

  const clients = clientsRes.data ?? [];
  const contracts = contractsRes.data ?? [];
  const perfThis = perfThisRes.data ?? [];
  const perfLast = perfLastRes.data ?? [];
  const touchpoints = touchpointsRes.data ?? [];
  const agents = agentsRes.data ?? [];

  const lastTouchMap: Record<string, string> = {};
  for (const tp of touchpoints) {
    if (!lastTouchMap[tp.client_id]) lastTouchMap[tp.client_id] = tp.touchpoint_date;
  }

  const updates: Array<{ id: string; score: number; color: string }> = [];

  for (const client of clients) {
    const contract = contracts.find((c) => c.client_id === client.id);
    if (!contract) continue;

    const perf = perfThis.find((p) => p.client_id === client.id);
    const prev = perfLast.find((p) => p.client_id === client.id);
    const lastTouch = lastTouchMap[client.id];

    let score = 0;

    // No hires/policies in 14 days — check MTD vs expected pace
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const pace = dayOfMonth / daysInMonth;
    const clientType = contract.client_type;

    if (clientType === "insurance_recruiting") {
      const hiresExpected = (prev?.hires ?? 0) * pace;
      if ((perf?.hires ?? 0) < hiresExpected * 0.2 && dayOfMonth > 14) score += 20;
    } else {
      const policiesExpected = (prev?.policies_sold ?? 0) * pace;
      if ((perf?.policies_sold ?? 0) < policiesExpected * 0.2 && dayOfMonth > 14) score += 20;
    }

    // Performance down 30%+ vs last month
    if (prev && perf) {
      const prevVal =
        clientType === "insurance_recruiting" ? prev.hires : prev.policies_sold;
      const thisVal =
        clientType === "insurance_recruiting" ? perf.hires : perf.policies_sold;
      if (prevVal > 0 && thisVal < prevVal * 0.7) score += 20;
    }

    // Contract renewal within 30 days
    if (contract.contract_renewal) {
      const daysUntil = Math.floor(
        (new Date(contract.contract_renewal).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntil >= 0 && daysUntil <= 30) score += 15;
    }

    // No touchpoint in 7 days
    if (lastTouch) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(lastTouch).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > 7) score += 15;
    } else {
      score += 15;
    }

    // CPL trending up 3 months (simplified: if this month CPL > last month CPL)
    if (perf?.cost_per_lead && prev?.cost_per_lead && perf.cost_per_lead > prev.cost_per_lead * 1.1) {
      score += 10;
    }
    if (perf?.cost_per_policy && prev?.cost_per_policy && perf.cost_per_policy > prev.cost_per_policy * 1.1) {
      score += 10;
    }

    const color = score <= 30 ? "green" : score <= 60 ? "yellow" : "red";
    updates.push({ id: contract.id, score, color });
  }

  // Batch update churn risk scores
  for (const u of updates) {
    await supabase
      .from("client_contracts")
      .update({ churn_risk_score: u.score, churn_risk_color: u.color })
      .eq("id", u.id);
  }

  // Check at-risk agents (hired 45+ days, zero production)
  const atRiskAgents = agents.filter((a) => {
    if (!a.hire_date) return false;
    const daysActive = Math.floor(
      (now.getTime() - new Date(a.hire_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return (
      daysActive >= 45 &&
      a.policies_sold_30d === 0 &&
      a.policies_sold_60d === 0 &&
      a.policies_sold_90d === 0
    );
  });

  return NextResponse.json({
    ok: true,
    contractsUpdated: updates.length,
    atRiskAgents: atRiskAgents.length,
  });
}
