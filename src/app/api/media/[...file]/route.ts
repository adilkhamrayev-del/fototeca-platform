import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { MEDIA_ROOT, CONTENT_TYPE_BY_EXTENSION, sanitizeMediaSegment } from "@/lib/media-storage";

// Public read-back for admin-uploaded media (currently: the homepage
// banner's photo/video) written by /api/admin/banner-media. Files live
// outside `public/` because they're uploaded at runtime, not bundled at
// build time — Next.js only serves `public/` as-is, so anything written
// after the build needs a route like this one to hand it back out.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string[] }> }) {
  const { file: segments } = await params;
  if (!segments || segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  // Every path segment is sanitized independently — same allowlist the
  // upload route's filenames are already limited to — so "../../etc" can't
  // escape MEDIA_ROOT.
  const safeSegments = segments.map(sanitizeMediaSegment);
  const filePath = path.join(MEDIA_ROOT, ...safeSegments);
  if (!filePath.startsWith(MEDIA_ROOT)) {
    return new Response("Not found", { status: 404 });
  }

  const extension = path.extname(filePath).slice(1).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    await stat(filePath);
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
