"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button onClick={() => disconnect()}>
        Disconnect {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {connectors.map((c) => (
        <button
          key={c.uid}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
        >
          {isPending ? "Connecting..." : `Connect (${c.name})`}
        </button>
      ))}
    </div>
  );
}