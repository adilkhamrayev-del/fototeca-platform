import { pool } from "@/lib/db";
import type {
  CatalogFormat,
  CatalogItem,
  CoverOption,
  CoverVariantKind,
  ProductKind,
  WideFormatOption,
  WideFormatPricingMode,
} from "@/lib/content";

export type CatalogItemRecord = CatalogItem & {
  id: string;
  isActive: boolean;
};

type ItemRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price_from: number;
  gradient_from: string;
  gradient_to: string;
  cover_image_url: string | null;
  requires_upload: boolean;
  is_active: boolean;
  product_kind: ProductKind;
};

type WideFormatOptionRow = {
  id: string;
  catalog_item_id: string;
  name: string;
  pricing_mode: WideFormatPricingMode;
  price_per_sqm: number;
  price_per_meter: number;
  min_width_cm: number;
  max_width_cm: number;
  min_height_cm: number;
  max_height_cm: number;
  image_url: string | null;
};

type FormatRow = {
  id: string;
  catalog_item_id: string;
  name: string;
  width_px: number;
  height_px: number;
  width_mm: string; // numeric columns come back from `pg` as strings
  height_mm: string;
  dpi: number;
  price_per_spread: number;
  min_spreads: number;
  max_spreads: number;
};

type CoverRow = {
  id: string;
  catalog_format_id: string;
  name: string;
  price_modifier: number;
  gradient_from: string;
  gradient_to: string;
  image_url: string | null;
  variant_kind: CoverVariantKind;
};

async function assemble(itemRows: ItemRow[]): Promise<CatalogItemRecord[]> {
  if (itemRows.length === 0) return [];
  const itemIds = itemRows.map((r) => r.id);

  const { rows: formatRows } = await pool.query<FormatRow>(
    `select id, catalog_item_id, name, width_px, height_px, width_mm, height_mm, dpi,
            price_per_spread, min_spreads, max_spreads
     from catalog_formats where catalog_item_id = any($1) order by sort_order, name`,
    [itemIds],
  );
  const formatIds = formatRows.map((r) => r.id);

  const { rows: coverRows } = formatIds.length
    ? await pool.query<CoverRow>(
        `select id, catalog_format_id, name, price_modifier, gradient_from, gradient_to, image_url, variant_kind
         from cover_options where catalog_format_id = any($1) order by sort_order, name`,
        [formatIds],
      )
    : { rows: [] as CoverRow[] };

  const coversByFormat = new Map<string, CoverOption[]>();
  for (const c of coverRows) {
    const list = coversByFormat.get(c.catalog_format_id) ?? [];
    list.push({
      id: c.id,
      name: c.name,
      priceModifier: c.price_modifier,
      gradient: [c.gradient_from, c.gradient_to],
      imageUrl: c.image_url,
      variantKind: c.variant_kind,
    });
    coversByFormat.set(c.catalog_format_id, list);
  }

  const formatsByItem = new Map<string, CatalogFormat[]>();
  for (const f of formatRows) {
    const list = formatsByItem.get(f.catalog_item_id) ?? [];
    list.push({
      id: f.id,
      name: f.name,
      widthPx: f.width_px,
      heightPx: f.height_px,
      widthMm: Number(f.width_mm),
      heightMm: Number(f.height_mm),
      dpi: f.dpi,
      pricePerSpread: f.price_per_spread,
      minSpreads: f.min_spreads,
      maxSpreads: f.max_spreads,
      coverOptions: coversByFormat.get(f.id) ?? [],
    });
    formatsByItem.set(f.catalog_item_id, list);
  }

  const { rows: wideFormatRows } = await pool.query<WideFormatOptionRow>(
    `select id, catalog_item_id, name, pricing_mode, price_per_sqm, price_per_meter,
            min_width_cm, max_width_cm, min_height_cm, max_height_cm, image_url
     from wide_format_options where catalog_item_id = any($1) order by sort_order, name`,
    [itemIds],
  );
  const wideFormatOptionsByItem = new Map<string, WideFormatOption[]>();
  for (const o of wideFormatRows) {
    const list = wideFormatOptionsByItem.get(o.catalog_item_id) ?? [];
    list.push({
      id: o.id,
      name: o.name,
      pricingMode: o.pricing_mode,
      pricePerSqm: o.price_per_sqm,
      pricePerMeter: o.price_per_meter,
      minWidthCm: o.min_width_cm,
      maxWidthCm: o.max_width_cm,
      minHeightCm: o.min_height_cm,
      maxHeightCm: o.max_height_cm,
      imageUrl: o.image_url,
    });
    wideFormatOptionsByItem.set(o.catalog_item_id, list);
  }

  return itemRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceFrom: row.price_from,
    gradient: [row.gradient_from, row.gradient_to],
    coverImageUrl: row.cover_image_url,
    requiresUpload: row.requires_upload,
    isActive: row.is_active,
    productKind: row.product_kind,
    formats: formatsByItem.get(row.id) ?? [],
    wideFormatOptions: wideFormatOptionsByItem.get(row.id) ?? [],
  }));
}

const SELECT_ITEMS = `
  select id, slug, title, description, price_from, gradient_from, gradient_to, cover_image_url,
         requires_upload, is_active, product_kind
  from catalog_items
`;

export async function listCatalogItems(
  opts: { onlyActive?: boolean } = {},
): Promise<CatalogItemRecord[]> {
  const clause = opts.onlyActive ? "where is_active = true" : "";
  const { rows } = await pool.query<ItemRow>(`${SELECT_ITEMS} ${clause} order by sort_order, title`);
  return assemble(rows);
}

export async function getCatalogItemBySlug(slug: string): Promise<CatalogItemRecord | null> {
  const { rows } = await pool.query<ItemRow>(`${SELECT_ITEMS} where slug = $1`, [slug]);
  const [assembled] = await assemble(rows);
  return assembled ?? null;
}

export async function getCatalogItemById(id: string): Promise<CatalogItemRecord | null> {
  const { rows } = await pool.query<ItemRow>(`${SELECT_ITEMS} where id = $1`, [id]);
  const [assembled] = await assemble(rows);
  return assembled ?? null;
}

export async function updateCatalogItem(
  id: string,
  input: {
    title: string;
    description: string;
    priceFrom: number;
    isActive: boolean;
    coverImageUrl?: string | null;
  },
): Promise<void> {
  await pool.query(
    `update catalog_items set title = $1, description = $2, price_from = $3, is_active = $4,
       cover_image_url = $5, updated_at = now()
     where id = $6`,
    [
      input.title,
      input.description,
      input.priceFrom,
      input.isActive,
      input.coverImageUrl ?? null,
      id,
    ],
  );
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      // Cyrillic titles are the norm here, but slugs stay ASCII (used in
      // URLs like /catalog/[slug] and /order/[slug]) — transliterate the
      // common Cyrillic range rather than dropping it to mush.
      .replace(/[а-яё]/g, (ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export async function createCatalogItem(input: {
  title: string;
  description: string;
  priceFrom: number;
  requiresUpload: boolean;
  productKind?: ProductKind;
}): Promise<string> {
  // Slug has to be unique (catalog_items.slug is UNIQUE) — start from the
  // title and suffix with -2, -3… on collision rather than failing the
  // whole save over something the admin didn't even see as a field.
  const base = slugify(input.title);
  let slug = base;
  for (let n = 2; ; n++) {
    const { rows } = await pool.query("select 1 from catalog_items where slug = $1", [slug]);
    if (rows.length === 0) break;
    slug = `${base}-${n}`;
  }

  const { rows } = await pool.query<{ id: string }>(
    `insert into catalog_items (slug, title, description, price_from, requires_upload, is_active, product_kind)
     values ($1, $2, $3, $4, $5, true, $6) returning id`,
    [
      slug,
      input.title,
      input.description,
      input.priceFrom,
      input.requiresUpload,
      input.productKind ?? "standard",
    ],
  );
  return rows[0].id;
}

/** mm → px at the given dpi, rounded to a whole pixel — this is what the
 * admin actually types (physical size + target resolution); widthPx/heightPx
 * stay the derived, stored value everywhere else reads a pixel size from. */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

type FormatInput = {
  name: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  pricePerSpread: number;
  minSpreads: number;
  maxSpreads: number;
};

export async function createCatalogFormat(catalogItemId: string, input: FormatInput): Promise<void> {
  const widthPx = mmToPx(input.widthMm, input.dpi);
  const heightPx = mmToPx(input.heightMm, input.dpi);
  await pool.query(
    `insert into catalog_formats
       (catalog_item_id, name, width_px, height_px, width_mm, height_mm, dpi,
        price_per_spread, min_spreads, max_spreads)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      catalogItemId,
      input.name,
      widthPx,
      heightPx,
      input.widthMm,
      input.heightMm,
      input.dpi,
      input.pricePerSpread,
      input.minSpreads,
      input.maxSpreads,
    ],
  );
}

export async function updateCatalogFormat(id: string, input: FormatInput): Promise<void> {
  const widthPx = mmToPx(input.widthMm, input.dpi);
  const heightPx = mmToPx(input.heightMm, input.dpi);
  await pool.query(
    `update catalog_formats
       set name = $1, width_px = $2, height_px = $3, width_mm = $4, height_mm = $5, dpi = $6,
           price_per_spread = $7, min_spreads = $8, max_spreads = $9
     where id = $10`,
    [
      input.name,
      widthPx,
      heightPx,
      input.widthMm,
      input.heightMm,
      input.dpi,
      input.pricePerSpread,
      input.minSpreads,
      input.maxSpreads,
      id,
    ],
  );
}

/** Throws a PG error with code 23503 (foreign_key_violation) if this format
 * is used by any existing order — caller should catch and show a friendly
 * "can't delete, it's in use" message instead of a raw DB error. */
export async function deleteCatalogFormat(id: string): Promise<void> {
  await pool.query("delete from catalog_formats where id = $1", [id]);
}

type CoverOptionInput = {
  name: string;
  priceModifier: number;
  imageUrl: string | null;
  variantKind: CoverVariantKind;
};

export async function createCoverOption(
  catalogFormatId: string,
  input: CoverOptionInput,
): Promise<void> {
  await pool.query(
    `insert into cover_options (catalog_format_id, name, price_modifier, image_url, variant_kind)
     values ($1, $2, $3, $4, $5)`,
    [catalogFormatId, input.name, input.priceModifier, input.imageUrl, input.variantKind],
  );
}

export async function updateCoverOption(id: string, input: CoverOptionInput): Promise<void> {
  await pool.query(
    "update cover_options set name = $1, price_modifier = $2, image_url = $3, variant_kind = $4 where id = $5",
    [input.name, input.priceModifier, input.imageUrl, input.variantKind, id],
  );
}

/** Same foreign-key-violation caveat as deleteCatalogFormat above. */
export async function deleteCoverOption(id: string): Promise<void> {
  await pool.query("delete from cover_options where id = $1", [id]);
}

/** Copies every cover option from one format to another, in one insert —
 * for when an admin adds a new format to an existing catalog item and
 * wants the same set of covers (Хит2/Тканевая/Экокожа/Комби, with their
 * photos and price modifiers) instead of re-typing each one by hand. Adds
 * to whatever covers the target format already has rather than replacing
 * them, so it's safe to use more than once (e.g. after adding one more
 * cover to the source format). No-op if the source format has no covers. */
export async function copyCoverOptions(sourceFormatId: string, targetFormatId: string): Promise<void> {
  await pool.query(
    `insert into cover_options
       (catalog_format_id, name, price_modifier, gradient_from, gradient_to, image_url, variant_kind, sort_order)
     select $2, name, price_modifier, gradient_from, gradient_to, image_url, variant_kind, sort_order
     from cover_options where catalog_format_id = $1`,
    [sourceFormatId, targetFormatId],
  );
}

type WideFormatOptionInput = {
  name: string;
  pricingMode: WideFormatPricingMode;
  pricePerSqm: number;
  pricePerMeter: number;
  minWidthCm: number;
  maxWidthCm: number;
  minHeightCm: number;
  maxHeightCm: number;
  imageUrl?: string | null;
};

export async function createWideFormatOption(
  catalogItemId: string,
  input: WideFormatOptionInput,
): Promise<void> {
  await pool.query(
    `insert into wide_format_options
       (catalog_item_id, name, pricing_mode, price_per_sqm, price_per_meter,
        min_width_cm, max_width_cm, min_height_cm, max_height_cm, image_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      catalogItemId,
      input.name,
      input.pricingMode,
      input.pricePerSqm,
      input.pricePerMeter,
      input.minWidthCm,
      input.maxWidthCm,
      input.minHeightCm,
      input.maxHeightCm,
      input.imageUrl ?? null,
    ],
  );
}

export async function updateWideFormatOption(id: string, input: WideFormatOptionInput): Promise<void> {
  await pool.query(
    `update wide_format_options
       set name = $1, pricing_mode = $2, price_per_sqm = $3, price_per_meter = $4,
           min_width_cm = $5, max_width_cm = $6, min_height_cm = $7, max_height_cm = $8,
           image_url = $9
     where id = $10`,
    [
      input.name,
      input.pricingMode,
      input.pricePerSqm,
      input.pricePerMeter,
      input.minWidthCm,
      input.maxWidthCm,
      input.minHeightCm,
      input.maxHeightCm,
      input.imageUrl ?? null,
      id,
    ],
  );
}

/** Same foreign-key-violation caveat as deleteCatalogFormat above (blocked
 * by any order_items row referencing it via wide_format_option_id). */
export async function deleteWideFormatOption(id: string): Promise<void> {
  await pool.query("delete from wide_format_options where id = $1", [id]);
}

/** Fetches one wide_format_options row for server-side price recomputation
 * at order time (see createWideFormatOrder in repo/orders.ts) — never trust
 * a client-submitted price when the customer can type arbitrary dimensions. */
export async function getWideFormatOptionById(
  id: string,
): Promise<(WideFormatOption & { catalogItemId: string }) | null> {
  const { rows } = await pool.query<WideFormatOptionRow>(
    `select id, catalog_item_id, name, pricing_mode, price_per_sqm, price_per_meter,
            min_width_cm, max_width_cm, min_height_cm, max_height_cm
     from wide_format_options where id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    catalogItemId: row.catalog_item_id,
    name: row.name,
    pricingMode: row.pricing_mode,
    pricePerSqm: row.price_per_sqm,
    pricePerMeter: row.price_per_meter,
    minWidthCm: row.min_width_cm,
    maxWidthCm: row.max_width_cm,
    minHeightCm: row.min_height_cm,
    maxHeightCm: row.max_height_cm,
  };
}
