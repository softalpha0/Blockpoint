"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { erc20Abi, invoiceRouterAbi } from "@/lib/abi";
import { openAppKit } from "@/lib/wallet";
import { formatUnits } from "viem";

const ROUTER = process.env.NEXT_PUBLIC_INVOICE_ROUTER_ADDRESS as `0x${string}`;
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const USDT = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`;

function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function tokenLabel(addr?: string) {
  const a = (addr || "").toLowerCase();
  if (USDC && a === USDC.toLowerCase()) return "USDC";
  if (USDT && a === USDT.toLowerCase()) return "USDT";
  return addr ? shortAddr(addr) : "Unknown";
}

export default function PayInvoicePage({ params }: { params: { invoiceId: string } }) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const invoiceId = params.invoiceId as `0x${string}`;

  const { data: inv } = useReadContract({
    abi: invoiceRouterAbi,
    address: ROUTER,
    functionName: "invoices",
    args: [invoiceId],
    query: { enabled: !!ROUTER && !!invoiceId },
  });

  const merchantId = (inv as any)?.[0] as `0x${string}` | undefined;
  const token = (inv as any)?.[1] as `0x${string}` | undefined;
  const amount = (inv as any)?.[2] as bigint | undefined;
  const expiry = (inv as any)?.[3] as bigint | undefined;
  const paid = (inv as any)?.[4] as boolean | undefined;

  const { data: decimals } = useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "decimals",
    query: { enabled: !!token },
  });

  const { data: symbol } = useReadContract({
    abi: erc20Abi,
    address: token,
    functionName: "symbol",
    query: { enabled: !!token },
  });

  const formattedAmount = useMemo(() => {
    if (!amount) return "—";
    const d = typeof decimals === "number" ? decimals : 18;
    return formatUnits(amount, d);
  }, [amount, decimals]);

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const connect = async () => {
    try {
      await openAppKit();
    } catch (e) {
      console.error(e);
    }
  };

  const canPay = !!address && !!token && !!amount && paid === false;

  const pay = async () => {
    setMsg(null);
    if (!canPay) return;

    try {
      setBusy("approve");

      await writeContractAsync({
        abi: erc20Abi,
        address: token!,
        functionName: "approve",
        args: [ROUTER, amount!],
      });

      setBusy("pay");

      await writeContractAsync({
        abi: invoiceRouterAbi,
        address: ROUTER,
        functionName: "payInvoice",
        args: [invoiceId],
      });

      setMsg("✅ Payment submitted");
    } catch (e: any) {
      setMsg(`⚠️ ${e?.shortMessage || e?.message || "Payment failed"}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container">
      <div className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/lock">Lock Vault</Link>
        </div>
      </div>

      <div className="section">
        <h1 className="h1">Pay Invoice</h1>
        <p className="p" style={{ marginTop: 6 }}>
          Router: <span style={{ color: "var(--text)" }}>{shortAddr(ROUTER)}</span>
        </p>
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <div className="card">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Invoice ID: <span style={{ color: "var(--text)" }}>{shortAddr(invoiceId)}</span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Merchant: <span style={{ color: "var(--text)" }}>{merchantId ? shortAddr(merchantId) : "—"}</span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Token: <span style={{ color: "var(--text)" }}>{token ? `${tokenLabel(token)} (${String(symbol || "")})` : "—"}</span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Amount: <span style={{ color: "var(--text)" }}>{formattedAmount}</span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Status: <span style={{ color: "var(--text)" }}>{paid ? "PAID" : "UNPAID"}</span>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Expiry: <span style={{ color: "var(--text)" }}>{expiry ? String(expiry) : "—"}</span>
            </div>
          </div>

          {!isConnected ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" onClick={connect}>
                Connect wallet
              </button>
            </div>
          ) : (
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btnPrimary" onClick={pay} disabled={!canPay || busy !== null}>
                {busy === "approve" ? "Approving…" : busy === "pay" ? "Paying…" : "Pay with token (USDC/USDT)"}
              </button>
            </div>
          )}

          {msg ? (
            <p className="p" style={{ marginTop: 10 }}>
              {msg}
            </p>
          ) : null}

          <p className="p" style={{ marginTop: 10 }}>
            Wallet: <span style={{ color: "var(--text)" }}>{address ? shortAddr(address) : "Not connected"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}