"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENT_SESSION_COOKIE_NAME } from "@/lib/auth/client-session";

export async function logoutClient() {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE_NAME);
  redirect("/account/login");
}
