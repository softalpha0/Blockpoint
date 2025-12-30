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

function allowedCurrencies(): string[] | null {
  const raw = process.env.FIAT_ALLOWED_CURRENCIES || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : null;
}

export async function POST(req: Request) {
  try {
    const { wallet, currency, amount, meta } = (await req.json()) || {};

    if (!wallet || !currency || amount === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const allowed = allowedCurrencies();
    if (allowed && !allowed.includes(currency)) {
      return NextResponse.json(
        { error: `Currency not allowed. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const reference = mkRef("dep");

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
      return NextResponse.json({ ok: true, reference, balance: balRes.rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("fiat deposit error:", e);
    return NextResponse.json(
      {
        error: "Deposit failed",
        details: e?.message || String(e),
        code: e?.code,
      },
      { status: 500 }
    );
  }
}
