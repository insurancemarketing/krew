export const dynamic = "force-dynamic";
/**
 * GET /api/earnings — Mason's personal earnings dashboard
 *
 * Returns:
 *   - monthly earnings for last 12 months (stacked by client)
 *   - per-client breakdown for current month
 *   - summary cards
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const db = createAdminClient();
    const now = new Date();

    // Build last 12 months
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    }

    const currentMonth = months[months.length - 1];
    const lastMonth = months[months.length - 2];

    // Load clients + contracts
    const { data: clients } = await db
      .from("krew_clients")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (!clients?.length) {
      return NextResponse.json({ rows: [], monthly: [], summary: null });
    }

    const clientIds = clients.map((c) => c.id as string);

    const [{ data: contracts }, { data: performances }, { data: hoursRows }] = await Promise.all([
      db.from("client_contracts").select("client_id, monthly_retainer, performance_fee_type, performance_fee_amount, status").in("client_id", clientIds),
      db.from("monthly_performance").select("client_id, month, leads, hires, policies_sold, ad_spend").in("client_id", clientIds).in("month", months),
      db.from("hours_log").select("client_id, hours, log_date").in("client_id", clientIds).gte("log_date", months[0].slice(0, 7) + "-01"),
    ]);

    const contractMap = new Map((contracts ?? []).map((c) => [c.client_id as string, c]));

    // Helper: compute revenue for a month/perf record
    function computeRevenue(clientId: string, perf: Record<string, unknown> | null) {
      const contract = contractMap.get(clientId);
      const retainer = parseFloat(String(contract?.monthly_retainer ?? 0)) || 0;
      const feeType = (contract?.performance_fee_type as string) ?? "per_hire";
      const feeAmt = parseFloat(String(contract?.performance_fee_amount ?? 0)) || 0;
      const adSpend = parseFloat(String(perf?.ad_spend ?? 0)) || 0;
      let perf_rev = 0;
      if (feeType === "per_hire") perf_rev = feeAmt * (parseInt(String(perf?.hires ?? 0), 10) || 0);
      else if (feeType === "per_policy") perf_rev = feeAmt * (parseInt(String(perf?.policies_sold ?? 0), 10) || 0);
      else if (feeType === "per_lead") perf_rev = feeAmt * (parseInt(String(perf?.leads ?? 0), 10) || 0);
      else if (feeType === "percent_adspend") perf_rev = (feeAmt / 100) * adSpend;
      return { retainer, perf_rev, total: retainer + perf_rev };
    }

    // Monthly earnings stacked by client
    type MonthlyEntry = { month: string; label: string; total: number; byClient: Record<string, number> };
    const monthlyMap = new Map<string, MonthlyEntry>();

    for (const m of months) {
      const label = new Date(m).toLocaleString("en-US", { month: "short", year: "numeric" });
      monthlyMap.set(m, { month: m, label, total: 0, byClient: {} });
    }

    // Index performances by clientId+month
    const perfByClientMonth = new Map<string, Record<string, unknown>>();
    for (const p of performances ?? []) {
      perfByClientMonth.set(`${p.client_id}::${p.month}`, p as Record<string, unknown>);
    }

    for (const m of months) {
      const entry = monthlyMap.get(m)!;
      for (const c of clients) {
        const perf = perfByClientMonth.get(`${c.id}::${m}`) ?? null;
        const { total } = computeRevenue(c.id as string, perf);
        entry.byClient[c.id as string] = total;
        entry.total += total;
      }
    }

    // Per-client this month
    const rows = clients.map((c) => {
      const perf = perfByClientMonth.get(`${c.id}::${currentMonth}`) ?? null;
      const { retainer, perf_rev, total } = computeRevenue(c.id as string, perf);
      const hoursThisMonth = (hoursRows ?? [])
        .filter((h) => h.client_id === c.id && (h.log_date as string).startsWith(currentMonth.slice(0, 7)))
        .reduce((s, h) => s + (h.hours as number), 0);
      const revenuePerHour = hoursThisMonth > 0 ? total / hoursThisMonth : 0;
      const contract = contractMap.get(c.id as string);

      return {
        clientId: c.id,
        clientName: c.name,
        retainer,
        perf_revenue: perf_rev,
        total_revenue: total,
        hours: hoursThisMonth,
        revenue_per_hour: revenuePerHour,
        status: (contract?.status as string) ?? "active",
      };
    });

    // Last month earnings
    let lastMonthTotal = 0;
    for (const c of clients) {
      const perf = perfByClientMonth.get(`${c.id}::${lastMonth}`) ?? null;
      lastMonthTotal += computeRevenue(c.id as string, perf).total;
    }

    const thisMonthTotal = rows.reduce((s, r) => s + r.total_revenue, 0);
    const momChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
    const allTimeTotal = Array.from(monthlyMap.values()).reduce((s, m) => s + m.total, 0);

    return NextResponse.json({
      rows,
      monthly: Array.from(monthlyMap.values()),
      clients: clients.map((c) => ({ id: c.id, name: c.name })),
      summary: {
        this_month: thisMonthTotal,
        last_month: lastMonthTotal,
        mom_change: momChange,
        projected_next_month: thisMonthTotal,
        all_time: allTimeTotal,
      },
    });
  } catch (err) {
    console.error("[earnings GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
