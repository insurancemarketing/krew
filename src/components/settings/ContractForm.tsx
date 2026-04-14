"use client";

import { useCallback, useEffect, useState } from "react";

interface Contract {
  id?: string;
  client_type: string;
  monthly_retainer: number;
  performance_fee_type: string;
  performance_fee_amount: number;
  contract_start: string | null;
  contract_renewal: string | null;
  ad_budget_monthly: number;
  hours_per_month_estimate: number;
  target_hourly_rate: number;
  cac: number;
  status: string;
  notes: string | null;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ContractForm({ clientId }: { clientId: string }) {
  const [form, setForm] = useState<Record<string, string>>({
    client_type: "insurance_recruiting",
    monthly_retainer: "0",
    performance_fee_type: "per_hire",
    performance_fee_amount: "0",
    contract_start: "",
    contract_renewal: "",
    ad_budget_monthly: "0",
    hours_per_month_estimate: "0",
    target_hourly_rate: "150",
    cac: "0",
    status: "active",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/contract`);
    const { contract } = (await res.json()) as { contract: Contract | null };
    if (contract) {
      setForm({
        client_type: contract.client_type ?? "insurance_recruiting",
        monthly_retainer: String(contract.monthly_retainer ?? 0),
        performance_fee_type: contract.performance_fee_type ?? "per_hire",
        performance_fee_amount: String(contract.performance_fee_amount ?? 0),
        contract_start: contract.contract_start ?? "",
        contract_renewal: contract.contract_renewal ?? "",
        ad_budget_monthly: String(contract.ad_budget_monthly ?? 0),
        hours_per_month_estimate: String(contract.hours_per_month_estimate ?? 0),
        target_hourly_rate: String(contract.target_hourly_rate ?? 150),
        cac: String(contract.cac ?? 0),
        status: contract.status ?? "active",
        notes: contract.notes ?? "",
      });
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSaveMsg({ type: "ok", text: "Contract saved." });
      else {
        const d = await res.json();
        setSaveMsg({ type: "err", text: d.error ?? "Error saving." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Contract & Billing</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Retainer, performance fees, renewal date — used by the Agency dashboard.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Client Type">
                <select
                  value={form.client_type}
                  onChange={(e) => setField("client_type", e.target.value)}
                  className={inputClass}
                >
                  <option value="insurance_recruiting">Insurance Recruiting</option>
                  <option value="insurance_sales">Insurance Sales</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="churned">Churned</option>
                </select>
              </Field>
              <Field label="Monthly Retainer ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monthly_retainer}
                  onChange={(e) => setField("monthly_retainer", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Performance Fee Type">
                <select
                  value={form.performance_fee_type}
                  onChange={(e) => setField("performance_fee_type", e.target.value)}
                  className={inputClass}
                >
                  <option value="per_hire">Per Hire</option>
                  <option value="per_policy">Per Policy</option>
                  <option value="per_lead">Per Lead</option>
                  <option value="percent_adspend">% of Ad Spend</option>
                </select>
              </Field>
              <Field label="Performance Fee Amount">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.performance_fee_amount}
                  onChange={(e) => setField("performance_fee_amount", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Ad Budget Monthly ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.ad_budget_monthly}
                  onChange={(e) => setField("ad_budget_monthly", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Contract Start">
                <input
                  type="date"
                  value={form.contract_start}
                  onChange={(e) => setField("contract_start", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Contract Renewal">
                <input
                  type="date"
                  value={form.contract_renewal}
                  onChange={(e) => setField("contract_renewal", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Hours / Month (est.)">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.hours_per_month_estimate}
                  onChange={(e) => setField("hours_per_month_estimate", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Target Hourly Rate ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.target_hourly_rate}
                  onChange={(e) => setField("target_hourly_rate", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="CAC ($)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cac}
                  onChange={(e) => setField("cac", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                className={inputClass}
              />
            </Field>
          </>
        )}

        {saveMsg && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              saveMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {saveMsg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Contract"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
