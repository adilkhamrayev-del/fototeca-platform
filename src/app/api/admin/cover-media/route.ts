import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSessionRole, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { extensionForMime, MAX_COVER_IMAGE_BYTES, uploadCoverImage } from "@/lib/media-storage";

// Admin-only upload for a cover option's preview photo (see
// /admin/catalog/[id]) — same shape as /api/admin/banner-media, just for
// cover swatches: images only (no video), its own storage subfolder.

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const role = getSessionRole(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (role !== "admin") {
    return Response.json({ error: "Требуется вход в админ-панель." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Файл не найден в запросе." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Поддерживаются только изображения." }, { status: 400 });
  }

  const extension = extensionForMime(file.type);
  if (!extension) {
    return Response.json(
      { error: `Формат ${file.type || "неизвестен"} не поддерживается. Используйте JPG, PNG, WEBP или GIF.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_COVER_IMAGE_BYTES) {
    return Response.json(
      { error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ${(MAX_COVER_IMAGE_BYTES / 1024 / 1024).toFixed(0)} МБ.` },
      { status: 400 },
    );
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  try {
    url = await uploadCoverImage(buffer, filename, file.type);
  } catch (error) {
    console.error("uploadCoverImage failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    const hint = message.toLowerCase().includes("token")
      ? " Похоже, к проекту не подключено хранилище Vercel Blob (Storage → Create Database → Blob)."
      : "";
    return Response.json({ error: `Ошибка загрузки на сервере: ${message}.${hint}` }, { status: 500 });
  }

  return Response.json({ url });
}
