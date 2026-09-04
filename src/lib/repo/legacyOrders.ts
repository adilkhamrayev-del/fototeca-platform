import { pool } from "@/lib/db";

// Read-only access to the `legacy_orders` archive imported from the old
// XAF system (zakaz.fototeca.kz) — see db/schema.sql for why this is kept
// separate from orders/order_items instead of forced into that model.

export type LegacyOrderRow = {
  id: string;
  legacyNumber: string;
  legacyDate: string | null;
  contractorName: string | null;
  cellNumber: string | null;
  orderAmount: number | null;
  amountToPay: number | null;
  amountPaid: number | null;
  email: string | null;
  dueDate: string | null;
  deliveryInfo: string | null;
  hasClient: boolean;
};

export async function listLegacyOrders(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: LegacyOrderRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const search = opts.search?.trim();
  const whereClause = search
    ? "where legacy_number ilike $1 or contractor_name ilike $1 or email ilike $1 or cell_number ilike $1"
    : "";
  const params = search ? [`%${search}%`] : [];

  const { rows: countRows } = await pool.query(
    `select count(*)::int as count from legacy_orders ${whereClause}`,
    params,
  );

  const { rows } = await pool.query(
    `select id, legacy_number, legacy_date, contractor_name, cell_number,
            order_amount, amount_to_pay, amount_paid, email, due_date, delivery_info,
            client_id is not null as has_client
     from legacy_orders
     ${whereClause}
     order by legacy_date desc nulls last
     limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, offset],
  );

  return {
    total: countRows[0].count as number,
    rows: rows.map((r) => ({
      id: r.id,
      legacyNumber: r.legacy_number,
      legacyDate: r.legacy_date,
      contractorName: r.contractor_name,
      cellNumber: r.cell_number,
      orderAmount: r.order_amount,
      amountToPay: r.amount_to_pay,
      amountPaid: r.amount_paid,
      email: r.email,
      dueDate: r.due_date,
      deliveryInfo: r.delivery_info,
      hasClient: r.has_client,
    })),
  };
}
