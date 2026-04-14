"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ClientHeader from "@/components/layout/ClientHeader";

interface Touchpoint {
  id: string;
  touchpoint_date: string;
  type: string;
  notes: string | null;
  action_items: string | null;
  created_at: string;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const typeStyle: Record<string, string> = {
  call: "bg-blue-100 text-blue-700",
  email: "bg-gray-100 text-gray-700",
  slack: "bg-purple-100 text-purple-700",
  meeting: "bg-green-100 text-green-700",
  report_sent: "bg-yellow-100 text-yellow-800",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function TouchpointsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    touchpoint_date: today(),
    type: "call",
    notes: "",
    action_items: "",
  });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/touchpoints`);
    const data = await res.json();
    setTouchpoints(data.touchpoints ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch(`/api/clients/${clientId}/touchpoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ touchpoint_date: today(), type: "call", notes: "", action_items: "" });
      load();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this touchpoint?")) return;
    await fetch(`/api/clients/${clientId}/touchpoints?id=${id}`, { method: "DELETE" });
    setTouchpoints((l) => l.filter((e) => e.id !== id));
  };

  const last = touchpoints[0];
  const lastDays = last ? daysAgo(last.touchpoint_date) : null;
  const lastStatus =
    lastDays == null
      ? { text: "Never", color: "text-red-700", bg: "bg-red-50" }
      : lastDays <= 3
      ? { text: `${lastDays}d ago`, color: "text-green-700", bg: "bg-green-50" }
      : lastDays <= 7
      ? { text: `${lastDays}d ago`, color: "text-yellow-700", bg: "bg-yellow-50" }
      : { text: `${lastDays}d ago`, color: "text-red-700", bg: "bg-red-50" };

  return (
    <div className="space-y-6">
      <ClientHeader clientId={clientId} subtitle="Touchpoints" />
      <ClientTabs clientId={clientId} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={`rounded-xl border border-gray-200 p-5 shadow-sm ${lastStatus.bg}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Last Touch
          </p>
          <p className={`mt-2 text-2xl font-bold ${lastStatus.color}`}>{lastStatus.text}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last 30d</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {touchpoints.filter((t) => daysAgo(t.touchpoint_date) <= 30).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">All time</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{touchpoints.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Action Items
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {touchpoints.filter((t) => t.action_items).length}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
      >
        <h3 className="text-sm font-semibold text-gray-900">Log Touchpoint</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Date</label>
            <input
              type="date"
              required
              value={form.touchpoint_date}
              onChange={(e) => setForm({ ...form, touchpoint_date: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className={inputClass}
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="meeting">Meeting</option>
              <option value="report_sent">Report Sent</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Action Items</label>
          <textarea
            rows={2}
            value={form.action_items}
            onChange={(e) => setForm({ ...form, action_items: e.target.value })}
            placeholder="• Send weekly report&#10;• Follow up on hiring freeze"
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "Saving…" : "+ Log Touchpoint"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">History</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-20 animate-pulse"
              />
            ))}
          </div>
        ) : touchpoints.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
            No touchpoints yet.
          </div>
        ) : (
          <div className="space-y-3">
            {touchpoints.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeStyle[t.type] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {t.type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(t.touchpoint_date).toLocaleDateString()} ·{" "}
                      {daysAgo(t.touchpoint_date)}d ago
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
                {t.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{t.notes}</p>
                )}
                {t.action_items && (
                  <div className="mt-2 rounded-md border border-yellow-100 bg-yellow-50 px-3 py-2">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Action Items</p>
                    <p className="whitespace-pre-wrap text-xs text-yellow-900">{t.action_items}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
