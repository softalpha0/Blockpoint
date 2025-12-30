import { NextResponse } from "next/server";
import crypto from "crypto";
import { getPool } from "../_db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normWallet(w: string) {
  return String(w || "").toLowerCase();
}

function num(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

function mkRef(prefix: string) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export async function POST(req: Request) {
  try {
    const { wallet, currency, amount, meta } = (await req.json()) || {};
    if (!wallet || !currency || amount === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const bal = await client.query(
        `select balance from fiat_balances where wallet=$1 and currency=$2`,
        [w, currency]
      );

      if (!bal.rows.length || Number(bal.rows[0].balance) < amt) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      const reference = mkRef("wd");

      await client.query(
        `
        insert into fiat_transactions
          (wallet, currency, type, amount, status, reference, meta)
        values
          ($1, $2, 'withdraw', $3, 'confirmed', $4, $5)
        `,
        [w, currency, amt, reference, meta ?? {}]
      );

      const updated = await client.query(
        `
        update fiat_balances
        set balance = balance - $3, updated_at = now()
        where wallet=$1 and currency=$2
        returning *
        `,
        [w, currency, amt]
      );

      await client.query("COMMIT");
      return NextResponse.json({ ok: true, reference, balance: updated.rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("fiat withdraw error:", e);
    return NextResponse.json(
      { error: "Withdraw failed", details: e?.message || String(e), code: e?.code },
      { status: 500 }
    );
  }
}
