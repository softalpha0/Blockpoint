"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

export default function DashboardClient({ initialAddress }: { initialAddress: string }) {
  const router = useRouter();
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [loading, setLoading] = useState(false);

  const address = useMemo(() => {
    return (wagmiAddress ?? initialAddress ?? "").toLowerCase();
  }, [wagmiAddress, initialAddress]);

  async function onLogout() {
    try {
      setLoading(true);
      await fetch("/api/siwe/logout", { method: "POST" });
      disconnect();
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <a href="/">Home</a>
          <a href="/lock">Lock Vault</a>
          <a href="/how-it-works">How it works</a>
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="h1" style={{ fontSize: 32, marginBottom: 6 }}>Dashboard</h1>
            <p className="p" style={{ fontSize: 15 }}>
              Signed in as <span style={{ color: "var(--text)" }}>{address}</span>
            </p>
            {!isConnected && (
              <p className="p" style={{ fontSize: 14, marginTop: 8 }}>
                Wallet isn’t connected in the browser yet — you can still use the session cookie, but connect to interact onchain.
              </p>
            )}
          </div>

          <div className="actions" style={{ marginTop: 0 }}>
            <button className="btn" onClick={() => openAppKit()}>
              Connect wallet
            </button>
            <button className="btn btnPrimary" onClick={onLogout} disabled={loading}>
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Testnet Fintech Rails</h3>
          <p>
            Blockpoint is building onchain rails for payments + vault-based controls.
            Savings and Lock Vaults are foundational “money primitives” we’ll plug into DeFi yield adapters later.
          </p>
        </div>

        <div className="card">
          <h3>Onchain Activity</h3>
          <p>
            Next step: index contract events (deposits/withdrawals/locks) and show them here as a ledger.
          </p>
        </div>

        <div className="card">
          <h3>Security</h3>
          <p>
            Wallet-only SIWE session for testnet. Email login will be added later — we’re keeping the UX focused for now.
          </p>
        </div>
      </div>

      <div className="footer">
        Tip: If you get “nonce missing”, refresh /login and try again.
      </div>
    </div>
  );
}
