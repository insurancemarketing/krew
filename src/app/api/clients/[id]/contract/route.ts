export const dynamic = "force-dynamic";
/**
 * GET  /api/clients/[id]/contract  — get contract for client
 * POST /api/clients/[id]/contract  — create or update contract
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
      .from("client_contracts")
      .select("*")
      .eq("client_id", params.id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ contract: data ?? null });
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

    const payload: Record<string, unknown> = {
      client_id: params.id,
      client_type: body.client_type ?? "insurance_recruiting",
      monthly_retainer: parseFloat(body.monthly_retainer ?? "0") || 0,
      performance_fee_type: body.performance_fee_type ?? "per_hire",
      performance_fee_amount: parseFloat(body.performance_fee_amount ?? "0") || 0,
      contract_start: body.contract_start || null,
      contract_renewal: body.contract_renewal || null,
      ad_budget_monthly: parseFloat(body.ad_budget_monthly ?? "0") || 0,
      hours_per_month_estimate: parseFloat(body.hours_per_month_estimate ?? "0") || 0,
      target_hourly_rate: parseFloat(body.target_hourly_rate ?? "150") || 150,
      cac: parseFloat(body.cac ?? "0") || 0,
      status: body.status ?? "active",
      notes: body.notes ?? null,
    };

    const { data, error } = await db
      .from("client_contracts")
      .upsert(payload, { onConflict: "client_id" })
      .select("*")
      .single();

    if (error) throw error;

    // Also update client_type on krew_clients
    await db
      .from("krew_clients")
      .update({ client_type: payload.client_type })
      .eq("id", params.id);

    return NextResponse.json({ contract: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
