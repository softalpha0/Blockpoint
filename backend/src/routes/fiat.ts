import { Router } from "express";
import { pool } from "../db";
import crypto from "crypto";

const router = Router();

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

router.post("/deposit", async (req, res) => {
  try {
    const { wallet, currency, amount, meta } = req.body || {};
    if (!wallet || !currency || amount === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return res.status(400).json({ error: "Invalid amount" });

    const reference = mkRef("dep");

    const client = await pool.connect();
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

      return res.json({ ok: true, reference, balance: balRes.rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("fiat deposit error:", e);
    return res.status(500).json({ error: e?.message || "Deposit failed" });
  }
});

router.post("/withdraw", async (req, res) => {
  try {
    const { wallet, currency, amount, meta } = req.body || {};
    if (!wallet || !currency || amount === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return res.status(400).json({ error: "Invalid amount" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const bal = await client.query(
        `select balance from fiat_balances where wallet=$1 and currency=$2`,
        [w, currency]
      );

      if (!bal.rows.length || Number(bal.rows[0].balance) < amt) {
        throw new Error("Insufficient balance");
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

      return res.json({ ok: true, reference, balance: updated.rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("fiat withdraw error:", e);
    return res.status(500).json({ error: e?.message || "Withdraw failed" });
  }
});

router.post("/payment", async (req, res) => {
  try {
    const { wallet, currency, amount, reference, meta } = req.body || {};
    if (!wallet || !currency || amount === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const w = normWallet(wallet);
    const amt = num(amount);
    if (!(amt > 0)) return res.status(400).json({ error: "Invalid amount" });

    const ref = reference || mkRef("pay");
    const onlyRecord = Boolean(meta?.onlyRecord);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let balanceRow: any = null;

      if (!onlyRecord) {
        const bal = await client.query(
          `select balance from fiat_balances where wallet=$1 and currency=$2`,
          [w, currency]
        );

        if (!bal.rows.length || Number(bal.rows[0].balance) < amt) {
          throw new Error("Insufficient balance");
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

      return res.json({ ok: true, reference: ref, tx: txRes.rows[0], balance: balanceRow });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("fiat payment error:", e);
    return res.status(500).json({ error: e?.message || "Payment failed" });
  }
});

router.get("/balance", async (req, res) => {
  try {
    const { wallet, currency } = req.query as any;
    if (!wallet || !currency) {
      return res.status(400).json({ error: "Missing wallet or currency" });
    }

    const r = await pool.query(
      `select * from fiat_balances where wallet=$1 and currency=$2`,
      [normWallet(wallet), currency]
    );

    return res.json(
      r.rows[0] || {
        wallet: normWallet(wallet),
        currency,
        balance: "0",
        updated_at: null,
      }
    );
  } catch (e: any) {
    console.error("fiat balance error:", e);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

router.get("/txs", async (req, res) => {
  try {
    const { wallet, limit = "50", offset = "0" } = req.query as any;
    if (!wallet) return res.status(400).json({ error: "Missing wallet" });

    const lim = Math.min(Number(limit) || 50, 100);
    const off = Number(offset) || 0;

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

    return res.json({ ok: true, rows: r.rows, limit: lim, offset: off });
  } catch (e: any) {
    console.error("fiat txs error:", e);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;