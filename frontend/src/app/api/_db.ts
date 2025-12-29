import { Pool } from "pg";

// Netlify provides DATABASE_URL via env vars
const connectionString =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL (or NETLIFY_DATABASE_URL) in environment");
}

declare global {
  // eslint-disable-next-line no-var
  var __bpPool: Pool | undefined;
}

export const pool =
  global.__bpPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  global.__bpPool = pool;
}
