"use client";

import { useState } from "react";

const FIELDS = [
  {
    key: "GHL_API_KEY",
    label: "GHL API Key",
    placeholder: "eyJ0eXAiOiJKV1Qi...",
    description: "Your GoHighLevel private integration API key.",
  },
  {
    key: "GHL_LOCATION_ID",
    label: "GHL Location ID",
    placeholder: "ABC123XYZ",
    description: "The location/sub-account ID from your GHL account.",
  },
  {
    key: "FB_ACCESS_TOKEN",
    label: "Facebook Access Token",
    placeholder: "EAABsbCS...",
    description: "Long-lived page or system user access token from Meta Business Manager.",
  },
  {
    key: "FB_AD_ACCOUNT_ID",
    label: "Facebook Ad Account ID",
    placeholder: "act_123456789",
    description: "Your Meta ad account ID (include the 'act_' prefix).",
  },
];

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, ""]))
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Only send fields that have values
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim()) payload[k] = v.trim();
    }

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Unknown error");
      }
      setMessage({ type: "success", text: "Settings saved successfully." });
      setValues(Object.fromEntries(FIELDS.map((f) => [f.key, ""])));
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cron/sync");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.errors?.join("; ") ?? "Sync failed");
      }
      setMessage({
        type: "success",
        text: `Sync complete. GHL: ${data.results?.ghl?.upserted ?? 0} contacts, FB: ${data.results?.facebook?.adsUpserted ?? 0} ads.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: String(err) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">API Credentials</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter values only for fields you want to update. Existing values are
              stored in Supabase and never exposed to the client.
            </p>
          </div>

          {FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={field.key}
                className="block text-sm font-medium text-gray-700"
              >
                {field.label}
              </label>
              <p className="mt-0.5 text-xs text-gray-500">{field.description}</p>
              <input
                id={field.key}
                type="password"
                autoComplete="off"
                value={values[field.key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </form>

      {/* Manual sync */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Manual Sync</h2>
        <p className="mt-1 text-sm text-gray-500">
          Trigger a data sync immediately. Syncs run automatically every 6 hours.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="mt-4 flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {syncing && (
            <svg className="h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {syncing ? "Syncing…" : "Run Sync Now"}
        </button>
      </div>

      {/* Webhook info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">GHL Webhook Setup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure this URL in GHL under Settings → Webhooks to get real-time hired updates:
        </p>
        <code className="mt-3 block rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 break-all">
          {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}
          /api/webhooks/ghl
        </code>
        <p className="mt-2 text-xs text-gray-400">
          Subscribe to: <strong>contact.tag_added</strong>
        </p>
      </div>
    </div>
  );
}
