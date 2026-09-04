// Populates a freshly migrated database with the same starting content that
// used to live only in src/lib/content.ts. Safe to re-run: it clears the
// content tables first (never touches clients/orders).
//
// Run with: npm run db:seed

import { pool } from "../src/lib/db.ts";
import { banner, catalogItems, articles } from "../src/lib/content.ts";

async function main() {
  console.log("Seeding database...");

  await pool.query("truncate table cover_options, catalog_formats, catalog_items restart identity cascade");
  await pool.query("truncate table articles restart identity cascade");
  await pool.query("truncate table banners restart identity cascade");

  await pool.query(
    `insert into banners (tag, title, description, primary_cta, secondary_cta, is_published)
     values ($1, $2, $3, $4, $5, true)`,
    [banner.tag, banner.title, banner.description, banner.primaryCta, banner.secondaryCta],
  );
  console.log("  banner: 1");

  for (const article of articles) {
    await pool.query(
      `insert into articles (slug, tag, title, excerpt, content, status, published_at)
       values ($1, $2, $3, $4, $5, 'PUBLISHED', $6::date)`,
      [article.slug, article.tag, article.title, article.excerpt, article.content, article.publishedAt],
    );
  }
  console.log(`  articles: ${articles.length}`);

  let formatCount = 0;
  let coverCount = 0;

  for (const [itemIndex, item] of catalogItems.entries()) {
    const { rows } = await pool.query<{ id: string }>(
      `insert into catalog_items
         (slug, title, description, price_from, gradient_from, gradient_to, requires_upload, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        item.slug,
        item.title,
        item.description,
        item.priceFrom,
        item.gradient[0],
        item.gradient[1],
        item.requiresUpload,
        itemIndex,
      ],
    );
    const catalogItemId = rows[0].id;

    for (const [formatIndex, format] of item.formats.entries()) {
      const { rows: formatRows } = await pool.query<{ id: string }>(
        `insert into catalog_formats
           (catalog_item_id, name, width_px, height_px, width_mm, height_mm, dpi,
            price_per_spread, min_spreads, max_spreads, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         returning id`,
        [
          catalogItemId,
          format.name,
          format.widthPx,
          format.heightPx,
          format.widthMm,
          format.heightMm,
          format.dpi,
          format.pricePerSpread,
          format.minSpreads,
          format.maxSpreads,
          formatIndex,
        ],
      );
      formatCount += 1;
      const catalogFormatId = formatRows[0].id;

      for (const [coverIndex, cover] of format.coverOptions.entries()) {
        await pool.query(
          `insert into cover_options
             (catalog_format_id, name, price_modifier, gradient_from, gradient_to, sort_order, variant_kind)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            catalogFormatId,
            cover.name,
            cover.priceModifier,
            cover.gradient[0],
            cover.gradient[1],
            coverIndex,
            cover.variantKind,
          ],
        );
        coverCount += 1;
      }
    }
  }
  console.log(`  catalog items: ${catalogItems.length}, formats: ${formatCount}, cover options: ${coverCount}`);

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
