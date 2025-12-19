"use client";

import { useSession, signOut } from "next-auth/react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { SiweMessage } from "siwe";
import { useMemo, useState } from "react";
import { keccak256, toUtf8Bytes, isHexString } from "ethers";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { address, chainId, isConnected } = useAccount();
  const { connect } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const [bindMsg, setBindMsg] = useState("");
  const [merchantIdText, setMerchantIdText] = useState("merchant-001");
  const [amountUsd, setAmountUsd] = useState("1"); // 1 USDC default
  const [createMsg, setCreateMsg] = useState("");
  const [invoiceId, setInvoiceId] = useState<string>("");

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const router = process.env.NEXT_PUBLIC_ROUTER!;
  const usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // base sepolia USDC (you already used this)

  const merchantId = useMemo(() => keccak256(toUtf8Bytes(merchantIdText)), [merchantIdText]);

  if (status === "loading") return <main style={{ padding: 20 }}>Loading…</main>;
  if (!session) return <main style={{ padding: 20 }}>Not signed in. Go to /login</main>;

  async function bindWallet() {
    if (!address || !chainId) return;

    const siwe = new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Bind this wallet to my Blockpoint account.",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce: crypto.randomUUID(),
    });

    const message = siwe.prepareMessage();
    const signature = await signMessageAsync({ message });

    const res = await fetch("/api/auth/siwe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    const data = await res.json();
    setBindMsg(data.ok ? `Wallet bound: ${data.address}` : `Bind failed: ${data.error}`);
  }

  async function createInvoice() {
    setCreateMsg("");
    setInvoiceId("");

    // amount in USDC 6 decimals
    const amt = Math.round(Number(amountUsd) * 1_000_000);
    if (!Number.isFinite(amt) || amt <= 0) {
      setCreateMsg("Invalid amount");
      return;
    }

    // invoice id as bytes32 (hash)
    const invoiceText = `inv-${Date.now()}`;
    const invoiceHash = keccak256(toUtf8Bytes(invoiceText));

    const res = await fetch(`${backend}/api/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invoiceId: invoiceHash,
        merchantId,
        token: usdc,
        amount: amt.toString(),
        expirySeconds: 3600,
        router,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setCreateMsg(data?.error || "Failed to create invoice");
      return;
    }

    setInvoiceId(invoiceHash);
    setCreateMsg("Invoice created ✅");
  }

  const payLinkOk = isHexString(invoiceId, 32);

  return (
    <main style={{ maxWidth: 900, margin: "50px auto", padding: 20 }}>
      <h1>Dashboard</h1>
      <p>Signed in as <b>{session.user?.email}</b></p>

      <hr style={{ margin: "20px 0" }} />

      <h2>1) Bind wallet</h2>

      {!isConnected ? (
        <button onClick={() => connect({ connector: injected() })} style={btn}>
          Connect wallet
        </button>
      ) : (
        <>
          <p>Wallet: <b>{address}</b> (chainId {chainId})</p>
          <button onClick={bindWallet} style={btn}>
            Bind wallet to account
          </button>
        </>
      )}

      {bindMsg && <p style={{ marginTop: 10 }}>{bindMsg}</p>}

      <hr style={{ margin: "20px 0" }} />

      <h2>2) Create an invoice</h2>
      <label>Merchant ID (text)</label>
      <input value={merchantIdText} onChange={(e) => setMerchantIdText(e.target.value)} style={input} />

      <label style={{ display: "block", marginTop: 10 }}>Amount (USDC)</label>
      <input value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} style={input} />

      <button onClick={createInvoice} style={btn}>Create invoice</button>

      {createMsg && <p style={{ marginTop: 10 }}>{createMsg}</p>}

      {payLinkOk && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
          <div><b>Invoice ID:</b> {invoiceId}</div>
          <div style={{ marginTop: 8 }}>
            <a href={`/pay/${invoiceId}`} style={{ textDecoration: "underline" }}>
              Open payment link
            </a>
          </div>
        </div>
      )}

      <hr style={{ margin: "20px 0" }} />

      <button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
    </main>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #111",
  marginTop: 10,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  marginTop: 6,
};