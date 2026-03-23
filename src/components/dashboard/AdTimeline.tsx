"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimelinePoint {
  date: string;
  leads: number;
  hired: number;
}

interface AdTimelineProps {
  data: TimelinePoint[];
}

export default function AdTimeline({ data }: AdTimelineProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
        Leads &amp; Hires Over Time
      </h2>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          No timeline data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(v) => v.slice(5)} // MM-DD
            />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="#93c5fd"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="hired"
              name="Hired"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
