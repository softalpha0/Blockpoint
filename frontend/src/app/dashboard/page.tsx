"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
          <Link href="/faq">FAQ</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1">Dashboard</h1>

        {!mounted ? (
          <p className="p">Loading…</p>
        ) : !connected ? (
          <>
            <p className="p">Please connect your wallet to continue.</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="btn btnPrimary" href="/login">
                Go to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="p">
              Connected: <b>{shortAddr(address)}</b>
            </p>

            <div className="section" style={{ marginTop: 16 }}>
              <p className="p">
                ✅ Dashboard route is working. Now you can paste back your full dashboard UI safely.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}