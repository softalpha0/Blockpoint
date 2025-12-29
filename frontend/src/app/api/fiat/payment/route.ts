import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";

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

function mkRef(prefix: string) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function num(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { wallet, currency, amount, reference, meta } = body || {};

    if (!wallet || !currency || amount === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const pool = getPool();
    const client = await pool.connect();

    const ref = reference || mkRef("pay");
    const onlyRecord = Boolean(meta?.onlyRecord);

    try {
      await client.query("BEGIN");

      let balanceRow: any = null;

      if (!onlyRecord) {
        const bal = await client.query(
          `select balance from fiat_balances where wallet=$1 and currency=$2`,
          [w, currency]
        );

        if (!bal.rows.length || Number(bal.rows[0].balance) < amt) {
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }

        const updated = await client.query(
          `
          update fiat_balances
          set balance = balance - $3, updated_at = now()
          where wallet=$1 and currency=$2
          returning *
          `,
          [w, currency, amt]
        );

        balanceRow = updated.rows[0];
      }

      const txRes = await client.query(
        `
        insert into fiat_transactions
          (wallet, currency, type, amount, status, reference, meta)
        values
          ($1, $2, 'payment', $3, 'confirmed', $4, $5)
        returning *
        `,
        [w, currency, amt, ref, meta ?? {}]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        { ok: true, reference: ref, tx: txRes.rows[0], balance: balanceRow },
        { status: 200, headers: { "cache-control": "no-store" } }
      );
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Payment failed" },
      { status: 500 }
    );
  }
}