"use client";

import { useState, useEffect } from "react";
import MetricCard from "@/components/ui/MetricCard";
import AdsBarChart from "@/components/dashboard/AdsBarChart";
import AdsTable from "@/components/dashboard/AdsTable";
import PeriodComparison from "@/components/dashboard/PeriodComparison";
import {
  MetricCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
} from "@/components/ui/Skeleton";
import {
  loadPeriods,
  metricsFromAds,
  deleteAllPeriods,
  deletePeriod,
  type ImportPeriod,
  type PeriodMetrics,
} from "@/lib/localData";
import type { AdRow } from "@/lib/data";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function DeltaBadge({ a, b, lowerIsBetter = false }: { a: number; b: number; lowerIsBetter?: boolean }) {
  if (b === 0 && a === 0) return null;
  const diff = a - b;
  if (diff === 0) return <span className="text-xs text-gray-400">no change</span>;
  const pct = b !== 0 ? Math.round(Math.abs((diff / b) * 100)) : null;
  const up = diff > 0;
  const positive = lowerIsBetter ? !up : up;
  return (
    <span className={`text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
      {up ? "↑" : "↓"} {Math.abs(diff)}{pct !== null ? ` (${pct}%)` : ""}
    </span>
  );
}

export default function DashboardPage() {
  const [periods, setPeriods] = useState<ImportPeriod[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [compareId, setCompareId] = useState<string>("");
  const [supabaseAds, setSupabaseAds] = useState<AdRow[] | null>(null);
  const [supabaseMetrics, setSupabaseMetrics] = useState<PeriodMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  // Load periods from localStorage + try Supabase
  useEffect(() => {
    const local = loadPeriods();
    setPeriods(local);
    if (local.length > 0) setSelectedId(local[0].id);

    // Also try Supabase in the background
    fetch("/api/dashboard-stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && Array.isArray(data.ads) && data.ads.length > 0) {
          setSupabaseAds(data.ads as AdRow[]);
          setSupabaseMetrics(data.metrics as PeriodMetrics);
        }
      })
      .catch(() => {})
      .then(() => setLoading(false));

    if (local.length === 0) setLoading(false);
  }, []);

  const handleDeletePeriod = (id: string) => {
    if (!confirm("Delete this period? This cannot be undone.")) return;
    deletePeriod(id);
    const updated = periods.filter((p) => p.id !== id);
    setPeriods(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id ?? "");
    if (compareId === id) setCompareId("");
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all import data and all periods? This cannot be undone.")) return;
    setClearing(true);
    deleteAllPeriods();
    // Try Supabase clear too
    try {
      await fetch("/api/dashboard-stats/clear", { method: "POST" });
    } catch {}
    setPeriods([]);
    setSelectedId("");
    setCompareId("");
    setSupabaseAds(null);
    setSupabaseMetrics(null);
    setClearing(false);
  };

  // Resolve the data to display
  const selectedPeriod = periods.find((p) => p.id === selectedId) ?? null;
  const comparePeriod = compareId ? (periods.find((p) => p.id === compareId) ?? null) : null;

  // Prefer localStorage period data; use Supabase only when no local periods at all
  const displayAds = selectedPeriod
    ? (selectedPeriod.ads as unknown as AdRow[])
    : (supabaseAds ?? []);

  const displayMetrics: PeriodMetrics = selectedPeriod
    ? metricsFromAds(selectedPeriod.ads)
    : (supabaseMetrics ?? { totalLeads: 0, totalHired: 0, totalSpend: 0, avgCostPerHire: 0, bestAd: null });

  const compareMetrics: PeriodMetrics | null = comparePeriod
    ? metricsFromAds(comparePeriod.ads)
    : null;

  const usingSupabase = !selectedPeriod && (supabaseAds?.length ?? 0) > 0;
  const hasData = displayAds.length > 0;

  const chartData = displayAds.map((ad) => ({
    name: ad.name,
    leads: ad.total_leads,
    hired: ad.total_hired,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track which Facebook ads are driving hired clients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          {periods.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Period:</label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  if (e.target.value === compareId) setCompareId("");
                }}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={() => selectedId && handleDeletePeriod(selectedId)}
                title="Delete this period"
                className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Compare selector */}
          {periods.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">vs:</label>
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">— none —</option>
                {periods
                  .filter((p) => p.id !== selectedId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
              </select>
            </div>
          )}

          {usingSupabase && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
              Supabase
            </span>
          )}

          {hasData && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              title="Clear all import data"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {clearing ? "Clearing…" : "Clear All"}
            </button>
          )}

          <a
            href="/dashboard/import"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
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
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Leads"
            value={displayMetrics.totalLeads.toLocaleString()}
            subtitle={
              compareMetrics
                ? (() => {
                    const diff = displayMetrics.totalLeads - compareMetrics.totalLeads;
                    const pct = compareMetrics.totalLeads > 0 ? Math.round(Math.abs(diff / compareMetrics.totalLeads) * 100) : null;
                    if (diff === 0) return `Same as ${comparePeriod!.label}`;
                    return `${diff > 0 ? "+" : ""}${diff}${pct !== null ? ` (${pct}%)` : ""} vs ${comparePeriod!.label}`;
                  })()
                : "All contacts attributed to ads"
            }
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Total Hired"
            value={displayMetrics.totalHired.toLocaleString()}
            subtitle={
              compareMetrics
                ? (() => {
                    const diff = displayMetrics.totalHired - compareMetrics.totalHired;
                    const pct = compareMetrics.totalHired > 0 ? Math.round(Math.abs(diff / compareMetrics.totalHired) * 100) : null;
                    if (diff === 0) return `Same as ${comparePeriod!.label}`;
                    return `${diff > 0 ? "+" : ""}${diff}${pct !== null ? ` (${pct}%)` : ""} vs ${comparePeriod!.label}`;
                  })()
                : "Contacts tagged as hired"
            }
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Avg. Cost / Hire"
            value={displayMetrics.avgCostPerHire > 0 ? fmt(displayMetrics.avgCostPerHire) : "—"}
            subtitle={
              compareMetrics && displayMetrics.avgCostPerHire > 0 && compareMetrics.avgCostPerHire > 0
                ? (() => {
                    const diff = displayMetrics.avgCostPerHire - compareMetrics.avgCostPerHire;
                    const pct = Math.round(Math.abs(diff / compareMetrics.avgCostPerHire) * 100);
                    if (diff === 0) return `Same as ${comparePeriod!.label}`;
                    const better = diff < 0;
                    return `${better ? "▼" : "▲"} ${fmt(Math.abs(diff))} (${pct}%) vs ${comparePeriod!.label}`;
                  })()
                : "Total ad spend ÷ total hired"
            }
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Best Performing Ad"
            value={displayMetrics.bestAd ? `${displayMetrics.bestAd.winRate.toFixed(0)}% win rate` : "—"}
            subtitle={displayMetrics.bestAd?.name ?? "Need ≥3 leads per ad"}
            highlight={!!displayMetrics.bestAd}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Bar chart — always shows selected period */}
      {loading ? <ChartSkeleton /> : <AdsBarChart data={chartData} />}

      {/* Ads table or comparison */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {comparePeriod
              ? `Comparing ${selectedPeriod?.label ?? "current"} vs ${comparePeriod.label}`
              : "Ad Performance"}
          </h2>
          {comparePeriod && (
            <button
              onClick={() => setCompareId("")}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit compare
            </button>
          )}
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : comparePeriod && selectedPeriod ? (
          <PeriodComparison
            periodA={{ label: selectedPeriod.label, ads: selectedPeriod.ads }}
            periodB={{ label: comparePeriod.label, ads: comparePeriod.ads }}
          />
        ) : (
          <AdsTable ads={displayAds} />
        )}
      </div>

      {/* Periods list (visible when > 1 period) */}
      {periods.length > 1 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">All Periods</h2>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Imported</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Ads</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Leads</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Hired</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {periods.map((p) => {
                  const m = metricsFromAds(p.ads);
                  const isSelected = p.id === selectedId;
                  return (
                    <tr
                      key={p.id}
                      className={`cursor-pointer hover:bg-blue-50/40 transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800 flex items-center gap-2">
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />}
                        {p.label}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {new Date(p.importedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{p.ads.length}</td>
                      <td className="px-4 py-2.5 text-gray-600">{m.totalLeads.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-gray-600">{m.totalHired}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePeriod(p.id); }}
                          className="rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete period"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
