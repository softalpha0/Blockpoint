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
    const currency = searchParams.get("currency") || "";

    if (!wallet || !currency) {
      return NextResponse.json({ error: "Missing wallet or currency" }, { status: 400 });
    }

    const pool = getPool();

    const r = await pool.query(
      `select * from fiat_balances where wallet=$1 and currency=$2`,
      [normWallet(wallet), currency]
    );

    const row =
      r.rows[0] || {
        wallet: normWallet(wallet),
        currency,
        balance: "0",
        updated_at: null,
      };

    return NextResponse.json(row, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch balance" },
      { status: 500 }
    );
  }
}