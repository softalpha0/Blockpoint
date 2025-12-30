import { Pool } from "pg";

let _pool: Pool | null = null;

function connString() {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    ""
  );
}

export function getPool() {
  if (_pool) return _pool;

  const cs = connString();
  if (!cs) {
    throw new Error("Missing DATABASE_URL (or NETLIFY_DATABASE_URL) in environment variables.");
  }

  _pool = new Pool({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
    max: 2,
  });

  return _pool;
}
