import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

declare global {
  var __fiatPool: Pool | undefined;
}

function getPool() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL is not set");

  if (!global.__fiatPool) {
    global.__fiatPool = new Pool({
      connectionString: cs,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__fiatPool;
}

function normWallet(w: string) {
  return String(w || "").toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const wallet = searchParams.get("wallet") || "";
    const limitRaw = searchParams.get("limit") || "50";
    const offsetRaw = searchParams.get("offset") || "0";

    if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

    const limit = Math.min(Number(limitRaw) || 50, 100);
    const offset = Number(offsetRaw) || 0;

    const pool = getPool();

    const r = await pool.query(
      `
      select *
      from fiat_transactions
      where wallet=$1
      order by created_at desc
      limit $2 offset $3
      `,
      [normWallet(wallet), limit, offset]
    );

    return NextResponse.json(
      { ok: true, rows: r.rows, limit, offset },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}