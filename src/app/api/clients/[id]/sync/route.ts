/**
 * POST /api/clients/[id]/sync — pull all contacts from GHL and upsert into DB
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encrypt";
import { fetchAllContacts, contactIsHired } from "@/lib/ghl";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = createAdminClient();
  const clientId = params.id;

  // Mark sync as in-progress
  await db
    .from("krew_clients")
    .update({ sync_status: "syncing", sync_error: null })
    .eq("id", clientId);

  try {
    // Fetch client record (need encrypted api key)
    const { data: client, error: clientErr } = await db
      .from("krew_clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const apiKey = decrypt(client.ghl_api_key as string);
    if (!apiKey) {
      throw new Error("Failed to decrypt GHL API key — check ENCRYPTION_SECRET");
    }

    // Fetch all contacts from GHL
    const ghlContacts = await fetchAllContacts(apiKey, client.ghl_location_id as string);
    console.log(`[sync] Client ${clientId}: fetched ${ghlContacts.length} contacts from GHL`);

    // Upsert in batches of 500
    const hiredTag = (client.hired_tag as string) || "recruitment - hire made";
    let upserted = 0;

    const rows = ghlContacts.map((c) => {
      const hired = contactIsHired(c.tags, hiredTag);
      return {
        client_id: clientId,
        ghl_contact_id: c.id,
        first_name: c.firstName || null,
        last_name: c.lastName || null,
        email: c.email || null,
        phone: c.phone || null,
        utm_content: c.utm_content || null,
        utm_campaign: c.utm_campaign || null,
        utm_source: c.utm_source || null,
        utm_medium: c.utm_medium || null,
        fbclid: c.fbclid || null,
        tags: c.tags.join(", ") || null,
        is_hired: hired,
        hired_at: hired ? (c.dateAdded || new Date().toISOString()) : null,
        watch_pct: c.watch_pct,
        created_at: c.dateAdded || new Date().toISOString(),
        last_synced: new Date().toISOString(),
      };
    });

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error: upsertErr } = await db
        .from("krew_contacts")
        .upsert(chunk, { onConflict: "client_id,ghl_contact_id" });

      if (upsertErr) {
        console.error(`[sync] Upsert chunk error:`, upsertErr.message);
        throw upsertErr;
      }
      upserted += chunk.length;
      console.log(`[sync] Upserted ${upserted}/${rows.length}`);
    }

    // Mark sync complete
    const now = new Date().toISOString();
    await db
      .from("krew_clients")
      .update({ sync_status: "ok", last_synced: now, sync_error: null })
      .eq("id", clientId);

    return NextResponse.json({
      ok: true,
      contactsUpserted: upserted,
      lastSynced: now,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync] Error for client ${clientId}:`, msg);

    await db
      .from("krew_clients")
      .update({ sync_status: "error", sync_error: msg })
      .eq("id", clientId);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
