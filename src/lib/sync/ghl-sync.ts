/**
 * GHL → Supabase sync logic.
 * Pulls all contacts from GHL, reads attribution custom fields,
 * upserts into the contacts table, and marks hired_at when the
 * "hired" tag is present.
 */

import { createServerClient } from "@/lib/supabase/server";
import {
  getAllContacts,
  getContact,
  extractAttributionFields,
  type GHLContact,
} from "@/lib/ghl/client";

const HIRED_TAG = "hired";

export interface GHLSyncResult {
  upserted: number;
  hired: number;
  errors: string[];
}

export async function syncGHLContacts(
  apiKey?: string,
  locationId?: string
): Promise<GHLSyncResult> {
  const supabase = createServerClient();
  const errors: string[] = [];
  let upserted = 0;
  let hired = 0;

  // 1. Fetch all contacts from GHL
  let contacts: GHLContact[];
  try {
    contacts = await getAllContacts(locationId, apiKey);
  } catch (err) {
    return {
      upserted: 0,
      hired: 0,
      errors: [`Failed to fetch GHL contacts: ${String(err)}`],
    };
  }

  // 2. For each contact, resolve attribution fields and upsert
  for (const contact of contacts) {
    try {
      // Fetch full contact details to get custom fields
      let fullContact = contact;
      if (!contact.customField || contact.customField.length === 0) {
        try {
          fullContact = await getContact(contact.id, apiKey);
        } catch {
          // continue with partial data
        }
      }

      const attr = extractAttributionFields(fullContact);
      const isHired = (fullContact.tags ?? []).includes(HIRED_TAG);
      const fullName = [fullContact.firstName, fullContact.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null;

      // Look up the ads row by fb_ad_id text value to get our internal UUID
      let adUuid: string | null = null;
      if (attr.fb_ad_id) {
        const { data: adRow } = await supabase
          .from("ads")
          .select("id")
          .eq("fb_ad_id", attr.fb_ad_id)
          .maybeSingle();
        adUuid = adRow?.id ?? null;
      }

      // Determine hired_at: if already has hired_at keep it; if newly hired set now
      let hiredAt: string | null = null;
      if (isHired) {
        // Check existing
        const { data: existing } = await supabase
          .from("contacts")
          .select("hired_at")
          .eq("ghl_contact_id", contact.id)
          .maybeSingle();
        hiredAt = existing?.hired_at ?? new Date().toISOString();
        hired++;
      }

      const { error } = await supabase.from("contacts").upsert(
        {
          ghl_contact_id: contact.id,
          name: fullName,
          email: fullContact.email ?? null,
          phone: fullContact.phone ?? null,
          utm_source: attr.utm_source ?? null,
          utm_medium: attr.utm_medium ?? null,
          utm_campaign: attr.utm_campaign ?? null,
          utm_content: attr.utm_content ?? null,
          fb_click_id: attr.fb_click_id ?? null,
          fb_ad_id: adUuid,
          tags: fullContact.tags ?? [],
          hired_at: hiredAt,
        },
        { onConflict: "ghl_contact_id" }
      );

      if (error) {
        errors.push(`Upsert contact ${contact.id}: ${error.message}`);
      } else {
        upserted++;
      }
    } catch (err) {
      errors.push(`Contact ${contact.id}: ${String(err)}`);
    }
  }

  return { upserted, hired, errors };
}

/**
 * Handle a real-time GHL webhook event for contact.tag_added.
 * Sets hired_at on the contact when the "hired" tag is added.
 */
export async function handleTagAddedWebhook(payload: {
  contactId: string;
  tag: string;
  locationId: string;
}): Promise<void> {
  const supabase = createServerClient();

  // Upsert a pipeline event
  const { data: contactRow } = await supabase
    .from("contacts")
    .select("id, hired_at")
    .eq("ghl_contact_id", payload.contactId)
    .maybeSingle();

  if (!contactRow) return;

  // Record the tag addition
  await supabase.from("pipeline_events").insert({
    contact_id: contactRow.id,
    tag_added: payload.tag,
  });

  // Mark hired if the hired tag was added
  if (payload.tag.toLowerCase() === HIRED_TAG && !contactRow.hired_at) {
    await supabase
      .from("contacts")
      .update({ hired_at: new Date().toISOString() })
      .eq("id", contactRow.id);
  }
}
