import { pool } from "@/lib/db";

// Site-wide swatches for the box-lining material picker shown when a
// customer checks "Подарочная упаковка" on the order page (see
// box_material_variants in db/schema.sql) — managed from
// /admin/box-materials, independent of any particular catalog item/format.
// Same shape/pattern as cover-variants.ts on purpose, but these belong to a
// different material entirely (inside lining of the gift box, not the
// book's own cover).

export type BoxMaterialKind = "barkhat" | "velur";

export type BoxMaterialVariant = {
  id: string;
  material: BoxMaterialKind;
  name: string;
  imageUrl: string | null;
};

type VariantRow = {
  id: string;
  material: BoxMaterialKind;
  name: string;
  image_url: string | null;
};

export async function listBoxMaterialVariants(): Promise<BoxMaterialVariant[]> {
  const { rows } = await pool.query<VariantRow>(
    `select id, material, name, image_url from box_material_variants order by material, sort_order, name`,
  );
  return rows.map((r) => ({
    id: r.id,
    material: r.material,
    name: r.name,
    imageUrl: r.image_url,
  }));
}

export async function createBoxMaterialVariant(input: {
  material: BoxMaterialKind;
  name: string;
  imageUrl: string | null;
}): Promise<void> {
  await pool.query(
    `insert into box_material_variants (material, name, image_url) values ($1, $2, $3)`,
    [input.material, input.name, input.imageUrl],
  );
}

export async function updateBoxMaterialVariant(
  id: string,
  input: { name: string; imageUrl: string | null },
): Promise<void> {
  await pool.query(`update box_material_variants set name = $1, image_url = $2 where id = $3`, [
    input.name,
    input.imageUrl,
    id,
  ]);
}

/** Throws nothing on a variant already used in orders — order_items
 * references this table with `on delete set null`, so deleting a variant
 * that's in use just clears it from those orders rather than failing. */
export async function deleteBoxMaterialVariant(id: string): Promise<void> {
  await pool.query("delete from box_material_variants where id = $1", [id]);
}
