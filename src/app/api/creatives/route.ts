export const dynamic = "force-dynamic";
/**
 * GET /api/creatives — all creatives across all clients with attribution stats
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const db = createAdminClient();

    // Get all creatives with client info
    const { data: creatives, error } = await db
      .from("creative_library")
      .select("*, krew_clients(id, name)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    if (!creatives || creatives.length === 0) {
      return NextResponse.json({ creatives: [] });
    }

    // For each creative, look up attribution stats from krew_contacts + krew_ad_spend
    const enriched = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (creatives as any[]).map(async (c) => {
        if (!c.utm_content) return { ...c, leads: 0, hired: 0, win_rate: 0, spend: 0, cost_per_hire: 0 };

        const [{ data: contacts }, { data: spendRows }] = await Promise.all([
          db
            .from("krew_contacts")
            .select("is_hired")
            .eq("client_id", c.client_id)
            .eq("utm_content", c.utm_content),
          db
            .from("krew_ad_spend")
            .select("spend")
            .eq("client_id", c.client_id)
            .eq("utm_content", c.utm_content),
        ]);

        const leads = contacts?.length ?? 0;
        const hired = (contacts ?? []).filter((x: { is_hired: boolean }) => x.is_hired).length;
        const spend = (spendRows ?? []).reduce((s: number, r: { spend: number }) => s + (r.spend ?? 0), 0);
        const win_rate = leads > 0 ? (hired / leads) * 100 : 0;
        const cost_per_hire = hired > 0 && spend > 0 ? spend / hired : 0;

        return { ...c, leads, hired, win_rate, spend, cost_per_hire };
      })
    );

    return NextResponse.json({ creatives: enriched });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
