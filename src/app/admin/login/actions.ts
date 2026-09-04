"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  assertAuthConfigured,
  buildSessionCookieValue,
  checkPassword,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function login(_prevState: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");

  let role;
  try {
    assertAuthConfigured();
    role = checkPassword(password);
  } catch {
    return { error: "ADMIN_PASSWORD не настроен на сервере — обратитесь к разработчику." };
  }

  if (!role) {
    return { error: "Неверный пароль" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, buildSessionCookieValue(role), {
    httpOnly: true,
    sameSite: "lax",
    // `secure` must track whether the site is actually served over HTTPS,
    // not just NODE_ENV — a production build served over plain HTTP (no
    // reverse proxy/TLS in front yet) would otherwise set a Secure cookie
    // that browsers silently refuse to store, making every login appear to
    // succeed but immediately bounce back to the login page. Flip
    // COOKIE_SECURE=true in .env once a TLS-terminating reverse proxy is in
    // front of the app.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(role === "admin" ? "/admin" : "/admin/production");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
