/**
 * GHL (GoHighLevel) API v2 client — server-side only.
 * Never import this in client components.
 *
 * Rate limit: 100 req / 10 sec → we use a 150ms delay between paginated requests.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

// Custom field keys we care about (GHL returns them as fieldKey or key)
const CUSTOM_FIELD_MAP: Record<string, string> = {
  utm_content: "utm_content",
  utm_campaign: "utm_campaign",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  fbclid: "fbclid",
  "% webinar watched": "watch_pct",
  "webinar watched": "watch_pct",
  "% watched": "watch_pct",
};

export interface GhlContact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  dateAdded: string;
  lastActivity: string | null;
  utm_content: string | null;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  fbclid: string | null;
  watch_pct: number | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractCustomFields(
  rawContact: Record<string, unknown>
): Record<string, string | null> {
  const result: Record<string, string | null> = {
    utm_content: null,
    utm_campaign: null,
    utm_source: null,
    utm_medium: null,
    fbclid: null,
    watch_pct: null,
  };

  // GHL v2 returns customFields as an array
  const fields = (rawContact.customFields ?? rawContact.customField ?? []) as Array<
    Record<string, unknown>
  >;

  for (const field of fields) {
    // Try both 'key' and 'fieldKey' — different GHL versions use different prop names
    const rawKey = (
      (field.key as string) ??
      (field.fieldKey as string) ??
      ""
    )
      .toLowerCase()
      .trim();
    const value = (field.value as string) ?? null;

    const mapped = CUSTOM_FIELD_MAP[rawKey];
    if (mapped && value !== null && value !== undefined && value !== "") {
      result[mapped] = String(value).trim();
    }
  }

  return result;
}

function normalizeTag(tag: string): string {
  return tag.replace(/[^\x20-\x7E]/g, "").toLowerCase().trim();
}

/** Check whether the tags array contains the hired tag (emoji-safe) */
export function contactIsHired(tags: string[], hiredTag: string): boolean {
  const needle = normalizeTag(hiredTag);
  if (!needle) return false;
  return tags.some((t) => normalizeTag(t).includes(needle));
}

/** Fetch a single page of contacts from GHL */
async function fetchContactsPage(
  apiKey: string,
  locationId: string,
  startAfter?: string | null,
  startAfterId?: string | null
): Promise<{ contacts: GhlContact[]; nextStartAfter: string | null; nextStartAfterId: string | null; total: number }> {
  const params = new URLSearchParams({
    locationId,
    limit: "100",
  });
  if (startAfter) params.set("startAfter", startAfter);
  if (startAfterId) params.set("startAfterId", startAfterId);

  const url = `${GHL_BASE}/contacts/?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: GHL_VERSION,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GHL API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    contacts?: unknown[];
    meta?: {
      total?: number;
      nextPageUrl?: string | null;
      startAfter?: string | null;
      startAfterId?: string | null;
    };
  };

  const rawContacts = (data.contacts ?? []) as Array<Record<string, unknown>>;
  const meta = data.meta ?? {};

  const contacts: GhlContact[] = rawContacts.map((raw) => {
    const customFields = extractCustomFields(raw);
    const tags = Array.isArray(raw.tags)
      ? (raw.tags as string[])
      : typeof raw.tags === "string"
      ? (raw.tags as string).split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const watchPctRaw = customFields.watch_pct;
    const watchPct = watchPctRaw !== null ? parseFloat(watchPctRaw) || null : null;

    return {
      id: (raw.id as string) ?? "",
      firstName: (raw.firstName as string) ?? null,
      lastName: (raw.lastName as string) ?? null,
      email: (raw.email as string) ?? null,
      phone: (raw.phone as string) ?? null,
      tags,
      dateAdded: (raw.dateAdded as string) ?? new Date().toISOString(),
      lastActivity: (raw.lastActivityAt as string) ?? (raw.lastActivity as string) ?? null,
      utm_content: customFields.utm_content || null,
      utm_campaign: customFields.utm_campaign || null,
      utm_source: customFields.utm_source || null,
      utm_medium: customFields.utm_medium || null,
      fbclid: customFields.fbclid || null,
      watch_pct: watchPct,
    };
  });

  return {
    contacts,
    nextStartAfter: (meta.startAfter as string) ?? null,
    nextStartAfterId: (meta.startAfterId as string) ?? null,
    total: (meta.total as number) ?? contacts.length,
  };
}

/** Fetch ALL contacts for a location, handling pagination + rate limiting */
export async function fetchAllContacts(
  apiKey: string,
  locationId: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<GhlContact[]> {
  const all: GhlContact[] = [];
  let startAfter: string | null = null;
  let startAfterId: string | null = null;
  let page = 0;

  while (true) {
    const { contacts, nextStartAfter, nextStartAfterId, total } =
      await fetchContactsPage(apiKey, locationId, startAfter, startAfterId);

    all.push(...contacts);
    page++;

    if (onProgress) onProgress(all.length, total);
    console.log(`[ghl] Page ${page}: fetched ${all.length}/${total} contacts`);

    // Stop if we got fewer than 100 (last page) or no next cursor
    if (contacts.length < 100 || (!nextStartAfter && !nextStartAfterId)) break;

    startAfter = nextStartAfter;
    startAfterId = nextStartAfterId;

    // Rate limit: 100 req / 10 sec → space out by 150ms to stay safe
    await delay(150);
  }

  return all;
}

/** Verify GHL credentials — returns total contacts or throws */
export async function testGhlConnection(
  apiKey: string,
  locationId: string
): Promise<{ ok: boolean; contactCount: number; error?: string }> {
  try {
    const params = new URLSearchParams({ locationId, limit: "1" });
    const res = await fetch(`${GHL_BASE}/contacts/?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: GHL_VERSION,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, contactCount: 0, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as { meta?: { total?: number } };
    return { ok: true, contactCount: data.meta?.total ?? 0 };
  } catch (err) {
    return { ok: false, contactCount: 0, error: String(err) };
  }
}
