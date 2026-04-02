/**
 * Auth helpers for the single-user internal dashboard.
 * Uses a simple cookie token compared against AUTH_SECRET env var.
 */
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const AUTH_COOKIE = "krew_auth";

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET ?? "changeme";
}

/** Server-side: check if the current request is authenticated */
export function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  return !!token && token === getAuthSecret();
}

/** Server component: read auth from cookie store */
export async function checkAuth(): Promise<boolean> {
  try {
    const store = cookies();
    const token = (store as any).get(AUTH_COOKIE)?.value;
    return !!token && token === getAuthSecret();
  } catch {
    return false;
  }
}
