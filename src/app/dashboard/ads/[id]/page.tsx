import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdDetail } from "@/lib/data";
import StatusBadge from "@/components/ui/StatusBadge";
import AdTimeline from "@/components/dashboard/AdTimeline";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ad = await getAdDetail(params.id);
  if (!ad) notFound();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Overview
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ad.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {ad.campaign_id && (
              <span className="text-xs text-gray-400">
                Campaign: {ad.campaign_id}
              </span>
            )}
            <span className="text-xs text-gray-400">
              FB Ad ID: {ad.fb_ad_id}
            </span>
          </div>
        </div>
        <StatusBadge winRate={ad.win_rate} />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Leads", value: ad.total_leads },
          { label: "Total Hired", value: ad.total_hired },
          { label: "Win Rate", value: `${ad.win_rate.toFixed(1)}%` },
          { label: "Ad Spend", value: fmt(ad.total_spend) },
          { label: "Cost / Hire", value: ad.total_hired > 0 ? fmt(ad.cost_per_hire) : "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline chart */}
      <AdTimeline data={ad.timeline} />

      {/* Contacts list */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          Contacts from this ad ({ad.contacts.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Email", "Added", "Hired"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ad.contacts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No contacts attributed to this ad yet.
                    </td>
                  </tr>
                )}
                {ad.contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {c.hired_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          {formatDate(c.hired_at)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not hired</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
