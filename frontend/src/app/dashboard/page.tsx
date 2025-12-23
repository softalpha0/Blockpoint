"use client";

import { useState } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import { WalletButton } from "@/components/WalletButton";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<string>("");

  async function bindWallet() {
    try {
      setStatus("Fetching nonce...");
      const nonceRes = await fetch("/api/auth/siwe", { method: "GET" });
      const { nonce } = await nonceRes.json();

      const msg = new SiweMessage({
        domain: window.location.host,
        address: address!,
        statement: "Bind this wallet to my Blockpoint account.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });

      setStatus("Signing...");
      const signature = await signMessageAsync({
        message: msg.prepareMessage(),
      });

      setStatus("Verifying...");
      const verifyRes = await fetch("/api/auth/siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, signature }),
      });

      const out = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(out?.error || "Bind failed");

      setStatus("✅ Wallet bound!");
    } catch (e: any) {
      setStatus(`❌ ${e.message || "Error"}`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>

      <div style={{ marginTop: 14 }}>
        <WalletButton />
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={bindWallet} disabled={!isConnected}>
          Bind wallet to account
        </button>
      </div>

      {status && <p style={{ marginTop: 10, opacity: 0.85 }}>{status}</p>}
    </main>
  );
}