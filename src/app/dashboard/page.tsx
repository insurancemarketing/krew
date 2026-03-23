"use client";

import { useState, useEffect } from "react";
import MetricCard from "@/components/ui/MetricCard";
import AdsBarChart from "@/components/dashboard/AdsBarChart";
import AdsTable from "@/components/dashboard/AdsTable";
import {
  MetricCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
} from "@/components/ui/Skeleton";
import {
  loadFromLocalStorage,
  metricsFromLocalData,
  LOCAL_STORAGE_KEY,
} from "@/lib/localData";
import type { AdRow, OverviewMetrics } from "@/lib/data";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const [ads, setAds] = useState<AdRow[] | null>(null);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [source, setSource] = useState<"supabase" | "localStorage" | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const handleClearData = async () => {
    if (!confirm("Clear all import data? This removes localStorage data and cannot be undone.")) return;
    setClearing(true);
    // Clear localStorage
    try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
    // Clear Supabase tables (best-effort)
    try {
      const res = await fetch("/api/dashboard-stats/clear", { method: "POST" });
      if (!res.ok) console.warn("[dashboard] Supabase clear returned", res.status);
    } catch (err) {
      console.warn("[dashboard] Supabase clear failed:", err);
    }
    setAds([]);
    setMetrics({ totalLeads: 0, totalHired: 0, avgCostPerHire: 0, bestAd: null });
    setSource(null);
    setClearing(false);
  };

  useEffect(() => {
    async function load() {
      // Try Supabase via API route first
      try {
        const res = await fetch("/api/dashboard-stats");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.ads) && data.ads.length > 0) {
            console.log("[dashboard] Loaded from Supabase:", data.ads.length, "ads");
            setAds(data.ads as AdRow[]);
            setMetrics(data.metrics as OverviewMetrics);
            setSource("supabase");
            return;
          }
          console.warn("[dashboard] Supabase returned 0 ads — trying localStorage");
        } else {
          console.warn("[dashboard] API error", res.status, "— trying localStorage");
        }
      } catch (err) {
        console.warn("[dashboard] Supabase fetch failed:", err);
      }

      // Fallback: localStorage
      const local = loadFromLocalStorage();
      if (local && local.ads.length > 0) {
        console.log("[dashboard] Loaded from localStorage:", local.ads.length, "ads");
        setAds(local.ads as unknown as AdRow[]);
        setMetrics(metricsFromLocalData(local));
        setSource("localStorage");
      } else {
        setAds([]);
        setMetrics({ totalLeads: 0, totalHired: 0, avgCostPerHire: 0, bestAd: null });
      }
    }

    load().then(() => setLoading(false)).catch(() => setLoading(false));
  }, []);

  const chartData = (ads ?? []).map((ad) => ({
    name: ad.name,
    leads: ad.total_leads,
    hired: ad.total_hired,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track which Facebook ads are driving hired clients.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {source === "localStorage" && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
              Local data (Supabase unavailable)
            </span>
          )}
          {(ads && ads.length > 0) && (
            <button
              onClick={handleClearData}
              disabled={clearing}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {clearing ? "Clearing…" : "Clear Data"}
            </button>
          )}
          <a
            href="/dashboard/import"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import Data
          </a>
        </div>
      </div>

      {/* Metric cards */}
      {loading || !metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Leads"
            value={metrics.totalLeads.toLocaleString()}
            subtitle="All contacts attributed to ads"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Total Hired"
            value={metrics.totalHired.toLocaleString()}
            subtitle="Contacts tagged as hired"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Avg. Cost / Hire"
            value={metrics.avgCostPerHire > 0 ? fmt(metrics.avgCostPerHire) : "—"}
            subtitle="Total ad spend ÷ total hired"
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Best Performing Ad"
            value={metrics.bestAd ? `${metrics.bestAd.winRate.toFixed(0)}% win rate` : "—"}
            subtitle={metrics.bestAd?.name ?? "Need ≥3 leads per ad"}
            highlight={!!metrics.bestAd}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Bar chart */}
      {loading ? <ChartSkeleton /> : <AdsBarChart data={chartData} />}

      {/* Ads table */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Ad Performance</h2>
        {loading || !ads ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <AdsTable ads={ads} />
        )}
      </div>
    </div>
  );
}
