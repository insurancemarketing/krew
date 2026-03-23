/**
 * localStorage schema for import data.
 * Used as a fallback when Supabase is unavailable.
 * Shape matches AdRow from lib/data.ts so dashboard components accept both.
 */

export interface LocalAdStat {
  id: string;
  fb_ad_id: string;
  name: string;
  status: string;
  campaign_id: null;
  ad_set_id: null;
  total_leads: number;
  total_hired: number;
  win_rate: number;
  total_spend: number;
  cost_per_hire: number;
  impressions: number;
  clicks: number;
}

export interface LocalImportData {
  importedAt: string;
  ads: LocalAdStat[];
}

export const LOCAL_STORAGE_KEY = "krew_import_data";

export function saveToLocalStorage(data: LocalImportData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    console.log("[localData] Saved to localStorage:", data.ads.length, "ads");
  } catch (err) {
    console.error("[localData] Failed to save to localStorage:", err);
  }
}

export function loadFromLocalStorage(): LocalImportData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LocalImportData;
  } catch (err) {
    console.error("[localData] Failed to read from localStorage:", err);
    return null;
  }
}

export function metricsFromLocalData(data: LocalImportData) {
  const totalLeads = data.ads.reduce((s, a) => s + a.total_leads, 0);
  const totalHired = data.ads.reduce((s, a) => s + a.total_hired, 0);
  const totalSpend = data.ads.reduce((s, a) => s + a.total_spend, 0);
  const avgCostPerHire = totalHired > 0 ? totalSpend / totalHired : 0;
  const qualified = [...data.ads]
    .filter((a) => a.total_leads >= 3)
    .sort((a, b) => b.win_rate - a.win_rate);
  const bestAd = qualified[0]
    ? { name: qualified[0].name, winRate: qualified[0].win_rate }
    : null;
  return { totalLeads, totalHired, avgCostPerHire, bestAd };
}
