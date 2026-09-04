import path from "node:path";
import { MEDIA_ROOT } from "@/lib/media-storage";

// Where /api/upload writes spread photos while the customer is still
// filling out the order form (order doesn't exist yet, so files land under
// a client-generated draftId). See STORAGE_ROOT comment for the Vercel
// caveat — /tmp there is ephemeral, so this whole module is a no-op on
// Vercel (finalizeOrderFiles returns immediately).
export const STORAGE_ROOT = process.env.VERCEL
  ? path.join("/tmp", "fototeca-storage", "orders")
  : path.join(process.cwd(), "storage", "orders");

export const isVercel = Boolean(process.env.VERCEL);

export function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "x";
}

// Folder/file names may contain the product's real title (Cyrillic,
// spaces) — keep those, just strip characters that are unsafe on
// Windows/NTFS (the real production server) and collapse whitespace.
function sanitizeFolderName(value: string): string {
  const cleaned = value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "Без названия";
}

function dateFolder(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

// Moves the draft's uploaded spread photos (and, if present, the
// customer's own local "Комби" cover photo) out of the temporary
// draftId-keyed folder and into the legacy-mirroring layout:
//
//   storage/orders/{YYYY.MM.DD}/{orderNumber}/{itemTitle}/Razvoroty/{shortCode}-01.jpg...
//   storage/orders/{YYYY.MM.DD}/{orderNumber}/{itemTitle}/Cover file/{shortCode}-cover.<ext>
//
// Best-effort: order data in Postgres is the source of truth, so any
// filesystem error here is logged and swallowed rather than failing the
// order — a customer's order must never be lost because a folder rename
// failed.
export async function finalizeOrderFiles(input: {
  orderNumber: string;
  itemTitle: string;
  draftId: string;
  comboPhotoUrl?: string | null;
}): Promise<void> {
  if (isVercel) return; // /tmp is ephemeral there — nothing durable to move

  try {
    const { readdir, mkdir, rename, copyFile, rm } = await import("node:fs/promises");

    const draftDir = path.join(STORAGE_ROOT, sanitizeSegment(input.draftId));
    let entries: string[] = [];
    try {
      entries = (await readdir(draftDir)).filter((f) => /^\d+\.jpg$/i.test(f));
    } catch {
      entries = []; // no draft folder — order placed with no spreads uploaded
    }

    const shortCode = input.orderNumber.slice(-3);
    const finalDir = path.join(
      STORAGE_ROOT,
      dateFolder(new Date()),
      sanitizeSegment(input.orderNumber),
      sanitizeFolderName(input.itemTitle),
    );

    if (entries.length > 0) {
      const razvorotyDir = path.join(finalDir, "Razvoroty");
      await mkdir(razvorotyDir, { recursive: true });
      for (const entry of entries.sort()) {
        const seq = entry.replace(/\.jpg$/i, "");
        await rename(
          path.join(draftDir, entry),
          path.join(razvorotyDir, `${shortCode}-${seq}.jpg`),
        );
      }
      await rm(draftDir, { recursive: true, force: true });
    }

    // "Комби" cover: the customer's own photo, uploaded separately via
    // /api/order/combo-cover-photo into MEDIA_ROOT/combo-uploads (local
    // disk only — on Vercel it's Blob and we already returned above).
    if (input.comboPhotoUrl?.startsWith("/api/media/combo-uploads/")) {
      const filename = input.comboPhotoUrl.split("/").pop();
      if (filename) {
        const sourcePath = path.join(MEDIA_ROOT, "combo-uploads", filename);
        const ext = path.extname(filename) || ".jpg";
        const coverDir = path.join(finalDir, "Cover file");
        await mkdir(coverDir, { recursive: true });
        await copyFile(sourcePath, path.join(coverDir, `${shortCode}-cover${ext}`));
      }
    }
  } catch (err) {
    console.error("finalizeOrderFiles failed (order was still saved to the database):", err);
  }
}
