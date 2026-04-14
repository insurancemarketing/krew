export const dynamic = "force-dynamic";
/**
 * GET /api/cron/alerts — nightly job: generate smart alerts + update churn risk scores
 * Protected by CRON_SECRET in Authorization header.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function daysBetween(a: Date, b: Date) {
  return Math.floor((Math.abs(b.getTime() - a.getTime())) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`;

    const { data: clients } = await db.from("krew_clients").select("id, name");
    if (!clients?.length) return NextResponse.json({ ok: true, processed: 0 });

    const clientIds = clients.map((c) => c.id as string);

    const [
      { data: contracts },
      { data: currentPerfs },
      { data: prevPerfs },
      { data: touchpoints },
      { data: attributions },
    ] = await Promise.all([
      db.from("client_contracts").select("*").in("client_id", clientIds),
      db.from("monthly_performance").select("*").in("client_id", clientIds).eq("month", currentMonth),
      db.from("monthly_performance").select("*").in("client_id", clientIds).eq("month", prevMonthStr),
      db.from("client_touchpoints").select("client_id, touchpoint_date").in("client_id", clientIds).order("touchpoint_date", { ascending: false }),
      db.from("krew_contacts").select("client_id, is_hired, hired_at, utm_content").in("client_id", clientIds),
    ]);

    const contractMap = new Map((contracts ?? []).map((c) => [c.client_id as string, c]));
    const currPerfMap = new Map((currentPerfs ?? []).map((p) => [p.client_id as string, p]));
    const prevPerfMap = new Map((prevPerfs ?? []).map((p) => [p.client_id as string, p]));
    const lastTouchMap = new Map<string, string>();
    for (const t of touchpoints ?? []) {
      if (!lastTouchMap.has(t.client_id as string)) lastTouchMap.set(t.client_id as string, t.touchpoint_date as string);
    }

    let alertsGenerated = 0;

    // Clear old unresolved alerts
    await db.from("smart_alerts").delete().in("client_id", clientIds).eq("is_resolved", false);

    type Alert = { client_id: string; alert_type: string; message: string; category: string };
    const alerts: Alert[] = [];

    for (const client of clients) {
      const cid = client.id as string;
      const contract = contractMap.get(cid);
      const currPerf = currPerfMap.get(cid);
      const prevPerf = prevPerfMap.get(cid);
      const lastTouch = lastTouchMap.get(cid);

      let churnScore = 0;

      // 1. No hires/policies in 14 days
      const recentHires = (attributions ?? [])
        .filter((a) => a.client_id === cid && a.is_hired && a.hired_at)
        .map((a) => new Date(a.hired_at as string).getTime());
      const lastHireDate = recentHires.length > 0 ? new Date(Math.max(...recentHires)) : null;
      if (!lastHireDate || daysBetween(lastHireDate, now) > 14) {
        const hires = parseInt(String(currPerf?.hires ?? 0), 10) || 0;
        const policies = parseInt(String(currPerf?.policies_sold ?? 0), 10) || 0;
        if (hires === 0 && policies === 0) {
          churnScore += 20;
          alerts.push({
            client_id: cid,
            alert_type: "error",
            message: `🔴 No hires or policies recorded this month for ${client.name}`,
            category: "performance",
          });
        }
      }

      // 2. Performance down 30%+ vs last month
      if (prevPerf && currPerf) {
        const prevTotal = (parseInt(String(prevPerf.hires ?? 0), 10) || 0) + (parseInt(String(prevPerf.policies_sold ?? 0), 10) || 0);
        const currTotal = (parseInt(String(currPerf.hires ?? 0), 10) || 0) + (parseInt(String(currPerf.policies_sold ?? 0), 10) || 0);
        if (prevTotal > 0 && currTotal < prevTotal * 0.70) {
          churnScore += 20;
          alerts.push({
            client_id: cid,
            alert_type: "error",
            message: `🔴 ${client.name} performance down ${Math.round((1 - currTotal / prevTotal) * 100)}% vs last month`,
            category: "performance",
          });
        }
      }

      // 3. Contract renewal within 30 days
      if (contract?.contract_renewal) {
        const daysToRenewal = daysBetween(now, new Date(contract.contract_renewal as string));
        if (daysToRenewal >= 0 && daysToRenewal <= 30) {
          churnScore += 15;
          alerts.push({
            client_id: cid,
            alert_type: "error",
            message: `🔴 ${client.name} contract renews in ${daysToRenewal} days`,
            category: "renewal",
          });
        }
      }

      // 4. No touchpoint in 7 days
      if (!lastTouch || daysBetween(new Date(lastTouch), now) > 7) {
        churnScore += 15;
        const days = lastTouch ? daysBetween(new Date(lastTouch), now) : null;
        alerts.push({
          client_id: cid,
          alert_type: "warning",
          message: `🟡 No touchpoint with ${client.name} in ${days ?? "many"} days`,
          category: "touchpoint",
        });
      }

      // 5. Budget pacing 20%+ over
      if (currPerf && contract?.ad_budget_monthly) {
        const budget = parseFloat(String(contract.ad_budget_monthly)) || 0;
        const spent = parseFloat(String(currPerf.ad_spend ?? 0)) || 0;
        const daysElapsed = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const projectedSpend = daysElapsed > 0 ? (spent / daysElapsed) * daysInMonth : 0;
        if (budget > 0 && projectedSpend > budget * 1.2) {
          alerts.push({
            client_id: cid,
            alert_type: "warning",
            message: `🟡 ${client.name} budget pacing ${Math.round(((projectedSpend - budget) / budget) * 100)}% over — projected $${Math.round(projectedSpend).toLocaleString()} vs $${Math.round(budget).toLocaleString()} budget`,
            category: "budget",
          });
        }
      }

      // 6. Scale opportunity — ad with win rate > 20%
      const clientAttrib = (attributions ?? []).filter((a) => a.client_id === cid);
      const utmGroups = new Map<string, { leads: number; hired: number }>();
      for (const a of clientAttrib) {
        const utm = (a.utm_content as string) || "(No UTM)";
        const g = utmGroups.get(utm) ?? { leads: 0, hired: 0 };
        g.leads++;
        if (a.is_hired) g.hired++;
        utmGroups.set(utm, g);
      }
      for (const [utm, g] of utmGroups.entries()) {
        if (g.leads >= 3 && g.hired / g.leads > 0.2) {
          alerts.push({
            client_id: cid,
            alert_type: "success",
            message: `🟢 ${utm} is at ${Math.round((g.hired / g.leads) * 100)}% win rate for ${client.name} — consider scaling`,
            category: "performance",
          });
        }
      }

      const churnColor = churnScore <= 30 ? "green" : churnScore <= 60 ? "yellow" : "red";

      // Update churn risk on contract
      if (contract) {
        await db
          .from("client_contracts")
          .update({ churn_risk_score: churnScore, churn_risk_color: churnColor })
          .eq("client_id", cid);
      }
    }

    // Batch insert alerts
    if (alerts.length > 0) {
      await db.from("smart_alerts").insert(alerts);
      alertsGenerated = alerts.length;
    }

    return NextResponse.json({ ok: true, processed: clients.length, alertsGenerated });
  } catch (err) {
    console.error("[cron/alerts]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
