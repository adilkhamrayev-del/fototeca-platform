"use server";

import { revalidatePath } from "next/cache";
import { upsertBanner } from "@/lib/repo/banner";

export async function saveBanner(
  _prevState: { success?: boolean } | undefined,
  formData: FormData,
) {
  const mediaUrl = String(formData.get("mediaUrl") || "") || null;
  const mediaType = formData.get("mediaType");

  await upsertBanner({
    id: String(formData.get("id") || "") || undefined,
    tag: String(formData.get("tag") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    primaryCta: String(formData.get("primaryCta") ?? ""),
    secondaryCta: String(formData.get("secondaryCta") ?? ""),
    mediaUrl,
    mediaType: mediaType === "image" || mediaType === "video" ? mediaType : null,
    isPublished: formData.get("isPublished") === "on",
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/banner");

  return { success: true };
}
