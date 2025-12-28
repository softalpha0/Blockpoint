"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { erc20Abi, lockVaultAbi } from "@/lib/abi";
import { openAppKit } from "@/lib/wallet";

const LOCK_VAULT = process.env.NEXT_PUBLIC_LOCK_VAULT as `0x${string}`;
const LOCK_ASSET = process.env.NEXT_PUBLIC_LOCK_ASSET as `0x${string}`;
const LOCK_REWARD = process.env.NEXT_PUBLIC_LOCK_REWARD as `0x${string}`;

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function LockPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: assetDecimals } = useReadContract({
    abi: erc20Abi,
    address: LOCK_ASSET,
    functionName: "decimals",
    query: { enabled: !!LOCK_ASSET },
  });

  const { data: rewardDecimals } = useReadContract({
    abi: erc20Abi,
    address: LOCK_REWARD,
    functionName: "decimals",
    query: { enabled: !!LOCK_REWARD },
  });

  const { data: pendingReward, refetch: refetchPending } = useReadContract({
    abi: lockVaultAbi,
    address: LOCK_VAULT,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!LOCK_VAULT, refetchInterval: 5000 },
  });

  const pending = useMemo(() => {
    const dec = typeof rewardDecimals === "number" ? rewardDecimals : 18;
    const v = (pendingReward as bigint | undefined) ?? 0n;
    return formatUnits(v, dec);
  }, [pendingReward, rewardDecimals]);

  const connect = async () => {
    try {
      await openAppKit();
    } catch (e) {
      console.error(e);
    }
  };

  const ensureConnected = () => mounted && isConnected && !!address;

  const doDeposit = async () => {
    setMsg(null);
    if (!ensureConnected()) return setMsg("Connect wallet first");
    if (!assetDecimals) return setMsg("Token decimals not ready");

    const n = Number(amt);
    if (!Number.isFinite(n) || n <= 0) return setMsg("Enter a valid amount");

    const parsed = parseUnits(amt, assetDecimals as number);

    try {
      setBusy("deposit");

      await writeContractAsync({
        abi: erc20Abi,
        address: LOCK_ASSET,
        functionName: "approve",
        args: [LOCK_VAULT, parsed],
      });

      await writeContractAsync({
        abi: lockVaultAbi,
        address: LOCK_VAULT,
        functionName: "deposit",
        args: [parsed],
      });

      setAmt("");
      setMsg("✅ Deposited");
      refetchPending();
    } catch (e: any) {
      setMsg(`⚠️ ${e?.shortMessage || e?.message || "Deposit failed"}`);
    } finally {
      setBusy(null);
    }
  };

  const doWithdraw = async () => {
    setMsg(null);
    if (!ensureConnected()) return setMsg("Connect wallet first");
    if (!assetDecimals) return setMsg("Token decimals not ready");

    const n = Number(amt);
    if (!Number.isFinite(n) || n <= 0) return setMsg("Enter a valid amount");

    const parsed = parseUnits(amt, assetDecimals as number);

    try {
      setBusy("withdraw");

      await writeContractAsync({
        abi: lockVaultAbi,
        address: LOCK_VAULT,
        functionName: "withdraw",
        args: [parsed],
      });

      setAmt("");
      setMsg("✅ Withdrawn");
      refetchPending();
    } catch (e: any) {
      setMsg(`⚠️ ${e?.shortMessage || e?.message || "Withdraw failed"}`);
    } finally {
      setBusy(null);
    }
  };

  const doClaim = async () => {
    setMsg(null);
    if (!ensureConnected()) return setMsg("Connect wallet first");

    try {
      setBusy("claim");

      await writeContractAsync({
        abi: lockVaultAbi,
        address: LOCK_VAULT,
        functionName: "claim",
        args: [],
      });

      setMsg("✅ Claimed rewards");
      refetchPending();
    } catch (e: any) {
      setMsg(`⚠️ ${e?.shortMessage || e?.message || "Claim failed"}`);
    } finally {
      setBusy(null);
    }
  };

  const canClaim = mounted && Number(pending || "0") > 0;

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/how-it-works">How it works</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1">Lock Vault</h1>
        <p className="p" style={{ marginTop: 6 }}>
          Lock crypto, earn yield. Wallet:{" "}
          <span style={{ color: "var(--text)" }}>{mounted && address ? shortAddr(address) : "Not connected"}</span>
        </p>

        {!mounted || !isConnected ? (
          <div className="actions" style={{ marginTop: 14 }}>
            <button className="btn btnPrimary" onClick={connect} disabled={!mounted}>
              {mounted ? "Connect wallet" : "Loading…"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <div className="grid">
          <div className="card">
            <strong>Deposit / Withdraw</strong>
            <p className="p" style={{ marginTop: 6 }}>
              Vault: <span style={{ color: "var(--text)" }}>{shortAddr(LOCK_VAULT)}</span>
            </p>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <input
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.2)",
                  color: "var(--text)",
                }}
              />

              <div className="actions">
                <button className="btn btnPrimary" onClick={doDeposit} disabled={!ensureConnected() || busy !== null}>
                  {busy === "deposit" ? "Depositing…" : "Deposit"}
                </button>
                <button className="btn" onClick={doWithdraw} disabled={!ensureConnected() || busy !== null}>
                  {busy === "withdraw" ? "Withdrawing…" : "Withdraw"}
                </button>
              </div>

              {msg ? <p className="p">{msg}</p> : null}
            </div>
          </div>

          <div className="card">
            <strong>Rewards</strong>
            <p className="p" style={{ marginTop: 6 }}>
              Pending rewards (live):{" "}
              <span style={{ color: "var(--text)" }}>{mounted ? pending : "—"}</span>
            </p>

            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn btnPrimary" onClick={doClaim} disabled={!ensureConnected() || busy !== null || !canClaim}>
                {busy === "claim" ? "Claiming…" : canClaim ? "Claim" : "Nothing to claim"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}