import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

if (process.env.NODE_ENV === "production") {
  try {
    console.log("FIAT DB host:", new URL(connectionString).host);
  } catch {
    console.log("FIAT DB host: invalid DATABASE_URL");
  }
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
