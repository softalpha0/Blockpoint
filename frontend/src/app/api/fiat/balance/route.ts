import { NextRequest, NextResponse } from "next/server";
import { getPool } from "../_db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    return NextResponse.json(
      r.rows[0] || {
        wallet,
        currency,
        balance: "0",
        updated_at: null,
      }
    );
  } catch (e: any) {
    console.error("fiat balance error:", e);
    return NextResponse.json(
      { error: "Failed to fetch balance", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
