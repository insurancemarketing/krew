export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: { id: string } };

function calcFields(body: Record<string, number>) {
  const {
    ad_spend = 0,
    leads = 0,
    appointments_set = 0,
    appointments_showed = 0,
    policies_sold = 0,
    premium_written = 0,
    active_policies = 0,
    policies_cancelled = 0,
  } = body;

  return {
    cost_per_lead: leads > 0 ? ad_spend / leads : null,
    cost_per_appointment: appointments_showed > 0 ? ad_spend / appointments_showed : null,
    cost_per_policy: policies_sold > 0 ? ad_spend / policies_sold : null,
    show_rate: appointments_set > 0 ? appointments_showed / appointments_set : null,
    close_rate: appointments_showed > 0 ? policies_sold / appointments_showed : null,
    persistency_rate:
      active_policies > 0
        ? (active_policies - policies_cancelled) / active_policies
        : null,
    roas: ad_spend > 0 ? premium_written / ad_spend : null,
  };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  let query = supabase
    .from("monthly_performance")
    .select("*")
    .eq("client_id", params.id)
    .order("month", { ascending: false });

  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ performance: data });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const calculated = calcFields(body);

  const { data, error } = await supabase
    .from("monthly_performance")
    .upsert(
      {
        ...body,
        ...calculated,
        client_id: params.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ performance: data });
}
