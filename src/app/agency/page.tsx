"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types ───────────────────────────────────────────────────────────────────
interface AgencyRow {
  client: { id: string; name: string; client_type: string | null };
  contract: {
    client_type: string;
    monthly_retainer: number;
    performance_fee_type: string | null;
    performance_fee_amount: number;
    contract_renewal: string | null;
    status: string;
    churn_risk_score: number;
    churn_risk_color: string;
  } | null;
  perf: {
    ad_spend: number; leads: number; appointments_set: number;
    appointments_showed: number; policies_sold: number;
    premium_written: number; hires: number;
    show_rate: number | null; close_rate: number | null;
    cost_per_lead: number | null; cost_per_policy: number | null; roas: number | null;
  } | null;
  retainer: number;
  perfFee: number;
  totalRevenue: number;
  hoursThisMonth: number;
  revenuePerHour: number | null;
  ltv: number;
  cac: number;
  ltgp: number;
  ltgpCacRatio: number | null;
  lastTouch: string | null;
  daysSinceTouch: number;
  daysUntilRenewal: number | null;
  churnScore: number;
  churnColor: string;
  status: string;
}

interface Summary {
  totalMrr: number;
  totalPerfRevenue: number;
  totalBlended: number;
  projectedNextMonth: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

function dateDiff(dateStr: string | null): string {
  if (!dateStr) return "—";
  const days = Math.floor(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  return `${days}d`;
}

function churnBadge(color: string, score: number) {
  const cls =
    color === "red"
      ? "bg-red-100 text-red-700"
      : color === "yellow"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {score}
    </span>
  );
}

function ltgpColor(ratio: number | null) {
  if (ratio == null) return "text-gray-400";
  if (ratio < 2) return "text-red-600 font-semibold";
  if (ratio < 4) return "text-yellow-600 font-semibold";
  return "text-green-600 font-semibold";
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function Skeleton() {
  return <div className="h-4 bg-gray-100 rounded animate-pulse" />;
}

// ── Mobile client card ────────────────────────────────────────────────────────
function MobileClientCard({ row }: { row: AgencyRow }) {
  const isRecruiting = (row.contract?.client_type ?? row.client.client_type) === "insurance_recruiting";
  const rowBg = row.churnColor === "red" ? "bg-red-50 border-red-200" : "bg-white border-gray-200";
  return (
    <Link href={`/dashboard/${row.client.id}`} className={`block rounded-xl border p-4 shadow-sm ${rowBg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{row.client.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{isRecruiting ? "Recruiting" : "Insurance Sales"}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-green-700">{fmt(row.totalRevenue)}<span className="text-xs text-gray-400">/mo</span></p>
          {churnBadge(row.churnColor, row.churnScore)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div><p className="text-gray-400">Spend</p><p className="font-medium">{row.perf?.ad_spend ? fmt(row.perf.ad_spend) : "—"}</p></div>
        <div><p className="text-gray-400">Leads</p><p className="font-medium">{row.perf?.leads ?? "—"}</p></div>
        <div><p className="text-gray-400">{isRecruiting ? "Hires" : "Policies"}</p><p className="font-medium">{isRecruiting ? row.perf?.hires ?? "—" : row.perf?.policies_sold ?? "—"}</p></div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AgencyDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"performance" | "business">("performance");

  useEffect(() => {
    fetch("/api/agency-stats")
      .then((r) => r.json())
      .then(({ summary: s, rows: r }) => {
        setSummary(s);
        setRows(r ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agency Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Mason's master dashboard — all clients at a glance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
              <Skeleton /><Skeleton />
            </div>
          ))
        ) : (
          <>
            <SummaryCard label="Total MRR" value={fmt(summary?.totalMrr ?? 0)} sub="Active retainers" />
            <SummaryCard label="Performance Revenue" value={fmt(summary?.totalPerfRevenue ?? 0)} sub="This month" />
            <SummaryCard label="Blended Revenue" value={fmt(summary?.totalBlended ?? 0)} sub="Retainer + performance" />
            <SummaryCard label="Projected Next Month" value={fmt(summary?.projectedNextMonth ?? 0)} sub="Conservative (retainer)" />
          </>
        )}
      </div>

      {/* Mobile cards (hidden on desktop) */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 h-28 animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No clients yet.</p>
        ) : (
          rows.map((r) => <MobileClientCard key={r.client.id} row={r} />)
        )}
      </div>

      {/* Desktop tabs + tables */}
      <div className="hidden lg:block">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-0">
          {(["performance", "business"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "performance" ? "Client Performance" : "Mason's Business"}
            </button>
          ))}
        </div>

        {/* Performance Table */}
        {tab === "performance" && (
          <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Client", "Type", "Ad Spend", "Leads", "CPL", "Appts", "Show%", "Policies/Hires", "CPP/CPH", "Premium/ROAS", "Health"].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                      ))}</tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">
                      No clients. <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">Add one →</Link>
                    </td></tr>
                  ) : (
                    rows.map((r) => {
                      const isRec = (r.contract?.client_type ?? r.client.client_type) === "insurance_recruiting";
                      const rowBg = r.churnColor === "red" ? "bg-red-50" : "";
                      return (
                        <tr key={r.client.id} className={`${rowBg} hover:bg-gray-50 transition-colors`}>
                          <td className="px-3 py-3">
                            <Link href={`/dashboard/${r.client.id}`} className="font-medium text-blue-600 hover:underline whitespace-nowrap">
                              {r.client.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{isRec ? "Recruiting" : "Sales"}</td>
                          <td className="px-3 py-3 text-gray-700">{r.perf?.ad_spend ? fmt(r.perf.ad_spend) : "—"}</td>
                          <td className="px-3 py-3 text-gray-700">{r.perf?.leads ?? "—"}</td>
                          <td className="px-3 py-3 text-gray-700">{r.perf?.cost_per_lead ? fmt(r.perf.cost_per_lead) : "—"}</td>
                          <td className="px-3 py-3 text-gray-700">{r.perf?.appointments_set ?? "—"}</td>
                          <td className="px-3 py-3 text-gray-700">{pct(r.perf?.show_rate ?? null)}</td>
                          <td className="px-3 py-3 font-medium text-gray-800">{isRec ? r.perf?.hires ?? "—" : r.perf?.policies_sold ?? "—"}</td>
                          <td className="px-3 py-3 text-gray-700">{isRec ? "—" : (r.perf?.cost_per_policy ? fmt(r.perf.cost_per_policy) : "—")}</td>
                          <td className="px-3 py-3 text-gray-700">{isRec ? "—" : (r.perf?.roas != null ? `${r.perf.roas.toFixed(2)}x` : "—")}</td>
                          <td className="px-3 py-3">{churnBadge(r.churnColor, r.churnScore)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Business Table */}
        {tab === "business" && (
          <div className="overflow-hidden rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Client", "Retainer", "Perf Fee", "Total $", "Hours", "$/hr", "LTV", "CAC", "LTGP:CAC", "Renewal", "Last Touch"].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                      ))}</tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No clients yet.</td></tr>
                  ) : (
                    rows.map((r) => {
                      const renewalDays = r.daysUntilRenewal;
                      const renewalBg = renewalDays != null && renewalDays <= 30 ? "text-red-600 font-semibold" : "text-gray-700";
                      const touchBg = r.daysSinceTouch > 7 ? "text-red-600 font-semibold" : "text-gray-700";
                      const rowBg = r.churnColor === "red" ? "bg-red-50" : "";
                      return (
                        <tr key={r.client.id} className={`${rowBg} hover:bg-gray-50 transition-colors`}>
                          <td className="px-3 py-3">
                            <Link href={`/dashboard/${r.client.id}`} className="font-medium text-blue-600 hover:underline whitespace-nowrap">
                              {r.client.name}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-gray-700">{fmt(r.retainer)}</td>
                          <td className="px-3 py-3 text-gray-700">{fmt(r.perfFee)}</td>
                          <td className="px-3 py-3 font-semibold text-gray-900">{fmt(r.totalRevenue)}</td>
                          <td className="px-3 py-3 text-gray-700">{r.hoursThisMonth.toFixed(1)}h</td>
                          <td className="px-3 py-3 text-gray-700">{r.revenuePerHour ? fmtD(r.revenuePerHour) : "—"}</td>
                          <td className="px-3 py-3 text-gray-700">{fmt(r.ltv)}</td>
                          <td className="px-3 py-3 text-gray-700">{r.cac > 0 ? fmt(r.cac) : "—"}</td>
                          <td className={`px-3 py-3 ${ltgpColor(r.ltgpCacRatio)}`}>
                            {r.ltgpCacRatio != null ? `${r.ltgpCacRatio.toFixed(1)}x` : "—"}
                          </td>
                          <td className={`px-3 py-3 ${renewalBg} whitespace-nowrap`}>
                            {r.contract?.contract_renewal ? dateDiff(r.contract.contract_renewal) : "—"}
                          </td>
                          <td className={`px-3 py-3 ${touchBg} whitespace-nowrap`}>
                            {r.lastTouch ? `${r.daysSinceTouch}d ago` : "Never"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
