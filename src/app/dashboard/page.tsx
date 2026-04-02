"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ClientSummary {
  id: string;
  name: string;
  last_synced: string | null;
  sync_status: string;
  totalLeads: number;
  hiresMtd: number;
  bestAd: string | null;
  costPerHire: number;
  earnings: number;
  statusColor: "green" | "yellow" | "red";
}

function StatusDot({ color }: { color: "green" | "yellow" | "red" }) {
  const cls = { green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500" }[color];
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function MasterDashboard() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const res = await fetch("/api/clients");
      const { clients: rawClients } = await res.json();
      if (!rawClients) return;

      // Fetch stats for each client in parallel
      const summaries = await Promise.all(
        rawClients.map(async (c: Record<string, unknown>) => {
          try {
            const statsRes = await fetch(`/api/clients/${c.id}/stats`);
            const stats = statsRes.ok ? await statsRes.json() : null;

            const metrics = stats?.metrics ?? {};
            const attribution = stats?.attribution ?? [];
            const costPerHire = attribution.length > 0
              ? attribution.reduce((sum: number, a: Record<string, number>) => sum + (a.spend ?? 0), 0) /
                Math.max(attribution.reduce((sum: number, a: Record<string, number>) => sum + (a.hired ?? 0), 0), 1)
              : 0;

            const bestAd = attribution.length > 0
              ? attribution.filter((a: Record<string, number>) => a.hired > 0)
                  .sort((a: Record<string, number>, b: Record<string, number>) => (a.cost_per_hire || 999999) - (b.cost_per_hire || 999999))[0]?.utm_content ?? null
              : null;

            let statusColor: "green" | "yellow" | "red" = "green";
            const now = Date.now();
            const lastHireDate = stats?.attribution
              ?.flatMap((a: Record<string, unknown[]>) => a.hiredDates ?? [])
              .map((d: unknown) => new Date(d as string).getTime())
              .sort((a: number, b: number) => b - a)[0];
            const noHire7d = !lastHireDate || (now - lastHireDate) > 7 * 86400 * 1000;

            if (costPerHire > 200 || (noHire7d && metrics.totalHired > 0)) statusColor = "red";
            else if (costPerHire > 150) statusColor = "yellow";

            return {
              id: c.id as string,
              name: c.name as string,
              last_synced: c.last_synced as string | null,
              sync_status: c.sync_status as string,
              totalLeads: metrics.totalLeads ?? 0,
              hiresMtd: metrics.hiresMtd ?? 0,
              bestAd,
              costPerHire: costPerHire > 0 ? costPerHire : 0,
              earnings: metrics.earningsMtd ?? 0,
              statusColor,
            } as ClientSummary;
          } catch {
            return {
              id: c.id as string,
              name: c.name as string,
              last_synced: c.last_synced as string | null,
              sync_status: c.sync_status as string,
              totalLeads: 0, hiresMtd: 0, bestAd: null,
              costPerHire: 0, earnings: 0,
              statusColor: "red" as const,
            };
          }
        })
      );
      setClients(summaries);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleSync = async (clientId: string) => {
    setSyncing((s) => new Set(s).add(clientId));
    try {
      await fetch(`/api/clients/${clientId}/sync`, { method: "POST" });
      await loadDashboard();
    } finally {
      setSyncing((s) => { const n = new Set(s); n.delete(clientId); return n; });
    }
  };

  const totalEarnings = clients.reduce((s, c) => s + c.earnings, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of all active client accounts.</p>
        </div>
        <div className="flex items-center gap-3">
          {totalEarnings > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm font-semibold text-green-700">
              {fmtCurrency(totalEarnings)} MTD
            </span>
          )}
          <Link
            href="/dashboard/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Clients table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Client", "Leads", "Hires MTD", "Best Ad", "Cost/Hire", "Your Earnings", "Last Sync", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No clients yet.{" "}
                    <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">Add your first client →</Link>
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.totalLeads.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{c.hiresMtd}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate" title={c.bestAd ?? ""}>
                      {c.bestAd ? (
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.bestAd}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.costPerHire > 0 ? fmtCurrency(c.costPerHire) : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      {c.earnings > 0 ? fmtCurrency(c.earnings) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {timeAgo(c.last_synced)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot color={c.statusColor} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.preventDefault(); handleSync(c.id); }}
                        disabled={syncing.has(c.id) || c.sync_status === "syncing"}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        <svg className={`h-3.5 w-3.5 ${syncing.has(c.id) ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {syncing.has(c.id) ? "Syncing…" : "Sync"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
