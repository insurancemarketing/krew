/**
 * POST /api/cron/sync-all-clients — sync all clients
 * Protected by CRON_SECRET header.
 * Set up as a Vercel Cron Job: every 6 hours
 *   vercel.json crons: path=/api/cron/sync-all-clients  schedule="0 * /6 * * *" (every 6h)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encrypt";
import { fetchAllContacts, contactIsHired } from "@/lib/ghl";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: clients } = await db
    .from("krew_clients")
    .select("id, name, ghl_api_key, ghl_location_id, hired_tag");

  if (!clients?.length) {
    return NextResponse.json({ ok: true, message: "No clients to sync" });
  }

  const results: Array<{ clientId: string; name: string; status: string; contactsUpserted?: number; error?: string }> = [];

  for (const client of clients) {
    try {
      console.log(`[cron] Syncing client: ${client.name}`);
      await db
        .from("krew_clients")
        .update({ sync_status: "syncing", sync_error: null })
        .eq("id", client.id);

      const apiKey = decrypt(client.ghl_api_key as string);
      const contacts = await fetchAllContacts(apiKey, client.ghl_location_id as string);
      const hiredTag = (client.hired_tag as string) || "recruitment - hire made";

      const rows = contacts.map((c) => ({
        client_id: client.id,
        ghl_contact_id: c.id,
        first_name: c.firstName ?? null,
        last_name: c.lastName ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        utm_content: c.utm_content ?? null,
        utm_campaign: c.utm_campaign ?? null,
        utm_source: c.utm_source ?? null,
        utm_medium: c.utm_medium ?? null,
        fbclid: c.fbclid ?? null,
        tags: c.tags.join(", ") ?? null,
        is_hired: contactIsHired(c.tags, hiredTag),
        hired_at: contactIsHired(c.tags, hiredTag) ? c.dateAdded : null,
        watch_pct: c.watch_pct,
        created_at: c.dateAdded,
        last_synced: new Date().toISOString(),
      }));

      for (let i = 0; i < rows.length; i += 500) {
        await db
          .from("krew_contacts")
          .upsert(rows.slice(i, i + 500), { onConflict: "client_id,ghl_contact_id" });
      }

      const now = new Date().toISOString();
      await db
        .from("krew_clients")
        .update({ sync_status: "ok", last_synced: now, sync_error: null })
        .eq("id", client.id);

      results.push({ clientId: client.id, name: client.name as string, status: "ok", contactsUpserted: rows.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .from("krew_clients")
        .update({ sync_status: "error", sync_error: msg })
        .eq("id", client.id);
      results.push({ clientId: client.id, name: client.name as string, status: "error", error: msg });
    }
  }

  return NextResponse.json({ ok: true, results });
}
