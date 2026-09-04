import { Pool } from "pg";

// One pooled connection, reused across requests (and across hot-reloads in
// dev, where a naive `new Pool()` in a module would otherwise leak a new
// pool on every edit).
declare global {
  var __fototecaPool: Pool | undefined;
}

export const pool =
  global.__fototecaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__fototecaPool = pool;
}
