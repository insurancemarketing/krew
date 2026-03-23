import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Minimal CSV parser
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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseAmount(val: string): number {
  return parseFloat(val.replace(/[$,\s]/g, "")) || 0;
}

// ---------------------------------------------------------------------------
// POST /api/import
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let body: { ghlCsv: string; fbCsv: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ghlCsv, fbCsv } = body;
  if (!ghlCsv || !fbCsv) {
    return NextResponse.json(
      { error: "Both CSV files are required" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any;
  const today = new Date().toISOString().split("T")[0];

  // -------------------------------------------------------------------------
  // 1. Facebook Ads CSV → ads + ad_spend
  // -------------------------------------------------------------------------
  const fbRows = parseCSV(fbCsv);
  // Map lowercase ad name → internal UUID for contact matching
  const adNameToId = new Map<string, string>();

  for (const row of fbRows) {
    const adName =
      row["Ad name"] ?? row["Ad Name"] ?? row["ad name"] ?? "";
    if (!adName.trim()) continue;

    const fbAdId = slugify(adName);
    const spend = parseAmount(
      row["Amount spent"] ?? row["Amount Spent"] ?? "0"
    );
    const impressions =
      parseInt(row["Impressions"] ?? "0", 10) || 0;
    const clicks =
      parseInt(
        row["Clicks (all)"] ?? row["Clicks"] ?? row["clicks"] ?? "0",
        10
      ) || 0;

    // Upsert ad row
    await supabase
      .from("ads")
      .upsert(
        { fb_ad_id: fbAdId, name: adName.trim(), status: "ACTIVE" },
        { onConflict: "fb_ad_id" }
      );

    // Fetch the UUID we just upserted
    const { data: adRow } = await supabase
      .from("ads")
      .select("id")
      .eq("fb_ad_id", fbAdId)
      .single();

    if (adRow?.id) {
      adNameToId.set(adName.trim().toLowerCase(), adRow.id);

      // Upsert aggregate spend keyed by fb_ad_id + today
      await supabase.from("ad_spend").upsert(
        {
          fb_ad_id: fbAdId,
          ad_id: adRow.id,
          date: today,
          spend,
          impressions,
          clicks,
        },
        { onConflict: "fb_ad_id,date" }
      );
    }
  }

  // -------------------------------------------------------------------------
  // 2. GHL Contacts CSV → contacts
  // -------------------------------------------------------------------------
  const ghlRows = parseCSV(ghlCsv);
  let contactsImported = 0;
  let adsMatched = 0;
  let hiredFound = 0;

  for (const row of ghlRows) {
    const name =
      (row["Contact Name"] ?? row["Name"] ?? row["name"] ?? "").trim() ||
      null;
    const email =
      (row["Email"] ?? row["email"] ?? "").trim().toLowerCase() || null;

    if (!name && !email) continue;

    // Parse tags
    const rawTags = row["Tags"] ?? row["tags"] ?? "";
    const tags = rawTags
      ? rawTags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
    const isHired = tags.some(
      (t: string) => t.toLowerCase() === "hired"
    );

    // Attribution fields
    const utmSource = row["utm_source"] || null;
    const utmMedium = row["utm_medium"] || null;
    const utmCampaign = row["utm_campaign"] || null;
    const utmContent = row["utm_content"] || null;

    // Match to ad by utm_campaign = ad name
    let adUuid: string | null = null;
    if (utmCampaign) {
      adUuid = adNameToId.get(utmCampaign.trim().toLowerCase()) ?? null;
      if (adUuid) adsMatched++;
    }

    // hired_at: use Date Created if available, else now
    let hiredAt: string | null = null;
    if (isHired) {
      const rawDate =
        row["Date Created"] ?? row["date_created"] ?? "";
      hiredAt = rawDate
        ? new Date(rawDate).toISOString()
        : new Date().toISOString();
      hiredFound++;
    }

    // created_at from CSV date if available
    const rawCreated =
      row["Date Created"] ?? row["date_created"] ?? "";
    const createdAt = rawCreated
      ? new Date(rawCreated).toISOString()
      : new Date().toISOString();

    // Stable ghl_contact_id: prefer email-based, fall back to name
    const ghlContactId = email
      ? `csv-${email.replace(/[^a-z0-9@._-]/g, "-")}`
      : `csv-${slugify(name ?? "unknown")}`;

    const { error } = await supabase.from("contacts").upsert(
      {
        ghl_contact_id: ghlContactId,
        name,
        email,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        fb_ad_id: adUuid,
        tags,
        hired_at: hiredAt,
        created_at: createdAt,
      },
      { onConflict: "ghl_contact_id" }
    );

    if (!error) contactsImported++;
  }

  return NextResponse.json({ contactsImported, adsMatched, hiredFound });
}
