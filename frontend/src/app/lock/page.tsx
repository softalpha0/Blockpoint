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
type LockState = "idle" | "approving" | "locking" | "done";

type TokenKey = "USDC" | "USDT";

function toUnits(amount: string, decimals: number): bigint {
  const a = (amount || "").trim();
  if (!a) return 0n;
  const [w, f = ""] = a.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const whole = BigInt(w || "0");
  const fracBn = BigInt(frac || "0");
  return whole * 10n ** BigInt(decimals) + fracBn;
}

export default function LockVaultPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { demo, toggle } = useDemoMode();

  const lockVault = (process.env.NEXT_PUBLIC_LOCK_VAULT_ADDRESS || "") as `0x${string}`;
  const usdc = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "") as `0x${string}`;
  const usdt = (process.env.NEXT_PUBLIC_USDT_ADDRESS || "") as `0x${string}`;

  const [pending, setPending] = useState<string>("0");
  const [err, setErr] = useState<string | null>(null);
  const [claimState, setClaimState] = useState<ClaimState>("idle");
  const [txHash, setTxHash] = useState<string>("");

  const [token, setToken] = useState<TokenKey>("USDC");
  const [lockAmount, setLockAmount] = useState("");
  const [lockState, setLockState] = useState<LockState>("idle");
  const [lockMsg, setLockMsg] = useState<string | null>(null);

  const basescanTx = txHash && txHash.startsWith("0x") ? `https://sepolia.basescan.org/tx/${txHash}` : "";

  const tokenCfg = useMemo(() => {
    if (token === "USDT") return { symbol: "USDT", address: usdt, decimals: 6 };
    return { symbol: "USDC", address: usdc, decimals: 6 };
  }, [token, usdc, usdt]);

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

  async function lockDeposit() {
    setErr(null);
    setLockMsg(null);
    setTxHash("");

    try {
      if (!isConnected || !address) throw new Error("Connect wallet first");
      if (!walletClient) throw new Error("Wallet not ready");

      const amt = Number(lockAmount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");

      if (demo) {
        setLockState("done");
        setLockMsg(`✅ Locked ${lockAmount} ${tokenCfg.symbol} (demo)`);
        setTxHash("0xDEMO_LOCK_TX");
        setLockAmount("");
        return;
      }

      if (!lockVault || lockVault === "0x") throw new Error("Missing NEXT_PUBLIC_LOCK_VAULT_ADDRESS");
      if (!tokenCfg.address || tokenCfg.address === "0x") throw new Error(`Missing token address for ${tokenCfg.symbol}`);

      const amountBn = toUnits(lockAmount, tokenCfg.decimals);

      setLockState("approving");

      const ERC20 = [
        { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
      ] as const;

      const approveHash = await walletClient.writeContract({
        address: tokenCfg.address,
        abi: ERC20,
        functionName: "approve",
        args: [lockVault, amountBn],
      });

      setTxHash(String(approveHash));
      await publicClient!.waitForTransactionReceipt({ hash: approveHash });

      setLockState("locking");

      const VAULT = [
        { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
        { type: "function", name: "lock", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
        { type: "function", name: "depositToken", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
        { type: "function", name: "lockToken", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
      ] as const;

      const fns = ["deposit", "lock", "depositToken", "lockToken"] as const;

      let lockHash: `0x${string}` | null = null;

      let lastErr: any = null;
      for (const fn of fns) {
        try {
          lockHash = await walletClient.writeContract({
            address: lockVault,
            abi: VAULT,
            functionName: fn,
            args: [tokenCfg.address, amountBn],
          });
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!lockHash) {
        throw new Error(lastErr?.shortMessage || lastErr?.message || "Vault lock function not found (deposit/lock)");
      }

      setTxHash(String(lockHash));
      await publicClient!.waitForTransactionReceipt({ hash: lockHash });

      setLockState("done");
      setLockMsg(`✅ Locked ${lockAmount} ${tokenCfg.symbol}`);
      setLockAmount("");
      await readPendingRewards();
    } catch (e: any) {
      setLockState("idle");
      setErr(e?.shortMessage || e?.message || "Lock failed");
    }
  }

  useEffect(() => {
    if (!publicClient) return;
    readPendingRewards();
  }, [publicClient, address, demo]);

  const walletLabel = useMemo(() => {
    if (!isConnected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [isConnected, address]);

  const canLock = isConnected && !!address && lockState !== "approving" && lockState !== "locking";

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
          <strong>Deposit / Lock</strong>
          <p className="p" style={{ marginTop: 6, color: "var(--muted)" }}>
            Lock USDC/USDT to earn yield. (Approve → Lock)
          </p>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label style={{ color: "var(--muted)", fontSize: 13 }}>
              Token
              <select
                value={token}
                onChange={(e) => setToken(e.target.value as TokenKey)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.2)",
                  color: "var(--text)",
                }}
              >
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </label>

            <label style={{ color: "var(--muted)", fontSize: 13 }}>
              Amount
              <input
                value={lockAmount}
                onChange={(e) => setLockAmount(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 10"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.2)",
                  color: "var(--text)",
                }}
              />
            </label>

            <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btnPrimary" onClick={lockDeposit} disabled={!canLock}>
                {lockState === "approving"
                  ? "Approving…"
                  : lockState === "locking"
                  ? "Locking…"
                  : lockState === "done"
                  ? "Locked ✅"
                  : `Lock ${tokenCfg.symbol}`}
              </button>

              <button className="btn" onClick={readPendingRewards} disabled={!isConnected}>
                Refresh
              </button>
            </div>

            {lockMsg ? <p className="p">{lockMsg}</p> : null}
          </div>
        </div>

        {/* Rewards */}
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
              Lock Vault = lock crypto and earn yield. Savings Vault = deposit/withdraw anytime (no yield).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}