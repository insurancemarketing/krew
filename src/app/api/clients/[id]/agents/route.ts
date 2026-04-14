export const dynamic = "force-dynamic";
/**
 * GET  /api/clients/[id]/agents  — list agent tracking records
 * POST /api/clients/[id]/agents  — create agent record
 * PUT  /api/clients/[id]/agents  — update agent record (pass id in body)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("agent_tracking")
      .select("*")
      .eq("client_id", params.id)
      .order("hire_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ agents: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = createAdminClient();
    const { data, error } = await db
      .from("agent_tracking")
      .insert({
        client_id: params.id,
        contact_id: body.contact_id ?? null,
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
        email: body.email ?? null,
        utm_content: body.utm_content ?? null,
        hire_date: body.hire_date ?? null,
        status: body.status ?? "active",
        churned_date: body.churned_date ?? null,
        policies_sold_30d: parseInt(body.policies_sold_30d ?? "0", 10) || 0,
        policies_sold_60d: parseInt(body.policies_sold_60d ?? "0", 10) || 0,
        policies_sold_90d: parseInt(body.policies_sold_90d ?? "0", 10) || 0,
        premium_30d: parseFloat(body.premium_30d ?? "0") || 0,
        premium_60d: parseFloat(body.premium_60d ?? "0") || 0,
        premium_90d: parseFloat(body.premium_90d ?? "0") || 0,
        notes: body.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ agent: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    const strFields = ["first_name", "last_name", "email", "utm_content", "status", "notes", "churned_date", "hire_date"];
    const numFields = ["policies_sold_30d", "policies_sold_60d", "policies_sold_90d"];
    const fltFields = ["premium_30d", "premium_60d", "premium_90d"];
    strFields.forEach((f) => { if (body[f] !== undefined) updates[f] = body[f]; });
    numFields.forEach((f) => { if (body[f] !== undefined) updates[f] = parseInt(body[f], 10) || 0; });
    fltFields.forEach((f) => { if (body[f] !== undefined) updates[f] = parseFloat(body[f]) || 0; });

    const { data, error } = await db
      .from("agent_tracking")
      .update(updates)
      .eq("id", body.id)
      .eq("client_id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ agent: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
