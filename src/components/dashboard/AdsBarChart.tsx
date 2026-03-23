"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  name: string;
  leads: number;
  hired: number;
}

interface AdsBarChartProps {
  data: ChartData[];
}

export default function AdsBarChart({ data }: AdsBarChartProps) {
  const truncate = (s: string) =>
    s.length > 20 ? s.slice(0, 18) + "…" : s;

  const chartData = data.map((d) => ({
    ...d,
    name: truncate(d.name),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Leads vs. Hired per Ad
      </h2>
      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
          No ad data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
            />
            <Bar dataKey="leads" name="Leads" fill="#93c5fd" radius={[4, 4, 0, 0]} />
            <Bar dataKey="hired" name="Hired" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
