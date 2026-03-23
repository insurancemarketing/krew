interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  highlight,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        highlight ? "border-blue-200 bg-blue-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {icon && (
          <span className="rounded-lg bg-gray-100 p-2 text-gray-500">{icon}</span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}
