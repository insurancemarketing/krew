"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// CSV preview parser (client-side only, for display)
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

function parseCSVPreview(
  text: string
): { headers: string[]; rows: string[][] } {
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
      {/* Zone */}
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
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
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
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-green-700">
              {file.name}
            </p>
            <p className="text-xs text-green-600">
              {(file.size / 1024).toFixed(1)} KB — click to replace
            </p>
          </>
        ) : (
          <>
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-500">
              Drag &amp; drop or click to upload
            </p>
          </>
        )}
      </div>

      {/* Column hint */}
      <p className="text-xs text-gray-500 leading-relaxed">{hint}</p>

      {/* Preview table */}
      {preview && preview.headers.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {preview.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-gray-50">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-1.5 text-gray-600 whitespace-nowrap max-w-[160px] truncate"
                        title={cell}
                      >
                        {cell || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
            Showing first {preview.rows.length} row
            {preview.rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
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
  const [ghlPreview, setGhlPreview] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);
  const [fbPreview, setFbPreview] = useState<{
    headers: string[];
    rows: string[][];
  } | null>(null);

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

  // Small yield so React re-renders the step label before the next sync op
  const tick = () => new Promise<void>((r) => setTimeout(r, 60));

  const handleProcess = async () => {
    if (!ghlContent || !fbContent) return;
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Step 1 — parse GHL CSV client-side for logging
      setStep("Parsing GHL CSV…");
      await tick();
      const ghlLines = ghlContent.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
      console.log("[import] GHL CSV — lines:", ghlLines.length, "| headers:", ghlLines[0]);

      // Step 2 — parse FB CSV client-side for logging
      setStep("Parsing Facebook Ads CSV…");
      await tick();
      const fbLines = fbContent.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
      console.log("[import] FB CSV — lines:", fbLines.length, "| headers:", fbLines[0]);

      // Step 3 — send to server (matching + upsert)
      setStep("Matching ads to contacts…");
      await tick();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error("[import] Fetch aborted after 10s timeout");
        controller.abort();
      }, 10_000);

      let res: Response;
      try {
        res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ghlCsv: ghlContent, fbCsv: fbContent }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new Error(
            "Processing timed out after 10 seconds. The server took too long — check server logs for details."
          );
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      console.log("[import] Server responded — status:", res.status);

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("[import] Failed to parse server JSON:", jsonErr);
        throw new Error(`Server returned non-JSON response (status ${res.status})`);
      }

      if (!res.ok) {
        const msg = (data.error as string) ?? `Server error ${res.status}`;
        console.error("[import] Server error response:", data);
        throw new Error(msg);
      }

      console.log("[import] Done:", data);
      setResult(data as ImportResult);
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
          Upload your GHL contacts and Facebook Ads CSV exports to populate the
          dashboard.
        </p>
      </div>

      {/* Upload zones */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            GHL Contacts CSV
          </h2>
          <DropZone
            label="GHL Contacts CSV"
            hint="Expected columns: Contact Name, Email, Tags, utm_source, utm_medium, utm_campaign, utm_content, Date Created"
            file={ghlFile}
            onFile={handleGhlFile}
            preview={ghlPreview}
          />
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Facebook Ads CSV
          </h2>
          <DropZone
            label="Facebook Ads CSV"
            hint="Expected columns: Ad name, Amount spent, Impressions, Clicks (all)"
            file={fbFile}
            onFile={handleFbFile}
            preview={fbPreview}
          />
        </div>
      </div>

      {/* Process button — appears only when both files are loaded */}
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

          {/* Step indicators */}
          {processing && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-2.5">
              {[
                "Parsing GHL CSV…",
                "Parsing Facebook Ads CSV…",
                "Matching ads to contacts…",
              ].map((label) => {
                const steps = [
                  "Parsing GHL CSV…",
                  "Parsing Facebook Ads CSV…",
                  "Matching ads to contacts…",
                ];
                const currentIdx = steps.indexOf(step ?? "");
                const thisIdx = steps.indexOf(label);
                const isDone = thisIdx < currentIdx;
                const isActive = thisIdx === currentIdx;
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
          )}
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
            <svg
              className="h-5 w-5 text-green-600 mt-0.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-semibold text-green-800">Import complete!</p>
              <p className="mt-1 text-sm text-green-700">
                {result.contactsImported} contact
                {result.contactsImported !== 1 ? "s" : ""} imported
                {" · "}
                {result.adsMatched} ad
                {result.adsMatched !== 1 ? "s" : ""} matched
                {" · "}
                {result.hiredFound} hired client
                {result.hiredFound !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
          >
            View Dashboard
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
