"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LoginClient() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const connected = mounted && isConnected && !!address;

  const statusText = useMemo(() => {
    if (!mounted) return "Loading wallet…";
    if (!connected) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [mounted, connected, address]);

  const onConnect = async () => {
    setErr(null);
    setBusy(true);
    try {
      await openAppKit();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to open wallet connect");
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = () => {
    setErr(null);
    try {
      disconnect();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Failed to disconnect");
    }
  };

  return (
    <div className="container">
      <div className="section" style={{ maxWidth: 720, marginInline: "auto" }}>
        <h1 className="h1">Login</h1>
        <p className="p" style={{ marginTop: 6 }}>
          {statusText}
        </p>

        <div className="actions" style={{ marginTop: 14 }}>
          {!connected ? (
            <button className="btn btnPrimary" onClick={onConnect} disabled={!mounted || busy}>
              {busy ? "Opening…" : "Connect wallet"}
            </button>
          ) : (
            <>
              {/* IMPORTANT: use Link, not router.push */}
              <Link className="btn btnPrimary" href="/dashboard" prefetch={false}>
                Go to Dashboard
              </Link>

              <button className="btn" onClick={onDisconnect}>
                Disconnect
              </button>
            </>
          )}

          <Link className="btn" href="/" prefetch={false}>
            Home
          </Link>
        </div>

        {err ? (
          <p className="p" style={{ marginTop: 10 }}>
            ⚠️ {err}
          </p>
        ) : null}

        <p className="p" style={{ marginTop: 12 }}>
          Note: We&apos;re not using “session auth” here. Wallet connection is the access key.
        </p>
      </div>
    </div>
  );
}