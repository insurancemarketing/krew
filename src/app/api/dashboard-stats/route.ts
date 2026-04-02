export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAdsWithStats, getOverviewMetrics } from "@/lib/data";

export async function GET() {
  try {
    const [ads, metrics] = await Promise.all([
      getAdsWithStats(),
      getOverviewMetrics(),
    ]);
    return NextResponse.json({ ads, metrics });
  } catch (err) {
    console.error("[dashboard-stats] Error:", err);
    return NextResponse.json(
      { error: String(err), ads: [], metrics: null },
      { status: 500 }
    );
  }
}
