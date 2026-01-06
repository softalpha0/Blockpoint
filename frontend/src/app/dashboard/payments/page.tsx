
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
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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
      const res = await fetch(`/api/payments/invoices?merchantWallet=${encodeURIComponent(merchantWallet)}`, { cache: "no-store" });
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
        <p className="p">{connected ? `Connected: ${shortAddr(address)}` : "Connect your wallet to create and manage invoices."}</p>

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
                  <Link className="btn btnPrimary" href={`/pay/${r.invoice_code}`}>Open pay page</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
