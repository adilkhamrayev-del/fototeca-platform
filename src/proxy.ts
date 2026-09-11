import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionRole, isPathAllowedForRole, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getClientPhoneFromSession, CLIENT_SESSION_COOKIE_NAME } from "@/lib/auth/client-session";

// Gate everything under /admin except the login page itself, and further
// restrict a "production" role session to the production board only.
// Also gates /account (the customer's personal cabinet) behind its own,
// separate phone-based session — unrelated to the admin session above.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/account")) {
    if (pathname === "/account/login") return NextResponse.next();
    const clientToken = request.cookies.get(CLIENT_SESSION_COOKIE_NAME)?.value;
    if (!getClientPhoneFromSession(clientToken)) {
      return NextResponse.redirect(new URL("/account/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const role = getSessionRole(token);
  if (!role) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!isPathAllowedForRole(pathname, role)) {
    return NextResponse.redirect(new URL("/admin/production", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
