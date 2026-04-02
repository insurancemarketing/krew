/**
 * localStorage schema for import data.
 * Supports multiple named periods for comparison over time.
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

/** A single named import snapshot */
export interface ImportPeriod {
  id: string;       // timestamp-based unique ID
  label: string;    // user display name e.g. "April 2026"
  importedAt: string;
  ads: LocalAdStat[];
}

// Legacy key — kept for backward compat
export const LOCAL_STORAGE_KEY = "krew_import_data";
// New key stores an array of periods
export const PERIODS_KEY = "krew_periods";

// ---------------------------------------------------------------------------
// Period CRUD
// ---------------------------------------------------------------------------

export function loadPeriods(): ImportPeriod[] {
  try {
    const raw = localStorage.getItem(PERIODS_KEY);
    if (raw) return JSON.parse(raw) as ImportPeriod[];

    // Migrate from legacy single-object key
    const legacy = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (legacy) {
      const data = JSON.parse(legacy) as { importedAt: string; ads: LocalAdStat[] };
      const migrated: ImportPeriod = {
        id: "migrated",
        label: "Imported data",
        importedAt: data.importedAt ?? new Date().toISOString(),
        ads: data.ads ?? [],
      };
      savePeriods([migrated]);
      return [migrated];
    }
    return [];
  } catch (err) {
    console.error("[localData] loadPeriods error:", err);
    return [];
  }
}

function savePeriods(periods: ImportPeriod[]): void {
  localStorage.setItem(PERIODS_KEY, JSON.stringify(periods));
}

/** Save a new period. Replaces existing period with same label if present. */
export function saveAsPeriod(
  ads: LocalAdStat[],
  label: string
): ImportPeriod {
  const newPeriod: ImportPeriod = {
    id: String(Date.now()),
    label: label.trim() || "Unnamed",
    importedAt: new Date().toISOString(),
    ads,
  };
  const existing = loadPeriods().filter(
    (p) => p.label.toLowerCase() !== newPeriod.label.toLowerCase()
  );
  savePeriods([newPeriod, ...existing]);
  // Also update legacy key so old callers still get latest
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ importedAt: newPeriod.importedAt, ads })
    );
  } catch {}
  console.log("[localData] Saved period:", newPeriod.label, "—", ads.length, "ads");
  return newPeriod;
}

export function deletePeriod(id: string): void {
  savePeriods(loadPeriods().filter((p) => p.id !== id));
}

export function deleteAllPeriods(): void {
  try { localStorage.removeItem(PERIODS_KEY); } catch {}
  try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
}

// ---------------------------------------------------------------------------
// Compat helpers (used by existing callers)
// ---------------------------------------------------------------------------

/** @deprecated Use loadPeriods()[0] instead */
export interface LocalImportData {
  importedAt: string;
  ads: LocalAdStat[];
}

/** @deprecated */
export function loadFromLocalStorage(): LocalImportData | null {
  const periods = loadPeriods();
  if (!periods.length) return null;
  return { importedAt: periods[0].importedAt, ads: periods[0].ads };
}

/** @deprecated Use saveAsPeriod instead */
export function saveToLocalStorage(data: LocalImportData): void {
  // Just keep legacy key — period save happens in import page via saveAsPeriod
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ---------------------------------------------------------------------------
// Metric helpers
// ---------------------------------------------------------------------------

export interface PeriodMetrics {
  totalLeads: number;
  totalHired: number;
  totalSpend: number;
  avgCostPerHire: number;
  bestAd: { name: string; winRate: number } | null;
}

export function metricsFromAds(ads: LocalAdStat[]): PeriodMetrics {
  const totalLeads = ads.reduce((s, a) => s + a.total_leads, 0);
  const totalHired = ads.reduce((s, a) => s + a.total_hired, 0);
  const totalSpend = ads.reduce((s, a) => s + a.total_spend, 0);
  const avgCostPerHire = totalHired > 0 ? totalSpend / totalHired : 0;
  const qualified = [...ads]
    .filter((a) => a.total_leads >= 3)
    .sort((a, b) => b.win_rate - a.win_rate);
  const bestAd = qualified[0]
    ? { name: qualified[0].name, winRate: qualified[0].win_rate }
    : null;
  return { totalLeads, totalHired, totalSpend, avgCostPerHire, bestAd };
}

/** Kept for callers that pass LocalImportData */
export function metricsFromLocalData(data: LocalImportData): PeriodMetrics {
  return metricsFromAds(data.ads);
}
