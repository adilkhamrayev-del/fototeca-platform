import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSessionRole, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { extensionForMime, MAX_BOX_IMAGE_BYTES, uploadBoxMaterialImage } from "@/lib/media-storage";

// Admin-only upload for a box-lining swatch photo (see /admin/box-materials)
// — same shape as /api/admin/cover-media, different storage subfolder.

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

  if (file.size > MAX_BOX_IMAGE_BYTES) {
    return Response.json(
      { error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ${(MAX_BOX_IMAGE_BYTES / 1024 / 1024).toFixed(0)} МБ.` },
      { status: 400 },
    );
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  try {
    url = await uploadBoxMaterialImage(buffer, filename, file.type);
  } catch (error) {
    console.error("uploadBoxMaterialImage failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    const hint = message.toLowerCase().includes("token")
      ? " Похоже, к проекту не подключено хранилище Vercel Blob (Storage → Create Database → Blob)."
      : "";
    return Response.json({ error: `Ошибка загрузки на сервере: ${message}.${hint}` }, { status: 500 });
  }

  return Response.json({ url });
}
