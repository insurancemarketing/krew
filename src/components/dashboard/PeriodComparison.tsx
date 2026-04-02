"use client";

import { useState } from "react";
import type { LocalAdStat } from "@/lib/localData";

type SortKey = "name" | "leads" | "hired" | "win_rate" | "spend";

interface PeriodComparisonProps {
  periodA: { label: string; ads: LocalAdStat[] };
  periodB: { label: string; ads: LocalAdStat[] };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

function Delta({
  a,
  b,
  lowerIsBetter = false,
  isPercent = false,
}: {
  a: number;
  b: number;
  lowerIsBetter?: boolean;
  isPercent?: boolean;
}) {
  const diff = a - b;
  if (diff === 0) return <span className="text-gray-400 text-xs">—</span>;
  const pct = b !== 0 ? Math.round(Math.abs((diff / b) * 100)) : null;
  const up = diff > 0;
  const positive = lowerIsBetter ? !up : up;
  const color = positive ? "text-green-600" : "text-red-500";
  const arrow = up ? "↑" : "↓";
  return (
    <span className={`text-xs font-medium ${color}`}>
      {arrow} {Math.abs(diff)}{isPercent ? "%" : ""}
      {pct !== null ? ` (${pct}%)` : ""}
    </span>
  );
}

export default function PeriodComparison({ periodA, periodB }: PeriodComparisonProps) {
  const [sortKey, setSortKey] = useState<SortKey>("leads");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // Build union of all ad names
  const allNames = Array.from(
    new Set([
      ...periodA.ads.map((a) => a.name),
      ...periodB.ads.map((a) => a.name),
    ])
  );

  const mapA = new Map(periodA.ads.map((a) => [a.name, a]));
  const mapB = new Map(periodB.ads.map((a) => [a.name, a]));

  const rows = allNames.map((name) => {
    const a = mapA.get(name);
    const b = mapB.get(name);
    return {
      name,
      leadsA: a?.total_leads ?? 0,
      leadsB: b?.total_leads ?? 0,
      hiredA: a?.total_hired ?? 0,
      hiredB: b?.total_hired ?? 0,
      winA: a?.win_rate ?? 0,
      winB: b?.win_rate ?? 0,
      spendA: a?.total_spend ?? 0,
      spendB: b?.total_spend ?? 0,
      cphA: a?.cost_per_hire ?? 0,
      cphB: b?.cost_per_hire ?? 0,
    };
  });

  const sorted = [...rows].sort((x, y) => {
    let diff = 0;
    if (sortKey === "name") diff = x.name.localeCompare(y.name);
    else if (sortKey === "leads") diff = x.leadsA - y.leadsA;
    else if (sortKey === "hired") diff = x.hiredA - y.hiredA;
    else if (sortKey === "win_rate") diff = x.winA - y.winA;
    else if (sortKey === "spend") diff = x.spendA - y.spendA;
    return sortDir === "asc" ? diff : -diff;
  });

  const thCls = "cursor-pointer whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700 select-none";
  const sortIcon = (k: SortKey) => (
    <span className="ml-1 text-gray-300">
      {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          {periodA.label}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-gray-300" />
          {periodB.label}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          Δ = {periodA.label} vs {periodB.label}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={thCls} onClick={() => toggleSort("name")}>Ad (utm_content){sortIcon("name")}</th>
              <th className={thCls} onClick={() => toggleSort("leads")}>Leads{sortIcon("leads")}</th>
              <th className={thCls} onClick={() => toggleSort("hired")}>Hired{sortIcon("hired")}</th>
              <th className={thCls} onClick={() => toggleSort("win_rate")}>Win Rate{sortIcon("win_rate")}</th>
              <th className={thCls} onClick={() => toggleSort("spend")}>Spend{sortIcon("spend")}</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Cost / Hire
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No data in either period.
                </td>
              </tr>
            )}
            {sorted.map((row) => (
              <tr key={row.name} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                    {row.name}
                  </span>
                </td>

                {/* Leads */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-blue-700">{row.leadsA}</span>
                    <span className="text-xs text-gray-400">{row.leadsB}</span>
                    <Delta a={row.leadsA} b={row.leadsB} />
                  </div>
                </td>

                {/* Hired */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-blue-700">{row.hiredA}</span>
                    <span className="text-xs text-gray-400">{row.hiredB}</span>
                    <Delta a={row.hiredA} b={row.hiredB} />
                  </div>
                </td>

                {/* Win rate */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-blue-700">
                      {row.winA.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400">{row.winB.toFixed(1)}%</span>
                    <Delta a={parseFloat(row.winA.toFixed(1))} b={parseFloat(row.winB.toFixed(1))} isPercent />
                  </div>
                </td>

                {/* Spend */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-blue-700">
                      {row.spendA > 0 ? fmt(row.spendA) : "—"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {row.spendB > 0 ? fmt(row.spendB) : "—"}
                    </span>
                    {row.spendA > 0 && row.spendB > 0 && (
                      <Delta a={row.spendA} b={row.spendB} lowerIsBetter />
                    )}
                  </div>
                </td>

                {/* Cost per hire */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-blue-700">
                      {row.cphA > 0 ? fmt(row.cphA) : "—"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {row.cphB > 0 ? fmt(row.cphB) : "—"}
                    </span>
                    {row.cphA > 0 && row.cphB > 0 && (
                      <Delta a={row.cphA} b={row.cphB} lowerIsBetter />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
