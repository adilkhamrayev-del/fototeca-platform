import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionRole, isPathAllowedForRole, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Gate everything under /admin except the login page itself, and further
// restrict a "production" role session to the production board only.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*"],
};
