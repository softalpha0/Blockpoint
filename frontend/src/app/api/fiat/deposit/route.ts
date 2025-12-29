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

function allowedCurrency(currency: string) {
  const allow = process.env.FIAT_ALLOWED_CURRENCIES;
  if (!allow) return true;
  const set = new Set(allow.split(",").map((s) => s.trim()).filter(Boolean));
  return set.has(currency);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { wallet, currency, amount, meta } = body || {};

    if (!wallet || !currency || amount === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!allowedCurrency(currency)) {
      return NextResponse.json({ error: "Currency not allowed" }, { status: 400 });
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const pool = getPool();
    const client = await pool.connect();

    const reference = mkRef("dep");

    try {
      await client.query("BEGIN");

      await client.query(
        `
        insert into fiat_transactions
          (wallet, currency, type, amount, status, reference, meta)
        values
          ($1, $2, 'deposit', $3, 'confirmed', $4, $5)
        `,
        [w, currency, amt, reference, meta ?? {}]
      );

      const balRes = await client.query(
        `
        insert into fiat_balances (wallet, currency, balance)
        values ($1, $2, $3)
        on conflict (wallet, currency)
        do update set
          balance = fiat_balances.balance + excluded.balance,
          updated_at = now()
        returning *
        `,
        [w, currency, amt]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        { ok: true, reference, balance: balRes.rows[0] },
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
      { error: e?.message || "Deposit failed" },
      { status: 500 }
    );
  }
}