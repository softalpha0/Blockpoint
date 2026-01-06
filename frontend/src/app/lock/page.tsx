"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useDemoMode } from "@/lib/demo";

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const ERC20_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const LOCK_ABI = [
  { type: "function", name: "pendingRewards", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "staked", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export default function LockVaultPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { demo, toggle } = useDemoMode();

  const lockVault = (process.env.NEXT_PUBLIC_LOCK_VAULT_ADDRESS || "") as `0x${string}`;
  const usdc = (process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS || "") as `0x${string}`;

  const [err, setErr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>("");

  const [symbol, setSymbol] = useState("USDC");
  const [decimals, setDecimals] = useState(6);

  const [amount, setAmount] = useState("");
  const [bal, setBal] = useState<bigint>(0n);
  const [alw, setAlw] = useState<bigint>(0n);

  const [staked, setStaked] = useState<bigint>(0n);
  const [pending, setPending] = useState<bigint>(0n);

  const [busy, setBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);

  const basescanTx = txHash?.startsWith("0x") ? `https://sepolia.basescan.org/tx/${txHash}` : "";

  const walletLabel = useMemo(() => {
    if (!isConnected || !address) return "Not connected";
    return `Connected: ${shortAddr(address)}`;
  }, [isConnected, address]);

  const prettyBal = useMemo(() => formatUnits(bal, decimals), [bal, decimals]);
  const prettyStaked = useMemo(() => formatUnits(staked, decimals), [staked, decimals]);
  const prettyPendingBpt = useMemo(() => formatUnits(pending, 18), [pending]);

  const parsedAmount = useMemo(() => {
    try {
      return parseUnits(amount || "0", decimals);
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const needsApprove = useMemo(() => parsedAmount > 0n && alw < parsedAmount, [parsedAmount, alw]);

  async function refresh() {
    setErr(null);
    try {
      if (!publicClient || !isConnected || !address) {
        setBal(0n);
        setAlw(0n);
        setStaked(0n);
        setPending(0n);
        return;
      }

      if (demo) {
        setSymbol("USDC");
        setDecimals(6);
        setBal(2500n * 10n ** 6n);
        setAlw(10_000n * 10n ** 6n);
        setStaked(500n * 10n ** 6n);
        setPending(123n * 10n ** 18n);
        return;
      }

      if (!lockVault || lockVault === "0x" || !usdc || usdc === "0x") {
        setErr("Missing NEXT_PUBLIC_LOCK_VAULT_ADDRESS or NEXT_PUBLIC_TEST_USDC_ADDRESS");
        return;
      }

      const [d, s] = await Promise.all([
        publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>,
        publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>,
      ]);

      setDecimals(Number(d));
      setSymbol(s);

      const [b, a, st, p] = await Promise.all([
        publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "balanceOf", args: [address as `0x${string}`] }) as Promise<bigint>,
        publicClient.readContract({ address: usdc, abi: ERC20_ABI, functionName: "allowance", args: [address as `0x${string}`, lockVault] }) as Promise<bigint>,
        publicClient.readContract({ address: lockVault, abi: LOCK_ABI, functionName: "staked", args: [address as `0x${string}`] }) as Promise<bigint>,
        publicClient.readContract({ address: lockVault, abi: LOCK_ABI, functionName: "pendingRewards", args: [address as `0x${string}`] }) as Promise<bigint>,
      ]);

      setBal(b);
      setAlw(a);
      setStaked(st);
      setPending(p);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Refresh failed");
    }
  }

  useEffect(() => {
    refresh();
  }, [publicClient, address, demo]);

  async function faucet() {
    setErr(null);
    setTxHash("");
    try {
      if (!walletClient) throw new Error("Wallet not ready");
      if (!isConnected || !address) throw new Error("Connect wallet first");
      if (demo) return;

      const hash = await walletClient.writeContract({ address: usdc, abi: ERC20_ABI, functionName: "faucet", args: [] });
      setTxHash(String(hash));
      await publicClient!.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Faucet failed");
    }
  }

  async function approveAndDeposit() {
    setErr(null);
    setTxHash("");
    setBusy(true);

    try {
      if (!walletClient) throw new Error("Wallet not ready");
      if (!publicClient) throw new Error("Public client not ready");
      if (!isConnected || !address) throw new Error("Connect wallet first");
      if (demo) return;

      if (!(parsedAmount > 0n)) throw new Error("Enter a valid amount");

      if (needsApprove) {
        const h1 = await walletClient.writeContract({
          address: usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [lockVault, parsedAmount],
        });
        setTxHash(String(h1));
        await publicClient.waitForTransactionReceipt({ hash: h1 });
      }

      const h2 = await walletClient.writeContract({
        address: lockVault,
        abi: LOCK_ABI,
        functionName: "deposit",
        args: [parsedAmount],
      });
      setTxHash(String(h2));
      await publicClient.waitForTransactionReceipt({ hash: h2 });

      setAmount("");
      await refresh();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  async function claim() {
    setErr(null);
    setTxHash("");
    setClaimBusy(true);
    try {
      if (!walletClient) throw new Error("Wallet not ready");
      if (!publicClient) throw new Error("Public client not ready");
      if (!isConnected || !address) throw new Error("Connect wallet first");
      if (demo) return;

      const hash = await walletClient.writeContract({ address: lockVault, abi: LOCK_ABI, functionName: "claim", args: [] });
      setTxHash(String(hash));
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Claim failed");
    } finally {
      setClaimBusy(false);
    }
  }

  async function withdrawAll() {
    setErr(null);
    setTxHash("");
    setBusy(true);
    try {
      if (!walletClient) throw new Error("Wallet not ready");
      if (!publicClient) throw new Error("Public client not ready");
      if (!isConnected || !address) throw new Error("Connect wallet first");
      if (demo) return;

      if (!(staked > 0n)) throw new Error("Nothing staked");

      const hash = await walletClient.writeContract({
        address: lockVault,
        abi: LOCK_ABI,
        functionName: "withdraw",
        args: [staked],
      });
      setTxHash(String(hash));
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{symbol} balance</div>
              <div style={{ color: "var(--text)", fontWeight: 700 }}>{prettyBal}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Staked</div>
              <div style={{ color: "var(--text)", fontWeight: 700 }}>{prettyStaked}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>Pending rewards (BPT)</div>
              <div style={{ color: "var(--text)", fontWeight: 700 }}>{prettyPendingBpt}</div>
            </div>

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />

            <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={faucet} disabled={!isConnected || demo || busy || claimBusy}>
                Faucet
              </button>

              <button className="btn btnPrimary" onClick={approveAndDeposit} disabled={!isConnected || demo || busy || claimBusy || !(parsedAmount > 0n)}>
                {busy ? "Working…" : needsApprove ? "Approve & Deposit" : "Deposit"}
              </button>

              <button className="btn btnPrimary" onClick={claim} disabled={!isConnected || claimBusy}>
                {claimBusy ? "Claiming…" : "Claim"}
              </button>

              <button className="btn" onClick={withdrawAll} disabled={!isConnected || demo || busy || claimBusy || !(staked > 0n)}>
                Withdraw all
              </button>

              <button className="btn" onClick={refresh} disabled={!isConnected || busy || claimBusy}>
                Refresh
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
              Flow: Faucet → Approve & Deposit → Claim.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
