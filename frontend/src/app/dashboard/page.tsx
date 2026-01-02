"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

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

function iconForEvent(name?: string) {
  const e = (name || "").toLowerCase();
  if (e.includes("deposit")) return "⬆️";
  if (e.includes("withdraw")) return "⬇️";
  if (e.includes("claim")) return "🎁";
  if (e.includes("reward")) return "💎";
  if (e.includes("lock")) return "🔒";
  if (e.includes("unlock")) return "🔓";
  if (e.includes("invoicepaid")) return "💳";
  if (e.includes("invoicecreated")) return "🧾";
  return "🧾";
}

function iconForFiatType(t: FiatTx["type"]) {
  if (t === "deposit") return "⬆️";
  if (t === "withdraw") return "⬇️";
  return "💳";
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function SkeletonLine({ w = 220 }: { w?: number }) {
  return (
    <div
      style={{
        width: w,
        height: 12,
        borderRadius: 8,
        background: "rgba(255,255,255,0.10)",
      }}
    />
  );
}

function TxLink({ hash }: { hash: string }) {
  const url = `https://sepolia.basescan.org/tx/${hash}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--text)" }}>
      {shortAddr(hash)}
    </a>
  );
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

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
        loadOnchain();
        loadFiat();
        setBalance("0");
      }, 200);
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ CRITICAL: avoid SSR/hydration weirdness
  if (!mounted) return null;

  // ✅ CRITICAL: Dashboard must render even if not connected (no session stuff here)
  if (!isConnected || !address) {
    return (
      <div className="container">
        <div className="nav">
          <div className="logo">Blockpoint</div>
          <div className="navLinks">
            <Link href="/">Home</Link>
            <Link href="/savings">Savings Vault</Link>
            <Link href="/lock">Lock Vault</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>

        <div className="section">
          <h1 className="h1">Dashboard</h1>
          <p className="p">Please connect your wallet to continue.</p>
          <div className="actions" style={{ marginTop: 12 }}>
            <button className="btn btnPrimary" onClick={onConnect}>
              Connect wallet
            </button>
            <Link className="btn" href="/login">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const connected = !!address && isConnected;

  const walletLabel = useMemo(() => {
    if (!connected) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [connected, address]);

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
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadOnchain();
    loadFiat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    if (!address) return;
    loadFiatBalance(currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, currency]);

  const groupedFiat = useMemo(() => {
    const m = new Map<string, FiatTx[]>();
    for (const r of fiatRows) {
      const ts = new Date(r.created_at).getTime();
      const k = dayKeyFromMs(ts);
      const arr = m.get(k) || [];
      arr.push(r);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [fiatRows]);

  const groupedOnchain = useMemo(() => {
    const m = new Map<string, ActivityRow[]>();
    for (const r of onchainRows) {
      const k = dayKeyFromMs(r.ts);
      const arr = m.get(k) || [];
      arr.push(r);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [onchainRows]);

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

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/savings">Savings Vault</Link>
          <Link href="/lock">Lock Vault</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/faq">FAQ</Link>
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
          {connected ? (
            <button className="btn" onClick={onDisconnect}>
              Disconnect
            </button>
          ) : (
            <button className="btn btnPrimary" onClick={onConnect}>
              Connect wallet
            </button>
          )}

          <button
            className="btn"
            onClick={() => {
              loadOnchain();
              loadFiat();
              loadFiatBalance(currency);
            }}
            disabled={loadingOnchain || loadingFiat}
          >
            {loadingOnchain || loadingFiat ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Savings / Fiat */}
      <div className="section" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Savings Vault (Fiat)</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Balance: <span style={{ color: "var(--text)" }}>{balance}</span> {currency}
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

              {savingMsg ? (
                <p className="p" style={{ marginTop: 6 }}>
                  {savingMsg}
                </p>
              ) : null}
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

        {fiatError ? (
          <p className="p" style={{ marginTop: 10 }}>
            ⚠️ {fiatError}
          </p>
        ) : null}

        {loadingFiat ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div className="card">
              <SkeletonLine w={260} />
              <div style={{ height: 8 }} />
              <SkeletonLine w={180} />
              <div style={{ height: 8 }} />
              <SkeletonLine w={220} />
            </div>
          </div>
        ) : fiatRows.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            {groupedFiat.map(([k, rows]) => (
              <div key={k}>
                <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>{dayLabelUTC(k)}</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {rows.map((r) => (
                    <div key={r.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <strong>
                          {iconForFiatType(r.type)} {r.type.toUpperCase()} • {r.currency}
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

        {onchainError ? (
          <p className="p" style={{ marginTop: 10 }}>
            ⚠️ {onchainError}
          </p>
        ) : null}

        {loadingOnchain ? (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div className="card">
              <SkeletonLine w={280} />
              <div style={{ height: 8 }} />
              <SkeletonLine w={190} />
            </div>
          </div>
        ) : onchainRows.length ? (
          <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
            {groupedOnchain.map(([k, rows]) => (
              <div key={k}>
                <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 8 }}>{dayLabelUTC(k)}</div>

                <div style={{ display: "grid", gap: 10 }}>
                  {rows.map((r, i) => (
                    <div key={`${r.txHash || "tx"}-${i}`} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <strong>
                          {iconForEvent(r.event)} {r.event || "Event"}
                        </strong>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{timeLabelUTC(r.ts)}</span>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {r.user ? (
                          <div style={{ color: "var(--muted)", fontSize: 13 }}>
                            User: <span style={{ color: "var(--text)" }}>{shortAddr(r.user)}</span>
                          </div>
                        ) : null}

                        {r.token ? (
                          <div style={{ color: "var(--muted)", fontSize: 13 }}>
                            Token: <span style={{ color: "var(--text)" }}>{shortAddr(r.token)}</span>
                          </div>
                        ) : null}

                        {r.amount ? (
                          <div style={{ color: "var(--muted)", fontSize: 13 }}>
                            Amount: <span style={{ color: "var(--text)" }}>{r.amount}</span>
                          </div>
                        ) : null}

                        {r.txHash ? (
                          <div style={{ color: "var(--muted)", fontSize: 13 }}>
                            Tx: <TxLink hash={r.txHash} />
                          </div>
                        ) : null}
                      </div>
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