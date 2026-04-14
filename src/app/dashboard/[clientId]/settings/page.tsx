"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ContractForm from "@/components/settings/ContractForm";

interface SpendEntry {
  id: string;
  utm_content: string;
  ad_name: string | null;
  spend: number;
  week_starting: string;
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function weekLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Current Monday
function currentWeekMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export default function ClientSettings() {
  const { clientId } = useParams<{ clientId: string }>();

  // Client form state
  const [name, setName] = useState("");
  const [ghlApiKey, setGhlApiKey] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [hiredTag, setHiredTag] = useState("recruitment - hire made");
  const [payout, setPayout] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Spend state
  const [spend, setSpend] = useState<SpendEntry[]>([]);
  const [spendLoading, setSpendLoading] = useState(true);
  const [newUtm, setNewUtm] = useState("");
  const [newAdName, setNewAdName] = useState("");
  const [newSpend, setNewSpend] = useState("");
  const [newWeek, setNewWeek] = useState(currentWeekMonday());
  const [addingSpend, setAddingSpend] = useState(false);

  const loadData = useCallback(async () => {
    const [clientRes, spendRes] = await Promise.all([
      fetch(`/api/clients/${clientId}`),
      fetch(`/api/clients/${clientId}/spend`),
    ]);
    const { client } = await clientRes.json();
    if (client) {
      setName(client.name ?? "");
      setGhlLocationId(client.ghl_location_id ?? "");
      setHiredTag(client.hired_tag ?? "recruitment - hire made");
      setPayout(String(client.payout_per_hire ?? "0"));
    }
    const spendData = await spendRes.json();
    setSpend(spendData.spend ?? []);
    setSpendLoading(false);
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = { name, ghl_location_id: ghlLocationId, hired_tag: hiredTag, payout_per_hire: payout };
      if (ghlApiKey.trim()) body.ghl_api_key = ghlApiKey;
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setSaveMsg({ type: "ok", text: "Settings saved." });
      else { const d = await res.json(); setSaveMsg({ type: "err", text: d.error ?? "Error saving." }); }
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUtm || !newSpend || !newWeek) return;
    setAddingSpend(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/spend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utm_content: newUtm, ad_name: newAdName || null, spend: newSpend, week_starting: newWeek }),
      });
      if (res.ok) {
        setNewUtm(""); setNewAdName(""); setNewSpend("");
        setNewWeek(currentWeekMonday());
        loadData();
      }
    } finally {
      setAddingSpend(false);
    }
  };

  const handleDeleteSpend = async (id: string) => {
    if (!confirm("Delete this spend entry?")) return;
    await fetch(`/api/clients/${clientId}/spend?spendId=${id}`, { method: "DELETE" });
    setSpend((s) => s.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-blue-600">All Clients</Link>
        <span>/</span>
        <Link href={`/dashboard/${clientId}`} className="hover:text-blue-600">{name || "Client"}</Link>
        <span>/</span>
        <span className="text-gray-800">Settings</span>
      </div>

      <ClientTabs clientId={clientId} />

      {/* Client form */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Client Settings</h2>
        </div>
        <form onSubmit={handleSaveClient} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Client Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Payout Per Hire ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="55.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">GHL API Key</label>
              <input
                type="password"
                value={ghlApiKey}
                onChange={(e) => setGhlApiKey(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank to keep existing"
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-400">Stored encrypted. Leave blank to keep current key.</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">GHL Location ID</label>
              <input
                type="text"
                value={ghlLocationId}
                onChange={(e) => setGhlLocationId(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">"Hired" Tag Name</label>
              <input
                type="text"
                value={hiredTag}
                onChange={(e) => setHiredTag(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. recruitment - hire made"
              />
              <p className="text-xs text-gray-400">Emoji prefixes (e.g. 🟢) are stripped before matching.</p>
            </div>
          </div>

          {saveMsg && (
            <div className={`rounded-md px-3 py-2 text-sm ${saveMsg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {saveMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
      </div>

      {/* Contract form */}
      <ContractForm clientId={clientId} />

      {/* Spend table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Manual Ad Spend</h2>
          <p className="text-xs text-gray-500 mt-0.5">Log weekly spend per utm_content value. Used to calculate cost per hire.</p>
        </div>

        {/* Add spend row */}
        <form onSubmit={handleAddSpend} className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">utm_content *</label>
              <input
                type="text"
                value={newUtm}
                onChange={(e) => setNewUtm(e.target.value)}
                placeholder="lambo-facetime"
                required
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Ad Name</label>
              <input
                type="text"
                value={newAdName}
                onChange={(e) => setNewAdName(e.target.value)}
                placeholder="Lambo FaceTime"
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Spend ($) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newSpend}
                onChange={(e) => setNewSpend(e.target.value)}
                placeholder="500.00"
                required
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Week Starting *</label>
              <input
                type="date"
                value={newWeek}
                onChange={(e) => setNewWeek(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addingSpend}
                className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {addingSpend ? "Adding…" : "Add Row"}
              </button>
            </div>
          </div>
        </form>

        {/* Spend list */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Week", "utm_content", "Ad Name", "Spend", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {spendLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : spend.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No spend entries yet.</td></tr>
              ) : (
                spend.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">{weekLabel(s.week_starting)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.utm_content}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-xs">{s.ad_name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{fmtCurrency(s.spend)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDeleteSpend(s.id)}
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
