/**
 * Facebook Marketing API client.
 * Uses a long-lived Page/System User access token stored in env vars.
 * All requests are server-side only.
 */

const FB_API_VERSION = "v19.0";
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

function getToken(token?: string): string {
  return token ?? process.env.FB_ACCESS_TOKEN ?? "";
}

function getAdAccountId(adAccountId?: string): string {
  return adAccountId ?? process.env.FB_AD_ACCOUNT_ID ?? "";
}

export interface FBAdInsight {
  ad_id: string;
  ad_name: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
}

export interface FBAd {
  id: string;
  name: string;
  campaign_id: string;
  adset_id: string;
  creative?: { id: string };
  status: string;
  effective_status: string;
}

export interface FBInsightsResponse {
  data: FBAdInsight[];
  paging?: { cursors?: { after?: string }; next?: string };
}

export interface FBAdsResponse {
  data: FBAd[];
  paging?: { cursors?: { after?: string }; next?: string };
}

/** List all active ads under the ad account */
export async function listAds(
  token?: string,
  adAccountId?: string
): Promise<FBAd[]> {
  const accessToken = getToken(token);
  const account = getAdAccountId(adAccountId);
  const fields = "id,name,campaign_id,adset_id,creative{id},status,effective_status";
  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    limit: "500",
    effective_status: '["ACTIVE","PAUSED"]',
  });

  const ads: FBAd[] = [];
  let url = `${FB_BASE}/${account}/ads?${params}`;

  while (url) {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FB /ads failed (${res.status}): ${body}`);
    }
    const data: FBAdsResponse = await res.json();
    ads.push(...(data.data ?? []));
    url = data.paging?.next ?? "";
  }

  return ads;
}

/** Fetch insights (spend/clicks/impressions) for a specific ad over a date range */
export async function getAdInsights(
  fbAdId: string,
  dateFrom: string,
  dateTo: string,
  token?: string
): Promise<FBAdInsight[]> {
  const accessToken = getToken(token);
  const fields = "ad_id,ad_name,date_start,date_stop,spend,impressions,clicks";
  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    time_increment: "1",
    level: "ad",
    limit: "500",
  });

  const insights: FBAdInsight[] = [];
  let url = `${FB_BASE}/${fbAdId}/insights?${params}`;

  while (url) {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FB insights for ad ${fbAdId} failed (${res.status}): ${body}`);
    }
    const data: FBInsightsResponse = await res.json();
    insights.push(...(data.data ?? []));
    url = data.paging?.next ?? "";
  }

  return insights;
}

/** Fetch insights for all ads in the account for a date range */
export async function getAllAdInsights(
  dateFrom: string,
  dateTo: string,
  token?: string,
  adAccountId?: string
): Promise<FBAdInsight[]> {
  const accessToken = getToken(token);
  const account = getAdAccountId(adAccountId);
  const fields = "ad_id,ad_name,date_start,date_stop,spend,impressions,clicks";
  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    time_increment: "1",
    level: "ad",
    limit: "500",
  });

  const insights: FBAdInsight[] = [];
  let url = `${FB_BASE}/${account}/insights?${params}`;

  while (url) {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`FB account insights failed (${res.status}): ${body}`);
    }
    const data: FBInsightsResponse = await res.json();
    insights.push(...(data.data ?? []));
    url = data.paging?.next ?? "";
  }

  return insights;
}

/** Returns a date string YYYY-MM-DD for N days ago */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/** Returns today's date string YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}
