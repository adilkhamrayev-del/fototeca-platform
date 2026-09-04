import { pool } from "@/lib/db";
import type { Banner } from "@/lib/content";

export type BannerRecord = Banner & {
  id: string;
  isPublished: boolean;
};

const SELECT = `
  select id, tag, title, description, primary_cta, secondary_cta, media_url, media_type, is_published
`;

function mapRow(row: {
  id: string;
  tag: string;
  title: string;
  description: string;
  primary_cta: string;
  secondary_cta: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  is_published: boolean;
}): BannerRecord {
  return {
    id: row.id,
    tag: row.tag,
    title: row.title,
    description: row.description,
    primaryCta: row.primary_cta,
    secondaryCta: row.secondary_cta,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    isPublished: row.is_published,
  };
}

/** The banner shown on the storefront — the most recently updated published one. */
export async function getPublishedBanner(): Promise<BannerRecord | null> {
  const { rows } = await pool.query(
    `${SELECT} from banners where is_published = true order by updated_at desc limit 1`,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

/** For the admin form — the most recently updated banner, published or not. */
export async function getBannerForAdmin(): Promise<BannerRecord | null> {
  const { rows } = await pool.query(`${SELECT} from banners order by updated_at desc limit 1`);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function upsertBanner(input: {
  id?: string;
  tag: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  isPublished: boolean;
}): Promise<void> {
  if (input.id) {
    await pool.query(
      `update banners set tag = $1, title = $2, description = $3, primary_cta = $4,
         secondary_cta = $5, media_url = $6, media_type = $7, is_published = $8, updated_at = now()
       where id = $9`,
      [
        input.tag,
        input.title,
        input.description,
        input.primaryCta,
        input.secondaryCta,
        input.mediaUrl,
        input.mediaType,
        input.isPublished,
        input.id,
      ],
    );
    return;
  }

  await pool.query(
    `insert into banners (tag, title, description, primary_cta, secondary_cta, media_url, media_type, is_published)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.tag,
      input.title,
      input.description,
      input.primaryCta,
      input.secondaryCta,
      input.mediaUrl,
      input.mediaType,
      input.isPublished,
    ],
  );
}
