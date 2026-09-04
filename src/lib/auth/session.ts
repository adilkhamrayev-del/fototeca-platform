import crypto from "node:crypto";

// Two shared passwords (ADMIN_PASSWORD / PRODUCTION_PASSWORD env vars)
// rather than a users table — lightweight role separation matching this
// phase of the plan. The session cookie's value is "<role>.<hmac>", where
// the hmac is keyed by that role's own password over a fixed message plus
// the role name, so a cookie can't be forged (or its role escalated)
// without knowing the matching password — even though the cookie itself is
// plain text.

const SESSION_COOKIE = "admin_session";
const SESSION_MESSAGE = "fototeca-admin-session";

export type AdminRole = "admin" | "production";

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getPasswordForRole(role: AdminRole): string | undefined {
  return role === "admin" ? process.env.ADMIN_PASSWORD : process.env.PRODUCTION_PASSWORD;
}

/** Throws if neither role has a password configured — used at login time
 * to distinguish "misconfigured server" from "wrong password". */
export function assertAuthConfigured(): void {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not set — add it to .env before using the admin panel.");
  }
}

/** Checks a submitted password against both configured passwords and
 * returns the matching role, or null if it matches neither. */
export function checkPassword(candidate: string): AdminRole | null {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && timingSafeEqualStr(candidate, adminPassword)) return "admin";

  const productionPassword = process.env.PRODUCTION_PASSWORD;
  if (productionPassword && timingSafeEqualStr(candidate, productionPassword)) return "production";

  return null;
}

function computeSessionToken(role: AdminRole): string | null {
  const password = getPasswordForRole(role);
  if (!password) return null;
  return crypto.createHmac("sha256", password).update(`${SESSION_MESSAGE}:${role}`).digest("hex");
}

export function buildSessionCookieValue(role: AdminRole): string {
  const token = computeSessionToken(role);
  if (!token) throw new Error(`No password configured for role "${role}"`);
  return `${role}.${token}`;
}

/** Validates a session cookie value and returns the role it grants, or
 * null if the cookie is missing, malformed, or its token doesn't match the
 * password currently configured for the claimed role. */
export function getSessionRole(cookieValue: string | undefined): AdminRole | null {
  if (!cookieValue) return null;

  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex < 0) return null;

  const role = cookieValue.slice(0, separatorIndex);
  const token = cookieValue.slice(separatorIndex + 1);
  if (role !== "admin" && role !== "production") return null;

  const expected = computeSessionToken(role);
  if (!expected) return null;

  return timingSafeEqualStr(expected, token) ? role : null;
}

/** Paths a "production" role session is allowed to reach (in addition to
 * the login page, which the proxy always allows). Everything else under
 * /admin redirects a production session to /admin/production. */
export function isPathAllowedForRole(pathname: string, role: AdminRole): boolean {
  if (role === "admin") return true;
  if (pathname === "/admin/production" || pathname.startsWith("/admin/production/")) return true;
  // Production staff print the production blank straight from the kanban
  // card (matches the old system's per-card "печать" button) — this is the
  // one path under /admin/orders they're allowed to reach, without opening
  // up the full order journal (prices, client list, status changes) to them.
  if (/^\/admin\/orders\/[^/]+\/print$/.test(pathname)) return true;
  return false;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
