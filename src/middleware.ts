import { NextResponse } from "next/server";

/**
 * Auth middleware disabled — dashboard is open.
 * To re-enable, restore the cookie check against AUTH_SECRET.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
