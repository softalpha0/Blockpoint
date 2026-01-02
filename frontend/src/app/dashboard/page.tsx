"use client";

import Link from "next/link";
import { useAccount } from "wagmi";

export default function DashboardPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="container">
        <div className="section">
          <h1 className="h1">Dashboard</h1>
          <p className="p">Please connect your wallet to continue.</p>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/login">
              Go to Login
            </Link>
            <Link className="btn" href="/">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="section">
        <h1 className="h1">Dashboard</h1>
        <p className="p">Connected: {address}</p>

        <div className="actions" style={{ marginTop: 12 }}>
          <Link className="btn" href="/savings">
            Savings Vault
          </Link>
          <Link className="btn" href="/lock">
            Lock Vault
          </Link>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <strong>Next step</strong>
          <p className="p" style={{ marginTop: 6 }}>
            Once you confirm navigation works, we’ll re-introduce SIWE session auth correctly (without breaking dashboard).
          </p>
        </div>
      </div>
    </div>
  );
}
