/**
 * Facebook Ads → Supabase sync logic.
 * 1. Pulls all active/paused ads from the ad account and upserts into `ads`.
 * 2. Pulls spend/impressions/clicks for each ad for the last 30 days
 *    and upserts into `ad_spend`.
 */

import { createServerClient } from "@/lib/supabase/server";
import {
  listAds,
  getAllAdInsights,
  daysAgo,
  today,
} from "@/lib/facebook/client";

export interface FBSyncResult {
  adsUpserted: number;
  spendRowsUpserted: number;
  errors: string[];
}

export async function syncFacebookAds(
  token?: string,
  adAccountId?: string
): Promise<FBSyncResult> {
  const supabase = createServerClient();
  const errors: string[] = [];
  let adsUpserted = 0;
  let spendRowsUpserted = 0;

  // 1. Fetch and upsert ads
  let ads;
  try {
    ads = await listAds(token, adAccountId);
  } catch (err) {
    return {
      adsUpserted: 0,
      spendRowsUpserted: 0,
      errors: [`Failed to fetch FB ads: ${String(err)}`],
    };
  }

  for (const ad of ads) {
    const { error } = await supabase.from("ads").upsert(
      {
        fb_ad_id: ad.id,
        name: ad.name,
        campaign_id: ad.campaign_id ?? null,
        ad_set_id: ad.adset_id ?? null,
        creative_id: ad.creative?.id ?? null,
        status: ad.effective_status ?? ad.status ?? "UNKNOWN",
      },
      { onConflict: "fb_ad_id" }
    );

    if (error) {
      errors.push(`Upsert ad ${ad.id}: ${error.message}`);
    } else {
      adsUpserted++;
    }
  }

  // 2. Fetch insights for last 30 days
  const dateFrom = daysAgo(30);
  const dateTo = today();

  let insights;
  try {
    insights = await getAllAdInsights(dateFrom, dateTo, token, adAccountId);
  } catch (err) {
    errors.push(`Failed to fetch FB insights: ${String(err)}`);
    return { adsUpserted, spendRowsUpserted, errors };
  }

  // Look up ad UUIDs in bulk
  const fbAdIds = [...new Set(insights.map((i) => i.ad_id))];
  const { data: adRows } = await supabase
    .from("ads")
    .select("id, fb_ad_id")
    .in("fb_ad_id", fbAdIds);

  const fbIdToUuid = new Map<string, string>(
    (adRows ?? []).map((r) => [r.fb_ad_id, r.id])
  );

  for (const insight of insights) {
    const adUuid = fbIdToUuid.get(insight.ad_id) ?? null;
    const { error } = await supabase.from("ad_spend").upsert(
      {
        fb_ad_id: insight.ad_id,
        ad_id: adUuid,
        date: insight.date_start,
        spend: parseFloat(insight.spend) || 0,
        impressions: parseInt(insight.impressions, 10) || 0,
        clicks: parseInt(insight.clicks, 10) || 0,
      },
      { onConflict: "fb_ad_id,date" }
    );

    if (error) {
      errors.push(`Upsert spend ${insight.ad_id}/${insight.date_start}: ${error.message}`);
    } else {
      spendRowsUpserted++;
    }
  }

  return { adsUpserted, spendRowsUpserted, errors };
}
