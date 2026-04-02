import { NextRequest, NextResponse } from "next/server";
import { testGhlConnection } from "@/lib/ghl";

export async function POST(request: NextRequest) {
  try {
    const { ghl_api_key, ghl_location_id } = await request.json();
    if (!ghl_api_key || !ghl_location_id) {
      return NextResponse.json({ error: "ghl_api_key and ghl_location_id required" }, { status: 400 });
    }
    const result = await testGhlConnection(ghl_api_key.trim(), ghl_location_id.trim());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
