import crypto from "node:crypto";
import { extensionForMime, MAX_COVER_UPLOAD_BYTES, uploadOrderCoverFile } from "@/lib/media-storage";

// Public (no admin session) upload for the "виньетка" order flow's separate
// "Обложки" block (see isVignette in OrderConfigurator.tsx) — a customer
// uploads finished cover artwork here, distinct from the individual-spreads
// block which still goes through /api/upload with its strict pixel/dpi
// check. No dimension check here on purpose: cover layouts vary by design,
// unlike the fixed-size spreads.

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const draftId = form.get("draftId");

  if (!(file instanceof File) || typeof draftId !== "string") {
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

  if (file.size > MAX_COVER_UPLOAD_BYTES) {
    return Response.json(
      {
        error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ${(MAX_COVER_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} МБ.`,
      },
      { status: 400 },
    );
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  try {
    url = await uploadOrderCoverFile(buffer, filename, file.type, draftId);
  } catch (error) {
    console.error("uploadOrderCoverFile failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Ошибка загрузки на сервере: ${message}.` }, { status: 500 });
  }

  return Response.json({ url, name: file.name });
}
