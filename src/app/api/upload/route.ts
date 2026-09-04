import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { getCatalogItemBySlug } from "@/lib/repo/catalog";
import { STORAGE_ROOT, sanitizeSegment } from "@/lib/order-storage";

// Server-side half of the two-tier file validation from the migration plan
// (claude/plan-novoy-platformy.md, §2 "Валидация файлов"): the client does a
// fast pre-check for instant feedback, but nothing lands on disk or counts
// as "valid" until this route re-checks it — a client can lie, a server
// response cannot be forged from the browser.
//
// While the order is still a draft (no order number yet), accepted files
// are written to storage/orders/{draftId}/{index}.jpg. Once the order is
// actually placed, createOrder() (src/lib/repo/orders.ts) calls
// finalizeOrderFiles() (src/lib/order-storage.ts) to move them into the
// legacy-mirroring dated/order-number/product-name/Razvoroty layout.
const DIMENSION_TOLERANCE_PX = 4; // re-encoding/export can round by a pixel or two

export async function POST(request: Request) {
  const form = await request.formData();

  const file = form.get("file");
  const itemSlug = form.get("itemSlug");
  const formatId = form.get("formatId");
  const draftId = form.get("draftId");
  const index = form.get("index");

  if (
    !(file instanceof File) ||
    typeof itemSlug !== "string" ||
    typeof formatId !== "string" ||
    typeof draftId !== "string" ||
    typeof index !== "string"
  ) {
    return Response.json(
      { valid: false, reason: "Некорректный запрос: не хватает данных файла." },
      { status: 400 },
    );
  }

  const item = await getCatalogItemBySlug(itemSlug);
  const format = item?.formats.find((f) => f.id === formatId);
  if (!item || !format) {
    return Response.json(
      { valid: false, reason: "Формат не найден." },
      { status: 400 },
    );
  }

  if (!/^image\/jpeg$/i.test(file.type)) {
    return Response.json({
      valid: false,
      reason: "Файл должен быть в формате JPG.",
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return Response.json({
      valid: false,
      reason: "Не удалось прочитать файл — повреждён или это не изображение.",
    });
  }

  const { width, height, space, density } = metadata;

  if (!width || !height) {
    return Response.json({ valid: false, reason: "Не удалось определить размер изображения." });
  }

  const widthOk = Math.abs(width - format.widthPx) <= DIMENSION_TOLERANCE_PX;
  const heightOk = Math.abs(height - format.heightPx) <= DIMENSION_TOLERANCE_PX;
  if (!widthOk || !heightOk) {
    return Response.json({
      valid: false,
      reason: `Неверный размер: ${width}×${height} px, нужно ${format.widthPx}×${format.heightPx} px.`,
      width,
      height,
    });
  }

  // sharp reports the ICC-independent pixel color space; "srgb" covers both
  // untagged-but-standard files and files explicitly tagged sRGB. CMYK or
  // wide-gamut inputs are rejected, matching the old system's requirement.
  if (space && space !== "srgb" && space !== "b-w") {
    return Response.json({
      valid: false,
      reason: `Неверный цветовой профиль (${space}) — требуется sRGB.`,
      width,
      height,
    });
  }

  const draftDir = path.join(STORAGE_ROOT, sanitizeSegment(draftId));
  await mkdir(draftDir, { recursive: true });
  const filename = `${sanitizeSegment(index).padStart(2, "0")}.jpg`;
  await writeFile(path.join(draftDir, filename), buffer);

  return Response.json({
    valid: true,
    width,
    height,
    density: density ?? null,
    savedAs: filename,
  });
}
