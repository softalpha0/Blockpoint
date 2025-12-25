"use client";

import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function LoginPage() {
  const { isConnected, address } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Redirect when connected
  useEffect(() => {
    if (isConnected) {
      window.location.href = "/dashboard";
    }
  }, [isConnected]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-xl border border-white/10 bg-black/20 p-6 w-full max-w-md">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm opacity-80">
          Connect your wallet to continue
        </p>

        {!isConnected ? (
          <button
            onClick={() => connect({ connector: injected() })}
            disabled={isPending}
            className="mt-6 w-full rounded-lg bg-white text-black px-4 py-2 font-medium"
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </button>
        ) : (
          <>
            <p className="mt-4 text-sm font-mono break-all">
              {address}
            </p>
            <button
              onClick={() => disconnect()}
              className="mt-4 w-full rounded-lg border px-4 py-2"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}