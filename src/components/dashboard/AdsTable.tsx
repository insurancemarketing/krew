"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import WinRateBar from "@/components/ui/WinRateBar";
import type { AdRow } from "@/lib/data";

type SortKey = "name" | "total_leads" | "total_hired" | "win_rate" | "total_spend" | "cost_per_hire";

interface AdsTableProps {
  ads: AdRow[];
}

export default function AdsTable({ ads }: AdsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("win_rate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...ads].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 inline-block text-gray-400">
      {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {(
                [
                  ["name", "Ad Name"],
                  ["total_leads", "Leads"],
                  ["total_hired", "Hired"],
                  ["win_rate", "Win Rate"],
                  ["total_spend", "Ad Spend"],
                  ["cost_per_hire", "Cost / Hire"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 select-none"
                >
                  {label}
                  <SortIcon k={key} />
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No ads found. Run a sync or check your Facebook credentials.
                </td>
              </tr>
            )}
            {sorted.map((ad) => (
              <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/ads/${ad.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {ad.name}
                  </Link>
                  {ad.campaign_id && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Campaign {ad.campaign_id}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{ad.total_leads}</td>
                <td className="px-4 py-3 text-gray-700">{ad.total_hired}</td>
                <td className="px-4 py-3">
                  <WinRateBar rate={ad.win_rate} />
                </td>
                <td className="px-4 py-3 text-gray-700">{fmt(ad.total_spend)}</td>
                <td className="px-4 py-3 text-gray-700">
                  {ad.total_hired > 0 ? fmt(ad.cost_per_hire) : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge winRate={ad.win_rate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
