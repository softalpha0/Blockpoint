import { NextRequest, NextResponse } from "next/server";
import { pool } from "../_db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const currency = searchParams.get("currency");

  if (!wallet || !currency) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const r = await pool.query(
    `select balance from fiat_balances where wallet=$1 and currency=$2`,
    [wallet.toLowerCase(), currency]
  );

  return NextResponse.json({
    wallet,
    currency,
    balance: r.rows[0]?.balance ?? "0",
  });
}