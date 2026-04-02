/**
 * GET /api/clients/[id]/stats — all aggregated stats for the client dashboard
 *
 * Returns:
 *   - attribution: per utm_content leads/hired/win_rate/spend/cost_per_hire/status
 *   - funnel: per utm_content funnel breakdown
 *   - pipeline: segment counts
 *   - metrics: top-level cards
 *   - alerts: smart alert messages
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeTag(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, "").toLowerCase().trim();
}

function hasTag(tagsStr: string | null, ...needles: string[]): boolean {
  if (!tagsStr) return false;
  const tags = tagsStr.split(",").map(normalizeTag);
  return needles.some((n) =>
    tags.some((t) => t.includes(normalizeTag(n)))
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const clientId = params.id;

    // Fetch client config
    const { data: client } = await db
      .from("krew_clients")
      .select("hired_tag, payout_per_hire")
      .eq("id", clientId)
      .single();

    const payoutPerHire = parseFloat(String(client?.payout_per_hire ?? 0)) || 0;

    // Fetch all contacts for this client
    const { data: contacts, error: cErr } = await db
      .from("krew_contacts")
      .select("utm_content, tags, is_hired, hired_at, watch_pct, created_at")
      .eq("client_id", clientId);

    if (cErr) throw cErr;
    if (!contacts) return NextResponse.json({ error: "No data" }, { status: 404 });

    // Fetch all spend for this client
    const { data: spendRows } = await db
      .from("krew_ad_spend")
      .select("utm_content, spend, week_starting")
      .eq("client_id", clientId);

    // ── Build spend map: utm_content → total spend ──
    const spendMap = new Map<string, number>();
    for (const row of spendRows ?? []) {
      const key = row.utm_content || "(No UTM)";
      spendMap.set(key, (spendMap.get(key) ?? 0) + (row.spend ?? 0));
    }

    // ── Group contacts by utm_content ──
    type Group = {
      leads: number;
      hired: number;
      watched: number;
      applied: number;
      scheduled: number;
      hiredDates: string[];
    };

    const groups = new Map<string, Group>();
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let totalLeads = 0;
    let totalHired = 0;
    let hiresMtd = 0;
    let lastHireDate: Date | null = null;

    // Pipeline segment counts (global across all UTMs)
    let pipeWatched100NotApplied = 0;
    let pipeAppliedNotScheduled = 0;
    let pipeScheduledUnknown = 0;
    let pipeNeverWatched = 0;
    let pipeUnsubscribed = 0;

    for (const c of contacts) {
      const utm = c.utm_content || "(No UTM)";
      if (!groups.has(utm)) {
        groups.set(utm, { leads: 0, hired: 0, watched: 0, applied: 0, scheduled: 0, hiredDates: [] });
      }
      const g = groups.get(utm)!;
      const tags = c.tags ?? "";

      g.leads++;
      totalLeads++;

      const watched100 = hasTag(tags, "watch100%", "watched 100");
      const applied = hasTag(tags, "questionnaire", "new applicant");
      const scheduled = hasTag(tags, "scheduled appointment", "scheduled");
      const unsubscribed = hasTag(tags, "unsubscribed", "b-018");

      if (watched100) g.watched++;
      if (applied) g.applied++;
      if (scheduled) g.scheduled++;

      if (c.is_hired) {
        g.hired++;
        totalHired++;
        const hiredDate = c.hired_at ? new Date(c.hired_at) : null;
        if (hiredDate) {
          if (hiredDate >= mtdStart) hiresMtd++;
          if (!lastHireDate || hiredDate > lastHireDate) lastHireDate = hiredDate;
          g.hiredDates.push(c.hired_at!);
        }
      }

      // Pipeline segmentation
      if (unsubscribed) {
        pipeUnsubscribed++;
      } else if (!c.is_hired) {
        if (watched100 && !applied) pipeWatched100NotApplied++;
        else if (applied && !scheduled) pipeAppliedNotScheduled++;
        else if (scheduled) pipeScheduledUnknown++;
        else if (!watched100 && !applied) pipeNeverWatched++;
      }
    }

    // ── Build attribution rows ──
    const attribution = Array.from(groups.entries()).map(([utm, g]) => {
      const spend = spendMap.get(utm) ?? 0;
      const winRate = g.leads > 0 ? (g.hired / g.leads) * 100 : 0;
      const costPerHire = g.hired > 0 && spend > 0 ? spend / g.hired : 0;
      let status: string;
      if (winRate >= 20) status = "Scale it";
      else if (winRate >= 10) status = "Testing";
      else status = "Review";

      return {
        utm_content: utm,
        leads: g.leads,
        hired: g.hired,
        win_rate: parseFloat(winRate.toFixed(1)),
        spend,
        cost_per_hire: costPerHire > 0 ? parseFloat(costPerHire.toFixed(2)) : 0,
        status,
      };
    }).sort((a, b) => b.hired - a.hired);

    // ── Funnel rows ──
    const funnel = Array.from(groups.entries()).map(([utm, g]) => {
      const watchPct = g.leads > 0 ? (g.watched / g.leads) * 100 : 0;
      const applyPct = g.watched > 0 ? (g.applied / g.watched) * 100 : 0;
      const hirePct = g.applied > 0 ? (g.hired / g.applied) * 100 : 0;
      return {
        utm_content: utm,
        leads: g.leads,
        watched: g.watched,
        watch_pct: parseFloat(watchPct.toFixed(1)),
        applied: g.applied,
        apply_pct: parseFloat(applyPct.toFixed(1)),
        hired: g.hired,
        hire_pct: parseFloat(hirePct.toFixed(1)),
      };
    }).sort((a, b) => b.leads - a.leads);

    // ── Smart alerts ──
    const alerts: Array<{ type: string; message: string }> = [];

    for (const row of attribution) {
      if (row.spend > 500 && row.cost_per_hire > 200) {
        alerts.push({
          type: "warning",
          message: `⚠️ ${row.utm_content} cost per hire is $${row.cost_per_hire.toFixed(0)} — consider reallocating budget`,
        });
      }
      if (row.win_rate > 20 && row.leads >= 3) {
        alerts.push({
          type: "success",
          message: `🚀 ${row.utm_content} is performing above average (${row.win_rate.toFixed(1)}% win rate) — consider scaling`,
        });
      }
    }

    if (pipeWatched100NotApplied >= 50) {
      alerts.push({
        type: "info",
        message: `💡 ${pipeWatched100NotApplied} contacts watched but didn't apply — re-engagement opportunity`,
      });
    }

    const noRecentHire =
      !lastHireDate || lastHireDate < fourteenDaysAgo;
    if (noRecentHire && totalHired > 0) {
      alerts.push({
        type: "error",
        message: `🔴 No hires recorded in 14 days — check pipeline`,
      });
    }

    // ── Top-level metrics ──
    const earningsMtd = hiresMtd * payoutPerHire;

    return NextResponse.json({
      metrics: {
        totalLeads,
        totalHired,
        hiresMtd,
        earningsMtd,
        payoutPerHire,
      },
      attribution,
      funnel,
      pipeline: {
        watched100NotApplied: pipeWatched100NotApplied,
        appliedNotScheduled: pipeAppliedNotScheduled,
        scheduledUnknown: pipeScheduledUnknown,
        neverWatched: pipeNeverWatched,
        unsubscribed: pipeUnsubscribed,
      },
      alerts,
    });
  } catch (err) {
    console.error("[stats GET]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
