"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { openAppKit } from "@/lib/wallet";

type Invoice = {
  invoice_id: string;
  invoice_code: string;
  merchant_id: string;
  token: string;
  amount: string;
  status: string;
  paid: boolean;
  payer?: string | null;
  created_at: string;
  paid_at?: string | null;
};

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function PayClient({ code }: { code: string }) {
  const { address, isConnected } = useAccount();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canLoad = useMemo(() => code && code !== "undefined" && code !== "null", [code]);

  async function load() {
    setErr(null);
    setMsg(null);
    if (!canLoad) {
      setInvoice(null);
      setLoading(false);
      setErr("Invalid payment link (missing code).");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`/api/payments/invoices/${encodeURIComponent(code)}`, { cache: "no-store" });
      const j = await safeJson(r);

      if (!r.ok) {
        setInvoice(null);
        setErr(j?.error || `Failed to load invoice (${r.status})`);
        return;
      }

      setInvoice(j?.invoice || null);
    } catch (e: any) {
      setInvoice(null);
      setErr(e?.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }

  async function markPaidDemo() {
    setErr(null);
    setMsg(null);
    if (!canLoad) return;

    setPaying(true);
    try {
      const r = await fetch(`/api/payments/invoices/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          payerWallet: address || undefined,
          txHash: "0xDEMO_TX_HASH",
          chainId: 84532,
          tokenAddress: invoice?.token || undefined,
        }),
      });

      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || `Pay failed (${r.status})`);

      setMsg("✅ Marked as paid (demo).");
      setInvoice(j?.invoice || null);
    } catch (e: any) {
      setErr(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  useEffect(() => {
    load();
  }, [code]);

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1" style={{ marginBottom: 8 }}>Pay Invoice</h1>
        <p className="p" style={{ color: "var(--muted)" }}>
          Code: <span style={{ color: "var(--text)" }}>{code || "—"}</span>
        </p>

        {loading ? (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>Loading…</strong>
            <p className="p" style={{ marginTop: 6 }}>Fetching invoice details.</p>
          </div>
        ) : err ? (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>⚠️ Error</strong>
            <p className="p" style={{ marginTop: 6 }}>{err}</p>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn" onClick={load}>Retry</button>
              <Link className="btn btnPrimary" href="/dashboard">Go to Dashboard</Link>
            </div>
          </div>
        ) : invoice ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <div><strong>Status:</strong> {invoice.status}{invoice.paid ? " ✅" : ""}</div>
              <div><strong>Amount:</strong> {String(invoice.amount)}</div>
              <div><strong>Token:</strong> {invoice.token}</div>
              <div><strong>Merchant:</strong> {shortAddr(invoice.merchant_id)}</div>
              {invoice.payer ? <div><strong>Payer:</strong> {shortAddr(invoice.payer)}</div> : null}
              {invoice.paid_at ? <div><strong>Paid at:</strong> {invoice.paid_at}</div> : null}
            </div>

            <div className="actions" style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!isConnected ? (
                <button className="btn btnPrimary" onClick={() => openAppKit()}>
                  Connect wallet
                </button>
              ) : (
                <button className="btn" disabled>
                  Connected: {shortAddr(address)}
                </button>
              )}

              <button className="btn btnPrimary" onClick={markPaidDemo} disabled={paying || invoice.paid}>
                {invoice.paid ? "Paid" : paying ? "Paying…" : "Pay (demo)"}
              </button>

              <button className="btn" onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>

            {msg ? <p className="p" style={{ marginTop: 10 }}>{msg}</p> : null}
            {err ? <p className="p" style={{ marginTop: 10 }}>⚠️ {err}</p> : null}

            <p className="p" style={{ marginTop: 10, color: "var(--muted)" }}>
              Demo mode marks the invoice paid in Postgres. Onchain payment + indexer wiring can be added next.
            </p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>Invoice not found</strong>
            <p className="p" style={{ marginTop: 6 }}>This pay link doesn’t match an invoice.</p>
          </div>
        )}
      </div>
    </div>
  );
}
