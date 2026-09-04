import { pool } from "@/lib/db";

// Site-wide swatches for the "Тканевая"/"Экокожа" variant popups on the
// order page (see cover_material_variants in db/schema.sql) — one shared
// list per material, managed from /admin/cover-materials, independent of
// any particular catalog item/format.

export type MaterialKind = "tkanevaya" | "ekokozha";

export type CoverMaterialVariant = {
  id: string;
  material: MaterialKind;
  name: string;
  imageUrl: string | null;
};

type VariantRow = {
  id: string;
  material: MaterialKind;
  name: string;
  image_url: string | null;
};

export async function listCoverMaterialVariants(): Promise<CoverMaterialVariant[]> {
  const { rows } = await pool.query<VariantRow>(
    `select id, material, name, image_url from cover_material_variants order by material, sort_order, name`,
  );
  return rows.map((r) => ({
    id: r.id,
    material: r.material,
    name: r.name,
    imageUrl: r.image_url,
  }));
}

export async function createCoverMaterialVariant(input: {
  material: MaterialKind;
  name: string;
  imageUrl: string | null;
}): Promise<void> {
  await pool.query(
    `insert into cover_material_variants (material, name, image_url) values ($1, $2, $3)`,
    [input.material, input.name, input.imageUrl],
  );
}

export async function updateCoverMaterialVariant(
  id: string,
  input: { name: string; imageUrl: string | null },
): Promise<void> {
  await pool.query(`update cover_material_variants set name = $1, image_url = $2 where id = $3`, [
    input.name,
    input.imageUrl,
    id,
  ]);
}

/** Throws a PG error with code 23503 (foreign_key_violation) only if some
 * legacy constraint blocks it — order_items references this table with
 * `on delete set null`, so in practice deleting a variant that's already
 * used in orders just clears it from those orders rather than failing. */
export async function deleteCoverMaterialVariant(id: string): Promise<void> {
  await pool.query("delete from cover_material_variants where id = $1", [id]);
}
