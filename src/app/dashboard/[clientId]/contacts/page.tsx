"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  utm_content: string | null;
  utm_campaign: string | null;
  tags: string | null;
  is_hired: boolean;
  hired_at: string | null;
  watch_pct: number | null;
  created_at: string;
}

const stages = ["All", "Never Watched", "Watched", "Applied", "Scheduled", "Hired"];

function hasTag(tags: string | null, ...needles: string[]): boolean {
  if (!tags) return false;
  const t = tags.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

function contactStage(c: Contact): string {
  if (c.is_hired) return "Hired";
  if (hasTag(c.tags, "scheduled appointment")) return "Scheduled";
  if (hasTag(c.tags, "questionnaire", "new applicant")) return "Applied";
  if (hasTag(c.tags, "watch100%", "watched 100")) return "Watched";
  return "Never Watched";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function ContactsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [clientName, setClientName] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [utmFilter, setUtmFilter] = useState("");
  const [hiredFilter, setHiredFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [utmOptions, setUtmOptions] = useState<string[]>([]);

  const perPage = 50;

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
    if (search) params.set("search", search);
    if (utmFilter) params.set("utm_content", utmFilter);
    if (hiredFilter) params.set("is_hired", hiredFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`/api/clients/${clientId}/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [clientId, page, search, utmFilter, hiredFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetch(`/api/clients/${clientId}`).then(r => r.json()).then(d => setClientName(d.client?.name ?? ""));
    // Load all UTM values for the filter dropdown
    fetch(`/api/clients/${clientId}/contacts?perPage=1000`).then(r => r.json()).then(d => {
      const utms = Array.from(new Set((d.contacts ?? []).map((c: Contact) => c.utm_content ?? "(No UTM)"))) as string[];
      setUtmOptions(utms.sort());
    });
  }, [clientId]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Client-side stage filter (applied on top of server results for simplicity)
  const displayContacts = stageFilter === "All"
    ? contacts
    : contacts.filter((c) => contactStage(c) === stageFilter);

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Created", "utm_content", "Watch%", "Tags", "Hired"];
    const rows = contacts.map((c) => [
      [c.first_name, c.last_name].filter(Boolean).join(" "),
      c.email ?? "",
      c.phone ?? "",
      fmtDate(c.created_at),
      c.utm_content ?? "(No UTM)",
      c.watch_pct != null ? `${c.watch_pct}%` : "",
      c.tags ?? "",
      c.is_hired ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${clientId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-blue-600">All Clients</Link>
        <span>/</span>
        <Link href={`/dashboard/${clientId}`} className="hover:text-blue-600">{clientName}</Link>
        <span>/</span>
        <span className="text-gray-800">Contacts</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total.toLocaleString()} total</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
        <select
          value={utmFilter}
          onChange={(e) => { setUtmFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All UTMs</option>
          {utmOptions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={hiredFilter}
          onChange={(e) => { setHiredFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Hired: All</option>
          <option value="true">Hired: Yes</option>
          <option value="false">Hired: No</option>
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {stages.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="To date"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Phone", "Created", "utm_content", "Watch%", "Stage", "Hired"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5"><div className="h-4 bg-gray-100 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : displayContacts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No contacts found.</td></tr>
              ) : (
                displayContacts.map((c) => {
                  const stage = contactStage(c);
                  const stageColors: Record<string, string> = {
                    Hired: "bg-green-100 text-green-700",
                    Scheduled: "bg-blue-100 text-blue-700",
                    Applied: "bg-purple-100 text-purple-700",
                    Watched: "bg-yellow-100 text-yellow-700",
                    "Never Watched": "bg-gray-100 text-gray-600",
                  };
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{c.email ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">{c.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-2.5">
                        {c.utm_content ? (
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{c.utm_content}</span>
                        ) : (
                          <span className="text-xs text-gray-400">(No UTM)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {c.watch_pct != null ? `${c.watch_pct.toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[stage] ?? ""}`}>{stage}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {c.is_hired ? (
                          <span className="text-green-600 font-medium text-xs">Yes</span>
                        ) : (
                          <span className="text-gray-400 text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages} ({total.toLocaleString()} contacts)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
