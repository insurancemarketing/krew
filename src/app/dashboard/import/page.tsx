"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  saveToLocalStorage,
  type LocalAdStat,
  type LocalImportData,
} from "@/lib/localData";

// ---------------------------------------------------------------------------
// CSV parsers
// ---------------------------------------------------------------------------
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVPreview(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines
    .slice(1, 6)
    .filter((l) => l.trim())
    .map((l) => parseCSVLine(l));
  return { headers, rows };
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Auto-suggest: find best FB ad name for a utm_content value
// Splits both on word boundaries and checks overlap.
// ---------------------------------------------------------------------------
function suggestMatch(utmContent: string, fbAdNames: string[]): string {
  if (!fbAdNames.length) return "";
  // exact case-insensitive match first
  const exact = fbAdNames.find(
    (n) => n.toLowerCase() === utmContent.toLowerCase()
  );
  if (exact) return exact;

  const utmWords = utmContent
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter((w) => w.length > 2);
  if (!utmWords.length) return "";

  let best = "";
  let bestScore = 0;
  for (const adName of fbAdNames) {
    const adWords = adName.toLowerCase().split(/[-_\s]+/);
    const score = utmWords.filter((w) =>
      adWords.some((aw) => aw.includes(w) || w.includes(aw))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      best = adName;
    }
  }
  return bestScore >= 1 ? best : "";
}

// ---------------------------------------------------------------------------
// DropZone
// ---------------------------------------------------------------------------
interface DropZoneProps {
  label: string;
  hint: string;
  file: File | null;
  onFile: (file: File, content: string) => void;
  preview: { headers: string[]; rows: string[][] } | null;
  optional?: boolean;
}

function DropZone({ label, hint, file, onFile, preview, optional }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      const reader = new FileReader();
      reader.onload = (e) => onFile(f, (e.target?.result as string) ?? "");
      reader.readAsText(f);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors min-h-[140px] ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : file
            ? "border-green-400 bg-green-50"
            : "border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {file ? (
          <>
            <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-green-700">{file.name}</p>
            <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB — click to replace</p>
          </>
        ) : (
          <>
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">
              {label}
              {optional && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
            </p>
            <p className="text-xs text-gray-500">Drag &amp; drop or click to upload</p>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{hint}</p>
      {preview && preview.headers.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {preview.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-gray-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-gray-600 whitespace-nowrap max-w-[160px] truncate" title={cell}>
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
            Showing first {preview.rows.length} row{preview.rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mapping table
// ---------------------------------------------------------------------------
interface UtmGroup {
  utmContent: string;
  count: number;
  hired: number;
}

interface MappingTableProps {
  groups: UtmGroup[];
  fbAdNames: string[];
  mappings: Record<string, string>;
  onChange: (utmContent: string, fbAdName: string) => void;
}

function MappingTable({ groups, fbAdNames, mappings, onChange }: MappingTableProps) {
  const hasFb = fbAdNames.length > 0;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Map UTM Content → Facebook Ad</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {hasFb
            ? "Match each utm_content value to a Facebook ad to include spend data. Suggestions are auto-filled — adjust as needed."
            : "No Facebook CSV uploaded. All rows will show leads and hires only; spend will be —. Upload a FB CSV to add spend data."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                utm_content (GHL)
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Leads
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Hired
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {hasFb ? "Facebook Ad" : "Facebook Ad (no CSV)"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groups.map(({ utmContent, count, hired }) => {
              const matched = hasFb && !!(mappings[utmContent] ?? "");
              return (
                <tr key={utmContent} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {utmContent}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-sm">{count}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-sm">{hired}</td>
                  <td className="px-4 py-2.5">
                    {hasFb ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={mappings[utmContent] ?? ""}
                          onChange={(e) => onChange(utmContent, e.target.value)}
                          className="w-full max-w-sm rounded-md border border-gray-200 px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">— No match (leads/hires only) —</option>
                          {fbAdNames.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        {matched && (
                          <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasFb && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {Object.keys(mappings).filter((k) => mappings[k]).length} of {groups.length} rows mapped to a Facebook ad
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const STEPS = [
  "Parsing GHL CSV…",
  "Computing ad stats…",
  "Saving to Supabase…",
] as const;

function StepList({ currentStep }: { currentStep: string | null }) {
  const currentIdx = STEPS.indexOf(currentStep as (typeof STEPS)[number]);
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-2.5">
      {STEPS.map((label, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={label} className="flex items-center gap-3">
            {isDone ? (
              <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : isActive ? (
              <svg className="h-4 w-4 shrink-0 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-gray-300" />
            )}
            <span className={`text-sm ${isActive ? "font-medium text-blue-800" : isDone ? "text-blue-700" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
type Phase = "upload" | "mapping" | "processing" | "done";

interface ImportResult {
  contactsImported: number;
  adsMatched: number;
  hiredFound: number;
}

export default function ImportPage() {
  const router = useRouter();

  // Upload state
  const [ghlFile, setGhlFile] = useState<File | null>(null);
  const [fbFile, setFbFile] = useState<File | null>(null);
  const [ghlContent, setGhlContent] = useState<string | null>(null);
  const [fbContent, setFbContent] = useState<string | null>(null);
  const [ghlPreview, setGhlPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fbPreview, setFbPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  // Mapping state
  const [utmGroups, setUtmGroups] = useState<UtmGroup[]>([]);
  const [fbAdNames, setFbAdNames] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Phase + progress
  const [phase, setPhase] = useState<Phase>("upload");
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tick = () => new Promise<void>((r) => setTimeout(r, 60));

  const handleGhlFile = useCallback((file: File, content: string) => {
    setGhlFile(file);
    setGhlContent(content);
    setGhlPreview(parseCSVPreview(content));
    setError(null);
  }, []);

  const handleFbFile = useCallback((file: File, content: string) => {
    setFbFile(file);
    setFbContent(content);
    setFbPreview(parseCSVPreview(content));
    setError(null);
  }, []);

  // Called when user clicks "Review Mappings" (both CSVs) or
  // "Process GHL Only" (GHL only, no FB)
  const handleReviewMappings = () => {
    if (!ghlContent) return;

    // Parse GHL to extract utm_content groups
    const ghlRows = parseCSV(ghlContent);
    console.log("[import] GHL rows for mapping:", ghlRows.length);

    const groupMap = new Map<string, { count: number; hired: number }>();
    for (const row of ghlRows) {
      const utm = (row["utm_content"] ?? "").trim() || "(none)";
      const existing = groupMap.get(utm) ?? { count: 0, hired: 0 };
      existing.count++;
      const tags = (row["Tags"] ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase());
      if (tags.indexOf("hired") !== -1) existing.hired++;
      groupMap.set(utm, existing);
    }

    const groups: UtmGroup[] = [...groupMap.entries()]
      .map(([utmContent, stats]) => ({ utmContent, ...stats }))
      .sort((a, b) => b.count - a.count);

    // Parse FB ad names if available
    const names: string[] = [];
    if (fbContent) {
      const fbRows = parseCSV(fbContent);
      console.log("[import] FB rows for mapping:", fbRows.length);
      for (const row of fbRows) {
        const name = (row["Ad name"] ?? "").trim();
        if (name && names.indexOf(name) === -1) names.push(name);
      }
    }

    // Auto-suggest mappings
    const auto: Record<string, string> = {};
    for (const { utmContent } of groups) {
      auto[utmContent] = suggestMatch(utmContent, names);
    }

    console.log("[import] utm groups:", groups.length, "| FB ad names:", names.length);
    console.log("[import] Auto-suggested mappings:", auto);

    setUtmGroups(groups);
    setFbAdNames(names);
    setMappings(auto);
    setPhase("mapping");
  };

  const handleProcess = async () => {
    if (!ghlContent) return;
    setPhase("processing");
    setError(null);

    try {
      // Step 1 — Parse GHL CSV
      setStep("Parsing GHL CSV…");
      await tick();

      const ghlRows = parseCSV(ghlContent);
      console.log("[import] GHL parsed:", ghlRows.length, "rows | cols:", Object.keys(ghlRows[0] ?? {}));

      // Parse FB CSV (if available)
      const fbRows = fbContent ? parseCSV(fbContent) : [];
      console.log("[import] FB parsed:", fbRows.length, "rows");

      // Build FB data map: lowercase(Ad name) → data
      type FbData = { fbAdId: string; spend: number; impressions: number; clicks: number };
      const fbDataMap = new Map<string, FbData>();
      for (const row of fbRows) {
        const adName = (row["Ad name"] ?? "").trim();
        if (!adName) continue;
        fbDataMap.set(adName, {
          fbAdId: (row["Ad ID"] ?? "").trim() || slugify(adName),
          spend: parseFloat((row["Amount spent (USD)"] ?? "0").replace(/[$,\s]/g, "")) || 0,
          impressions: parseInt(row["Impressions"] ?? "0", 10) || 0,
          clicks: parseInt(row["Link clicks"] ?? "0", 10) || 0,
        });
        console.log("[import] FB ad data:", adName, fbDataMap.get(adName));
      }

      // Step 2 — Compute per-utm_content stats
      setStep("Computing ad stats…");
      await tick();

      // Re-compute groups from ghlRows (in case handleReviewMappings was skipped)
      const groupMap = new Map<string, { contacts: typeof ghlRows; hired: number }>();
      for (const row of ghlRows) {
        const utm = (row["utm_content"] ?? "").trim() || "(none)";
        const existing = groupMap.get(utm) ?? { contacts: [], hired: 0 };
        existing.contacts.push(row);
        const tags = (row["Tags"] ?? "").split(",").map((t) => t.trim().toLowerCase());
        if (tags.indexOf("hired") !== -1) existing.hired++;
        groupMap.set(utm, existing);
      }

      let hiredFound = 0;
      let adsMatched = 0;
      const localAds: LocalAdStat[] = [];

      for (const [utmContent, group] of groupMap) {
        const fbAdName = mappings[utmContent] ?? "";
        const fb = fbAdName ? fbDataMap.get(fbAdName) : null;

        const totalLeads = group.contacts.length;
        const totalHired = group.hired;
        const winRate = totalLeads > 0 ? (totalHired / totalLeads) * 100 : 0;
        const totalSpend = fb?.spend ?? 0;
        const costPerHire = totalHired > 0 && totalSpend > 0 ? totalSpend / totalHired : 0;

        hiredFound += totalHired;
        if (fb) adsMatched++;

        const id = slugify(utmContent === "(none)" ? "no-utm" : utmContent);
        const fbAdId = fb?.fbAdId ?? id;

        console.log(
          `[import] "${utmContent}" → FB="${fbAdName || "none"}" | leads=${totalLeads} hired=${totalHired} spend=$${totalSpend}`
        );

        localAds.push({
          id,
          fb_ad_id: fbAdId,
          name: utmContent,
          status: "ACTIVE",
          campaign_id: null,
          ad_set_id: null,
          total_leads: totalLeads,
          total_hired: totalHired,
          win_rate: winRate,
          total_spend: totalSpend,
          cost_per_hire: costPerHire,
          impressions: fb?.impressions ?? 0,
          clicks: fb?.clicks ?? 0,
        });
      }

      const totalLeads = localAds.reduce((s, a) => s + a.total_leads, 0);
      console.log(
        `[import] Stats: ${totalLeads} contacts, ${hiredFound} hired, ${adsMatched} FB ads matched`
      );

      // Save to localStorage FIRST — works even if Supabase is unavailable
      const localData: LocalImportData = {
        importedAt: new Date().toISOString(),
        ads: localAds,
      };
      saveToLocalStorage(localData);

      // Step 3 — Save to Supabase (best-effort)
      setStep("Saving to Supabase…");
      await tick();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = getSupabaseClient() as any;
      if (!supabase) {
        console.warn("[import] Supabase not configured — data saved to localStorage only");
      } else {
        const today = new Date().toISOString().split("T")[0];

        // Upsert ads
        const adsToUpsert = localAds.map((a) => ({
          fb_ad_id: a.fb_ad_id,
          name: a.name,
          status: "ACTIVE",
        }));
        const { error: adsErr } = await supabase
          .from("ads")
          .upsert(adsToUpsert, { onConflict: "fb_ad_id" });
        if (adsErr) console.error("[import] ads upsert error:", adsErr.message);

        // Fetch UUIDs
        const { data: adRows, error: adFetchErr } = await supabase
          .from("ads")
          .select("id, fb_ad_id")
          .in("fb_ad_id", localAds.map((a) => a.fb_ad_id));
        if (adFetchErr) console.error("[import] ads fetch error:", adFetchErr.message);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fbAdIdToUuid = new Map<string, string>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (adRows ?? []).map((r: any) => [r.fb_ad_id, r.id] as [string, string])
        );
        console.log("[import] Ad UUID map size:", fbAdIdToUuid.size);

        // Upsert contacts in chunks of 500
        const contactsToUpsert = [];
        for (const [utmContent, group] of groupMap) {
          const adStat = localAds.find((a) => a.name === utmContent);
          const adUuid = adStat ? (fbAdIdToUuid.get(adStat.fb_ad_id) ?? null) : null;

          for (const row of group.contacts) {
            const contactId = (row["Contact Id"] ?? "").trim();
            if (!contactId) continue;
            const tags = (row["Tags"] ?? "").split(",").map((t) => t.trim()).filter(Boolean);
            const isHired = tags.some((t) => t.toLowerCase() === "hired");
            const rawCreated = (row["Created"] ?? "").trim();
            const createdAt = rawCreated
              ? new Date(rawCreated).toISOString()
              : new Date().toISOString();

            contactsToUpsert.push({
              ghl_contact_id: `csv-${contactId}`,
              name:
                [(row["First Name"] ?? "").trim(), (row["Last Name"] ?? "").trim()]
                  .filter(Boolean)
                  .join(" ") || null,
              email: (row["Email"] ?? "").trim().toLowerCase() || null,
              phone: (row["Phone"] ?? "").trim() || null,
              utm_content: utmContent === "(none)" ? null : utmContent,
              utm_campaign: (row["utm_campaign"] ?? "").trim() || null,
              utm_medium: (row["utm_medium"] ?? "").trim() || null,
              fb_click_id: (row["fbclid"] ?? "").trim() || null,
              fb_ad_id: adUuid,
              tags,
              hired_at: isHired ? createdAt : null,
              created_at: createdAt,
            });
          }
        }

        console.log("[import] Upserting", contactsToUpsert.length, "contacts to Supabase...");
        for (let i = 0; i < contactsToUpsert.length; i += 500) {
          const chunk = contactsToUpsert.slice(i, i + 500);
          const { error: cErr } = await supabase
            .from("contacts")
            .upsert(chunk, { onConflict: "ghl_contact_id" });
          if (cErr) console.error(`[import] contacts chunk ${Math.floor(i / 500) + 1} error:`, cErr.message);
          else console.log(`[import] Contacts saved: ${Math.min(i + 500, contactsToUpsert.length)}/${contactsToUpsert.length}`);
        }

        // Upsert ad_spend for ads with FB data
        const spendRows = localAds
          .filter((a) => a.total_spend > 0)
          .map((a) => ({
            fb_ad_id: a.fb_ad_id,
            ad_id: fbAdIdToUuid.get(a.fb_ad_id) ?? null,
            date: today,
            spend: a.total_spend,
            impressions: a.impressions,
            clicks: a.clicks,
          }));

        if (spendRows.length > 0) {
          const { error: spendErr } = await supabase
            .from("ad_spend")
            .upsert(spendRows, { onConflict: "fb_ad_id,date" });
          if (spendErr) console.error("[import] ad_spend upsert error:", spendErr.message);
          else console.log("[import] ad_spend upserted:", spendRows.length, "rows");
        }
      }

      console.log(`[import] Complete — contacts: ${totalLeads}, hired: ${hiredFound}, FB ads matched: ${adsMatched}`);
      setResult({ contactsImported: totalLeads, adsMatched, hiredFound });
      setPhase("done");

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[import] Error:", msg, err);
      setError(msg);
      setPhase("mapping"); // drop back to mapping so user can retry
    } finally {
      setStep(null);
    }
  };

  const handleReset = () => {
    setPhase("upload");
    setResult(null);
    setError(null);
    setUtmGroups([]);
    setFbAdNames([]);
    setMappings({});
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your GHL contacts CSV to see leads and hires per ad.
          Optionally add a Facebook Ads CSV to include spend data.
        </p>
      </div>

      {/* ── UPLOAD PHASE ── */}
      {phase === "upload" && (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-800">GHL Contacts CSV</h2>
              <DropZone
                label="GHL Contacts CSV"
                hint="Columns used: Contact Id, First Name, Last Name, Phone, Email, Created, Tags, fbclid, utm_content, utm_campaign, utm_medium"
                file={ghlFile}
                onFile={handleGhlFile}
                preview={ghlPreview}
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-800">Facebook Ads CSV</h2>
              <DropZone
                label="Facebook Ads CSV"
                hint="Columns used: Ad name, Amount spent (USD), Impressions, Link clicks, Ad ID. Skip this file to see leads/hires only."
                file={fbFile}
                onFile={handleFbFile}
                preview={fbPreview}
                optional
              />
            </div>
          </div>

          {ghlFile && (
            <div className="flex flex-wrap gap-3">
              {fbFile ? (
                <button
                  onClick={handleReviewMappings}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Review Mappings
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleReviewMappings}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Preview &amp; Process (GHL only)
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-1">
              <p className="font-semibold">Error</p>
              <p className="font-mono text-xs break-all">{error}</p>
            </div>
          )}
        </>
      )}

      {/* ── MAPPING PHASE ── */}
      {phase === "mapping" && (
        <div className="space-y-6">
          <MappingTable
            groups={utmGroups}
            fbAdNames={fbAdNames}
            mappings={mappings}
            onChange={(utm, fbName) =>
              setMappings((prev) => ({ ...prev, [utm]: fbName }))
            }
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-1">
              <p className="font-semibold">Processing failed — fix and retry</p>
              <p className="font-mono text-xs break-all">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleProcess}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Process Files
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* ── PROCESSING PHASE ── */}
      {phase === "processing" && (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
            <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processing…
          </div>
          <StepList currentStep={step} />
        </div>
      )}

      {/* ── DONE PHASE ── */}
      {phase === "done" && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-green-800">Import complete!</p>
              <p className="mt-1 text-sm text-green-700">
                {result.contactsImported.toLocaleString()} contact{result.contactsImported !== 1 ? "s" : ""}
                {" · "}
                {result.hiredFound} hire{result.hiredFound !== 1 ? "s" : ""}
                {result.adsMatched > 0 && (
                  <>{" · "}{result.adsMatched} FB ad{result.adsMatched !== 1 ? "s" : ""} matched</>
                )}
              </p>
              <p className="mt-1 text-xs text-green-600">
                Data saved to localStorage and{" "}
                {getSupabaseClient() ? "Supabase" : "localStorage only (Supabase not configured)"}.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
            >
              View Dashboard
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
