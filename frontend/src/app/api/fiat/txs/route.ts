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
    const limit = searchParams.get("limit") || "50";
    const offset = searchParams.get("offset") || "0";

    if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

    const lim = Math.min(Number(limit) || 50, 100);
    const off = Number(offset) || 0;

    const pool = getPool();
    const r = await pool.query(
      `
      select *
      from fiat_transactions
      where wallet=$1
      order by created_at desc
      limit $2 offset $3
      `,
      [normWallet(wallet), lim, off]
    );

    return NextResponse.json({ rows: r.rows, limit: lim, offset: off });
  } catch (e: any) {
    console.error("fiat txs error:", e);
    return NextResponse.json(
      { error: "Failed to fetch transactions", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
