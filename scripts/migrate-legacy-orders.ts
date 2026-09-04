// Imports orders from the old XAF system (zakaz.fototeca.kz) into the
// `legacy_orders` archive table (see db/schema.sql for why this is a
// separate table rather than orders/order_items), and builds the client
// base in `clients` along the way.
//
// Input: a JSON file produced by scripts/legacy/xlsx-to-json.py from a
// "Журнал заказов" -> Экспорт -> Excel файл (.XLSX) export. Get one by:
//   1. In the old system: Журнал заказов -> Экспорт -> Excel файл (.XLSX)
//   2. python3 scripts/legacy/xlsx-to-json.py path/to/Заказы.xlsx /tmp/legacy.json
//   3. node --env-file=.env --experimental-strip-types --experimental-transform-types \
//        scripts/migrate-legacy-orders.ts /tmp/legacy.json
//
// By default only imports the most recent ORDER_LIMIT legacy orders (the
// plan calls for "last ~50 pages / ~500 orders", not the full ~15-year
// history) but builds the CLIENT base from every row in the file, since a
// repeat customer's order from 2021 is still a real client today. Pass
// --all as a second argument to import every legacy order instead.
//
// Safe to re-run: legacy_number is unique, so re-running with the same or
// an overlapping export just skips rows already imported (ON CONFLICT DO
// NOTHING) rather than duplicating them.

import { readFileSync } from "node:fs";
import { pool } from "../src/lib/db.ts";

const ORDER_LIMIT = 500;

type LegacyRow = {
  legacyNumber: string;
  legacyDate: string | null;
  department: string | null;
  contractorRaw: string | null;
  contractorName: string | null;
  phone: string | null;
  cellNumber: string | null;
  orderAmount: number | null;
  amountToPay: number | null;
  amountPaid: number | null;
  email: string | null;
  executor: string | null;
  dueDate: string | null;
  deliveryInfo: string | null;
};

async function main() {
  const jsonPath = process.argv[2];
  const importAll = process.argv.includes("--all");

  if (!jsonPath) {
    console.error(
      "Usage: node --env-file=.env --experimental-strip-types --experimental-transform-types " +
        "scripts/migrate-legacy-orders.ts path/to/legacy.json [--all]",
    );
    process.exit(1);
  }

  const rows: LegacyRow[] = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Read ${rows.length} legacy orders from ${jsonPath}`);

  // --- 1. Client base: dedupe by phone across every row in the file ---
  // (last-seen name/email wins — rows are already in file order, which is
  // legacy order-number order, not strictly chronological, but good enough
  // for "which spelling of this client's name do we keep").
  const clientsByPhone = new Map<string, { name: string; email: string | null }>();
  for (const row of rows) {
    if (!row.phone) continue;
    clientsByPhone.set(row.phone, {
      name: row.contractorName || row.contractorRaw || "Без имени",
      email: row.email,
    });
  }

  console.log(`Found ${clientsByPhone.size} distinct clients (by phone) across the full export`);

  let clientsInserted = 0;
  let clientsUpdated = 0;
  const clientIdByPhone = new Map<string, string>();

  for (const [phone, info] of clientsByPhone) {
    const existing = await pool.query<{ id: string }>("select id from clients where phone = $1", [phone]);
    if (existing.rows[0]) {
      clientIdByPhone.set(phone, existing.rows[0].id);
      // Only fill in an email the client record doesn't already have —
      // never overwrite anything a real order (new platform) has set.
      if (info.email) {
        await pool.query("update clients set email = coalesce(email, $1) where id = $2", [
          info.email,
          existing.rows[0].id,
        ]);
      }
      clientsUpdated++;
      continue;
    }
    const inserted = await pool.query<{ id: string }>(
      "insert into clients (full_name, phone, email) values ($1, $2, $3) returning id",
      [info.name, phone, info.email],
    );
    clientIdByPhone.set(phone, inserted.rows[0].id);
    clientsInserted++;
  }

  console.log(`Clients: ${clientsInserted} inserted, ${clientsUpdated} already existed`);

  // --- 2. Legacy orders: most recent ORDER_LIMIT (or --all) ---
  const sorted = [...rows].sort((a, b) => (a.legacyDate ?? "").localeCompare(b.legacyDate ?? ""));
  const toImport = importAll ? sorted : sorted.slice(-ORDER_LIMIT);

  console.log(
    `Importing ${toImport.length} legacy orders (${importAll ? "all" : `most recent ${ORDER_LIMIT}`})`,
  );

  let ordersInserted = 0;
  for (const row of toImport) {
    const clientId = row.phone ? (clientIdByPhone.get(row.phone) ?? null) : null;
    const result = await pool.query(
      `insert into legacy_orders
         (legacy_number, legacy_date, client_id, department, contractor_name, cell_number,
          order_amount, amount_to_pay, amount_paid, email, executor, due_date, delivery_info)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       on conflict (legacy_number) do nothing`,
      [
        row.legacyNumber,
        row.legacyDate,
        clientId,
        row.department,
        row.contractorName || row.contractorRaw,
        row.cellNumber,
        row.orderAmount,
        row.amountToPay,
        row.amountPaid,
        row.email,
        row.executor,
        row.dueDate,
        row.deliveryInfo,
      ],
    );
    if ((result.rowCount ?? 0) > 0) ordersInserted++;
  }

  console.log(`Legacy orders: ${ordersInserted} inserted (${toImport.length - ordersInserted} already present)`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
