import { Pool, type QueryResult, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail fast in production builds if env is missing
  console.warn("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString,
  // Neon/hosted Postgres usually requires SSL
  ssl: connectionString?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

/**
 * Typed query helper
 */
export async function dbQuery<T extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const res = await pool.query<T>(text, params);
  return res;
}
