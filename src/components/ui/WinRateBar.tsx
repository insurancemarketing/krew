"use client";

interface WinRateBarProps {
  rate: number; // 0–100
}

export default function WinRateBar({ rate }: WinRateBarProps) {
  const clamped = Math.min(100, Math.max(0, rate));
  const color =
    clamped >= 20 ? "bg-green-500" : clamped >= 10 ? "bg-amber-500" : "bg-gray-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-sm text-gray-700">{clamped.toFixed(0)}%</span>
    </div>
  );
}
