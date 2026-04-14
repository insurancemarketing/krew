"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AgencyClient {
  id: string;
  name: string;
  client_type: string;
  last_synced: string | null;
  retainer: number;
  performance_fee_type: string;
  performance_fee_amount: number;
  contract_renewal: string | null;
  ad_budget_monthly: number;
  status: string;
  ad_spend: number;
  leads: number;
  appointments_set: number;
  appointments_showed: number;
  policies_sold: number;
  hires: number;
  premium_written: number;
  cost_per_lead: number;
  cost_per_policy: number;
  show_rate: number;
  close_rate: number;
  roas: number;
  perf_revenue: number;
  total_revenue: number;
  hours_this_month: number;
  revenue_per_hour: number;
  ltv: number;
  ltgp: number;
  ltgp_cac_ratio: number;
  payback_months: number;
  cac: number;
  last_touchpoint: string | null;
  days_since_touchpoint: number;
  churn_risk_score: number;
  churn_risk_color: "green" | "yellow" | "red";
}

interface AgencySummary {
  total_mrr: number;
  total_perf_revenue: number;
  total_blended: number;
  projected_next_month: number;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number, decimals = 1) {
  return `${(n * 100).toFixed(decimals)}%`;
}

function ChurnBadge({ color, score }: { color: "green" | "yellow" | "red"; score: number }) {
  const styles: Record<string, string> = {
    green: "bg-green-100 text-green-700 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[color]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`} />
      Risk: {score}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: "green" | "blue" | "default";
}) {
  const valueClass =
    emphasis === "green"
      ? "text-green-700"
      : emphasis === "blue"
      ? "text-blue-700"
      : "text-gray-900";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AgencyDashboard() {
  const [clients, setClients] = useState<AgencyClient[]>([]);
  const [summary, setSummary] = useState<AgencySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agency");
        const data = await res.json();
        if (data.error) setError(data.error);
        else {
          setClients(data.clients ?? []);
          setSummary(data.summary ?? null);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalHours = clients.reduce((s, c) => s + c.hours_this_month, 0);
  const totalBudget = clients.reduce((s, c) => s + c.ad_budget_monthly, 0);
  const totalSpend = clients.reduce((s, c) => s + c.ad_spend, 0);
  const atRisk = clients.filter((c) => c.churn_risk_color !== "green").length;

  const blendedRevPerHour = totalHours > 0 && summary ? summary.total_blended / totalHours : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Master view of Mason&apos;s agency &mdash; revenue, health, and client business metrics.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="mt-3 h-8 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <SummaryCard
              label="MRR (Retainers)"
              value={fmtCurrency(summary?.total_mrr ?? 0)}
              sub={`${clients.length} active clients`}
              emphasis="blue"
            />
            <SummaryCard
              label="Performance Revenue MTD"
              value={fmtCurrency(summary?.total_perf_revenue ?? 0)}
              sub="Hires + policy fees"
              emphasis="green"
            />
            <SummaryCard
              label="Blended Revenue MTD"
              value={fmtCurrency(summary?.total_blended ?? 0)}
              sub={blendedRevPerHour > 0 ? `${fmtCurrency(blendedRevPerHour)}/hour` : undefined}
              emphasis="green"
            />
            <SummaryCard
              label="Clients At Risk"
              value={String(atRisk)}
              sub={atRisk > 0 ? "Review in table below" : "All healthy"}
              emphasis={atRisk > 0 ? "default" : "green"}
            />
          </>
        )}
      </div>

      {/* Budget pacing */}
      {!loading && totalBudget > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-gray-900">Ad Budget Pacing (All Clients)</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {fmtCurrency(totalSpend)} spent of {fmtCurrency(totalBudget)} budgeted this month
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {fmtPct(totalSpend / Math.max(totalBudget, 1))}
            </p>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                totalSpend / totalBudget > 1.2
                  ? "bg-red-500"
                  : totalSpend / totalBudget > 0.95
                  ? "bg-yellow-400"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min((totalSpend / totalBudget) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Client table */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Clients</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Client",
                    "Type",
                    "Retainer",
                    "Perf Rev MTD",
                    "Total MTD",
                    "$/Hour",
                    "LTGP:CAC",
                    "Churn Risk",
                    "Last Touch",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                      No clients yet.{" "}
                      <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">
                        Add your first client &rarr;
                      </Link>
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/${c.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {c.client_type === "insurance_recruiting" ? "Recruiting" : "Sales"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.retainer > 0 ? fmtCurrency(c.retainer) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.perf_revenue > 0 ? fmtCurrency(c.perf_revenue) : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-700">
                        {c.total_revenue > 0 ? fmtCurrency(c.total_revenue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.revenue_per_hour > 0 ? fmtCurrency(c.revenue_per_hour) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {c.ltgp_cac_ratio > 0 ? `${c.ltgp_cac_ratio.toFixed(1)}x` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ChurnBadge color={c.churn_risk_color} score={c.churn_risk_score} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {c.last_touchpoint
                          ? `${c.days_since_touchpoint}d ago`
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/${c.id}/input`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Input data &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Per-client financial breakdown */}
      {!loading && clients.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Performance Snapshot</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/${c.id}`}
                    className="font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {c.name}
                  </Link>
                  <ChurnBadge color={c.churn_risk_color} score={c.churn_risk_score} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Ad Spend</p>
                    <p className="font-medium text-gray-900">{fmtCurrency(c.ad_spend)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Leads</p>
                    <p className="font-medium text-gray-900">{c.leads.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {c.client_type === "insurance_recruiting" ? "Hires" : "Policies"}
                    </p>
                    <p className="font-medium text-gray-900">
                      {c.client_type === "insurance_recruiting" ? c.hires : c.policies_sold}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Premium</p>
                    <p className="font-medium text-gray-900">
                      {c.premium_written > 0 ? fmtCurrency(c.premium_written) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">CPL</p>
                    <p className="font-medium text-gray-900">
                      {c.cost_per_lead > 0 ? fmtCurrency(c.cost_per_lead) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ROAS</p>
                    <p className="font-medium text-gray-900">
                      {c.roas > 0 ? `${c.roas.toFixed(2)}x` : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  {c.contract_renewal
                    ? `Renewal: ${new Date(c.contract_renewal).toLocaleDateString()}`
                    : "No renewal date set"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
