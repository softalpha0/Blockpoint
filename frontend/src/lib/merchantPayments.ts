import { dbQuery } from "@/lib/db";

export type CreateInvoiceInput = {
  merchantWallet: string;
  token: string;
  amount: string | number;
  expiry?: any;
};

export type MerchantActivityRow =
  | {
      kind: "invoice_created";
      ts: number;
      invoice_id: string;
      invoice_code: string | null;
      merchant_id: string;
      token: string;
      amount: string;
      status: string;
      paid: boolean;
    }
  | {
      kind: "invoice_paid";
      ts: number;
      invoice_id: string;
      invoice_code: string | null;
      merchant_id: string;
      token: string;
      amount: string;
      payer_wallet: string | null;
      tx_hash: string | null;
      chain_id: number;
      status: string;
    };

function normWallet(w: string) {
  return String(w || "").toLowerCase().trim();
}

function genCode(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizeExpiryToUnixSeconds(raw: any): number {
  const nowSec = Math.floor(Date.now() / 1000);

  if (raw === null || raw === undefined || raw === "") {
    return nowSec + 30 * 60;
  }

  if (typeof raw === "string" && raw.includes("-") && raw.includes(":")) {
    const t = Date.parse(raw);
    if (Number.isFinite(t)) return Math.floor(t / 1000);
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) return nowSec + 30 * 60;

  
  if (n > 1e12) return Math.floor(n / 1000);

  if (n > 0 && n < 60 * 24 * 365) {

    if (n > 1e9) return Math.floor(n);
    return nowSec + Math.floor(n * 60);
  }

  if (n > 0) return Math.floor(n);

  return nowSec + 30 * 60;
}

export async function getInvoiceByCode(code: string) {
  const c = String(code || "").trim();
  if (!c) return null;

  const res = await dbQuery(
    `
    SELECT
      invoice_id,
      invoice_code,
      merchant_id,
      token,
      amount::text as amount,
      expiry,
      paid,
      payer,
      paid_tx,
      created_tx,
      created_at,
      paid_at,
      status::text as status
    FROM public.invoices
    WHERE invoice_code = $1
    LIMIT 1
    `,
    [c]
  );

  return res.rows[0] ?? null;
}

async function ensureMerchantId(wallet: string) {
  const w = normWallet(wallet);
  if (!w) throw new Error("Missing merchant wallet");
  return w;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const merchantId = await ensureMerchantId(input.merchantWallet);

  const token = String(input.token || "").trim();
  if (!token) throw new Error("Missing token");

  const amount = String(input.amount);
  if (!amount || Number(amount) <= 0) throw new Error("Invalid amount");

  const expiry = normalizeExpiryToUnixSeconds(input.expiry);
  if (!Number.isFinite(expiry) || expiry <= 0) throw new Error("Invalid expiry");

  let code = genCode(12);
  for (let i = 0; i < 12; i++) {
    const exists = await dbQuery(`SELECT 1 FROM public.invoices WHERE invoice_code=$1 LIMIT 1`, [code]);
    if (!exists.rowCount) break;
    code = genCode(12);
  }

  const invoiceId = `inv_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const res = await dbQuery(
    `
    INSERT INTO public.invoices (
      invoice_id,
      merchant_id,
      token,
      amount,
      expiry,
      paid,
      status,
      invoice_code
    )
    VALUES ($1,$2,$3,$4,$5,false,'open',$6)
    RETURNING
      invoice_id,
      invoice_code,
      merchant_id,
      token,
      amount::text as amount,
      expiry,
      paid,
      payer,
      paid_tx,
      created_tx,
      created_at,
      paid_at,
      status::text as status
    `,
    [invoiceId, merchantId, token, amount, expiry, code]
  );

  return res.rows[0];
}

export async function markInvoicePaid(args: {
  invoiceCode: string;
  payerWallet?: string;
  txHash?: string;
  chainId?: number;
  tokenAddress?: string;
}) {
  const code = String(args.invoiceCode || "").trim();
  if (!code) throw new Error("Missing invoiceCode");

  const up = await dbQuery(
    `
    UPDATE public.invoices
    SET
      paid = true,
      status = 'paid',
      paid_at = COALESCE(paid_at, now()),
      payer = COALESCE(payer, NULLIF($2,'')),
      paid_tx = COALESCE(paid_tx, NULLIF($3,''))
    WHERE invoice_code = $1
    RETURNING
      invoice_id,
      invoice_code,
      merchant_id,
      token,
      amount::text as amount,
      expiry,
      paid,
      payer,
      paid_tx,
      created_tx,
      created_at,
      paid_at,
      status::text as status
    `,
    [code, normWallet(args.payerWallet || ""), String(args.txHash || "")]
  );

  const invoice = up.rows[0] ?? null;
  if (!invoice) return null;

  await dbQuery(
    `
    INSERT INTO public.invoice_payments (
      invoice_id,
      payer_wallet,
      tx_hash,
      status,
      amount,
      chain_id,
      token_address,
      raw
    )
    VALUES (
      $1,
      NULLIF($2,''),
      NULLIF($3,''),
      'confirmed',
      $4::numeric,
      $5::int,
      NULLIF($6,''),
      $7::jsonb
    )
    `,
    [
      String(invoice.invoice_id),
      normWallet(args.payerWallet || ""),
      String(args.txHash || ""),
      String(invoice.amount),
      Number.isFinite(args.chainId as any) ? Number(args.chainId) : 84532,
      String(args.tokenAddress || ""),
      JSON.stringify({ source: "demo", invoiceCode: code }),
    ]
  ).catch(() => {});

  return invoice;
}

export async function listMerchantActivity(wallet: string, limit = 50): Promise<MerchantActivityRow[]> {
  const w = normWallet(wallet);
  if (!w) return [];

  const lim = Math.max(1, Math.min(200, Number(limit) || 50));

  const res = await dbQuery(
    `
    WITH created AS (
      SELECT
        'invoice_created'::text AS kind,
        (EXTRACT(EPOCH FROM i.created_at) * 1000)::bigint AS ts,
        i.invoice_id,
        i.invoice_code,
        i.merchant_id,
        i.token,
        i.amount::text AS amount,
        i.status::text AS status,
        i.paid AS paid,
        NULL::text AS payer_wallet,
        NULL::text AS tx_hash,
        NULL::int  AS chain_id
      FROM public.invoices i
      WHERE lower(i.merchant_id) = $1
    ),
    paid AS (
      SELECT
        'invoice_paid'::text AS kind,
        (EXTRACT(EPOCH FROM COALESCE(p.created_at, i.paid_at, now())) * 1000)::bigint AS ts,
        i.invoice_id,
        i.invoice_code,
        i.merchant_id,
        i.token,
        i.amount::text AS amount,
        p.status::text AS status,
        TRUE AS paid,
        p.payer_wallet,
        p.tx_hash,
        p.chain_id
      FROM public.invoices i
      JOIN public.invoice_payments p
        ON p.invoice_id = i.invoice_id
      WHERE lower(i.merchant_id) = $1
    )
    SELECT * FROM created
    UNION ALL
    SELECT * FROM paid
    ORDER BY ts DESC
    LIMIT $2
    `,
    [w, lim]
  );

  return res.rows.map((r: any) => {
    if (r.kind === "invoice_paid") {
      return {
        kind: "invoice_paid",
        ts: Number(r.ts),
        invoice_id: String(r.invoice_id),
        invoice_code: r.invoice_code ? String(r.invoice_code) : null,
        merchant_id: String(r.merchant_id),
        token: String(r.token),
        amount: String(r.amount),
        payer_wallet: r.payer_wallet ? String(r.payer_wallet) : null,
        tx_hash: r.tx_hash ? String(r.tx_hash) : null,
        chain_id: Number(r.chain_id ?? 84532),
        status: String(r.status),
      };
    }

    return {
      kind: "invoice_created",
      ts: Number(r.ts),
      invoice_id: String(r.invoice_id),
      invoice_code: r.invoice_code ? String(r.invoice_code) : null,
      merchant_id: String(r.merchant_id),
      token: String(r.token),
      amount: String(r.amount),
      status: String(r.status),
      paid: Boolean(r.paid),
    };
  });
}
