export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getAuthSecret } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  const secret = getAuthSecret();

  if (!password || password !== secret) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    res.cookies.set(AUTH_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
