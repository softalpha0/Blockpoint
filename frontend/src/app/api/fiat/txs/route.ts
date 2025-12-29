import { NextRequest, NextResponse } from "next/server";
import { pool } from "../_db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ rows: [] });

  const r = await pool.query(
    `select * from fiat_transactions
     where wallet=$1
     order by created_at desc
     limit 50`,
    [wallet.toLowerCase()]
  );

  return NextResponse.json({ rows: r.rows });
}