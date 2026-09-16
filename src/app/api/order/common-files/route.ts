import crypto from "node:crypto";
import { MAX_COMMON_FILE_BYTES, uploadOrderCommonFile } from "@/lib/media-storage";

// Public (no admin session) upload for the "виньетка" order flow's
// "Общие файлы" block — files shared across the whole album (title page
// elements, class list, whatever isn't a per-spread photo). Unlike the
// cover-files and spreads blocks, this one isn't restricted to images —
// print files here are as likely to be a PDF, PSD or archive — so the
// extension is taken from the original filename (sanitized) rather than a
// fixed image-mime map.
const SAFE_EXTENSION = /^[a-zA-Z0-9]{1,10}$/;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const draftId = form.get("draftId");

  if (!(file instanceof File) || typeof draftId !== "string") {
    return Response.json({ error: "Файл не найден в запросе." }, { status: 400 });
  }

  if (file.size > MAX_COMMON_FILE_BYTES) {
    return Response.json(
      {
        error: `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(1)} МБ). Максимум ${(MAX_COMMON_FILE_BYTES / 1024 / 1024).toFixed(0)} МБ.`,
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
    url = await uploadOrderCommonFile(buffer, filename, contentType, draftId);
  } catch (error) {
    console.error("uploadOrderCommonFile failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Ошибка загрузки на сервере: ${message}.` }, { status: 500 });
  }

  return Response.json({ url, name: file.name });
}
