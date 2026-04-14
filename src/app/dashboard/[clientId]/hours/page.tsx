"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ClientHeader from "@/components/layout/ClientHeader";

interface HoursEntry {
  id: string;
  log_date: string;
  hours: number;
  task_description: string | null;
  created_at: string;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function HoursPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [entries, setEntries] = useState<HoursEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ log_date: today(), hours: "1", task_description: "" });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/hours`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hours) return;
    setAdding(true);
    const res = await fetch(`/api/clients/${clientId}/hours`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ log_date: today(), hours: "1", task_description: "" });
      load();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`/api/clients/${clientId}/hours?entryId=${id}`, { method: "DELETE" });
    setEntries((l) => l.filter((e) => e.id !== id));
  };

  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  const nowMonth = today().slice(0, 7);
  const mtdHours = entries
    .filter((e) => e.log_date.startsWith(nowMonth))
    .reduce((s, e) => s + Number(e.hours), 0);

  // Group by week
  const weekMap = new Map<string, number>();
  for (const e of entries) {
    const d = new Date(e.log_date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const weekStart = d.toISOString().split("T")[0];
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + Number(e.hours));
  }
  const weekRows = Array.from(weekMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8);
  const maxWeekHours = Math.max(1, ...weekRows.map((r) => r[1]));

  return (
    <div className="space-y-6">
      <ClientHeader clientId={clientId} subtitle="Hours" />
      <ClientTabs clientId={clientId} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hours MTD</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{mtdHours.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            All-time Hours
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{total.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Entries</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{entries.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Avg per Entry
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {entries.length > 0 ? (total / entries.length).toFixed(1) : "—"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-4"
      >
        <div>
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            required
            value={form.log_date}
            onChange={(e) => setForm({ ...form, log_date: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Hours</label>
          <input
            type="number"
            step="0.25"
            min="0"
            required
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-600">Task</label>
          <input
            value={form.task_description}
            onChange={(e) => setForm({ ...form, task_description: e.target.value })}
            placeholder="Ad copy updates, reporting…"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-4">
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "Adding…" : "+ Add Hours"}
          </button>
        </div>
      </form>

      {weekRows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
            By Week (last 8)
          </h2>
          <div className="space-y-2">
            {weekRows.map(([weekStart, hours]) => (
              <div key={weekStart} className="flex items-center gap-3">
                <span className="w-24 text-right text-xs text-gray-500">
                  {new Date(weekStart).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(hours / maxWeekHours) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs font-medium text-gray-700">
                  {hours.toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Hours", "Task", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
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
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    No hours logged yet.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {new Date(e.log_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {Number(e.hours).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.task_description ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
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
