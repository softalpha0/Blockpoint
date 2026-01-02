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
            <Link className="btn btnPrimary" href="/login" prefetch={false}>
              Go to Login
            </Link>
            <Link className="btn" href="/" prefetch={false}>
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

        <div className="card" style={{ marginTop: 14 }}>
          <strong>Next step</strong>
          <p className="p" style={{ marginTop: 6 }}>
            Now that routing works, we can re-introduce your activity/fiat widgets safely (without blocking navigation).
          </p>
        </div>
      </div>
    </div>
  );
}