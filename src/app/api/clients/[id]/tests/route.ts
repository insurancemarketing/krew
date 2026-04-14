export const dynamic = "force-dynamic";
/**
 * GET    /api/clients/[id]/tests  — list split tests
 * POST   /api/clients/[id]/tests  — create test
 * PUT    /api/clients/[id]/tests  — update test (pass id in body)
 * DELETE /api/clients/[id]/tests?id=  — delete test
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
      .from("split_tests")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ tests: data ?? [] });
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
      .from("split_tests")
      .insert({
        client_id: params.id,
        test_name: body.test_name ?? "",
        element_tested: body.element_tested ?? null,
        control_rate: body.control_rate != null ? parseFloat(body.control_rate) : null,
        variation_rate: body.variation_rate != null ? parseFloat(body.variation_rate) : null,
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
        winner: body.winner ?? null,
        implemented: body.implemented ?? false,
        notes: body.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ test: data }, { status: 201 });
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
    if (body.test_name !== undefined) updates.test_name = body.test_name;
    if (body.element_tested !== undefined) updates.element_tested = body.element_tested;
    if (body.control_rate !== undefined) updates.control_rate = parseFloat(body.control_rate);
    if (body.variation_rate !== undefined) updates.variation_rate = parseFloat(body.variation_rate);
    if (body.start_date !== undefined) updates.start_date = body.start_date;
    if (body.end_date !== undefined) updates.end_date = body.end_date;
    if (body.winner !== undefined) updates.winner = body.winner;
    if (body.implemented !== undefined) updates.implemented = body.implemented;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await db
      .from("split_tests")
      .update(updates)
      .eq("id", body.id)
      .eq("client_id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ test: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const db = createAdminClient();
    const { error } = await db
      .from("split_tests")
      .delete()
      .eq("id", id)
      .eq("client_id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
