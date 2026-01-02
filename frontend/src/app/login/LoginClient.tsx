
"use client";

import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LoginClient() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="container">
      <div className="section" style={{ maxWidth: 720 }}>
        <h1 className="h1">Login</h1>

        <p className="p" style={{ marginTop: 8 }}>
          {isConnected && address ? (
            <>
              Connected: <strong>{shortAddr(address)}</strong>
            </>
          ) : (
            "Not connected"
          )}
        </p>

        <div className="actions" style={{ marginTop: 14 }}>
          {!isConnected ? (
            <button className="btn btnPrimary" onClick={() => openAppKit()}>
              Connect wallet
            </button>
          ) : (
            <>
              <Link className="btn btnPrimary" href="/dashboard">
                Go to Dashboard
              </Link>

              <button className="btn" onClick={() => disconnect()}>
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