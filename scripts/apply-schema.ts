// Applies db/schema.sql using the `pg` driver directly, without shelling
// out to the `psql` client binary. `npm run db:migrate` (psql -f ...) is
// the normal path for local development, where psql is already on hand
// alongside a Postgres install — but the Docker runtime image deliberately
// doesn't bundle a Postgres client just to run this once at startup, so
// the container's entrypoint (docker/entrypoint.sh) uses this instead.
//
// db/schema.sql is written to be safe to re-run (every statement is
// idempotent — `create table if not exists`, etc.), and `pg` can execute a
// whole multi-statement SQL file in one `query()` call, so this is a thin
// wrapper, not a reimplementation of anything psql does.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pool } from "../src/lib/db.ts";

async function main() {
  const schemaPath = fileURLToPath(new URL("../db/schema.sql", import.meta.url));
  const sql = readFileSync(schemaPath, "utf-8");
  console.log(`Applying ${schemaPath} ...`);
  await pool.query(sql);
  console.log("Schema applied.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
