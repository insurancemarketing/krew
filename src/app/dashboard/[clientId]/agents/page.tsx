"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ClientHeader from "@/components/layout/ClientHeader";

interface Agent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  utm_content: string | null;
  hire_date: string | null;
  status: string;
  churned_date: string | null;
  policies_sold_30d: number;
  policies_sold_60d: number;
  policies_sold_90d: number;
  premium_30d: number;
  premium_60d: number;
  premium_90d: number;
  notes: string | null;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function fmtCurrency(n: number | null | undefined) {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function AgentsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);

  const emptyForm = {
    first_name: "",
    last_name: "",
    email: "",
    utm_content: "",
    hire_date: "",
    status: "active",
    policies_sold_30d: "0",
    policies_sold_60d: "0",
    policies_sold_90d: "0",
    premium_30d: "0",
    premium_60d: "0",
    premium_90d: "0",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/agents`);
    const data = await res.json();
    setAgents(data.agents ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const handleEdit = (agent: Agent) => {
    setEditing(agent);
    setForm({
      first_name: agent.first_name ?? "",
      last_name: agent.last_name ?? "",
      email: agent.email ?? "",
      utm_content: agent.utm_content ?? "",
      hire_date: agent.hire_date ?? "",
      status: agent.status,
      policies_sold_30d: String(agent.policies_sold_30d),
      policies_sold_60d: String(agent.policies_sold_60d),
      policies_sold_90d: String(agent.policies_sold_90d),
      premium_30d: String(agent.premium_30d),
      premium_60d: String(agent.premium_60d),
      premium_90d: String(agent.premium_90d),
      notes: agent.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;
    const res = await fetch(`/api/clients/${clientId}/agents`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      resetForm();
      setShowForm(false);
      load();
    }
  };

  const active = agents.filter((a) => a.status === "active");
  const churned = agents.filter((a) => a.status === "churned");

  const statusStyle: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-600",
    churned: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <ClientHeader clientId={clientId} subtitle="Agents" />
      <ClientTabs clientId={clientId} />

      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-700">{active.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Churned</p>
            <p className="text-2xl font-bold text-red-700">{churned.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Hires Tracked</p>
            <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Close" : "+ Add Agent"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">
            {editing ? "Edit Agent" : "Add Agent"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="First Name">
              <input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Last Name">
              <input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="utm_content (source ad)">
              <input
                value={form.utm_content}
                onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Hire Date">
              <input
                type="date"
                value={form.hire_date}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="churned">Churned</option>
              </select>
            </Field>
            <Field label="Policies 30d">
              <input
                type="number"
                min="0"
                value={form.policies_sold_30d}
                onChange={(e) => setForm({ ...form, policies_sold_30d: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Policies 60d">
              <input
                type="number"
                min="0"
                value={form.policies_sold_60d}
                onChange={(e) => setForm({ ...form, policies_sold_60d: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Policies 90d">
              <input
                type="number"
                min="0"
                value={form.policies_sold_90d}
                onChange={(e) => setForm({ ...form, policies_sold_90d: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Premium 30d ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.premium_30d}
                onChange={(e) => setForm({ ...form, premium_30d: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Premium 60d ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.premium_60d}
                onChange={(e) => setForm({ ...form, premium_60d: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Premium 90d ($)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.premium_90d}
                onChange={(e) => setForm({ ...form, premium_90d: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editing ? "Update Agent" : "Save Agent"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Name",
                  "Source Ad",
                  "Hire Date",
                  "Tenure",
                  "30d",
                  "60d",
                  "90d",
                  "Premium 90d",
                  "Status",
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
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    No agents tracked yet. Add one to start measuring retention.
                  </td>
                </tr>
              ) : (
                agents.map((a) => {
                  const tenure = daysSince(a.hire_date);
                  const stalled =
                    a.status === "active" &&
                    tenure != null &&
                    tenure >= 45 &&
                    a.policies_sold_30d === 0 &&
                    a.policies_sold_60d === 0;
                  return (
                    <tr
                      key={a.id}
                      className={
                        stalled ? "bg-yellow-50 hover:bg-yellow-100" : "hover:bg-gray-50"
                      }
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                        {a.email && <p className="text-xs text-gray-500">{a.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {a.utm_content ? (
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {a.utm_content}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {a.hire_date ? new Date(a.hire_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {tenure != null ? `${tenure}d` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.policies_sold_30d}</td>
                      <td className="px-4 py-3 text-gray-700">{a.policies_sold_60d}</td>
                      <td className="px-4 py-3 text-gray-700">{a.policies_sold_90d}</td>
                      <td className="px-4 py-3 text-gray-700">{fmtCurrency(a.premium_90d)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[a.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEdit(a)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
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
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
