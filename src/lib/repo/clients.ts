import { pool } from "@/lib/db";

export type ClientSummary = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
};

export type ClientListRow = ClientSummary & {
  createdAt: string;
  // Count of orders placed through the current platform (orders table) —
  // does NOT include legacy_orders, since those pre-date the platform and
  // most clients have zero here despite having real order history.
  ordersCount: number;
};

export async function listClients(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: ClientListRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  const search = opts.search?.trim();
  const whereClause = search ? "where c.full_name ilike $1 or c.phone ilike $1 or c.email ilike $1" : "";
  const params = search ? [`%${search}%`] : [];

  const { rows: countRows } = await pool.query(
    `select count(*)::int as count from clients c ${whereClause}`,
    params,
  );

  const { rows } = await pool.query(
    `select c.id, c.full_name, c.phone, c.email, c.created_at,
            (select count(*)::int from orders o where o.client_id = c.id) as orders_count
     from clients c
     ${whereClause}
     order by c.full_name asc
     limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, offset],
  );

  return {
    total: countRows[0].count as number,
    rows: rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      phone: r.phone,
      email: r.email,
      createdAt: r.created_at,
      ordersCount: r.orders_count,
    })),
  };
}

// Used by the personal-cabinet login (src/app/account/login) to check a
// phone number actually has orders under it before starting a session —
// and by anything else that needs a client's own name/email by phone.
export async function findClientByPhone(phone: string): Promise<ClientSummary | null> {
  const { rows } = await pool.query<{
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  }>("select id, full_name, phone, email from clients where phone = $1", [phone]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    fullName: rows[0].full_name,
    phone: rows[0].phone,
    email: rows[0].email,
  };
}
