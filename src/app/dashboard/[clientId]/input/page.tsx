"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ClientHeader from "@/components/layout/ClientHeader";

interface PerfRow {
  month: string;
  ad_spend: number;
  leads: number;
  appointments_set: number;
  appointments_showed: number;
  policies_sold: number;
  premium_written: number;
  avg_policy_value: number;
  policies_cancelled: number;
  active_policies: number;
  hires: number;
  active_agents: number;
  agents_churned: number;
  cost_per_lead: number | null;
  cost_per_appointment: number | null;
  cost_per_policy: number | null;
  show_rate: number | null;
  close_rate: number | null;
  persistency_rate: number | null;
  roas: number | null;
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function monthLabel(month: string) {
  return new Date(month).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type FormState = Record<string, string>;

const numericFields = [
  { key: "ad_spend", label: "Ad Spend ($)", step: "0.01" },
  { key: "leads", label: "Leads", step: "1" },
  { key: "appointments_set", label: "Appointments Set", step: "1" },
  { key: "appointments_showed", label: "Appointments Showed", step: "1" },
  { key: "policies_sold", label: "Policies Sold", step: "1" },
  { key: "premium_written", label: "Premium Written ($)", step: "0.01" },
  { key: "avg_policy_value", label: "Avg Policy Value ($)", step: "0.01" },
  { key: "policies_cancelled", label: "Policies Cancelled", step: "1" },
  { key: "active_policies", label: "Active Policies", step: "1" },
  { key: "hires", label: "Hires (recruiting)", step: "1" },
  { key: "active_agents", label: "Active Agents", step: "1" },
  { key: "agents_churned", label: "Agents Churned", step: "1" },
];

export default function MonthlyInputPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState<FormState>({});
  const [history, setHistory] = useState<PerfRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadMonth = useCallback(
    async (m: string) => {
      setLoading(true);
      const res = await fetch(
        `/api/clients/${clientId}/monthly-performance?month=${encodeURIComponent(m)}`
      );
      const data = await res.json();
      const perf = data.performance;
      const initial: FormState = {};
      for (const f of numericFields) initial[f.key] = String(perf?.[f.key] ?? 0);
      setForm(initial);
      setLoading(false);
    },
    [clientId]
  );

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/monthly-performance`);
    const data = await res.json();
    setHistory(data.performance ?? []);
  }, [clientId]);

  useEffect(() => {
    loadMonth(month);
  }, [loadMonth, month]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/monthly-performance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, ...form }),
      });
      if (res.ok) {
        setMessage({ type: "ok", text: `Saved ${monthLabel(`${month}-01`)}.` });
        await loadHistory();
      } else {
        const d = await res.json();
        setMessage({ type: "err", text: d.error ?? "Save failed." });
      }
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Live calculated previews
  const n = (k: string) => parseFloat(form[k] ?? "0") || 0;
  const calc = {
    cpl: n("leads") > 0 ? n("ad_spend") / n("leads") : 0,
    cpa: n("appointments_showed") > 0 ? n("ad_spend") / n("appointments_showed") : 0,
    cpp: n("policies_sold") > 0 ? n("ad_spend") / n("policies_sold") : 0,
    showRate: n("appointments_set") > 0 ? n("appointments_showed") / n("appointments_set") : 0,
    closeRate:
      n("appointments_showed") > 0 ? n("policies_sold") / n("appointments_showed") : 0,
    persistency:
      n("active_policies") > 0
        ? (n("active_policies") - n("policies_cancelled")) / n("active_policies")
        : 0,
    roas: n("ad_spend") > 0 ? n("premium_written") / n("ad_spend") : 0,
  };

  return (
    <div className="space-y-6">
      <ClientHeader clientId={clientId} subtitle="Monthly Input" />
      <ClientTabs clientId={clientId} />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Monthly Performance Data</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Enter post-funnel metrics. Ratios are calculated server-side on save.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 px-6 py-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {numericFields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="block text-xs font-medium text-gray-600">{f.label}</label>
                  <input
                    type="number"
                    step={f.step}
                    min="0"
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Live calculated preview */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
            <p className="font-semibold mb-2">Calculated (live preview)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>CPL: <span className="font-medium">{fmtCurrency(calc.cpl)}</span></div>
              <div>CPA: <span className="font-medium">{fmtCurrency(calc.cpa)}</span></div>
              <div>CPP: <span className="font-medium">{fmtCurrency(calc.cpp)}</span></div>
              <div>Show rate: <span className="font-medium">{fmtPct(calc.showRate)}</span></div>
              <div>Close rate: <span className="font-medium">{fmtPct(calc.closeRate)}</span></div>
              <div>Persistency: <span className="font-medium">{fmtPct(calc.persistency)}</span></div>
              <div>ROAS: <span className="font-medium">{calc.roas ? `${calc.roas.toFixed(2)}x` : "—"}</span></div>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : `Save ${monthLabel(`${month}-01`)}`}
          </button>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">History</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Month",
                    "Spend",
                    "Leads",
                    "Appts Set",
                    "Showed",
                    "Policies",
                    "Premium",
                    "Hires",
                    "CPL",
                    "CPA",
                    "ROAS",
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
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                      No monthly data yet.
                    </td>
                  </tr>
                ) : (
                  history.map((r) => (
                    <tr
                      key={r.month}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setMonth(r.month.slice(0, 7))}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        {monthLabel(r.month)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{fmtCurrency(r.ad_spend)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.leads}</td>
                      <td className="px-4 py-3 text-gray-700">{r.appointments_set}</td>
                      <td className="px-4 py-3 text-gray-700">{r.appointments_showed}</td>
                      <td className="px-4 py-3 text-gray-700">{r.policies_sold}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtCurrency(r.premium_written)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.hires}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtCurrency(r.cost_per_lead)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {fmtCurrency(r.cost_per_appointment)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.roas ? `${r.roas.toFixed(2)}x` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
