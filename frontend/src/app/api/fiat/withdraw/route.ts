import { NextResponse } from "next/server";
import { pool } from "../_db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { wallet, currency, amount } = await req.json();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bal = await client.query(
      `select balance from fiat_balances where wallet=$1 and currency=$2`,
      [wallet.toLowerCase(), currency]
    );

    if (!bal.rows.length || Number(bal.rows[0].balance) < amount) {
      throw new Error("Insufficient balance");
    }

    await client.query(
      `insert into fiat_transactions (wallet,currency,type,amount,status)
       values ($1,$2,'withdraw',$3,'confirmed')`,
      [wallet.toLowerCase(), currency, amount]
    );

    const updated = await client.query(
      `update fiat_balances
       set balance = balance - $3
       where wallet=$1 and currency=$2
       returning balance`,
      [wallet.toLowerCase(), currency, amount]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, balance: updated.rows[0].balance });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Withdraw failed" }, { status: 400 });
  } finally {
    client.release();
  }
}