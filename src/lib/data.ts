/**
 * Server-side data fetching helpers used by Server Components.
 * All functions return plain objects safe for serialization.
 */

import { createServerClient } from "@/lib/supabase/server";

export interface AdRow {
  id: string;
  fb_ad_id: string;
  name: string;
  status: string | null;
  campaign_id: string | null;
  ad_set_id: string | null;
  total_spend: number;
  total_leads: number;
  total_hired: number;
  win_rate: number;
  cost_per_hire: number;
}

export interface OverviewMetrics {
  totalLeads: number;
  totalHired: number;
  avgCostPerHire: number;
  bestAd: { name: string; winRate: number } | null;
}

export interface ContactRow {
  id: string;
  ghl_contact_id: string;
  name: string | null;
  email: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  pipeline_stage: string | null;
  tags: string[] | null;
  hired_at: string | null;
  created_at: string;
  ad_name: string | null;
}

export interface AdDetailRow {
  id: string;
  name: string;
  fb_ad_id: string;
  status: string | null;
  campaign_id: string | null;
  total_spend: number;
  total_leads: number;
  total_hired: number;
  win_rate: number;
  cost_per_hire: number;
  timeline: Array<{ date: string; leads: number; hired: number }>;
  contacts: Array<{
    id: string;
    name: string | null;
    email: string | null;
    hired_at: string | null;
    created_at: string;
  }>;
}

/** Aggregate spend for an ad */
async function getAdSpendTotal(
  supabase: any,
  adId: string
): Promise<number> {
  const { data } = await supabase
    .from("ad_spend")
    .select("spend")
    .eq("ad_id", adId);
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.spend ?? 0), 0);
}

/** Get all ads with aggregated stats */
export async function getAdsWithStats(): Promise<AdRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { data: ads, error } = await supabase
    .from("ads")
    .select("id, fb_ad_id, name, status, campaign_id, ad_set_id")
    .order("created_at", { ascending: false });

  if (error || !ads) return [];

  const rows: AdRow[] = [];

  for (const ad of ads) {
    // Contacts attributed to this ad
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, hired_at")
      .eq("fb_ad_id", ad.id);

    const totalLeads = contacts?.length ?? 0;
    const totalHired = (contacts ?? []).filter((c) => c.hired_at).length;
    const winRate = totalLeads > 0 ? (totalHired / totalLeads) * 100 : 0;

    const totalSpend = await getAdSpendTotal(supabase, ad.id);
    const costPerHire = totalHired > 0 ? totalSpend / totalHired : 0;

    rows.push({
      id: ad.id,
      fb_ad_id: ad.fb_ad_id,
      name: ad.name,
      status: ad.status,
      campaign_id: ad.campaign_id,
      ad_set_id: ad.ad_set_id,
      total_spend: totalSpend,
      total_leads: totalLeads,
      total_hired: totalHired,
      win_rate: winRate,
      cost_per_hire: costPerHire,
    });
  }

  return rows;
}

/** Get overview metric cards */
export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { count: totalLeads } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true });

  const { count: totalHired } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .not("hired_at", "is", null);

  const { data: spendData } = await supabase
    .from("ad_spend")
    .select("spend");

  const totalSpend = (spendData ?? []).reduce(
    (sum: number, r: any) => sum + (r.spend ?? 0),
    0
  );
  const avgCostPerHire =
    totalHired && totalHired > 0 ? totalSpend / totalHired : 0;

  // Best performing ad by win rate (min 3 leads)
  const ads = await getAdsWithStats();
  const qualifiedAds = ads.filter((a) => a.total_leads >= 3);
  qualifiedAds.sort((a, b) => b.win_rate - a.win_rate);
  const bestAd = qualifiedAds[0]
    ? { name: qualifiedAds[0].name, winRate: qualifiedAds[0].win_rate }
    : null;

  return {
    totalLeads: totalLeads ?? 0,
    totalHired: totalHired ?? 0,
    avgCostPerHire,
    bestAd,
  };
}

/** Get a paginated, filtered list of contacts */
export async function getContacts(opts?: {
  search?: string;
  stage?: string;
  page?: number;
  perPage?: number;
}): Promise<{ contacts: ContactRow[]; total: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;
  const page = opts?.page ?? 1;
  const perPage = opts?.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("contacts")
    .select(
      `id, ghl_contact_id, name, email, utm_source, utm_medium, utm_campaign,
       utm_content, pipeline_stage, tags, hired_at, created_at,
       ads!contacts_fb_ad_id_fkey(name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts?.search) {
    query = query.or(
      `name.ilike.%${opts.search}%,email.ilike.%${opts.search}%`
    );
  }
  if (opts?.stage) {
    query = query.eq("pipeline_stage", opts.stage);
  }

  const { data, count, error } = await query;
  if (error) return { contacts: [], total: 0 };

  const contacts: ContactRow[] = (data ?? []).map((row) => ({
    id: row.id,
    ghl_contact_id: row.ghl_contact_id,
    name: row.name,
    email: row.email,
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    utm_content: row.utm_content,
    pipeline_stage: row.pipeline_stage,
    tags: row.tags,
    hired_at: row.hired_at,
    created_at: row.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ad_name: (row as any).ads?.name ?? null,
  }));

  return { contacts, total: count ?? 0 };
}

/** Get a single ad with full detail */
export async function getAdDetail(adId: string): Promise<AdDetailRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;

  const { data: ad } = await supabase
    .from("ads")
    .select("*")
    .eq("id", adId)
    .maybeSingle();

  if (!ad) return null;

  // All contacts
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, email, hired_at, created_at")
    .eq("fb_ad_id", adId)
    .order("created_at", { ascending: true });

  const totalLeads = contacts?.length ?? 0;
  const totalHired = (contacts ?? []).filter((c) => c.hired_at).length;
  const winRate = totalLeads > 0 ? (totalHired / totalLeads) * 100 : 0;
  const totalSpend = await getAdSpendTotal(supabase, adId);
  const costPerHire = totalHired > 0 ? totalSpend / totalHired : 0;

  // Build timeline: bucket contacts and hires by day
  const timelineMap = new Map<
    string,
    { leads: number; hired: number }
  >();

  for (const c of contacts ?? []) {
    const day = c.created_at.split("T")[0];
    const existing = timelineMap.get(day) ?? { leads: 0, hired: 0 };
    existing.leads++;
    if (c.hired_at) existing.hired++;
    timelineMap.set(day, existing);
  }

  const timeline = Array.from(timelineMap.entries())
    .map(([date, val]) => ({ date, ...val }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: ad.id,
    name: ad.name,
    fb_ad_id: ad.fb_ad_id,
    status: ad.status,
    campaign_id: ad.campaign_id,
    total_spend: totalSpend,
    total_leads: totalLeads,
    total_hired: totalHired,
    win_rate: winRate,
    cost_per_hire: costPerHire,
    timeline,
    contacts: (contacts ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      hired_at: c.hired_at,
      created_at: c.created_at,
    })),
  };
}
