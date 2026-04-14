"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ClientHeader({ clientId, subtitle }: { clientId: string; subtitle?: string }) {
  const [name, setName] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        const { client } = await res.json();
        setName(client?.name ?? "");
      } catch {}
    }
    load();
  }, [clientId]);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/dashboard" className="hover:text-blue-600">All Clients</Link>
        <span>/</span>
        <Link href={`/dashboard/${clientId}`} className="hover:text-blue-600">
          {name || "Client"}
        </Link>
        {subtitle && (
          <>
            <span>/</span>
            <span className="text-gray-800 font-medium">{subtitle}</span>
          </>
        )}
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{name || "Loading…"}</h1>
    </div>
  );
}
