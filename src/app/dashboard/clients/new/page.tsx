"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [hiredTag, setHiredTag] = useState("recruitment - hire made");
  const [payout, setPayout] = useState("55");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey || !locationId) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/clients/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghl_api_key: apiKey, ghl_location_id: locationId }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: `Connected — ${data.contactCount.toLocaleString()} contacts found.` });
      } else {
        setTestResult({ ok: false, message: data.error ?? "Connection failed." });
      }
    } catch (err) {
      setTestResult({ ok: false, message: String(err) });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, ghl_api_key: apiKey, ghl_location_id: locationId,
          hired_tag: hiredTag, payout_per_hire: payout,
        }),
      });
      const data = await res.json();
      if (res.ok && data.client) {
        router.push(`/dashboard/${data.client.id}`);
      } else {
        setError(data.error ?? "Failed to create client.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-blue-600">All Clients</Link>
        <span>/</span>
        <span className="text-gray-800">Add Client</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-5 space-y-5">
          {/* Client name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Client Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nick - AO Infinite"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* API key */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">GHL API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
              required
              autoComplete="new-password"
              placeholder="eyJhbGciOiJSUzI1NiIs…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">Stored encrypted with AES-256-GCM. Never exposed to the browser after save.</p>
          </div>

          {/* Location ID */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">GHL Location ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationId}
                onChange={(e) => { setLocationId(e.target.value); setTestResult(null); }}
                required
                placeholder="ve9EPM428h8vShlRW1KT"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiKey || !locationId}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {testing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Testing…
                  </>
                ) : "Test Connection"}
              </button>
            </div>
            {testResult && (
              <div className={`rounded-md px-3 py-2 text-sm ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {testResult.ok ? "✓ " : "✗ "}{testResult.message}
              </div>
            )}
          </div>

          {/* Hired tag */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">"Hired" Tag</label>
            <input
              type="text"
              value={hiredTag}
              onChange={(e) => setHiredTag(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="recruitment - hire made"
            />
            <p className="text-xs text-gray-400">Emoji prefixes (e.g. 🟢) are stripped before matching.</p>
          </div>

          {/* Payout */}
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
        </div>

        {error && (
          <div className="mx-6 mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating…" : "Create Client"}
          </button>
        </div>
      </form>
    </div>
  );
}
