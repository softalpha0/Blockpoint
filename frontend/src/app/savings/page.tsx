"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useDemoMode } from "@/lib/demo";

type FiatTx = {
  id: string;
  wallet: string;
  currency: string;
  type: "deposit" | "withdraw" | "payment";
  amount: string;
  status: string;
  reference: string;
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

function allowedFiat() {
  const raw = process.env.NEXT_PUBLIC_FIAT_ALLOWED_CURRENCIES || "NGN,USD,GHS,KES,ZAR";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function SavingsPage() {
  const { address, isConnected } = useAccount();
  const { demo, toggle } = useDemoMode();

  const currencies = useMemo(() => allowedFiat(), []);
  const [currency, setCurrency] = useState(currencies[0] || "NGN");

  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<string>("0");
  const [rows, setRows] = useState<FiatTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const wallet = address || "";

  const demoKey = useMemo(() => `bp_demo_bal_${(wallet || "no_wallet").toLowerCase()}_${currency}`, [wallet, currency]);

  function demoGetBalance() {
    try {
      return localStorage.getItem(demoKey) || "0";
    } catch {
      return "0";
    }
  }

  function demoSetBalance(v: string) {
    try {
      localStorage.setItem(demoKey, v);
    } catch {}
  }

  function demoAppendTx(type: "deposit" | "withdraw") {
    const tx: FiatTx = {
      id: crypto.randomUUID(),
      wallet: (wallet || "0x0").toLowerCase(),
      currency,
      type,
      amount: amount || "0",
      status: "confirmed",
      reference: `${type}_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setRows((prev) => [tx, ...prev]);
  }

  async function refresh() {
    setErr(null);
    if (!wallet) {
      setBalance("0");
      setRows([]);
      return;
    }

    if (demo) {
      setBalance(demoGetBalance());
      return;
    }

    try {
      const b = await fetch(`/api/fiat/balance?wallet=${encodeURIComponent(wallet)}&currency=${encodeURIComponent(currency)}`, {
        cache: "no-store",
      });
      const bj = await safeJson(b);
      setBalance(String(bj?.balance ?? "0"));

      const t = await fetch(`/api/fiat/txs?wallet=${encodeURIComponent(wallet)}`, { cache: "no-store" });
      const tj = await safeJson(t);
      setRows(Array.isArray(tj?.rows) ? tj.rows : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, currency, demo]);

  async function deposit() {
    setErr(null);
    setLoading(true);
    try {
      if (!wallet) throw new Error("Connect wallet first");
      const amt = Number(amount);
      if (!(amt > 0)) throw new Error("Enter a valid amount");

      if (demo) {
        const next = String(Number(demoGetBalance()) + amt);
        demoSetBalance(next);
        setBalance(next);
        demoAppendTx("deposit");
        setAmount("");
        return;
      }

      const r = await fetch(`/api/fiat/deposit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, currency, amount: amt }),
      });

      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || "Deposit failed");

      setBalance(String(j?.balance?.balance ?? balance));
      await refresh();
      setAmount("");
    } catch (e: any) {
      setErr(e?.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  }

  async function withdraw() {
    setErr(null);
    setLoading(true);
    try {
      if (!wallet) throw new Error("Connect wallet first");
      const amt = Number(amount);
      if (!(amt > 0)) throw new Error("Enter a valid amount");

      if (demo) {
        const curBal = Number(demoGetBalance());
        if (curBal < amt) throw new Error("Insufficient balance");
        const next = String(curBal - amt);
        demoSetBalance(next);
        setBalance(next);
        demoAppendTx("withdraw");
        setAmount("");
        return;
      }

      const r = await fetch(`/api/fiat/withdraw`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, currency, amount: amt }),
      });

      const j = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || "Withdraw failed");

      setBalance(String(j?.balance?.balance ?? balance));
      await refresh();
      setAmount("");
    } catch (e: any) {
      setErr(e?.message || "Withdraw failed");
    } finally {
      setLoading(false);
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
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h1 className="h1" style={{ margin: 0 }}>Savings Vault</h1>
          <button className="btn" onClick={toggle}>
            {demo ? "Demo: ON" : "Demo: OFF"}
          </button>
        </div>

        <p className="p" style={{ marginTop: 10 }}>
          {isConnected && address ? `Connected: ${shortAddr(address)}` : "Not connected"}
        </p>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Asset</div>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ minWidth: 140 }}>
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 13 }}>
                Balance: <span style={{ color: "var(--text)" }}>{balance}</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btnPrimary" onClick={deposit} disabled={loading}>
                  {loading ? "Working…" : "Deposit"}
                </button>
                <button className="btn" onClick={withdraw} disabled={loading}>
                  {loading ? "Working…" : "Withdraw"}
                </button>
                <button className="btn" onClick={refresh} disabled={loading}>
                  Refresh
                </button>
              </div>

              {err ? <p className="p">⚠️ {err}</p> : null}
            </div>
          </div>
        </div>

        <div className="section" style={{ marginTop: 16 }}>
          <h2 style={{ margin: 0 }}>Recent activity</h2>

          {!rows.length ? (
            <div className="card" style={{ marginTop: 12 }}>
              <strong>Empty</strong>
              <p className="p" style={{ marginTop: 6 }}>Make your first deposit to see activity.</p>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {rows.slice(0, 15).map((r) => (
                <div key={r.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{r.type.toUpperCase()} • {r.currency}</strong>
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>
                      {r.created_at.slice(0, 16).replace("T", " ")} UTC
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 13 }}>
                    Amount: <span style={{ color: "var(--text)" }}>{r.amount}</span>
                  </div>
                  <div style={{ marginTop: 4, color: "var(--muted)", fontSize: 13 }}>
                    Ref: <span style={{ color: "var(--text)" }}>{r.reference}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="p" style={{ marginTop: 16, color: "var(--muted)" }}>
          Savings Vault = simple save/deposit/withdraw. Lock Vault = earn yield + claim when locked.
        </p>
      </div>
    </div>
  );
}
