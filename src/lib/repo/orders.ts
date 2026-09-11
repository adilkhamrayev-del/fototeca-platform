import { pool } from "@/lib/db";
import type { OrderStatus, ProductionStage, ProductionCard } from "@/lib/orders-shared";
import { getCatalogItemById } from "@/lib/repo/catalog";
import { finalizeOrderFiles } from "@/lib/order-storage";

// Re-exported so existing callers (`@/lib/repo/orders`) keep working — the
// canonical definitions live in orders-shared.ts, which client components
// import directly to avoid pulling `pg` into the browser bundle.
export type { OrderStatus, ProductionStage, ProductionCard };
export {
  ORDER_STATUS_LABELS,
  PRODUCTION_STAGE_LABELS,
  PRODUCTION_STAGE_ORDER,
} from "@/lib/orders-shared";

export type NewOrderInput = {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  catalogItemId: string;
  catalogFormatId: string;
  coverOptionId: string;
  // Set when the chosen cover option has variant_kind 'tkanevaya'/'ekokozha'
  // (the material variant picked in the popup) or 'kombi' (the one
  // fabric-or-eco-leather sub-variant picked for the "material" half of the
  // combo) — null for 'none'.
  coverVariantId?: string | null;
  // Set only for variant_kind 'kombi' — the customer's own uploaded photo
  // for the other half of the cover (see /api/order/combo-cover-photo).
  coverComboPhotoUrl?: string | null;
  spreads: number;
  endpapers: boolean;
  packaging: boolean;
  // Box-lining swatch (бархат/велюр) the customer picked when packaging is
  // true — see box_material_variants in db/schema.sql. Unrelated to
  // coverVariantId, which is the book's own cover material.
  boxMaterialId?: string | null;
  express: boolean;
  price: number;
  uploadDraftId: string;
  // Set when the customer chose "прислать ссылку" instead of uploading
  // spread files directly — a link (Google Drive/Yandex Disk/etc.) for the
  // admin to open and download the files from. `price` already includes
  // the FILE_LINK_SURCHARGE for this — see OrderConfigurator.tsx.
  fileLinkUrl?: string | null;
  // Durable URLs (Vercel Blob / MEDIA_ROOT — see uploadSpreadPhoto in
  // media-storage.ts) for each uploaded spread photo, in page order. Empty
  // when the customer used the "ссылка на файлы" option instead. This is
  // what lets admin (and the customer's own /account order history)
  // actually see/download the files — the STORAGE_ROOT copy finalizeOrderFiles
  // moves around is /tmp-only on Vercel and was never retrievable there.
  spreadPhotoUrls?: string[];
};

async function generateOrderNumber(client: { query: typeof pool.query }): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await client.query<{ n: string }>("select nextval('order_number_seq') as n");
  const sequence = String(rows[0].n).padStart(6, "0");
  return `${year}${sequence}`;
}

export async function createOrder(
  input: NewOrderInput,
): Promise<{ orderId: string; orderNumber: string }> {
  const client = await pool.connect();
  try {
    await client.query("begin");

    // Find or create the client by phone — the one field the legacy
    // journal always has, and the natural dedupe key for repeat customers.
    const existing = await client.query<{ id: string }>(
      "select id from clients where phone = $1",
      [input.clientPhone],
    );
    let clientId: string;
    if (existing.rows[0]) {
      clientId = existing.rows[0].id;
      await client.query(
        "update clients set full_name = $1, email = coalesce($2, email) where id = $3",
        [input.clientName, input.clientEmail ?? null, clientId],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        "insert into clients (full_name, phone, email) values ($1, $2, $3) returning id",
        [input.clientName, input.clientPhone, input.clientEmail ?? null],
      );
      clientId = inserted.rows[0].id;
    }

    const orderNumber = await generateOrderNumber(client);

    const orderRow = await client.query<{ id: string }>(
      `insert into orders (number, client_id, status, total_amount)
       values ($1, $2, 'AWAITING_PAYMENT', $3)
       returning id`,
      [orderNumber, clientId, input.price],
    );
    const orderId = orderRow.rows[0].id;

    await client.query(
      `insert into order_items
         (order_id, catalog_item_id, catalog_format_id, cover_option_id, spreads,
          endpapers, packaging, express, price, upload_draft_id,
          cover_variant_id, cover_combo_photo_url, file_link_url, spread_photo_urls,
          box_material_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        orderId,
        input.catalogItemId,
        input.catalogFormatId,
        input.coverOptionId,
        input.spreads,
        input.endpapers,
        input.packaging,
        input.express,
        input.price,
        input.uploadDraftId,
        input.coverVariantId ?? null,
        input.coverComboPhotoUrl ?? null,
        input.fileLinkUrl ?? null,
        JSON.stringify(input.spreadPhotoUrls ?? []),
        input.boxMaterialId ?? null,
      ],
    );

    await client.query("commit");

    // Best-effort: move the customer's uploaded files from the temporary
    // draft folder into the legacy-mirroring dated/order-number/product
    // layout. Never blocks or fails order creation — see
    // finalizeOrderFiles' own comment for why.
    const item = await getCatalogItemById(input.catalogItemId);
    void finalizeOrderFiles({
      orderNumber,
      itemTitle: item?.title ?? "Заказ",
      draftId: input.uploadDraftId,
      comboPhotoUrl: input.coverComboPhotoUrl ?? null,
      fileLinkUrl: input.fileLinkUrl ?? null,
    });

    return { orderId, orderNumber };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export type OrderListRow = {
  id: string;
  number: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  clientName: string;
  clientPhone: string;
  itemTitle: string;
};

export async function listOrders(opts: { status?: OrderStatus } = {}): Promise<OrderListRow[]> {
  const clause = opts.status ? "where o.status = $1" : "";
  const params = opts.status ? [opts.status] : [];
  const { rows } = await pool.query(
    `select o.id, o.number, o.status, o.total_amount, o.created_at,
            c.full_name as client_name, c.phone as client_phone,
            coalesce(ci.title, '—') as item_title
     from orders o
     join clients c on c.id = o.client_id
     left join order_items oi on oi.order_id = o.id
     left join catalog_items ci on ci.id = oi.catalog_item_id
     ${clause}
     order by o.created_at desc`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    totalAmount: r.total_amount,
    createdAt: r.created_at,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    itemTitle: r.item_title,
  }));
}

export type OrderDetail = OrderListRow & {
  clientEmail: string | null;
  items: {
    id: string;
    itemTitle: string;
    formatName: string;
    coverName: string;
    coverVariantLabel: string | null;
    coverComboPhotoUrl: string | null;
    fileLinkUrl: string | null;
    spreadPhotoUrls: string[];
    spreads: number;
    endpapers: boolean;
    packaging: boolean;
    // Box-lining swatch label (e.g. "бархат: Бордовый") — only set when
    // packaging is true and a swatch was picked; unrelated to
    // coverVariantLabel, which is the book's own cover material.
    boxMaterialLabel: string | null;
    express: boolean;
    price: number;
    productionStage: ProductionStage;
  }[];
};

const MATERIAL_LABELS_RU: Record<string, string> = { tkanevaya: "ткань", ekokozha: "экокожа" };
const BOX_MATERIAL_LABELS_RU: Record<string, string> = { barkhat: "бархат", velur: "велюр" };

// Same idea as coverVariantLabel below, for the box-lining swatch.
function boxMaterialLabel(row: {
  box_material_name: string | null;
  box_material_material: string | null;
}): string | null {
  if (!row.box_material_name) return null;
  const family = row.box_material_material
    ? (BOX_MATERIAL_LABELS_RU[row.box_material_material] ?? row.box_material_material)
    : null;
  return family ? `${family}: ${row.box_material_name}` : row.box_material_name;
}

// Shared by getOrderById and listProductionItems — turns the material
// variant on an order_items row into one display string. For a plain
// tkanevaya/ekokozha cover it's just the variant's own name; for kombi
// (which picks one variant from either material) it's prefixed with which
// material that was, since "Комби" alone doesn't say.
function coverVariantLabel(row: {
  variant_name: string | null;
  variant_material: string | null;
  is_kombi: boolean;
}): string | null {
  if (!row.variant_name) return null;
  if (row.is_kombi && row.variant_material) {
    return `${MATERIAL_LABELS_RU[row.variant_material] ?? row.variant_material}: ${row.variant_name}`;
  }
  return row.variant_name;
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const { rows } = await pool.query(
    `select o.id, o.number, o.status, o.total_amount, o.created_at,
            c.full_name as client_name, c.phone as client_phone, c.email as client_email
     from orders o
     join clients c on c.id = o.client_id
     where o.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const order = rows[0];

  const { rows: itemRows } = await pool.query(
    `select oi.id, ci.title as item_title, cf.name as format_name, co.name as cover_name,
            oi.spreads, oi.endpapers, oi.packaging, oi.express, oi.price, oi.production_stage,
            oi.cover_combo_photo_url, oi.file_link_url, oi.spread_photo_urls,
            cmv.name as variant_name, cmv.material as variant_material,
            co.variant_kind = 'kombi' as is_kombi,
            bmv.name as box_material_name, bmv.material as box_material_material
     from order_items oi
     join catalog_items ci on ci.id = oi.catalog_item_id
     join catalog_formats cf on cf.id = oi.catalog_format_id
     join cover_options co on co.id = oi.cover_option_id
     left join cover_material_variants cmv on cmv.id = oi.cover_variant_id
     left join box_material_variants bmv on bmv.id = oi.box_material_id
     where oi.order_id = $1`,
    [id],
  );

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    totalAmount: order.total_amount,
    createdAt: order.created_at,
    clientName: order.client_name,
    clientPhone: order.client_phone,
    clientEmail: order.client_email,
    itemTitle: itemRows[0]?.item_title ?? "—",
    items: itemRows.map((r) => ({
      id: r.id,
      itemTitle: r.item_title,
      formatName: r.format_name,
      coverName: r.cover_name,
      coverVariantLabel: coverVariantLabel(r),
      coverComboPhotoUrl: r.cover_combo_photo_url,
      fileLinkUrl: r.file_link_url,
      spreadPhotoUrls: r.spread_photo_urls ?? [],
      spreads: r.spreads,
      endpapers: r.endpapers,
      packaging: r.packaging,
      boxMaterialLabel: boxMaterialLabel(r),
      express: r.express,
      price: r.price,
      productionStage: r.production_stage,
    })),
  };
}

// Full order history for a client's personal cabinet (see
// src/app/account) — every order ever placed under this phone number,
// newest first, with the same item-level detail (including file
// previews) as the admin order page.
export async function getOrdersForClientPhone(phone: string): Promise<OrderDetail[]> {
  const { rows } = await pool.query<{ id: string }>(
    `select o.id
     from orders o
     join clients c on c.id = o.client_id
     where c.phone = $1
     order by o.created_at desc`,
    [phone],
  );

  const orders: OrderDetail[] = [];
  for (const row of rows) {
    const detail = await getOrderById(row.id);
    if (detail) orders.push(detail);
  }
  return orders;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await pool.query("update orders set status = $1, updated_at = now() where id = $2", [
    status,
    id,
  ]);
}

export async function listProductionItems(): Promise<ProductionCard[]> {
  const { rows } = await pool.query(
    `select oi.id as item_id, o.number as order_number, o.id as order_id,
            ci.title as item_title, cf.name as format_name, co.name as cover_name,
            oi.spreads, c.full_name as client_name, oi.production_stage,
            oi.cover_combo_photo_url, oi.file_link_url, oi.spread_photo_urls,
            cmv.name as variant_name, cmv.material as variant_material,
            co.variant_kind = 'kombi' as is_kombi,
            oi.packaging, bmv.name as box_material_name, bmv.material as box_material_material
     from order_items oi
     join orders o on o.id = oi.order_id
     join clients c on c.id = o.client_id
     join catalog_items ci on ci.id = oi.catalog_item_id
     join catalog_formats cf on cf.id = oi.catalog_format_id
     join cover_options co on co.id = oi.cover_option_id
     left join cover_material_variants cmv on cmv.id = oi.cover_variant_id
     left join box_material_variants bmv on bmv.id = oi.box_material_id
     where o.status not in ('CANCELLED')
     order by o.created_at asc`,
  );
  return rows.map((r) => ({
    itemId: r.item_id,
    orderNumber: r.order_number,
    orderId: r.order_id,
    itemTitle: r.item_title,
    formatName: r.format_name,
    coverName: r.cover_name,
    coverVariantLabel: coverVariantLabel(r),
    coverComboPhotoUrl: r.cover_combo_photo_url,
    fileLinkUrl: r.file_link_url,
    spreadPhotoUrls: r.spread_photo_urls ?? [],
    spreads: r.spreads,
    clientName: r.client_name,
    productionStage: r.production_stage,
    packaging: r.packaging,
    boxMaterialLabel: boxMaterialLabel(r),
  }));
}

export async function setProductionStage(itemId: string, stage: ProductionStage): Promise<void> {
  await pool.query(
    "update order_items set production_stage = $1::production_stage, updated_at = now() where id = $2",
    [stage, itemId],
  );

  // If every item in the order has reached DONE, move the order itself to READY.
  const { rows } = await pool.query<{ order_id: string }>(
    "select order_id from order_items where id = $1",
    [itemId],
  );
  const orderId = rows[0]?.order_id;
  if (!orderId) return;

  const { rows: remaining } = await pool.query(
    "select count(*)::int as count from order_items where order_id = $1 and production_stage != 'DONE'",
    [orderId],
  );
  if (remaining[0].count === 0) {
    await pool.query(
      "update orders set status = 'READY', updated_at = now() where id = $1 and status = 'IN_PRODUCTION'",
      [orderId],
    );
  }
}
