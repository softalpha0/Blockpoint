
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(relPath, content) {
  const abs = path.join(ROOT, relPath);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, content, "utf8");
  console.log("✅ wrote", relPath);
}

const SQL = `-- Merchants
create extension if not exists pgcrypto;

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text not null,
  display_name text not null default 'Merchant',
  public_slug text not null unique,
  default_chain_id int not null default 84532,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchants_owner_wallet_idx on merchants (owner_wallet);

-- Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  invoice_code text not null unique,
  status text not null check (status in ('draft','pending','paid','expired','cancelled')) default 'pending',
  chain_id int not null default 84532,
  token_address text,
  token_symbol text not null,
  amount text not null,
  amount_wei text not null,
  to_address text not null,
  memo text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_merchant_id_idx on invoices (merchant_id);
create index if not exists invoices_status_idx on invoices (status);

-- Payments (payment attempts)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  status text not null check (status in ('detected','confirmed','failed','underpaid','overpaid')) default 'detected',
  tx_hash text not null unique,
  from_address text not null,
  to_address text not null,
  chain_id int not null,
  token_address text,
  amount_wei text not null,
  block_number bigint,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_id_idx on payments (invoice_id);
create index if not exists payments_status_idx on payments (status);

-- Updated-at triggers (optional)
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    create function set_updated_at() returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'merchants_set_updated_at') then
    create trigger merchants_set_updated_at
    before update on merchants
    for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'invoices_set_updated_at') then
    create trigger invoices_set_updated_at
    before update on invoices
    for each row execute function set_updated_at();
  end if;
end
$$;
`;

const DB_TS = `import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __bp_pool: Pool | undefined;
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");
  return url;
}

export function db() {
  if (!global.__bp_pool) {
    global.__bp_pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return global.__bp_pool;
}

export async function q<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const pool = db();
  return pool.query(text, params);
}

export function normWallet(w: string) {
  return (w || "").trim().toLowerCase();
}

export function isHexAddress(w?: string) {
  const s = (w || "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}
`;

const PAYMENTS_TS = `export function makeInvoiceCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "BP-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function slugFromWallet(wallet: string) {
  const w = wallet.toLowerCase();
  return \`bp-\${w.slice(-6)}\`;
}

// light converter (good for demo). For production: use viem parseUnits with token decimals.
export function amountToWeiString(amount: string, decimals: number) {
  const a = (amount || "").trim();
  if (!a) return "0";
  const [i, f = ""] = a.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const cleanInt = (i || "0").replace(/[^\\d]/g, "") || "0";
  const cleanFrac = frac.replace(/[^\\d]/g, "");
  const combined = \`\${cleanInt}\${cleanFrac}\`.replace(/^0+/, "") || "0";
  return combined;
}
`;

const ENSURE_ROUTE = `import { NextResponse } from "next/server";
import { isHexAddress, normWallet, q } from "@/lib/db";
import { slugFromWallet } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ownerWallet = normWallet(body?.ownerWallet || "");
    const displayName = String(body?.displayName || "Merchant").slice(0, 60);

    if (!isHexAddress(ownerWallet)) {
      return NextResponse.json({ error: "Invalid ownerWallet" }, { status: 400 });
    }

    const existing = await q(
      \`select id, owner_wallet, display_name, public_slug, default_chain_id
       from merchants
       where owner_wallet = $1
       limit 1\`,
      [ownerWallet]
    );

    if (existing.rows[0]) {
      return NextResponse.json({ merchant: existing.rows[0] });
    }

    const baseSlug = slugFromWallet(ownerWallet);
    let slug = baseSlug;

    for (let i = 0; i < 10; i++) {
      const clash = await q(\`select 1 from merchants where public_slug = $1 limit 1\`, [slug]);
      if (!clash.rows.length) break;
      slug = \`\${baseSlug}-\${Math.floor(Math.random() * 9999)}\`;
    }

    const created = await q(
      \`insert into merchants (owner_wallet, display_name, public_slug)
       values ($1, $2, $3)
       returning id, owner_wallet, display_name, public_slug, default_chain_id\`,
      [ownerWallet, displayName, slug]
    );

    return NextResponse.json({ merchant: created.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to ensure merchant" }, { status: 500 });
  }
}
`;

const INVOICES_ROUTE = `import { NextResponse } from "next/server";
import { isHexAddress, normWallet, q } from "@/lib/db";
import { amountToWeiString, makeInvoiceCode } from "@/lib/payments";

export const dynamic = "force-dynamic";

type CreateInvoiceBody = {
  merchantWallet: string;
  tokenSymbol: string;
  tokenAddress?: string | null;
  chainId?: number;
  amount: string;
  toAddress: string;
  memo?: string;
  expiresAt?: string | null;
};

function decimalsForSymbol(sym: string) {
  const s = (sym || "").toUpperCase();
  if (s === "USDC" || s === "USDT") return 6;
  return 18;
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as CreateInvoiceBody;

    const merchantWallet = normWallet(b.merchantWallet || "");
    const toAddress = normWallet(b.toAddress || "");
    const tokenSymbol = String(b.tokenSymbol || "").toUpperCase();
    const tokenAddress = b.tokenAddress ? normWallet(String(b.tokenAddress)) : null;
    const chainId = Number(b.chainId || 84532);
    const amount = String(b.amount || "").trim();
    const memo = b.memo ? String(b.memo).slice(0, 180) : null;
    const expiresAt = b.expiresAt ? new Date(String(b.expiresAt)) : null;

    if (!isHexAddress(merchantWallet)) return NextResponse.json({ error: "Invalid merchantWallet" }, { status: 400 });
    if (!isHexAddress(toAddress)) return NextResponse.json({ error: "Invalid toAddress" }, { status: 400 });
    if (!tokenSymbol) return NextResponse.json({ error: "Missing tokenSymbol" }, { status: 400 });

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const m = await q(\`select id from merchants where owner_wallet = $1 limit 1\`, [merchantWallet]);
    let merchantId = m.rows[0]?.id;

    if (!merchantId) {
      const slug = \`bp-\${merchantWallet.slice(-6)}\`;
      const created = await q(
        \`insert into merchants (owner_wallet, display_name, public_slug)
         values ($1, 'Merchant', $2)
         returning id\`,
        [merchantWallet, slug]
      );
      merchantId = created.rows[0].id;
    }

    let code = makeInvoiceCode();
    for (let i = 0; i < 10; i++) {
      const exists = await q(\`select 1 from invoices where invoice_code = $1 limit 1\`, [code]);
      if (!exists.rows.length) break;
      code = makeInvoiceCode();
    }

    const decimals = decimalsForSymbol(tokenSymbol);
    const amountWei = amountToWeiString(amount, decimals);

    const created = await q(
      \`insert into invoices
       (merchant_id, invoice_code, status, chain_id, token_address, token_symbol, amount, amount_wei, to_address, memo, expires_at)
       values
       ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10)
       returning
       id, invoice_code, status, chain_id, token_address, token_symbol, amount, amount_wei, to_address, memo, expires_at, created_at\`,
      [merchantId, code, chainId, tokenAddress, tokenSymbol, amount, amountWei, toAddress, memo, expiresAt]
    );

    const invoice = created.rows[0];
    return NextResponse.json({ invoice, payUrl: \`/pay/\${invoice.invoice_code}\` });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create invoice" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const merchantWallet = normWallet(searchParams.get("merchantWallet") || "");
    if (!isHexAddress(merchantWallet)) {
      return NextResponse.json({ error: "merchantWallet required" }, { status: 400 });
    }

    const m = await q(\`select id from merchants where owner_wallet = $1 limit 1\`, [merchantWallet]);
    const merchantId = m.rows[0]?.id;
    if (!merchantId) return NextResponse.json({ rows: [] });

    await q(
      \`update invoices
       set status = 'expired'
       where merchant_id = $1
         and status = 'pending'
         and expires_at is not null
         and expires_at < now()\`,
      [merchantId]
    );

    const rows = await q(
      \`select
        id, invoice_code, status, chain_id, token_address, token_symbol,
        amount, amount_wei, to_address, memo, expires_at, paid_at, created_at, updated_at
       from invoices
       where merchant_id = $1
       order by created_at desc
       limit 200\`,
      [merchantId]
    );

    return NextResponse.json({ rows: rows.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list invoices" }, { status: 500 });
  }
}
`;

const INVOICE_BY_CODE = `import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await ctx.params;
    const invoiceCode = String(code || "").trim();

    const r = await q(
      \`select
        i.id, i.invoice_code, i.status, i.chain_id, i.token_address, i.token_symbol,
        i.amount, i.amount_wei, i.to_address, i.memo, i.expires_at, i.paid_at, i.created_at,
        m.display_name as merchant_name, m.public_slug as merchant_slug, m.owner_wallet as merchant_wallet
       from invoices i
       join merchants m on m.id = i.merchant_id
       where i.invoice_code = $1
       limit 1\`,
      [invoiceCode]
    );

    const invoice = r.rows[0];
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (invoice.status === "pending" && invoice.expires_at && new Date(invoice.expires_at).getTime() < Date.now()) {
      await q(\`update invoices set status = 'expired' where id = $1\`, [invoice.id]);
      invoice.status = "expired";
    }

    const payRows = await q(
      \`select id, status, tx_hash, from_address, to_address, chain_id, token_address, amount_wei, block_number, confirmed_at, created_at
       from payments
       where invoice_id = $1
       order by created_at desc
       limit 30\`,
      [invoice.id]
    );

    return NextResponse.json({ invoice, payments: payRows.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load invoice" }, { status: 500 });
  }
}
`;

const PAYMENTS_ROUTE = `import { NextResponse } from "next/server";
import { isHexAddress, normWallet, q } from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = {
  invoiceCode: string;
  txHash: string;
  fromAddress: string;
  chainId?: number;
  tokenAddress?: string | null;
  amountWei?: string;
};

function isTxHash(s: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;

    const invoiceCode = String(b.invoiceCode || "").trim();
    const txHash = String(b.txHash || "").trim();
    const fromAddress = normWallet(b.fromAddress || "");
    const chainId = Number(b.chainId || 84532);
    const tokenAddress = b.tokenAddress ? normWallet(String(b.tokenAddress)) : null;
    const amountWei = String(b.amountWei || "0").trim();

    if (!invoiceCode) return NextResponse.json({ error: "Missing invoiceCode" }, { status: 400 });
    if (!isTxHash(txHash)) return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
    if (!isHexAddress(fromAddress)) return NextResponse.json({ error: "Invalid fromAddress" }, { status: 400 });

    const inv = await q(
      \`select id, status, to_address, chain_id, token_address, amount_wei
       from invoices
       where invoice_code = $1
       limit 1\`,
      [invoiceCode]
    );
    const invoice = inv.rows[0];
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (invoice.status === "cancelled" || invoice.status === "expired") {
      return NextResponse.json({ error: \`Invoice is \${invoice.status}\` }, { status: 400 });
    }

    const created = await q(
      \`insert into payments (invoice_id, status, tx_hash, from_address, to_address, chain_id, token_address, amount_wei)
       values ($1, 'detected', $2, $3, $4, $5, $6, $7)
       on conflict (tx_hash) do update set invoice_id = excluded.invoice_id
       returning id, status, tx_hash, created_at\`,
      [invoice.id, txHash, fromAddress, invoice.to_address, chainId, tokenAddress, amountWei]
    );

    return NextResponse.json({ payment: created.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to submit payment" }, { status: 500 });
  }
}
`;

const VERIFY_ROUTE = `import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const dynamic = "force-dynamic";

function isTxHash(s: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const { txHash } = await req.json();
    const hash = String(txHash || "").trim();
    if (!isTxHash(hash)) return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });

    const rpc = process.env.BASE_SEPOLIA_RPC_URL;
    if (!rpc) {
      return NextResponse.json({ error: "BASE_SEPOLIA_RPC_URL not set (verification disabled)" }, { status: 400 });
    }

    const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
    const receipt = await client.getTransactionReceipt({ hash: hash });

    const ok = receipt.status === "success";
    const blockNumber = receipt.blockNumber ? Number(receipt.blockNumber) : null;

    await q(
      \`update payments
       set status = $1,
           block_number = $2,
           confirmed_at = case when $1 = 'confirmed' then now() else confirmed_at end
       where tx_hash = $3\`,
      [ok ? "confirmed" : "failed", blockNumber, hash]
    );

    if (ok) {
      await q(
        \`update invoices
         set status = 'paid',
             paid_at = now()
         where id = (select invoice_id from payments where tx_hash = $1 limit 1)
           and status = 'pending'\`,
        [hash]
      );
    }

    return NextResponse.json({
      receipt: { status: receipt.status, blockNumber },
      updated: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.shortMessage || e?.message || "Verify failed" }, { status: 500 });
  }
}
`;

const DASHBOARD_PAYMENTS_PAGE = `/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

type InvoiceRow = {
  id: string;
  invoice_code: string;
  status: "draft" | "pending" | "paid" | "expired" | "cancelled";
  chain_id: number;
  token_symbol: string;
  token_address: string | null;
  amount: string;
  amount_wei: string;
  to_address: string;
  memo: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
};

function shortAddr(a?: string) {
  if (!a) return "";
  return \`\${a.slice(0, 6)}…\${a.slice(-4)}\`;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

const TOKENS = [
  { symbol: "USDC", address: "" },
  { symbol: "USDT", address: "" },
  { symbol: "ETH", address: null },
];

export default function PaymentsDashboardPage() {
  const { address, isConnected } = useAccount();
  const merchantWallet = useMemo(() => (address || "").toLowerCase(), [address]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [tokenSymbol, setTokenSymbol] = useState("USDC");
  const [amount, setAmount] = useState("10.00");
  const [toAddress, setToAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [createdPayUrl, setCreatedPayUrl] = useState<string>("");

  async function ensureMerchant() {
    if (!merchantWallet) return;
    await fetch("/api/payments/merchant/ensure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ownerWallet: merchantWallet, displayName: "Merchant" }),
    });
  }

  async function loadInvoices() {
    setErr(null);
    if (!merchantWallet) { setRows([]); return; }
    setLoading(true);
    try {
      await ensureMerchant();
      const res = await fetch(\`/api/payments/invoices?merchantWallet=\${encodeURIComponent(merchantWallet)}\`, { cache: "no-store" });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || "Failed to load invoices");
      setRows(Array.isArray(j?.rows) ? j.rows : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  async function createInvoice() {
    setErr(null);
    setCreatedPayUrl("");
    try {
      if (!merchantWallet) throw new Error("Connect your wallet first");

      const h = Number(expiresHours);
      const expiresAt = Number.isFinite(h) && h > 0 ? new Date(Date.now() + h * 3600_000).toISOString() : null;

      const chosen = TOKENS.find((t) => t.symbol === tokenSymbol);
      const tokenAddress = chosen?.symbol === "ETH" ? null : chosen?.address || null;

      const res = await fetch("/api/payments/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          merchantWallet,
          tokenSymbol,
          tokenAddress,
          chainId: 84532,
          amount,
          toAddress: (toAddress || merchantWallet).toLowerCase(),
          memo: memo || "",
          expiresAt,
        }),
      });

      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || "Failed to create invoice");

      setCreatedPayUrl(j?.payUrl || "");
      setAmount("10.00");
      setMemo("");
      await loadInvoices();
    } catch (e: any) {
      setErr(e?.message || "Failed to create invoice");
    }
  }

  useEffect(() => {
    if (!mounted) return;
    loadInvoices();
  }, [mounted, merchantWallet]);

  const connected = mounted && isConnected && !!address;

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/savings">Savings Vault</Link>
          <Link href="/lock">Lock Vault</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/payments">Merchant Payments</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1" style={{ marginBottom: 8 }}>Merchant Payments</h1>
        <p className="p">{connected ? \`Connected: \${shortAddr(address)}\` : "Connect your wallet to create and manage invoices."}</p>

        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card">
            <strong>Create invoice</strong>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Token
                <select value={tokenSymbol} onChange={(e) => setTokenSymbol(e.target.value)} className="input" style={{ width: "100%", marginTop: 6 }}>
                  {TOKENS.map((t) => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
                </select>
              </label>

              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Amount
                <input className="input" style={{ width: "100%", marginTop: 6 }} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>

              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Receive to (optional)
                <input className="input" style={{ width: "100%", marginTop: 6 }} placeholder="Defaults to your connected wallet" value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
              </label>

              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Memo (optional)
                <input className="input" style={{ width: "100%", marginTop: 6 }} placeholder="e.g. Website design" value={memo} onChange={(e) => setMemo(e.target.value)} />
              </label>

              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Expiry (hours)
                <input className="input" style={{ width: "100%", marginTop: 6 }} inputMode="numeric" value={expiresHours} onChange={(e) => setExpiresHours(e.target.value)} />
              </label>

              <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btnPrimary" onClick={createInvoice} disabled={!connected}>Create invoice</button>
                <button className="btn" onClick={loadInvoices} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
              </div>

              {createdPayUrl ? (
                <p className="p" style={{ marginTop: 8 }}>
                  ✅ Invoice created:{" "}
                  <Link href={createdPayUrl} style={{ color: "var(--text)", textDecoration: "underline" }}>
                    {createdPayUrl}
                  </Link>
                </p>
              ) : null}

              {err ? <p className="p">⚠️ {err}</p> : null}
            </div>
          </div>

          <div className="card">
            <strong>How it works</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Create an invoice → share the link → customer pays → paste tx hash → (optional) verify with RPC.
            </p>
            <p className="p" style={{ marginTop: 8, color: "var(--muted)" }}>
              Tip: set <code>BASE_SEPOLIA_RPC_URL</code> to enable verification.
            </p>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Your invoices</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{rows.length} items</span>
        </div>

        {!rows.length ? (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>No invoices yet</strong>
            <p className="p" style={{ marginTop: 6 }}>Create your first invoice to see it here.</p>
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div className="card" key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>{r.invoice_code} • {r.token_symbol} {r.amount}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>
                    Status: <span style={{ color: "var(--text)" }}>{r.status}</span>
                  </span>
                </div>

                <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                  To: <span style={{ color: "var(--text)" }}>{shortAddr(r.to_address)}</span>
                  {r.memo ? <> • Memo: <span style={{ color: "var(--text)" }}>{r.memo}</span></> : null}
                </div>

                <div className="actions" style={{ marginTop: 10 }}>
                  <Link className="btn btnPrimary" href={\`/pay/\${r.invoice_code}\`}>Open pay page</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
`;

const PAY_PAGE = `/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

type Invoice = {
  id: string;
  invoice_code: string;
  status: string;
  chain_id: number;
  token_address: string | null;
  token_symbol: string;
  amount: string;
  amount_wei: string;
  to_address: string;
  memo: string | null;
  expires_at: string | null;
  created_at: string;
  merchant_name: string;
  merchant_slug: string;
  merchant_wallet: string;
};

type Payment = {
  id: string;
  status: string;
  tx_hash: string;
  from_address: string;
  created_at: string;
  confirmed_at: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

function shortAddr(a?: string) {
  if (!a) return "";
  return \`\${a.slice(0, 6)}…\${a.slice(-4)}\`;
}

export default function PayInvoicePage({ params }: { params: { code: string } }) {
  const code = params.code;
  const { address, isConnected } = useAccount();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const basescanTx = useMemo(() => {
    const h = txHash.trim();
    if (!h.startsWith("0x")) return "";
    return \`https://sepolia.basescan.org/tx/\${h}\`;
  }, [txHash]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(\`/api/payments/invoices/\${encodeURIComponent(code)}\`, { cache: "no-store" });
      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || "Failed to load invoice");
      setInvoice(j.invoice);
      setPayments(Array.isArray(j.payments) ? j.payments : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load invoice");
      setInvoice(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [code]);

  async function submitPaymentAttempt() {
    setVerifyMsg(null);
    setErr(null);
    setSubmitting(true);
    try {
      if (!invoice) throw new Error("Invoice not loaded");
      if (!txHash.trim()) throw new Error("Paste the transaction hash");

      const from = (address || "0x0000000000000000000000000000000000000000").toLowerCase();

      const res = await fetch("/api/payments/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceCode: invoice.invoice_code,
          txHash: txHash.trim(),
          fromAddress: from,
          chainId: invoice.chain_id,
          tokenAddress: invoice.token_address,
          amountWei: "0",
        }),
      });

      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || "Failed to submit");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyTx() {
    setVerifyMsg(null);
    setErr(null);
    setVerifyBusy(true);
    try {
      if (!txHash.trim()) throw new Error("Paste the transaction hash first");

      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash: txHash.trim() }),
      });

      const j = await safeJson(res);
      if (!res.ok) throw new Error(j?.error || "Verification failed");

      setVerifyMsg(\`✅ Verified: \${j?.receipt?.status} (block \${j?.receipt?.blockNumber ?? "?"})\`);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Verify failed");
    } finally {
      setVerifyBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard/payments">Merchant Payments</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1" style={{ marginBottom: 8 }}>Pay Invoice</h1>

        {loading ? (
          <div className="card" style={{ marginTop: 12 }}><strong>Loading…</strong></div>
        ) : err ? (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>⚠️ Error</strong>
            <p className="p" style={{ marginTop: 6 }}>{err}</p>
          </div>
        ) : invoice ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong>{invoice.invoice_code} • {invoice.token_symbol} {invoice.amount}</strong>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  Status: <span style={{ color: "var(--text)" }}>{invoice.status}</span>
                </span>
              </div>

              <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                Merchant: <span style={{ color: "var(--text)" }}>{invoice.merchant_name}</span>
              </div>

              <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                Pay to: <span style={{ color: "var(--text)" }}>{invoice.to_address}</span>
              </div>

              {invoice.memo ? (
                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                  Memo: <span style={{ color: "var(--text)" }}>{invoice.memo}</span>
                </div>
              ) : null}

              {invoice.expires_at ? (
                <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                  Expires: <span style={{ color: "var(--text)" }}>{new Date(invoice.expires_at).toUTCString()}</span>
                </div>
              ) : null}
            </div>

            <div className="card">
              <strong>After you pay</strong>
              <p className="p" style={{ marginTop: 6 }}>
                Paste your transaction hash below so the merchant can track it.
              </p>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <input className="input" placeholder="0x… transaction hash" value={txHash} onChange={(e) => setTxHash(e.target.value)} />

                <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn btnPrimary" onClick={submitPaymentAttempt} disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit tx hash"}
                  </button>
                  <button className="btn" onClick={verifyTx} disabled={verifyBusy}>
                    {verifyBusy ? "Verifying…" : "Verify tx (optional)"}
                  </button>
                  {basescanTx ? (
                    <a className="btn" href={basescanTx} target="_blank" rel="noreferrer">View on Basescan</a>
                  ) : null}
                </div>

                {verifyMsg ? <p className="p">{verifyMsg}</p> : null}

                <p className="p" style={{ marginTop: 6, color: "var(--muted)" }}>
                  Your wallet:{" "}
                  <span style={{ color: "var(--text)" }}>{isConnected && address ? shortAddr(address) : "not connected"}</span>
                </p>
              </div>
            </div>

            <div className="card">
              <strong>Payment attempts</strong>
              {!payments.length ? (
                <p className="p" style={{ marginTop: 6 }}>None submitted yet.</p>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {payments.map((p) => (
                    <div key={p.id} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <strong>{shortAddr(p.tx_hash)}</strong>
                        <span style={{ color: "var(--muted)", fontSize: 13 }}>
                          Status: <span style={{ color: "var(--text)" }}>{p.status}</span>
                        </span>
                      </div>
                      <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                        From: <span style={{ color: "var(--text)" }}>{shortAddr(p.from_address)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
`;

// ---- WRITE FILES ----
writeFile("sql/merchant_payments.sql", SQL);

writeFile("frontend/src/lib/db.ts", DB_TS);
writeFile("frontend/src/lib/payments.ts", PAYMENTS_TS);

writeFile("frontend/src/app/api/payments/merchant/ensure/route.ts", ENSURE_ROUTE);
writeFile("frontend/src/app/api/payments/invoices/route.ts", INVOICES_ROUTE);
writeFile("frontend/src/app/api/payments/invoices/[code]/route.ts", INVOICE_BY_CODE);
writeFile("frontend/src/app/api/payments/payments/route.ts", PAYMENTS_ROUTE);
writeFile("frontend/src/app/api/payments/verify/route.ts", VERIFY_ROUTE);

writeFile("frontend/src/app/dashboard/payments/page.tsx", DASHBOARD_PAYMENTS_PAGE);
writeFile("frontend/src/app/pay/[code]/page.tsx", PAY_PAGE);

console.log("\n✅ Done. Next steps:");
console.log("1) Run the SQL: sql/merchant_payments.sql");
console.log("2) Ensure DATABASE_URL is set (local + Vercel).");
console.log("3) (Optional) set BASE_SEPOLIA_RPC_URL for verification.");
console.log("4) Start dev server: cd frontend && npm run dev");
