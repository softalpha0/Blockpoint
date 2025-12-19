"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect, useReadContract, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { isHexString } from "ethers";

const ROUTER = process.env.NEXT_PUBLIC_ROUTER as `0x${string}`;
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;

const routerAbi = [
  {
    "inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],
    "name":"invoices",
    "outputs":[
      {"internalType":"bytes32","name":"merchantId","type":"bytes32"},
      {"internalType":"address","name":"token","type":"address"},
      {"internalType":"uint256","name":"amount","type":"uint256"},
      {"internalType":"uint64","name":"expiry","type":"uint64"},
      {"internalType":"bool","name":"paid","type":"bool"}
    ],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"bytes32","name":"invoiceId","type":"bytes32"}],
    "name":"payInvoice",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  }
] as const;

const erc20Abi = [
  {
    "inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],
    "name":"approve",
    "outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],
    "name":"allowance",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[],
    "name":"decimals",
    "outputs":[{"internalType":"uint8","name":"","type":"uint8"}],
    "stateMutability":"view",
    "type":"function"
  }
] as const;

export default function PayPage({ params }: { params: { invoiceId: string } }) {
  const invoiceId = params.invoiceId as `0x${string}`;
  const valid = useMemo(() => isHexString(invoiceId, 32), [invoiceId]);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState("");

  const { data: inv } = useReadContract({
    abi: routerAbi,
    address: ROUTER,
    functionName: "invoices",
    args: valid ? [invoiceId] : undefined,
    query: { enabled: valid },
  });

  const amount = inv?.[2] ?? BigInt(0);
  const paid = inv?.[4] ?? false;

  const { data: allowance } = useReadContract({
    abi: erc20Abi,
    address: USDC,
    functionName: "allowance",
    args: address ? [address, ROUTER] : undefined,
    query: { enabled: !!address && valid },
  });

  const enoughAllowance = (allowance ?? 0) >= amount;

  async function approve() {
    try {
      setStatus("Approving…");
      await writeContractAsync({
        abi: erc20Abi,
        address: USDC,
        functionName: "approve",
        args: [ROUTER, amount],
      });
      setStatus("Approved ✅");
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Approve failed");
    }
  }

  async function pay() {
    try {
      setStatus("Paying…");
      await writeContractAsync({
        abi: routerAbi,
        address: ROUTER,
        functionName: "payInvoice",
        args: [invoiceId],
      });
      setStatus("Paid ✅");
    } catch (e: any) {
      setStatus(e?.shortMessage || e?.message || "Payment failed");
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "50px auto", padding: 20 }}>
      <h1>Pay Invoice</h1>

      {!valid && <p>Invalid invoice id</p>}

      {valid && (
        <>
          <p><b>Invoice:</b> {invoiceId}</p>

          {!inv && <p>Loading invoice…</p>}

          {inv && (
            <>
              <p><b>Amount:</b> {Number(amount) / 1_000_000} USDC</p>
              <p><b>Status:</b> {paid ? "Paid" : "Unpaid"}</p>

              {!isConnected ? (
                <button onClick={() => connect({ connector: injected() })} style={btn}>
                  Connect wallet
                </button>
              ) : paid ? (
                <p>✅ Already paid</p>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {!enoughAllowance ? (
                    <button onClick={approve} style={btn}>Approve USDC</button>
                  ) : (
                    <button onClick={pay} style={btn}>Pay now</button>
                  )}
                </div>
              )}

              {status && <p style={{ marginTop: 12 }}>{status}</p>}
            </>
          )}
        </>
      )}
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
};