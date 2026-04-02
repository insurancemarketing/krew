"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EarningsRow {
  clientId: string;
  clientName: string;
  hiresMtd: number;
  payout: number;
  earningsMtd: number;
}

interface MonthlyEarning {
  month: string;  // "2026-04"
  label: string;  // "Apr 2026"
  total: number;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export default function EarningsPage() {
  const [rows, setRows] = useState<EarningsRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyEarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const clientsRes = await fetch("/api/clients");
      const { clients } = await clientsRes.json();
      if (!clients) return;

      const allRows: EarningsRow[] = [];
      const monthlyMap = new Map<string, number>();

      await Promise.all(
        clients.map(async (c: Record<string, string>) => {
          const statsRes = await fetch(`/api/clients/${c.id}/stats`);
          if (!statsRes.ok) return;
          const stats = await statsRes.json();
          const m = stats.metrics ?? {};
          allRows.push({
            clientId: c.id,
            clientName: c.name,
            hiresMtd: m.hiresMtd ?? 0,
            payout: m.payoutPerHire ?? 0,
            earningsMtd: m.earningsMtd ?? 0,
          });
        })
      );

      // Build monthly from hires (approximate — based on contacts synced)
      // For now just use MTD as a proxy
      const currentMonth = new Date().toISOString().slice(0, 7);
      const totalMtd = allRows.reduce((s, r) => s + r.earningsMtd, 0);
      if (totalMtd > 0) monthlyMap.set(currentMonth, totalMtd);

      setRows(allRows);
      setMonthly(
        Array.from(monthlyMap.entries())
          .map(([month, total]) => ({ month, label: monthLabel(month), total }))
          .sort((a, b) => b.month.localeCompare(a.month))
      );
      setLoading(false);
    }
    load();
  }, []);

  const totalMtd = rows.reduce((s, r) => s + r.earningsMtd, 0);
  const maxBar = Math.max(...monthly.map((m) => m.total), 1);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Earnings</h1>
        <p className="mt-1 text-sm text-gray-500">Internal view — not shown to clients.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">This Month</p>
          <p className="mt-2 text-4xl font-bold text-green-700">{fmtCurrency(totalMtd)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {rows.reduce((s, r) => s + r.hiresMtd, 0)} total hires MTD across {rows.length} client{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">All Time (approx.)</p>
          <p className="mt-2 text-4xl font-bold text-gray-800">
            {fmtCurrency(monthly.reduce((s, m) => s + m.total, 0))}
          </p>
          <p className="mt-1 text-xs text-gray-400">Based on synced data</p>
        </div>
      </div>

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Earnings by Month</h2>
          <div className="space-y-3">
            {monthly.map((m) => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-20 text-right text-xs text-gray-500 whitespace-nowrap">{m.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full flex items-center pl-2 transition-all"
                    style={{ width: `${Math.max((m.total / maxBar) * 100, 2)}%` }}
                  >
                    <span className="text-xs font-medium text-white whitespace-nowrap">
                      {fmtCurrency(m.total)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-client breakdown */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Breakdown by Client</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Client", "Hires MTD", "Payout / Hire", "Earnings MTD"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  No clients yet. <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">Add one →</Link>
                </td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.clientId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${r.clientId}`} className="font-medium text-blue-600 hover:underline">{r.clientName}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.hiresMtd}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtCurrency(r.payout)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{fmtCurrency(r.earningsMtd)}</td>
                  </tr>
                ))
              )}
              {!loading && rows.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-800">Total</td>
                  <td className="px-4 py-3 text-gray-800">{rows.reduce((s, r) => s + r.hiresMtd, 0)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-green-700">{fmtCurrency(totalMtd)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
