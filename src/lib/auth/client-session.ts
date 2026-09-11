import crypto from "node:crypto";

// Personal cabinet login (see src/app/account) is phone-number-only, no
// SMS code — the user explicitly chose this for now (SMS needs a paid
// provider account we can't set up ourselves) with the option to add a
// code screen on top of this same flow later without changing anything
// here. Since there's no per-client secret (unlike admin's per-role
// password), the cookie is signed with ADMIN_PASSWORD as the HMAC key —
// reusing a secret that's already configured in production rather than
// requiring a brand new env var for a login that's already low-stakes
// (a phone number is not a secret; this only stops trivial cookie
// tampering, e.g. changing the phone digits to view someone else's
// orders without having logged in as them).
const CLIENT_SESSION_COOKIE = "client_session";
const CLIENT_SESSION_MESSAGE = "fototeca-client-session";

function secret(): string {
  return process.env.ADMIN_PASSWORD || "fototeca-client-session-dev-fallback";
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function computeToken(phoneDigits: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${CLIENT_SESSION_MESSAGE}:${phoneDigits}`)
    .digest("hex");
}

export function buildClientSessionCookieValue(phoneDigits: string): string {
  return `${phoneDigits}.${computeToken(phoneDigits)}`;
}

/** Validates a client session cookie and returns the phone digits it
 * grants, or null if missing/malformed/tampered with. */
export function getClientPhoneFromSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex < 0) return null;

  const phone = cookieValue.slice(0, separatorIndex);
  const token = cookieValue.slice(separatorIndex + 1);
  if (!/^\d{10,15}$/.test(phone)) return null;

  return timingSafeEqualStr(computeToken(phone), token) ? phone : null;
}

export const CLIENT_SESSION_COOKIE_NAME = CLIENT_SESSION_COOKIE;
