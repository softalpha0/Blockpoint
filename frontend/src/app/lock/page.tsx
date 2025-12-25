// frontend/src/app/lock/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { erc20Abi, lockVaultAbi } from "@/lib/abi";

const LOCK_VAULT = process.env.NEXT_PUBLIC_LOCK_VAULT as `0x${string}`;
const LOCK_ASSET = process.env.NEXT_PUBLIC_LOCK_ASSET as `0x${string}`;
const DECIMALS = Number(process.env.NEXT_PUBLIC_LOCK_ASSET_DECIMALS || "6");

export default function LockPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");

  const amt = useMemo(() => {
    try {
      return parseUnits(amount || "0", DECIMALS);
    } catch {
      return 0n;
    }
  }, [amount]);

  const { data: allowance } = useReadContract({
    abi: erc20Abi,
    address: LOCK_ASSET,
    functionName: "allowance",
    args: address ? [address, LOCK_VAULT] : undefined,
    query: { enabled: !!address },
  });

  const { data: pendingBPT } = useReadContract({
    abi: lockVaultAbi,
    address: LOCK_VAULT,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const needApprove = (allowance ?? 0n) < amt;

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Lock & Earn BPT</h1>
      <p style={{ opacity: 0.8 }}>
        Lock your assets and earn <b>BPT (BlockPoint Token)</b> as rewards.
      </p>

      {!isConnected ? (
        <div style={{ marginTop: 18 }}>Connect your wallet</div>
      ) : (
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount to lock"
            style={{ padding: 10, borderRadius: 10 }}
          />

          <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,.06)" }}>
            <div style={{ opacity: 0.75 }}>Pending BPT Rewards</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {formatUnits((pendingBPT ?? 0n) as bigint, 18)} BPT
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {needApprove ? (
              <button
                disabled={isPending || amt === 0n}
                onClick={() =>
                  writeContractAsync({
                    abi: erc20Abi,
                    address: LOCK_ASSET,
                    functionName: "approve",
                    args: [LOCK_VAULT, amt],
                  })
                }
              >
                Approve
              </button>
            ) : (
              <button
                disabled={isPending || amt === 0n}
                onClick={() =>
                  writeContractAsync({
                    abi: lockVaultAbi,
                    address: LOCK_VAULT,
                    functionName: "deposit",
                    args: [amt],
                  })
                }
              >
                Lock & Earn BPT
              </button>
            )}

            <button
              disabled={isPending || amt === 0n}
              onClick={() =>
                writeContractAsync({
                  abi: lockVaultAbi,
                  address: LOCK_VAULT,
                  functionName: "withdraw",
                  args: [amt],
                })
              }
            >
              Withdraw
            </button>

            <button
              disabled={isPending}
              onClick={() =>
                writeContractAsync({
                  abi: lockVaultAbi,
                  address: LOCK_VAULT,
                  functionName: "claim",
                  args: [],
                })
              }
            >
              Claim BPT
            </button>
          </div>
        </div>
      )}
    </main>
  );
}