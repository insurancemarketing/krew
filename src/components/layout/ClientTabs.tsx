"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "input", label: "Monthly Input" },
  { slug: "agents", label: "Agents" },
  { slug: "creatives", label: "Creatives" },
  { slug: "hours", label: "Hours" },
  { slug: "touchpoints", label: "Touchpoints" },
  { slug: "tests", label: "Split Tests" },
  { slug: "contacts", label: "Contacts" },
  { slug: "settings", label: "Settings" },
];

export default function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const basePath = `/dashboard/${clientId}`;

  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav className="-mb-px flex gap-5 text-sm">
        {tabs.map((t) => {
          const href = t.slug ? `${basePath}/${t.slug}` : basePath;
          const isActive = t.slug
            ? pathname.startsWith(href)
            : pathname === basePath;
          return (
            <Link
              key={t.slug}
              href={href}
              className={`whitespace-nowrap border-b-2 px-1 py-3 font-medium transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
