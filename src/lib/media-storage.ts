import path from "node:path";

// Where uploaded admin media (currently: the homepage banner's photo/video)
// is written on disk, and read back from by the /api/media/[...file] route
// that serves it. This path is only used on the real self-hosted server
// (no VERCEL env var there) — a normal persistent folder next to the app.
//
// On Vercel, /tmp is NOT a safe place for this: it's wiped across
// deployments AND unreliable even within a single deployment, since
// serverless invocations can land on different instances that don't share
// a filesystem — a file written by the upload request may simply not exist
// when a later request (e.g. the browser loading the <video>/<img>) hits a
// different instance. So on Vercel we use Vercel Blob (see uploadBannerMedia
// below) instead of MEDIA_ROOT.
export const MEDIA_ROOT = path.join(process.cwd(), "storage", "media");

export const isVercel = Boolean(process.env.VERCEL);

// Keeps filenames predictable and prevents path traversal (`../../etc`) —
// every caller that turns user input into a path segment runs it through
// this first.
//
// Must allow "." — every real filename here is "<uuid>.<ext>" (see
// uploadBannerMedia below). Stripping the dot used to silently break every
// upload: the file was written correctly, but /api/media/[...file] sanitizes
// the requested segment the same way, so "<uuid>.jpg" became "<uuid>jpg" —
// extension-less, no matching Content-Type, and no file at that path — a
// guaranteed 404 on every single banner image/video. A lone "." or ".."
// segment is still neutralized (belt-and-braces on top of the
// MEDIA_ROOT-prefix check in the route itself).
export function sanitizeMediaSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80) || "x";
  return /^\.+$/.test(cleaned) ? "x" : cleaned;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSION_BY_MIME).map(([mime, ext]) => [ext, mime]),
);

export function extensionForMime(mime: string): string | null {
  return EXTENSION_BY_MIME[mime] ?? null;
}

export const BANNER_MEDIA_SUBDIR = "banner";
export const MAX_BANNER_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_BANNER_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB — short clips only

export const COVER_MEDIA_SUBDIR = "covers";
export const MAX_COVER_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

// Customer-uploaded photo for the "Комби" cover — the customer supplies
// their own image for part of the cover at order time (see
// /api/order/combo-cover-photo), unlike the admin-managed swatches above.
export const COMBO_PHOTO_SUBDIR = "combo-uploads";
export const MAX_COMBO_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

// Shared upload path for any admin-managed media file (banner photo/video,
// cover-option preview photo, and anything similar added later) — same
// storage split as the comment on MEDIA_ROOT above: Vercel Blob when
// deployed there, local disk under MEDIA_ROOT otherwise. `subdir` keeps
// each kind of upload in its own folder/URL prefix.
export async function uploadAdminMedia(
  buffer: Buffer,
  filename: string,
  contentType: string,
  subdir: string,
): Promise<string> {
  if (isVercel) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${subdir}/${filename}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const dir = path.join(MEDIA_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/api/media/${subdir}/${filename}`;
}

// Uploads a banner file and returns its public URL. On Vercel this goes to
// Vercel Blob (persistent, served from Vercel's own CDN — the URL it
// returns already works from any browser, no /api/media proxy needed). On
// the real server it writes to local disk under MEDIA_ROOT and returns the
// path that /api/media/[...file] serves back out.
export async function uploadBannerMedia(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  return uploadAdminMedia(buffer, filename, contentType, BANNER_MEDIA_SUBDIR);
}

// Same idea as uploadBannerMedia, for a cover option's preview photo.
export async function uploadCoverImage(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  return uploadAdminMedia(buffer, filename, contentType, COVER_MEDIA_SUBDIR);
}

// Same idea again, for a customer's own combo-cover photo — public route,
// no admin session, see /api/order/combo-cover-photo.
export async function uploadComboPhoto(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  return uploadAdminMedia(buffer, filename, contentType, COMBO_PHOTO_SUBDIR);
}
