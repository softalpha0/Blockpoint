"use client";

import { useAccount, useDisconnect } from "wagmi";
import { openAppKit } from "@/lib/wallet";
export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {!isConnected ? (
        <button
          onClick={() => openAppKit()}
          className="mt-4 rounded bg-white text-black px-4 py-2"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="font-mono text-sm">
            Connected wallet:<br />
            {address}
          </p>

          <button
            onClick={() => disconnect()}
            className="rounded bg-white text-black px-4 py-2"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}