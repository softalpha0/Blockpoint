"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected || !address) {
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
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardClient />;
}