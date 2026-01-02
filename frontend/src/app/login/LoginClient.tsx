"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LoginClient() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const status = useMemo(() => {
    if (!mounted) return "Checking wallet…";
    if (!isConnected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [mounted, isConnected, address]);

  const onConnect = async () => {
    try {
      await openAppKit();
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || "Failed to open wallet connect");
    }
  };

  const onSignIn = async () => {
  
    if (!isConnected || !address) {
      await onConnect();
      return;
    }
    router.push("/dashboard");
  };

  const onDisconnect = () => {
    try {
      disconnect();
    } catch (e) {
      console.error(e);
    }
  };

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
        <h1 className="h1">Connect your wallet</h1>
        <p className="p">Testnet access uses wallet-based authentication for now. Email auth comes later.</p>

        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onConnect} disabled={!mounted}>
            Open WalletConnect
          </button>

          <button className="btn btnPrimary" onClick={onSignIn} disabled={!mounted}>
            Sign in
          </button>

          <button className="btn" onClick={() => router.push("/dashboard")} disabled={!mounted}>
            Dashboard →
          </button>

          <button className="btn" onClick={onDisconnect} disabled={!mounted}>
            Disconnect
          </button>
        </div>

        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Status</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{status}</div>
        </div>
      </div>
    </div>
  );
}