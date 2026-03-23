"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { ContactRow } from "@/lib/data";

interface ContactsTableProps {
  contacts: ContactRow[];
  total: number;
  page: number;
  perPage: number;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContactsTable({
  contacts,
  total,
  page,
  perPage,
}: ContactsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / perPage);

  const navigate = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search, page: "1" });
  };

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        {(searchParams.get("search") || searchParams.get("stage")) && (
          <button
            type="button"
            onClick={() => { setSearch(""); navigate({ search: "", page: "1" }); }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-opacity ${isPending ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Email", "Attribution Source", "Pipeline Stage", "Tags", "Hired Date", "Created"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No contacts found.
                  </td>
                </tr>
              )}
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name ?? "—"}
                    {c.ad_name && (
                      <p className="text-xs text-gray-400 mt-0.5">via {c.ad_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {c.utm_source && (
                        <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          src: {c.utm_source}
                        </span>
                      )}
                      {c.utm_medium && (
                        <span className="ml-1 inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          med: {c.utm_medium}
                        </span>
                      )}
                      {c.utm_campaign && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.utm_campaign}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.pipeline_stage ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            tag === "hired"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.hired_at ? (
                      <span className="text-green-600 font-medium">
                        {formatDate(c.hired_at)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDate(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} contacts
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => navigate({ page: String(page - 1) })}
                className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => navigate({ page: String(page + 1) })}
                className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
