import crypto from "node:crypto";
import { MAX_WIDE_FORMAT_FILE_BYTES, uploadWideFormatFile } from "@/lib/media-storage";

// Public (no admin session) upload for the "Широкоформатная печать" order
// flow's single print file — modeled on /api/order/common-files: not
// restricted to images, since a print-quality file here is as likely to be
// a PDF/TIFF/PSD as a JPG.
const SAFE_EXTENSION = /^[a-zA-Z0-9]{1,10}$/;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const draftId = form.get("draftId");

  if (!(file instanceof File) || typeof draftId !== "string") {
    return Response.json({ error: "Файл не найден в запросе." }, { status: 400 });
  }

  if (file.size > MAX_WIDE_FORMAT_FILE_BYTES) {
    return Response.json(
      {
        error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ${(MAX_WIDE_FORMAT_FILE_BYTES / 1024 / 1024).toFixed(0)} МБ.`,
      },
      { status: 400 },
    );
  }

  const rawExtension = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
  const extension = SAFE_EXTENSION.test(rawExtension) ? rawExtension.toLowerCase() : "bin";
  const filename = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";

  let url: string;
  try {
    url = await uploadWideFormatFile(buffer, filename, contentType, draftId);
  } catch (error) {
    console.error("uploadWideFormatFile failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Ошибка загрузки на сервере: ${message}.` }, { status: 500 });
  }

  return Response.json({ url, name: file.name });
}
