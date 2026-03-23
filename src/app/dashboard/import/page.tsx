"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

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
// DropZone component
// ---------------------------------------------------------------------------
interface DropZoneProps {
  label: string;
  hint: string;
  file: File | null;
  onFile: (file: File, content: string) => void;
  preview: { headers: string[]; rows: string[][] } | null;
}

function DropZone({ label, hint, file, onFile, preview }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        onFile(f, (e.target?.result as string) ?? "");
      };
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
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors min-h-[160px] ${
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>
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
// Step indicator list
// ---------------------------------------------------------------------------
const STEPS = [
  "Parsing GHL CSV…",
  "Parsing Facebook Ads CSV…",
  "Matching ads to contacts…",
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
interface ImportResult {
  contactsImported: number;
  adsMatched: number;
  hiredFound: number;
}

export default function ImportPage() {
  const router = useRouter();

  const [ghlFile, setGhlFile] = useState<File | null>(null);
  const [fbFile, setFbFile] = useState<File | null>(null);
  const [ghlContent, setGhlContent] = useState<string | null>(null);
  const [fbContent, setFbContent] = useState<string | null>(null);
  const [ghlPreview, setGhlPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fbPreview, setFbPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGhlFile = useCallback((file: File, content: string) => {
    setGhlFile(file);
    setGhlContent(content);
    setGhlPreview(parseCSVPreview(content));
    setResult(null);
    setError(null);
  }, []);

  const handleFbFile = useCallback((file: File, content: string) => {
    setFbFile(file);
    setFbContent(content);
    setFbPreview(parseCSVPreview(content));
    setResult(null);
    setError(null);
  }, []);

  // Yield to let React re-render the step label before the next operation
  const tick = () => new Promise<void>((r) => setTimeout(r, 60));

  const handleProcess = async () => {
    if (!ghlContent || !fbContent) return;
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      // -----------------------------------------------------------------------
      // Step 1 — Parse GHL CSV
      // -----------------------------------------------------------------------
      setStep("Parsing GHL CSV…");
      await tick();

      const ghlRows = parseCSV(ghlContent);
      console.log(
        "[import] GHL parsed:", ghlRows.length, "rows",
        "| cols:", Object.keys(ghlRows[0] ?? {})
      );

      // -----------------------------------------------------------------------
      // Step 2 — Parse Facebook Ads CSV
      // -----------------------------------------------------------------------
      setStep("Parsing Facebook Ads CSV…");
      await tick();

      const fbRows = parseCSV(fbContent);
      console.log(
        "[import] FB parsed:", fbRows.length, "rows",
        "| cols:", Object.keys(fbRows[0] ?? {})
      );

      // Build FB lookup: lowercase(Ad name) → ad data
      type FbAd = { fbAdId: string; name: string; spend: number; impressions: number; clicks: number };
      const fbByName = new Map<string, FbAd>();

      for (const row of fbRows) {
        const adName = (row["Ad name"] ?? "").trim();
        if (!adName) {
          console.warn("[import] FB row missing 'Ad name', skipping:", row);
          continue;
        }
        const rawFbAdId = (row["Ad ID"] ?? "").trim();
        const entry: FbAd = {
          // Use real FB Ad ID if present, otherwise fall back to slugified name
          fbAdId: rawFbAdId || slugify(adName),
          name: adName,
          spend: parseFloat((row["Amount spent (USD)"] ?? "0").replace(/[$,\s]/g, "")) || 0,
          impressions: parseInt(row["Impressions"] ?? "0", 10) || 0,
          clicks: parseInt(row["Link clicks"] ?? "0", 10) || 0,
        };
        fbByName.set(adName.toLowerCase(), entry);
        console.log("[import] FB ad:", entry);
      }
      console.log("[import] FB ad map size:", fbByName.size);

      // -----------------------------------------------------------------------
      // Step 3 — Match GHL contacts to FB ads via utm_content = Ad name
      // -----------------------------------------------------------------------
      setStep("Matching ads to contacts…");
      await tick();

      type ContactRecord = {
        ghl_contact_id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        utm_content: string | null;
        utm_campaign: string | null;
        utm_medium: string | null;
        fb_click_id: string | null;
        tags: string[];
        hired_at: string | null;
        created_at: string;
        // internal — resolved to UUID before upsert
        _matchedAdKey: string | null;
      };

      const contacts: ContactRecord[] = [];
      let hiredFound = 0;
      let adsMatched = 0;

      for (const row of ghlRows) {
        const contactId = (row["Contact Id"] ?? "").trim();
        if (!contactId) {
          console.warn("[import] GHL row missing 'Contact Id', skipping:", row);
          continue;
        }

        const firstName = (row["First Name"] ?? "").trim();
        const lastName = (row["Last Name"] ?? "").trim();
        const name = [firstName, lastName].filter(Boolean).join(" ") || null;
        const email = (row["Email"] ?? "").trim().toLowerCase() || null;
        const phone = (row["Phone"] ?? "").trim() || null;

        const rawTags = row["Tags"] ?? "";
        const tags = rawTags
          ? rawTags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];
        const isHired = tags.some((t) => t.toLowerCase() === "hired");

        const utmContent = (row["utm_content"] ?? "").trim() || null;
        const utmCampaign = (row["utm_campaign"] ?? "").trim() || null;
        const utmMedium = (row["utm_medium"] ?? "").trim() || null;
        const fbClickId = (row["fbclid"] ?? "").trim() || null;

        const rawCreated = (row["Created"] ?? "").trim();
        const createdAt = rawCreated
          ? new Date(rawCreated).toISOString()
          : new Date().toISOString();

        let hiredAt: string | null = null;
        if (isHired) {
          hiredAt = createdAt;
          hiredFound++;
          console.log(`[import] Hired: "${name}" tags=${JSON.stringify(tags)}`);
        }

        // Match utm_content → FB Ad name (exact, case-insensitive)
        let matchedAdKey: string | null = null;
        if (utmContent) {
          const key = utmContent.toLowerCase();
          if (fbByName.has(key)) {
            matchedAdKey = key;
            adsMatched++;
            console.log(`[import] Matched: "${name}" utm_content="${utmContent}" → "${fbByName.get(key)!.name}"`);
          } else {
            console.warn(`[import] No FB ad for utm_content="${utmContent}" (contact: "${name}")`);
          }
        }

        contacts.push({
          ghl_contact_id: `csv-${contactId}`,
          name,
          email,
          phone,
          utm_content: utmContent,
          utm_campaign: utmCampaign,
          utm_medium: utmMedium,
          fb_click_id: fbClickId,
          tags,
          hired_at: hiredAt,
          created_at: createdAt,
          _matchedAdKey: matchedAdKey,
        });
      }

      console.log(
        `[import] Match summary: ${contacts.length} contacts, ${hiredFound} hired, ${adsMatched} with ad match`
      );

      // -----------------------------------------------------------------------
      // Step 4 — Save to Supabase
      // -----------------------------------------------------------------------
      setStep("Saving to Supabase…");
      await tick();

      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split("T")[0];

      // 4a. Upsert all FB ads
      const adsToUpsert = [...fbByName.values()].map((fb) => ({
        fb_ad_id: fb.fbAdId,
        name: fb.name,
        status: "ACTIVE",
      }));

      console.log("[import] Upserting", adsToUpsert.length, "ads...");
      if (adsToUpsert.length > 0) {
        const { error: adsErr } = await supabase
          .from("ads")
          .upsert(adsToUpsert, { onConflict: "fb_ad_id" });
        if (adsErr) {
          console.error("[import] ads upsert error:", adsErr);
          throw new Error(`ads upsert: ${adsErr.message}`);
        }
      }

      // 4b. Fetch UUIDs for all ads we just upserted
      const fbAdIds = adsToUpsert.map((a) => a.fb_ad_id);
      const { data: adRows, error: adFetchErr } = await supabase
        .from("ads")
        .select("id, fb_ad_id, name")
        .in("fb_ad_id", fbAdIds);

      if (adFetchErr) {
        console.error("[import] ads fetch error:", adFetchErr);
        throw new Error(`ads fetch: ${adFetchErr.message}`);
      }

      // Build: lowercase(adName) → UUID
      const adNameToUuid = new Map<string, string>();
      for (const [key, fb] of fbByName) {
        const match = (adRows ?? []).find((r) => r.fb_ad_id === fb.fbAdId);
        if (match) {
          adNameToUuid.set(key, match.id);
        } else {
          console.warn("[import] Could not find UUID for ad:", fb.name);
        }
      }
      console.log("[import] Ad name → UUID:", [...adNameToUuid].map(([k, v]) => `${k}=${v}`).join(", "));

      // 4c. Upsert contacts in chunks of 500
      const contactsToUpsert = contacts.map((c) => ({
        ghl_contact_id: c.ghl_contact_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        utm_content: c.utm_content,
        utm_campaign: c.utm_campaign,
        utm_medium: c.utm_medium,
        fb_click_id: c.fb_click_id,
        fb_ad_id: c._matchedAdKey ? (adNameToUuid.get(c._matchedAdKey) ?? null) : null,
        tags: c.tags,
        hired_at: c.hired_at,
        created_at: c.created_at,
      }));

      console.log("[import] Upserting", contactsToUpsert.length, "contacts...");
      let contactsImported = 0;
      const CHUNK = 500;
      for (let i = 0; i < contactsToUpsert.length; i += CHUNK) {
        const chunk = contactsToUpsert.slice(i, i + CHUNK);
        const { error: cErr } = await supabase
          .from("contacts")
          .upsert(chunk, { onConflict: "ghl_contact_id" });
        if (cErr) {
          console.error(`[import] contacts upsert error (chunk ${i / CHUNK + 1}):`, cErr);
          throw new Error(`contacts upsert: ${cErr.message}`);
        }
        contactsImported += chunk.length;
        console.log(`[import] Contacts saved: ${contactsImported}/${contactsToUpsert.length}`);
      }

      // 4d. Upsert ad_spend (one row per ad per day)
      const spendToUpsert = [...fbByName.values()].map((fb) => ({
        fb_ad_id: fb.fbAdId,
        ad_id: adNameToUuid.get(fb.name.toLowerCase()) ?? null,
        date: today,
        spend: fb.spend,
        impressions: fb.impressions,
        clicks: fb.clicks,
      }));

      if (spendToUpsert.length > 0) {
        console.log("[import] Upserting", spendToUpsert.length, "ad_spend rows...");
        const { error: spendErr } = await supabase
          .from("ad_spend")
          .upsert(spendToUpsert, { onConflict: "fb_ad_id,date" });
        if (spendErr) {
          console.error("[import] ad_spend upsert error:", spendErr);
          throw new Error(`ad_spend upsert: ${spendErr.message}`);
        }
      }

      console.log(
        `[import] Complete — contacts: ${contactsImported}, ads matched: ${adsMatched}, hired: ${hiredFound}`
      );
      setResult({ contactsImported, adsMatched, hiredFound });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[import] Import failed:", msg, err);
      setError(msg);
    } finally {
      setProcessing(false);
      setStep(null);
    }
  };

  const bothReady = !!ghlFile && !!fbFile;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your GHL contacts and Facebook Ads CSV exports to populate the dashboard.
        </p>
      </div>

      {/* Upload zones */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">GHL Contacts CSV</h2>
          <DropZone
            label="GHL Contacts CSV"
            hint="Expected columns: Contact Id, First Name, Last Name, Phone, Email, Created, Tags, fbclid, utm_content, utm_campaign, utm_medium, utm_keyword"
            file={ghlFile}
            onFile={handleGhlFile}
            preview={ghlPreview}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">Facebook Ads CSV</h2>
          <DropZone
            label="Facebook Ads CSV"
            hint="Expected columns: Ad name, Amount spent (USD), Impressions, Link clicks, Ad ID"
            file={fbFile}
            onFile={handleFbFile}
            preview={fbPreview}
          />
        </div>
      </div>

      {/* Process button */}
      {bothReady && !result && (
        <div className="space-y-4">
          <button
            onClick={handleProcess}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {processing && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {processing ? "Processing…" : "Process Files"}
          </button>

          {processing && <StepList currentStep={step} />}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-1">
          <p className="font-semibold">Import failed</p>
          <p className="font-mono text-xs break-all">{error}</p>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-green-800">Import complete!</p>
              <p className="mt-1 text-sm text-green-700">
                {result.contactsImported} contact{result.contactsImported !== 1 ? "s" : ""}
                {" · "}
                {result.hiredFound} hire{result.hiredFound !== 1 ? "s" : ""}
                {" · "}
                {result.adsMatched} ad{result.adsMatched !== 1 ? "s" : ""} matched
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
          >
            View Dashboard
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
