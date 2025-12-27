"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { openAppKit } from "@/lib/wallet";
import { SiweMessage } from "siwe";

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  // If already has a server session cookie, bounce to dashboard
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/siwe/session", { cache: "no-store" });
        if (res.ok) router.replace("/dashboard");
      } catch {}
    })();
  }, [router]);

  const addr = useMemo(() => (address ? address.toLowerCase() : ""), [address]);

  async function connect() {
    setErr(null);
    openAppKit();
  }

  async function signInWithWallet() {
    setErr(null);
    setBusy(true);
    try {
      if (!isConnected || !addr) {
        await connect();
        return;
      }

      // 1) get nonce
      const nonceRes = await fetch("/api/siwe/nonce", { cache: "no-store" });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce } = await nonceRes.json();

      // 2) SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;

      const msg = new SiweMessage({
        domain,
        address: addr,
        statement: "Sign in to Blockpoint (testnet).",
        uri: origin,
        version: "1",
        chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532),
        nonce,
      });

      const message = msg.prepareMessage();

      // 3) request signature via AppKit (WalletConnect) provider
      const provider = (window as any).ethereum;
      if (!provider?.request) {
        throw new Error("No wallet provider found. Open WalletConnect first.");
      }

      const signature = await provider.request({
        method: "personal_sign",
        params: [message, addr],
      });

      // 4) verify → sets httpOnly session cookie
      const verifyRes = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        const j = await verifyRes.json().catch(() => ({}));
        throw new Error(j?.error ?? "SIWE verify failed");
      }

      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  // avoid hydration mismatch: don’t render wallet-derived UI until mounted
  if (!mounted) {
    return (
      <div className="container">
        <div className="section hero">
          <h1 className="h1">Connect your wallet</h1>
          <p className="p">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="section hero">
        <h1 className="h1">Connect your wallet</h1>
        <p className="p">
          Testnet access uses wallet-based authentication for now. Email auth comes later.
        </p>

        <div className="actions">
          <button className="btn" onClick={connect} disabled={busy}>
            Open WalletConnect
          </button>

          <button className="btn btnPrimary" onClick={signInWithWallet} disabled={busy}>
            {busy ? "Signing…" : "Sign in"}
          </button>
        </div>

        {addr ? (
          <p className="p" style={{ marginTop: 10, fontSize: 14 }}>
            Connected: {addr}
          </p>
        ) : null}

        {err ? (
          <p className="p" style={{ marginTop: 10, fontSize: 14, color: "#ffb4b4" }}>
            {err}
          </p>
        ) : null}
      </div>
    </div>
  );
}
