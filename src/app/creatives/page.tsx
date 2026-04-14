"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface Creative {
  id: string;
  client_id: string;
  ad_name: string;
  utm_content: string | null;
  creative_type: string;
  concept_name: string | null;
  hook_summary: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  created_at: string;
  leads: number;
  hired: number;
  win_rate: number;
  spend: number;
  cost_per_hire: number;
  krew_clients?: { id: string; name: string };
}

function fmtCurrency(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CrossClientCreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"hired" | "win_rate" | "cost_per_hire" | "created_at">(
    "hired"
  );

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/creatives");
      const data = await res.json();
      setCreatives(data.creatives ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of creatives) {
      if (c.krew_clients) map.set(c.krew_clients.id, c.krew_clients.name);
    }
    return Array.from(map.entries());
  }, [creatives]);

  const filtered = useMemo(() => {
    let list = creatives;
    if (filterClient !== "all") list = list.filter((c) => c.client_id === filterClient);
    if (filterType !== "all") list = list.filter((c) => c.creative_type === filterType);
    list = [...list].sort((a, b) => {
      if (sortBy === "created_at") return b.created_at.localeCompare(a.created_at);
      if (sortBy === "cost_per_hire") {
        const av = a.cost_per_hire || Infinity;
        const bv = b.cost_per_hire || Infinity;
        return av - bv;
      }
      return (b[sortBy] as number) - (a[sortBy] as number);
    });
    return list;
  }, [creatives, filterClient, filterType, sortBy]);

  const totals = useMemo(() => {
    const leads = filtered.reduce((s, c) => s + (c.leads || 0), 0);
    const hired = filtered.reduce((s, c) => s + (c.hired || 0), 0);
    const spend = filtered.reduce((s, c) => s + (c.spend || 0), 0);
    return { leads, hired, spend, winRate: leads ? (hired / leads) * 100 : 0 };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Creative Library</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cross-client view of ad creatives with attribution stats.
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Creatives</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Leads</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totals.leads.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Hired / Converted
          </p>
          <p className="mt-2 text-2xl font-bold text-green-700">{totals.hired}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Blended Win Rate
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totals.winRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All clients</option>
          {clients.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All types</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="carousel">Carousel</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="hired">Sort: Hired</option>
          <option value="win_rate">Sort: Win rate</option>
          <option value="cost_per_hire">Sort: Cost/hire</option>
          <option value="created_at">Sort: Newest</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="h-40 w-full animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-4 w-32 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          No creatives yet. Add creatives from the per-client Creatives tab.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-gray-100">
                {c.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail_url}
                    alt={c.ad_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No thumbnail</span>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{c.ad_name}</p>
                    {c.krew_clients && (
                      <Link
                        href={`/dashboard/${c.krew_clients.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {c.krew_clients.name}
                      </Link>
                    )}
                  </div>
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {c.creative_type}
                  </span>
                </div>

                {c.hook_summary && (
                  <p className="mt-2 text-xs text-gray-600">&ldquo;{c.hook_summary}&rdquo;</p>
                )}

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-gray-500">Leads</p>
                    <p className="text-sm font-semibold text-gray-900">{c.leads ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500">Hired</p>
                    <p className="text-sm font-semibold text-green-700">{c.hired ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500">Win %</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {c.win_rate ? c.win_rate.toFixed(1) : "0.0"}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500">C/H</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {fmtCurrency(c.cost_per_hire)}
                    </p>
                  </div>
                </div>

                {c.utm_content && (
                  <p className="mt-2 font-mono text-xs text-gray-500">{c.utm_content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
