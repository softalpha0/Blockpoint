"use client";

import * as React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const [hasInjected, setHasInjected] = React.useState(false);

  React.useEffect(() => {
    setHasInjected(typeof window !== "undefined" && !!(window as any).ethereum);
  }, []);

  if (isConnected && address) {
    return (
      <button onClick={() => disconnect()}>
        Disconnect {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  
  const visible = connectors
    .filter((c) => {
      const isInjected = c.id === "injected" || c.name.toLowerCase().includes("injected");
      return !isInjected || hasInjected;
    })
    .sort((a, b) => {
      const aWC = a.id === "walletConnect" || a.name.toLowerCase().includes("walletconnect");
      const bWC = b.id === "walletConnect" || b.name.toLowerCase().includes("walletconnect");
      return Number(bWC) - Number(aWC);
    });

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {visible.map((c) => (
        <button
          key={c.uid}
          onClick={() => connect({ connector: c })}
          disabled={isPending}
        >
          {isPending ? "Connecting..." : `Connect (${c.name})`}
        </button>
      ))}

      
      {visible.length === 0 && (
        <p style={{ opacity: 0.8 }}>
          No wallet connectors available. Check NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
        </p>
      )}
    </div>
  );
}