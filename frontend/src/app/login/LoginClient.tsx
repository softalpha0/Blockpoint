"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { openAppKit } from "@/lib/wallet";

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

// Simple fetch with timeout so UI never “hangs”
async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, ms = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export default function LoginClient() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => setMounted(true), []);

  // ✅ One-time session check ONLY (no polling)
  useEffect(() => {
    if (!mounted) return;

    let alive = true;

    (async () => {
      setSessionLoading(true);
      try {
        const res = await fetchWithTimeout("/api/siwe/session", { cache: "no-store" }, 8000);
        const j = await safeJson(res);
        if (!alive) return;
        setSession(j || null);
      } catch {
        if (!alive) return;
        setSession(null);
      } finally {
        if (!alive) return;
        setSessionLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mounted]);

  const walletLabel = useMemo(() => {
    if (!mounted) return "Loading…";
    if (!isConnected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [mounted, isConnected, address]);

  const isAuthed = !!session?.ok && !!session?.address;

  // ✅ Open wallet modal ONLY on click
  const onOpenWallet = async () => {
    try {
      setStatus("");
      setBusy(true);
      await openAppKit();
    } catch (e: any) {
      setStatus(e?.message || "Failed to open wallet modal");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = () => {
    try {
      disconnect();
      setSession(null);
      setStatus("Disconnected.");
    } catch (e: any) {
      setStatus(e?.message || "Failed to disconnect");
    }
  };

  // ✅ SIWE sign in ONLY on click
  const onSignIn = async () => {
    if (!mounted) return;
    if (!isConnected || !address) {
      setStatus("Connect wallet first.");
      return;
    }

    setBusy(true);
    setStatus("Requesting nonce…");

    try {
      const nonceRes = await fetchWithTimeout("/api/siwe/nonce", { cache: "no-store" }, 12000);
      const nonceJson = await safeJson(nonceRes);
      const nonce = nonceJson?.nonce;

      if (!nonceRes.ok || !nonce) {
        throw new Error(nonceJson?.error || "Failed to get nonce");
      }

      // Domain/origin must match what your API expects
      const domain = window.location.host;
      const origin = window.location.origin;

      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        address,
        "",
        "Sign in to Blockpoint.",
        "",
        `URI: ${origin}`,
        `Version: 1`,
        `Chain ID: ${Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532)}`,
        `Nonce: ${nonce}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join("\n");

      setStatus("Signing message…");
      const signature = await signMessageAsync({ message });

      setStatus("Verifying…");
      const verifyRes = await fetchWithTimeout(
        "/api/siwe/verify",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message,
            signature,
          }),
        },
        15000
      );

      const verifyJson = await safeJson(verifyRes);

      if (!verifyRes.ok) {
        throw new Error(verifyJson?.error || `Verify failed (${verifyRes.status})`);
      }

      setStatus("Signed in. Redirecting…");

      // refresh session quickly
      const sessRes = await fetchWithTimeout("/api/siwe/session", { cache: "no-store" }, 8000);
      const sessJson = await safeJson(sessRes);
      setSession(sessJson || null);

      window.location.href = "/dashboard";
    } catch (e: any) {
      setStatus(e?.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/lock">Lock Vault</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </div>

      <div className="section hero">
        <h1 className="h1">Connect your wallet</h1>
        <p className="p">
          Testnet access uses wallet-based authentication for now. Email auth comes later.
        </p>

        <div className="actions" style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={onOpenWallet} disabled={!mounted || busy}>
            {busy ? "Opening…" : "Open WalletConnect"}
          </button>

          <button className="btn btnPrimary" onClick={onSignIn} disabled={!mounted || busy}>
            {busy ? "Signing…" : "Sign in"}
          </button>

          {mounted && isConnected ? (
            <button className="btn" onClick={onDisconnect} disabled={busy}>
              Disconnect
            </button>
          ) : null}

          <Link className="btn" href="/dashboard">
            Dashboard →
          </Link>
        </div>

        <p className="p" style={{ marginTop: 10, fontSize: 14 }}>
          {sessionLoading ? "Checking session…" : isAuthed ? `Session: ${shortAddr(session.address)}` : "No session"}
        </p>

        <p className="p" style={{ marginTop: 6 }}>
          {walletLabel}
        </p>

        {status ? (
          <p className="p" style={{ marginTop: 10 }}>
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}