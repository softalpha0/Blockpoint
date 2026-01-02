"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LoginClient() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [busy, setBusy] = useState(false);

  const label = useMemo(() => {
    if (!isConnected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [isConnected, address]);

  const onConnect = async () => {
    setBusy(true);
    try {
      await openAppKit();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
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
      <div className="section" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className="h1">Login</h1>
        <p className="p">{label}</p>

        <div className="actions" style={{ marginTop: 14 }}>
          {!isConnected ? (
            <button className="btn btnPrimary" onClick={onConnect} disabled={busy}>
              {busy ? "Connecting…" : "Connect wallet"}
            </button>
          ) : (
            <>
              <Link className="btn btnPrimary" href="/dashboard">
                Go to Dashboard
              </Link>
              <button className="btn" onClick={onDisconnect}>
                Disconnect
              </button>
            </>
          )}

          <Link className="btn" href="/">
            Home
          </Link>
        </div>

        <p className="p" style={{ marginTop: 12 }}>
          Note: We’re not using “session auth” here. Wallet connection is the access key.
        </p>
      </div>
    </div>
  );
}