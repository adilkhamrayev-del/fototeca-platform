import crypto from "node:crypto";
import { extensionForMime, MAX_COMBO_PHOTO_BYTES, uploadComboPhoto } from "@/lib/media-storage";

// Public (no admin session) upload for a customer's own photo used on a
// "Комби" cover — see OrderConfigurator's variant popup. Mirrors
// /api/admin/cover-media but deliberately open to anonymous visitors, same
// as /api/upload for spread files: placing an order needs no account.

export async function POST(request: Request) {
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

  if (file.size > MAX_COMBO_PHOTO_BYTES) {
    return Response.json(
      {
        error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ${(MAX_COMBO_PHOTO_BYTES / 1024 / 1024).toFixed(0)} МБ.`,
      },
      { status: 400 },
    );
  }

  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let url: string;
  try {
    url = await uploadComboPhoto(buffer, filename, file.type);
  } catch (error) {
    console.error("uploadComboPhoto failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Ошибка загрузки на сервере: ${message}.` }, { status: 500 });
  }

  return Response.json({ url });
}
