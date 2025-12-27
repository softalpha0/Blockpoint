"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";
import { LOCK_ADAPTERS } from "@/lib/lockAdapters";

type ActivityRow = {
  kind: string;
  from: string;
  to: string;
  amount: string;
  tx: string;
  block: string;
};

function shortAddr(a: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const addr = useMemo(() => (address ? address.toLowerCase() : ""), [address]);

  const [sessionAddr, setSessionAddr] = useState<string>("");
  const [sessionLoading, setSessionLoading] = useState(true);

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // lock ui
  const [adapterId, setAdapterId] = useState(LOCK_ADAPTERS[0].id);
  const [amount, setAmount] = useState("");
  const [durationDays, setDurationDays] = useState(30);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/siwe/session", { cache: "no-store" });
        if (!res.ok) throw new Error("No session");
        const j = await res.json();
        setSessionAddr(j.address);
      } finally {
        setSessionLoading(false);
      }
    })();
  }, []);

  async function refreshActivity(a?: string) {
    const target = (a || sessionAddr || addr || "").toLowerCase();
    if (!target) return;
    setLoadingFeed(true);
    try {
      const res = await fetch(`/api/activity?address=${encodeURIComponent(target)}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (j.ok) setRows(j.rows);
    } finally {
      setLoadingFeed(false);
    }
  }

  useEffect(() => {
    if (!sessionAddr) return;
    refreshActivity(sessionAddr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAddr]);

  const adapter = LOCK_ADAPTERS.find((a) => a.id === adapterId) ?? LOCK_ADAPTERS[0];

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <span style={{ color: "var(--muted)" }}>
            Session: {sessionLoading ? "…" : shortAddr(sessionAddr)}
          </span>
          <button className="btn" onClick={() => openAppKit()}>
            WalletConnect
          </button>
          <button className="btn" onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      </div>

      <div className="section">
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p className="p" style={{ marginTop: 6 }}>
          Fintech-style UX with onchain settlement. This dashboard shows your testnet session, activity,
          and the Lock Vault “strategy-ready” UI layer.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Connection</h3>
            <p>
              Wallet: <b>{isConnected ? "Connected" : "Not connected"}</b>
              <br />
              Address: <b>{addr ? shortAddr(addr) : "—"}</b>
            </p>
          </div>

          <div className="card">
            <h3>Testnet</h3>
            <p>
              Base Sepolia <b>(84532)</b>
              <br />
              Verify addresses + network before signing.
            </p>
          </div>

          <div className="card">
            <h3>Actions</h3>
            <p style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn btnPrimary" onClick={() => refreshActivity()}>
                {loadingFeed ? "Refreshing…" : "Refresh activity"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 style={{ margin: 0 }}>Lock Vault (strategy-ready UI)</h2>
        <p className="p" style={{ marginTop: 6 }}>
          This is the adapter architecture layer — users choose a lock style now, and later you can
          plug DeFi protocols behind it for yield.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Choose strategy</h3>
            <p style={{ marginTop: 10 }}>
              <select
                value={adapterId}
                onChange={(e) => setAdapterId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  outline: "none",
                }}
              >
                {LOCK_ADAPTERS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} • {a.risk} risk • {a.aprHint}
                  </option>
                ))}
              </select>
            </p>
            <p className="p" style={{ marginTop: 10, fontSize: 14 }}>
              {adapter.description}
            </p>
          </div>

          <div className="card">
            <h3>Lock params</h3>
            <p style={{ marginTop: 10 }}>
              <label style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
                Amount (BPT)
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </p>

            <p style={{ marginTop: 10 }}>
              <label style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
                Duration (days)
              </label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </p>
          </div>

          <div className="card">
            <h3>Preview</h3>
            <p className="p" style={{ marginTop: 10 }}>
              Strategy: <b>{adapter.name}</b>
              <br />
              Risk: <b>{adapter.risk}</b>
              <br />
              APR hint: <b>{adapter.aprHint}</b>
              <br />
              Lock: <b>{durationDays} days</b>
              <br />
              Amount: <b>{amount || "—"}</b>
            </p>

            <p className="p" style={{ marginTop: 10, fontSize: 13 }}>
              Next step: wire this UI to the LockVault contract function + adapter routing.
            </p>

            <button
              className="btn btnPrimary"
              style={{ marginTop: 10 }}
              onClick={() => alert("UI ready. Next: contract write + adapter routing.")}
            >
              Lock (testnet)
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 style={{ margin: 0 }}>Activity feed (onchain v1)</h2>
        <p className="p" style={{ marginTop: 6 }}>
          This reads BPT Transfer logs and labels likely Savings/Lock flows. Next iteration can index
          native vault events (Deposit/Withdraw/Lock/Unlock) once you share the ABI/events.
        </p>

        <div className="card" style={{ marginTop: 12 }}>
          {loadingFeed ? (
            <p className="p">Loading activity…</p>
          ) : rows.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {rows.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.18)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.kind}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13 }}>
                      {shortAddr(r.from)} → {shortAddr(r.to)} • {r.amount}
                    </div>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 12, textAlign: "right" }}>
                    <div>Block {r.block}</div>
                    <div>{shortAddr(r.tx)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="p">No recent indexed activity found.</p>
          )}
        </div>
      </div>

      <div className="footer">Testnet only. Fintech UX + onchain settlement.</div>
    </div>
  );
}
