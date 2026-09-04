// Imports the full "Контрагенты" (contractors) export from the old XAF
// system into `clients`, on top of whatever migrate-legacy-orders.ts
// already built from the orders journal's "Контрагент" free-text column.
//
// Why a separate script rather than folding this into
// migrate-legacy-orders.ts: the contractors grid is the old system's own
// deduplicated client list (by its internal "Код"), a materially different
// and more complete source than parsing names/phones back out of order
// rows — and its export is a different file format (.xls, via
// scripts/legacy/contractors-to-json.py) fetched from a different page
// (Справочники -> Контрагенты), so it made sense to keep as its own step
// with its own report rather than complicating the orders importer.
//
// Input: a JSON file produced by scripts/legacy/contractors-to-json.py
// from a "Контрагенты" -> Экспорт контрагента export. Get one by:
//   1. In the old system: Справочники -> Контрагенты -> Экспорт контрагента
//   2. python3 scripts/legacy/contractors-to-json.py path/to/Контрагенты.xls /tmp/contractors.json
//   3. node --env-file=.env --experimental-strip-types --experimental-transform-types \
//        scripts/migrate-legacy-contractors.ts /tmp/contractors.json
//
// `clients.phone` is NOT NULL UNIQUE, so a contractor row with no
// parseable phone number is counted and skipped rather than imported —
// there's no way to place it in this table without one. For a phone that
// already has a client (most likely: this same phone was already seen via
// migrate-legacy-orders.ts), this only ever fills in a missing email
// (coalesce) — it never overwrites a name or email a real order on the new
// platform may since have set.
//
// Safe to re-run: matching is by phone, so re-running with the same or an
// overlapping export just updates/skips rows already present rather than
// duplicating them.

import { readFileSync } from "node:fs";
import { pool } from "../src/lib/db.ts";

type ContractorRow = {
  code: string | null;
  name: string | null;
  login: string | null;
  email: string | null;
  phone: string | null;
};

async function main() {
  const jsonPath = process.argv[2];

  if (!jsonPath) {
    console.error(
      "Usage: node --env-file=.env --experimental-strip-types --experimental-transform-types " +
        "scripts/migrate-legacy-contractors.ts path/to/contractors.json",
    );
    process.exit(1);
  }

  const rows: ContractorRow[] = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Read ${rows.length} contractors from ${jsonPath}`);

  let inserted = 0;
  let updated = 0;
  let skippedNoPhone = 0;
  let duplicatePhoneInFile = 0;

  const seenInFile = new Set<string>();

  for (const row of rows) {
    if (!row.phone) {
      skippedNoPhone++;
      continue;
    }
    if (seenInFile.has(row.phone)) {
      duplicatePhoneInFile++;
      continue;
    }
    seenInFile.add(row.phone);

    const name = row.name || row.login || row.email || "Без имени";

    const existing = await pool.query<{ id: string }>("select id from clients where phone = $1", [row.phone]);
    if (existing.rows[0]) {
      if (row.email) {
        await pool.query("update clients set email = coalesce(email, $1) where id = $2", [
          row.email,
          existing.rows[0].id,
        ]);
      }
      updated++;
      continue;
    }

    await pool.query("insert into clients (full_name, phone, email) values ($1, $2, $3)", [
      name,
      row.phone,
      row.email,
    ]);
    inserted++;
  }

  console.log(`Clients: ${inserted} inserted, ${updated} already existed (email backfilled where missing)`);
  console.log(`Skipped: ${skippedNoPhone} with no parseable phone, ${duplicatePhoneInFile} duplicate phone within the file`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
