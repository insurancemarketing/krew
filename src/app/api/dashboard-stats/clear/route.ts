export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;
    // Delete in dependency order (contacts → ads/ad_spend)
    await supabase.from("ad_spend").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("contacts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("ads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    console.log("[clear] All import data deleted from Supabase");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[clear] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
