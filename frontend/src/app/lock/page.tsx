"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useDemoMode } from "@/lib/demo";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

type ClaimState = "idle" | "claiming" | "claimed";

export default function LockVaultPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { demo, toggle } = useDemoMode();

  // If you have a LockVault contract address, set it here via env.
  // (If your LockVault is same as router, change env name and set it.)
  const lockVault = (process.env.NEXT_PUBLIC_LOCK_VAULT_ADDRESS || "") as `0x${string}`;

  const [pending, setPending] = useState<string>("0");
  const [err, setErr] = useState<string | null>(null);
  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [txHash, setTxHash] = useState<string>("");

  const basescanTx = txHash && txHash.startsWith("0x") ? `https://sepolia.basescan.org/tx/${txHash}` : "";

  async function readPendingRewards() {
    setErr(null);
    setTxHash("");
    try {
      if (!isConnected || !address) {
        setPending("0");
        return;
      }

      if (demo) {
        setPending("12.34");
        return;
      }

      if (!lockVault || lockVault === "0x") {
        setPending("0");
        setErr("Missing NEXT_PUBLIC_LOCK_VAULT_ADDRESS");
        return;
      }

      // Minimal ABI stubs for common patterns
      const ABI = [
        { type: "function", name: "pendingRewards", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
        { type: "function", name: "earned", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
        { type: "function", name: "claimableRewards", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
      ] as const;

      const fns = ["pendingRewards", "earned", "claimableRewards"] as const;

      let val: bigint | null = null;
      for (const fn of fns) {
        try {
          val = (await publicClient!.readContract({
            address: lockVault,
            abi: ABI,
            functionName: fn,
            args: [address as `0x${string}`],
          })) as bigint;
          break;
        } catch {}
      }

      setPending(val ? val.toString() : "0");
    } catch (e: any) {
      setErr(e?.message || "Failed to read rewards");
    }
  }

  async function claim() {
    setErr(null);
    setClaimState("idle");
    setTxHash("");
    try {
      if (!isConnected || !address) throw new Error("Connect wallet first");
      if (!walletClient) throw new Error("Wallet not ready");

      if (demo) {
        setClaimState("claimed");
        setTxHash("0xDEMO_CLAIM_TX");
        setPending("0");
        return;
      }

      if (!lockVault || lockVault === "0x") throw new Error("Missing NEXT_PUBLIC_LOCK_VAULT_ADDRESS");

      setClaimState("claiming");

      const ABI = [
        { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
        { type: "function", name: "claimRewards", stateMutability: "nonpayable", inputs: [], outputs: [] },
      ] as const;

      // Try claim() then claimRewards()
      let hash: `0x${string}` | null = null;

      try {
        hash = await walletClient.writeContract({
          address: lockVault,
          abi: ABI,
          functionName: "claim",
          args: [],
        });
      } catch {
        hash = await walletClient.writeContract({
          address: lockVault,
          abi: ABI,
          functionName: "claimRewards",
          args: [],
        });
      }

      setTxHash(String(hash));
      await publicClient!.waitForTransactionReceipt({ hash });

      setClaimState("claimed");
      await readPendingRewards();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Claim failed");
      setClaimState("idle");
    }
  }

  useEffect(() => {
    if (!publicClient) return;
    readPendingRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, address, demo]);

  const walletLabel = useMemo(() => {
    if (!isConnected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [isConnected, address]);

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/savings">Savings Vault</Link>
          <Link href="/lock">Lock Vault</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Login</Link>
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h1 className="h1" style={{ margin: 0 }}>Lock Vault</h1>
          <button className="btn" onClick={toggle}>
            {demo ? "Demo: ON" : "Demo: OFF"}
          </button>
        </div>

        <p className="p" style={{ marginTop: 10 }}>{walletLabel}</p>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Pending rewards</div>
              <div style={{ color: "var(--text)", fontWeight: 700 }}>{pending}</div>
            </div>

            <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btnPrimary" onClick={claim} disabled={!isConnected || claimState === "claiming"}>
                {claimState === "claiming" ? "Claiming…" : claimState === "claimed" ? "Claimed ✅" : "Claim"}
              </button>

              <button className="btn" onClick={readPendingRewards} disabled={!isConnected}>
                Refresh rewards
              </button>
            </div>

            {txHash ? (
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                Tx:{" "}
                {basescanTx ? (
                  <a href={basescanTx} target="_blank" rel="noreferrer" style={{ color: "var(--text)" }}>
                    {shortAddr(txHash)}
                  </a>
                ) : (
                  <span style={{ color: "var(--text)" }}>{txHash}</span>
                )}
              </div>
            ) : null}

            {err ? <p className="p">⚠️ {err}</p> : null}

            <p className="p" style={{ color: "var(--muted)", marginTop: 6 }}>
              Lock Vault = earn yield (claim). Savings Vault = deposit/withdraw anytime (no yield).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
