/**
 * GET /api/clients/[id]/contacts — paginated, filterable contact list
 * Query params: page, perPage, utm_content, is_hired, stage, search, date_from, date_to
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const sp = request.nextUrl.searchParams;
    const page = parseInt(sp.get("page") ?? "1", 10);
    const perPage = Math.min(parseInt(sp.get("perPage") ?? "50", 10), 200);
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = db
      .from("krew_contacts")
      .select(
        "id, ghl_contact_id, first_name, last_name, email, phone, utm_content, utm_campaign, tags, is_hired, hired_at, watch_pct, created_at",
        { count: "exact" }
      )
      .eq("client_id", params.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    const utmFilter = sp.get("utm_content");
    if (utmFilter === "(No UTM)") {
      query = query.is("utm_content", null);
    } else if (utmFilter) {
      query = query.eq("utm_content", utmFilter);
    }

    const isHiredFilter = sp.get("is_hired");
    if (isHiredFilter === "true") query = query.eq("is_hired", true);
    else if (isHiredFilter === "false") query = query.eq("is_hired", false);

    const search = sp.get("search");
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const dateFrom = sp.get("date_from");
    if (dateFrom) query = query.gte("created_at", dateFrom);
    const dateTo = sp.get("date_to");
    if (dateTo) query = query.lte("created_at", dateTo);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({ contacts: data ?? [], total: count ?? 0, page, perPage });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
