"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
interface AttrRow {
  utm_content: string;
  leads: number;
  hired: number;
  win_rate: number;
  spend: number;
  cost_per_hire: number;
  status: string;
}

interface FunnelRow {
  utm_content: string;
  leads: number;
  watched: number;
  watch_pct: number;
  applied: number;
  apply_pct: number;
  hired: number;
  hire_pct: number;
}

interface Pipeline {
  watched100NotApplied: number;
  appliedNotScheduled: number;
  scheduledUnknown: number;
  neverWatched: number;
  unsubscribed: number;
}

interface Metrics {
  totalLeads: number;
  totalHired: number;
  hiresMtd: number;
  earningsMtd: number;
  payoutPerHire: number;
}

interface Alert {
  type: string;
  message: string;
}

interface ClientInfo {
  name: string;
  last_synced: string | null;
  sync_status: string;
  sync_error: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const statusStyles: Record<string, string> = {
  "Scale it": "bg-green-100 text-green-700",
  "Testing": "bg-blue-100 text-blue-700",
  "Review": "bg-orange-100 text-orange-700",
};

// ── Metric Card ────────────────────────────────────────────────────────────
function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Smart Alert Banner ─────────────────────────────────────────────────────
function AlertBanner({ alert }: { alert: Alert }) {
  const styles: Record<string, string> = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[alert.type] ?? styles.info}`}>
      {alert.message}
    </div>
  );
}

// ── Pipeline Segment Card ──────────────────────────────────────────────────
function PipelineCard({
  icon, label, count, clientId,
}: { icon: string; label: string; count: number; clientId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [contacts, setContacts] = useState<unknown[]>([]);

  const handleViewContacts = async () => {
    if (expanded) { setExpanded(false); return; }
    const res = await fetch(`/api/clients/${clientId}/contacts?perPage=200`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setExpanded(true);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{icon} {label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{count.toLocaleString()}</p>
        </div>
        {count > 0 && (
          <button
            onClick={handleViewContacts}
            className="text-xs text-blue-600 hover:underline"
          >
            {expanded ? "Hide" : "View contacts"}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-3 max-h-48 overflow-y-auto border-t border-gray-100 pt-3 space-y-1">
          {contacts.length === 0 ? (
            <p className="text-xs text-gray-400">No contacts found.</p>
          ) : (
            (contacts as Array<Record<string, unknown>>).map((c) => (
              <div key={c.id as string} className="flex items-center justify-between text-xs text-gray-600">
                <span>{[c.first_name as string, c.last_name as string].filter(Boolean).join(" ") || (c.email as string) || (c.id as string)}</span>
                <span className="font-mono text-gray-400">{(c.utm_content as string) ?? "—"}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [attribution, setAttribution] = useState<AttrRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [attrSort, setAttrSort] = useState<keyof AttrRow>("hired");
  const [attrDir, setAttrDir] = useState<"asc" | "desc">("desc");

  const loadData = useCallback(async () => {
    try {
      const [clientRes, statsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/stats`),
      ]);
      const { client: c } = await clientRes.json();
      const stats = await statsRes.json();
      setClient(c);
      setMetrics(stats.metrics);
      setAttribution(stats.attribution ?? []);
      setFunnel(stats.funnel ?? []);
      setPipeline(stats.pipeline ?? null);
      setAlerts(stats.alerts ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch(`/api/clients/${clientId}/sync`, { method: "POST" });
    await loadData();
    setSyncing(false);
  };

  const toggleSort = (key: keyof AttrRow) => {
    if (attrSort === key) setAttrDir((d) => d === "asc" ? "desc" : "asc");
    else { setAttrSort(key); setAttrDir("desc"); }
  };

  const sortedAttribution = [...attribution].sort((a, b) => {
    const av = a[attrSort], bv = b[attrSort];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return attrDir === "asc" ? cmp : -cmp;
  });

  const maxHired = Math.max(...attribution.map((a) => a.hired), 1);
  const maxCph = Math.max(...attribution.filter((a) => a.cost_per_hire > 0).map((a) => a.cost_per_hire), 1);

  const SortTh = ({ k, label }: { k: keyof AttrRow; label: string }) => (
    <th
      className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 select-none"
      onClick={() => toggleSort(k)}
    >
      {label}
      <span className="ml-1 text-gray-300">
        {attrSort === k ? (attrDir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  );

  const Skeleton = () => (
    <div className="h-4 bg-gray-100 rounded animate-pulse" />
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard" className="hover:text-blue-600">All Clients</Link>
            <span>/</span>
            <span className="text-gray-800 font-medium">{client?.name ?? "…"}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{client?.name ?? "Loading…"}</h1>
          {client?.last_synced && (
            <p className="text-xs text-gray-400 mt-0.5">Last synced: {timeAgo(client.last_synced)}</p>
          )}
          {client?.sync_error && (
            <p className="text-xs text-red-500 mt-0.5">Sync error: {client.sync_error}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${clientId}/settings`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          <Link
            href={`/dashboard/${clientId}/contacts`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Contacts
          </Link>
          <button
            onClick={handleSync}
            disabled={syncing || client?.sync_status === "syncing"}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => <AlertBanner key={i} alert={a} />)}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <Skeleton /><Skeleton />
            </div>
          ))
        ) : (
          <>
            <Card title="Total Leads" value={(metrics?.totalLeads ?? 0).toLocaleString()} sub="All time" />
            <Card title="Total Hires" value={(metrics?.totalHired ?? 0).toLocaleString()} sub="All time" />
            <Card title="Hires This Month" value={(metrics?.hiresMtd ?? 0).toLocaleString()} />
            <Card
              title="Your Earnings MTD"
              value={metrics ? fmtCurrency(metrics.earningsMtd) : "—"}
              sub={metrics ? `${metrics.hiresMtd} × ${fmtCurrency(metrics.payoutPerHire)}` : undefined}
            />
          </>
        )}
      </div>

      {/* Attribution Table */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Attribution</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortTh k="utm_content" label="Ad (utm_content)" />
                  <SortTh k="leads" label="Leads" />
                  <SortTh k="hired" label="Hired" />
                  <SortTh k="win_rate" label="Win Rate" />
                  <SortTh k="spend" label="Spend" />
                  <SortTh k="cost_per_hire" label="Cost/Hire" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                    ))}</tr>
                  ))
                ) : sortedAttribution.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No data — run a sync to import contacts.</td></tr>
                ) : (
                  sortedAttribution.map((row) => {
                    const isBest = row.hired === maxHired && row.hired > 0;
                    const isWorst = row.cost_per_hire === maxCph && row.cost_per_hire > 0 && row.spend > 100;
                    return (
                      <tr
                        key={row.utm_content}
                        className={`transition-colors ${isBest ? "bg-green-50" : isWorst ? "bg-red-50" : "hover:bg-gray-50"}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{row.utm_content}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.leads}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.hired}</td>
                        <td className="px-4 py-3 text-gray-700">{row.win_rate.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-gray-700">{row.spend > 0 ? fmtCurrency(row.spend) : "—"}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.cost_per_hire > 0 ? fmtCurrency(row.cost_per_hire) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Funnel Table */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Funnel Breakdown</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Ad", "Leads", "Watched", "Watch%", "Applied", "Apply%", "Hired", "Hire%"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-12" /></td>
                    ))}</tr>
                  ))
                ) : funnel.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No funnel data yet.</td></tr>
                ) : (
                  funnel.map((row) => (
                    <tr key={row.utm_content} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{row.utm_content}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.leads}</td>
                      <td className="px-4 py-3 text-gray-700">{row.watched}</td>
                      <td className="px-4 py-3 text-gray-600">{row.watch_pct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-gray-700">{row.applied}</td>
                      <td className="px-4 py-3 text-gray-600">{row.apply_pct.toFixed(1)}%</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{row.hired}</td>
                      <td className="px-4 py-3 text-gray-600">{row.hire_pct.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pipeline Recovery */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Pipeline Recovery</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 h-24 animate-pulse" />
            ))}
          </div>
        ) : pipeline ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PipelineCard icon="🔥" label="Watched 100%, didn't apply" count={pipeline.watched100NotApplied} clientId={clientId} />
            <PipelineCard icon="🔥" label="Applied, didn't schedule" count={pipeline.appliedNotScheduled} clientId={clientId} />
            <PipelineCard icon="🔥" label="Scheduled, unknown outcome" count={pipeline.scheduledUnknown} clientId={clientId} />
            <PipelineCard icon="❄️" label="Never watched" count={pipeline.neverWatched} clientId={clientId} />
            <PipelineCard icon="🚫" label="Unsubscribed" count={pipeline.unsubscribed} clientId={clientId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
