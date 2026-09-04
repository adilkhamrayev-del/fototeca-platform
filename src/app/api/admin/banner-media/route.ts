import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSessionRole, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  extensionForMime,
  MAX_BANNER_IMAGE_BYTES,
  MAX_BANNER_VIDEO_BYTES,
  uploadBannerMedia,
} from "@/lib/media-storage";

// Admin-only upload for the homepage banner's photo/video. This is separate
// from /api/upload (the customer-facing order-photo endpoint): different
// auth requirement (admin session, not public), different validation (any
// reasonable image/video, not an exact print-size JPG match), and a
// different storage subfolder. `src/proxy.ts` only gates /admin/:path*, not
// /api/*, so the session check has to happen here too.

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

  const mediaType: "image" | "video" | null = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : null;
  if (!mediaType) {
    return Response.json(
      { error: "Поддерживаются только изображения и видео." },
      { status: 400 },
    );
  }

  const extension = extensionForMime(file.type);
  if (!extension) {
    return Response.json(
      { error: `Формат ${file.type || "неизвестен"} не поддерживается. Используйте JPG, PNG, WEBP, GIF, MP4, WEBM или MOV.` },
      { status: 400 },
    );
  }

  const maxBytes = mediaType === "image" ? MAX_BANNER_IMAGE_BYTES : MAX_BANNER_VIDEO_BYTES;
  if (file.size > maxBytes) {
    return Response.json(
      {
        error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум для ${
          mediaType === "image" ? "изображения" : "видео"
        }: ${(maxBytes / 1024 / 1024).toFixed(0)} МБ — для видео используйте короткий ролик.`,
      },
      { status: 400 },
    );
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  try {
    url = await uploadBannerMedia(buffer, filename, file.type);
  } catch (error) {
    // Surface the real cause instead of a generic "check your connection" —
    // the most common one on a fresh Vercel project is @vercel/blob
    // rejecting the upload because no Blob store is attached yet (no
    // BLOB_READ_WRITE_TOKEN env var). Logged server-side in full; the
    // client only gets a short diagnostic line, no stack trace.
    console.error("uploadBannerMedia failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    const hint = message.toLowerCase().includes("token")
      ? " Похоже, к проекту не подключено хранилище Vercel Blob (Storage → Create Database → Blob) — без него BLOB_READ_WRITE_TOKEN не появится."
      : "";
    return Response.json(
      { error: `Ошибка загрузки на сервере: ${message}.${hint}` },
      { status: 500 },
    );
  }

  return Response.json({ url, mediaType });
}
