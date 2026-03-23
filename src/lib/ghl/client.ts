/**
 * GoHighLevel REST API client (v1 + v2).
 * All methods run server-side only. The API key is never sent to the browser.
 */

const GHL_BASE_URL = "https://rest.gohighlevel.com/v1";
const GHL_V2_BASE_URL = "https://services.leadconnectorhq.com";

function getHeaders(apiKey?: string): HeadersInit {
  const key = apiKey ?? process.env.GHL_API_KEY ?? "";
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };
}

export interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  customField?: Array<{ id: string; field_value: string }>;
  source?: string;
  dateAdded?: string;
}

export interface GHLContactsResponse {
  contacts: GHLContact[];
  meta?: {
    total: number;
    nextPageUrl?: string;
  };
}

export interface GHLCustomFieldMap {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  fb_click_id?: string;
  fb_ad_id?: string;
}

/** Fetch all contacts, optionally filtered by tag */
export async function getContacts(
  locationId?: string,
  tag?: string,
  apiKey?: string,
  startAfter?: string
): Promise<GHLContact[]> {
  const locId = locationId ?? process.env.GHL_LOCATION_ID ?? "";
  const params = new URLSearchParams({ locationId: locId, limit: "100" });
  if (tag) params.set("tag", tag);
  if (startAfter) params.set("startAfter", startAfter);

  const res = await fetch(`${GHL_BASE_URL}/contacts/?${params}`, {
    headers: getHeaders(apiKey),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL /contacts/ failed (${res.status}): ${body}`);
  }

  const data: GHLContactsResponse = await res.json();
  return data.contacts ?? [];
}

/** Fetch a single contact by ID to read custom attribution fields */
export async function getContact(
  contactId: string,
  apiKey?: string
): Promise<GHLContact> {
  const res = await fetch(`${GHL_BASE_URL}/contacts/${contactId}`, {
    headers: getHeaders(apiKey),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL /contacts/${contactId} failed (${res.status}): ${body}`);
  }

  const data: { contact: GHLContact } = await res.json();
  return data.contact;
}

/** Fetch all contacts with pagination, up to maxPages */
export async function getAllContacts(
  locationId?: string,
  apiKey?: string,
  maxPages = 20
): Promise<GHLContact[]> {
  const all: GHLContact[] = [];
  let startAfter: string | undefined;
  let page = 0;

  while (page < maxPages) {
    const batch = await getContacts(locationId, undefined, apiKey, startAfter);
    all.push(...batch);
    if (batch.length < 100) break;
    startAfter = batch[batch.length - 1].id;
    page++;
  }

  return all;
}

/**
 * Extract UTM / attribution custom fields from a GHL contact.
 * GHL stores custom fields as an array of { id, field_value }.
 * The field names vary per account; we try to match by common patterns.
 */
export function extractAttributionFields(contact: GHLContact): GHLCustomFieldMap {
  const fields: GHLCustomFieldMap = {};

  for (const cf of contact.customField ?? []) {
    const id = cf.id.toLowerCase();
    const val = cf.field_value;
    if (id.includes("utm_source") || id === "utm_source") fields.utm_source = val;
    else if (id.includes("utm_medium") || id === "utm_medium") fields.utm_medium = val;
    else if (id.includes("utm_campaign") || id === "utm_campaign") fields.utm_campaign = val;
    else if (id.includes("utm_content") || id === "utm_content") fields.utm_content = val;
    else if (id.includes("fb_click") || id.includes("fbclid")) fields.fb_click_id = val;
    else if (id.includes("fb_ad_id") || id.includes("fbadid")) fields.fb_ad_id = val;
  }

  return fields;
}
