/**
 * GET  /api/clients/[id]/spend — list spend entries
 * POST /api/clients/[id]/spend — add a spend entry
 * DELETE /api/clients/[id]/spend?spendId=xxx — delete a spend entry
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_ad_spend")
      .select("id, utm_content, ad_name, spend, week_starting, created_at")
      .eq("client_id", params.id)
      .order("week_starting", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ spend: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { utm_content, ad_name, spend, week_starting } = await request.json();

    if (!utm_content || !spend || !week_starting) {
      return NextResponse.json(
        { error: "utm_content, spend, and week_starting are required" },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("krew_ad_spend")
      .upsert(
        {
          client_id: params.id,
          utm_content: utm_content.trim(),
          ad_name: ad_name?.trim() ?? null,
          spend: parseFloat(spend) || 0,
          week_starting,
        },
        { onConflict: "client_id,utm_content,week_starting" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const spendId = request.nextUrl.searchParams.get("spendId");
    if (!spendId) return NextResponse.json({ error: "spendId required" }, { status: 400 });

    const db = createAdminClient();
    const { error } = await db
      .from("krew_ad_spend")
      .delete()
      .eq("id", spendId)
      .eq("client_id", params.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
