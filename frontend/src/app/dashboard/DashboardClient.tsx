"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

type MerchantActivityRow = {
  kind: "invoice_created" | "invoice_paid";
  ts: string;
  invoice_code: string;
  invoice_id: string;
  token: string;
  amount: string;
  status: string;
  payer?: string | null;
  tx_hash?: string | null;
};

type ActivityRow = {
  ts: number; // ms
  chainId?: number;
  contract?: string;
  txHash?: string;
  blockNumber?: number;
  event?: string;
  user?: string;
  token?: string;
  amount?: string;
  raw?: any;
};

type FiatTx = {
  id: string;
  wallet: string;
  currency: string;
  type: "deposit" | "withdraw" | "payment";
  amount: string;
  status: string;
  reference: string;
  meta: any;
  created_at: string;
};

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function dayKeyFromMs(ms: number) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function dayLabelUTC(key: string) {
  return `${key} (UTC)`;
}
function timeLabelUTC(ms: number) {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm} UTC`;
}

const CURRENCIES = ["NGN", "USD", "GHS", "KES", "ZAR"];

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const connected = mounted && isConnected && !!address;

  // --- existing dashboard state (fiat + onchain) ---
  const [onchainRows, setOnchainRows] = useState<ActivityRow[]>([]);
  const [fiatRows, setFiatRows] = useState<FiatTx[]>([]);
  const [loadingOnchain, setLoadingOnchain] = useState(true);
  const [loadingFiat, setLoadingFiat] = useState(true);
  const [onchainError, setOnchainError] = useState<string | null>(null);
  const [fiatError, setFiatError] = useState<string | null>(null);

  const [currency, setCurrency] = useState("NGN");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<string>("0");
  const [savingBusy, setSavingBusy] = useState(false);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);

  // --- merchant payments ---
  const [mpLoading, setMpLoading] = useState(true);
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpRows, setMpRows] = useState<MerchantActivityRow[]>([]);

  const [invToken, setInvToken] = useState("USDC");
  const [invAmount, setInvAmount] = useState("");
  const [invBusy, setInvBusy] = useState(false);
  const [invMsg, setInvMsg] = useState<string | null>(null);
  const [invPayUrl, setInvPayUrl] = useState<string | null>(null);

  const walletLabel = useMemo(() => {
    if (!mounted) return "Checking wallet…";
    if (!connected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [mounted, connected, address]);

  const onConnect = async () => {
    try {
      await openAppKit();
    } catch (e) {
      console.error(e);
    }
  };

  const onDisconnect = () => {
    try {
      disconnect();
      setTimeout(() => {
        setBalance("0");
        setFiatRows([]);
        setOnchainRows([]);
        setMpRows([]);
      }, 200);
    } catch (e) {
      console.error(e);
    }
  };

  async function loadOnchain() {
    setLoadingOnchain(true);
    setOnchainError(null);

    try {
      const qs = address ? `?wallet=${encodeURIComponent(address)}` : "";
      const res = await fetch(`/api/activity${qs}`, { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok) {
        setOnchainRows([]);
        setOnchainError(data?.error || `Failed to load onchain (${res.status})`);
        return;
      }

      const list =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.rows)
          ? data.rows
          : Array.isArray(data?.activity)
          ? data.activity
          : [];

      setOnchainRows(list);
    } catch (e: any) {
      setOnchainRows([]);
      setOnchainError(e?.message || "Failed to load onchain");
    } finally {
      setLoadingOnchain(false);
    }
  }

  async function loadFiat() {
    setLoadingFiat(true);
    setFiatError(null);

    try {
      if (!address) {
        setFiatRows([]);
        return;
      }

      const res = await fetch(`/api/fiat/txs?wallet=${encodeURIComponent(address)}`, { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok) {
        setFiatRows([]);
        setFiatError(data?.error || `Failed to load fiat (${res.status})`);
        return;
      }

      setFiatRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e: any) {
      setFiatRows([]);
      setFiatError(e?.message || "Failed to load fiat");
    } finally {
      setLoadingFiat(false);
    }
  }

  async function loadFiatBalance(curr: string) {
    if (!address) {
      setBalance("0");
      return;
    }
    try {
      const res = await fetch(
        `/api/fiat/balance?wallet=${encodeURIComponent(address)}&currency=${encodeURIComponent(curr)}`,
        { cache: "no-store" }
      );
      const data = await safeJson(res);
      if (!res.ok) return;
      setBalance(String(data?.balance ?? "0"));
    } catch {}
  }

  async function loadMerchantPayments() {
    setMpLoading(true);
    setMpError(null);
    try {
      if (!address) {
        setMpRows([]);
        return;
      }
      const r = await fetch(`/api/merchant/activity?wallet=${encodeURIComponent(address)}`, { cache: "no-store" });
      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || "Failed to load merchant payments");
      setMpRows(Array.isArray(j?.rows) ? j.rows : []);
    } catch (e: any) {
      setMpRows([]);
      setMpError(e?.message || "Failed to load merchant payments");
    } finally {
      setMpLoading(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    if (!address) return;
    loadOnchain();
    loadFiat();
    loadFiatBalance(currency);
    loadMerchantPayments();
  }, [mounted, address]);

  useEffect(() => {
    if (!mounted) return;
    if (!address) return;
    loadFiatBalance(currency);
  }, [mounted, address, currency]);

  const groupedFiat = useMemo(() => {
    if (!mounted) return [];
    const m = new Map<string, FiatTx[]>();
    for (const r of fiatRows) {
      const ts = new Date(r.created_at).getTime();
      const k = dayKeyFromMs(ts);
      const arr = m.get(k) || [];
      arr.push(r);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [mounted, fiatRows]);

  const groupedOnchain = useMemo(() => {
    if (!mounted) return [];
    const m = new Map<string, ActivityRow[]>();
    for (const r of onchainRows) {
      const k = dayKeyFromMs(r.ts);
      const arr = m.get(k) || [];
      arr.push(r);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [mounted, onchainRows]);

  async function savingsDeposit() {
    if (!address) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setSavingMsg("Enter a valid amount");
      return;
    }

    setSavingBusy(true);
    setSavingMsg(null);
    try {
      const r = await fetch(`/api/fiat/deposit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: address, currency, amount: amt }),
      });
      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || `Deposit failed (${r.status})`);

      setAmount("");
      await loadFiatBalance(currency);
      await loadFiat();
      setSavingMsg("✅ Deposit recorded");
    } catch (e: any) {
      setSavingMsg(`⚠️ ${e?.message || "Deposit failed"}`);
    } finally {
      setSavingBusy(false);
    }
  }

  async function savingsWithdraw() {
    if (!address) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setSavingMsg("Enter a valid amount");
      return;
    }

    setSavingBusy(true);
    setSavingMsg(null);
    try {
      const r = await fetch(`/api/fiat/withdraw`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet: address, currency, amount: amt }),
      });
      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || `Withdraw failed (${r.status})`);

      setAmount("");
      await loadFiatBalance(currency);
      await loadFiat();
      setSavingMsg("✅ Withdrawal recorded");
    } catch (e: any) {
      setSavingMsg(`⚠️ ${e?.message || "Withdraw failed"}`);
    } finally {
      setSavingBusy(false);
    }
  }

  async function createMerchantInvoice() {
    setInvMsg(null);
    setInvPayUrl(null);

    try {
      if (!address) throw new Error("Connect wallet first");
      const amt = Number(invAmount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");

      setInvBusy(true);

      const r = await fetch("/api/merchant/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          merchantWallet: address,
          token: invToken,
          amount: amt,
          expiresInDays: 7,
        }),
      });

      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || "Failed to create invoice");

      setInvMsg("✅ Invoice created");
      setInvPayUrl(j?.payUrl || null);
      setInvAmount("");

      await loadMerchantPayments();
    } catch (e: any) {
      setInvMsg(`⚠️ ${e?.message || "Failed to create invoice"}`);
    } finally {
      setInvBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/savings">Savings Vault</Link>
          <Link href="/lock">Lock Vault</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1" style={{ marginBottom: 8 }}>
          Dashboard
        </h1>
        <p className="p">{walletLabel}</p>

        <div className="actions" style={{ marginTop: 14 }}>
          {!connected ? (
            <button className="btn btnPrimary" onClick={onConnect} disabled={!mounted}>
              {mounted ? "Connect wallet" : "Loading…"}
            </button>
          ) : (
            <button className="btn" onClick={onDisconnect}>
              Disconnect
            </button>
          )}

          <button
            className="btn"
            onClick={() => {
              loadOnchain();
              loadFiat();
              loadFiatBalance(currency);
              loadMerchantPayments();
            }}
            disabled={!mounted || loadingOnchain || loadingFiat || mpLoading}
          >
            {loadingOnchain || loadingFiat || mpLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Merchant Payments */}
      <div className="section" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Merchant Payments</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{mpRows.length} events</span>
        </div>

        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card">
            <strong>Create invoice</strong>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Asset
                <select
                  value={invToken}
                  onChange={(e) => setInvToken(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.2)",
                    color: "var(--text)",
                  }}
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </label>

              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Amount
                <input
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 25"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.2)",
                    color: "var(--text)",
                  }}
                />
              </label>

              <div className="actions" style={{ marginTop: 6 }}>
                <button className="btn btnPrimary" onClick={createMerchantInvoice} disabled={!connected || invBusy}>
                  {invBusy ? "Creating…" : "Create invoice"}
                </button>
                {invPayUrl ? (
                  <Link className="btn" href={invPayUrl}>
                    Open pay link
                  </Link>
                ) : null}
              </div>

              {invMsg ? <p className="p">{invMsg}</p> : null}

              <p className="p" style={{ color: "var(--muted)" }}>
                This creates an invoice in Postgres and generates a pay link.
              </p>
            </div>
          </div>

          <div className="card">
            <strong>Payments activity</strong>

            {mpError ? <p className="p" style={{ marginTop: 10 }}>⚠️ {mpError}</p> : null}

            {mpLoading ? (
              <p className="p" style={{ marginTop: 10 }}>Loading…</p>
            ) : mpRows.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {mpRows.slice(0, 25).map((r, idx) => (
                  <div key={`${r.invoice_id}-${r.kind}-${idx}`} style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>
                        {r.kind === "invoice_created" ? "🧾 Invoice created" : "💳 Invoice paid"} • {r.token} • {r.amount}
                      </strong>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>
                        {new Date(r.ts).toISOString().slice(0, 16).replace("T", " ")} UTC
                      </span>
                    </div>

                    <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                      Code: <span style={{ color: "var(--text)" }}>{r.invoice_code}</span>{" "}
                      <span style={{ marginLeft: 10 }}>Status: <span style={{ color: "var(--text)" }}>{r.status}</span></span>
                    </div>

                    {r.kind === "invoice_paid" ? (
                      <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                        Payer: <span style={{ color: "var(--text)" }}>{r.payer ? shortAddr(r.payer) : "—"}</span>
                        {"  "}Tx: <span style={{ color: "var(--text)" }}>{r.tx_hash ? shortAddr(r.tx_hash) : "—"}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="p" style={{ marginTop: 10, color: "var(--muted)" }}>
                No invoices yet — create one to see events here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Savings Vault (Fiat) */}
      <div className="section" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Savings Vault (Fiat)</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Balance: <span style={{ color: "var(--text)" }}>{mounted ? balance : "—"}</span> {currency}
          </span>
        </div>

        <div className="grid" style={{ marginTop: 14 }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <strong>Deposit / Withdraw</strong>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Fiat ledger (NGN/USD/etc)</div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Currency
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.2)",
                    color: "var(--text)",
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ color: "var(--muted)", fontSize: 13 }}>
                Amount
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 10000"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.2)",
                    color: "var(--text)",
                  }}
                />
              </label>

              <div className="actions" style={{ marginTop: 6 }}>
                <button className="btn btnPrimary" onClick={savingsDeposit} disabled={!connected || savingBusy}>
                  {savingBusy ? "Working…" : "Deposit"}
                </button>
                <button className="btn" onClick={savingsWithdraw} disabled={!connected || savingBusy}>
                  {savingBusy ? "Working…" : "Withdraw"}
                </button>
              </div>

              {savingMsg ? <p className="p">{savingMsg}</p> : null}
            </div>
          </div>

          <div className="card">
            <strong>How it works</strong>
            <p className="p" style={{ marginTop: 6 }}>
              Savings Vault is for storing value in fiat currencies (NGN/USD/etc). You can deposit and withdraw anytime.
            </p>
            <p className="p" style={{ marginTop: 6 }}>
              Lock Vault is different: you lock crypto and earn yield.
            </p>
            <div className="actions" style={{ marginTop: 10 }}>
              <Link className="btn btnPrimary" href="/lock">
                Go to Lock Vault
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Fiat Activity */}
      <div className="section" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Fiat Activity</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{fiatRows.length} items</span>
        </div>

        {fiatError ? <p className="p" style={{ marginTop: 10 }}>⚠️ {fiatError}</p> : null}

        {!loadingFiat && mounted && fiatRows.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            {groupedFiat.map(([k, rows]) => (
              <div key={k}>
                <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>{dayLabelUTC(k)}</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {rows.map((r) => (
                    <div key={r.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <strong>
                          {r.type.toUpperCase()} • {r.currency}
                        </strong>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>
                          {timeLabelUTC(new Date(r.created_at).getTime())}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                        Amount: <span style={{ color: "var(--text)" }}>{r.amount}</span>
                      </div>
                      <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
                        Ref: <span style={{ color: "var(--text)" }}>{r.reference}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>Make your first deposit</strong>
            <p className="p" style={{ marginTop: 6 }}>
              Choose a currency in Savings Vault and deposit to start.
            </p>
          </div>
        )}
      </div>

      {/* Onchain Activity */}
      <div className="section" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Onchain Activity (Base Sepolia)</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{onchainRows.length} items</span>
        </div>

        {onchainError ? <p className="p" style={{ marginTop: 10 }}>⚠️ {onchainError}</p> : null}

        {!loadingOnchain && mounted && onchainRows.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            {groupedOnchain.map(([k, rows]) => (
              <div key={k}>
                <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>{dayLabelUTC(k)}</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {rows.map((r, i) => (
                    <div key={`${r.txHash || "tx"}-${i}`} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <strong>{r.event || "Event"}</strong>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{timeLabelUTC(r.ts)}</span>
                      </div>
                      {r.txHash ? (
                        <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                          Tx: <span style={{ color: "var(--text)" }}>{shortAddr(r.txHash)}</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <strong>No onchain events yet</strong>
            <p className="p" style={{ marginTop: 6 }}>
              Try Lock Vault deposit/claim or invoice payments on Base Sepolia, then refresh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
