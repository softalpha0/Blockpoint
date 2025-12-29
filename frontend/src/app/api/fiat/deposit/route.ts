import { NextResponse } from "next/server";
import { pool } from "../_db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { wallet, currency, amount } = await req.json();
  if (!wallet || !currency || !amount) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `insert into fiat_transactions (wallet,currency,type,amount,status)
       values ($1,$2,'deposit',$3,'confirmed')`,
      [wallet.toLowerCase(), currency, amount]
    );

    const bal = await client.query(
      `insert into fiat_balances (wallet,currency,balance)
       values ($1,$2,$3)
       on conflict (wallet,currency)
       do update set balance = fiat_balances.balance + $3
       returning balance`,
      [wallet.toLowerCase(), currency, amount]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, balance: bal.rows[0].balance });
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Deposit failed" }, { status: 500 });
  } finally {
    client.release();
  }
}