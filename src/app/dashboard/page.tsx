import { Suspense } from "react";
import { getAdsWithStats, getOverviewMetrics } from "@/lib/data";
import MetricCard from "@/components/ui/MetricCard";
import AdsBarChart from "@/components/dashboard/AdsBarChart";
import AdsTable from "@/components/dashboard/AdsTable";
import {
  MetricCardSkeleton,
  TableSkeleton,
  ChartSkeleton,
} from "@/components/ui/Skeleton";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

async function MetricsSection() {
  const metrics = await getOverviewMetrics();
  return (
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
  );
}

async function ChartSection() {
  const ads = await getAdsWithStats();
  const chartData = ads.map((ad) => ({
    name: ad.name,
    leads: ad.total_leads,
    hired: ad.total_hired,
  }));
  return <AdsBarChart data={chartData} />;
}

async function TableSection() {
  const ads = await getAdsWithStats();
  return <AdsTable ads={ads} />;
}

export default function DashboardPage() {
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
        <a
          href="/dashboard/settings"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Data
        </a>
      </div>

      {/* Metric cards */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MetricsSection />
      </Suspense>

      {/* Bar chart */}
      <Suspense fallback={<ChartSkeleton />}>
        <ChartSection />
      </Suspense>

      {/* Ads table */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Ad Performance
        </h2>
        <Suspense fallback={<TableSkeleton rows={6} cols={7} />}>
          <TableSection />
        </Suspense>
      </div>
    </div>
  );
}
