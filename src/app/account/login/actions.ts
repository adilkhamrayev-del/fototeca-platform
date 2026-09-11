"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findClientByPhone } from "@/lib/repo/clients";
import { buildClientSessionCookieValue, CLIENT_SESSION_COOKIE_NAME } from "@/lib/auth/client-session";

export async function loginAsClient(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const phoneDigits = String(formData.get("phone") ?? "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return { error: "Укажите корректный номер телефона" };
  }

  const client = await findClientByPhone(phoneDigits);
  if (!client) {
    return {
      error: "Заказов с таким номером не найдено. Проверьте номер или оформите первый заказ в каталоге.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE_NAME, buildClientSessionCookieValue(phoneDigits), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 180, // 180 days — regular customers shouldn't need to re-enter their phone often
  });

  redirect("/account");
}
