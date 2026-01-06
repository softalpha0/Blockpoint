import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// DEBUG (safe): log only hostname in prod
if (process.env.NODE_ENV === "production") {
  try {
    const host = new URL(connectionString).host;
    console.log("DB host:", host);
  } catch {
    console.log("DB host: invalid DATABASE_URL");
  }
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function dbQuery<T = any>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}
