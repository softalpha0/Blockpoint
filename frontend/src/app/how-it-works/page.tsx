"use client";

import Link from "next/link";

export default function HowItWorksPage() {
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
        <h1 className="h1">How it works</h1>

        <div className="card" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>1) Connect a wallet</h2>
          <p className="p">Blockpoint uses your wallet address as your account identity.</p>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>2) Use Vaults</h2>
          <ul className="p" style={{ marginTop: 6, paddingLeft: 18 }}>
            <li>
              <strong>Savings Vault:</strong> simple deposit/withdraw ledger (fiat rails demo).
            </li>
            <li>
              <strong>Lock Vault:</strong> lock crypto to earn yield + claim rewards.
            </li>
          </ul>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>3) Merchant Payments</h2>
          <p className="p" style={{ marginTop: 6 }}>
            Merchants generate invoices and share a payment link.
          </p>
          <ul className="p" style={{ marginTop: 6, paddingLeft: 18 }}>
            <li>
              App generates a pay link: <code>/pay/&lt;code&gt;</code>
            </li>
            <li>Customer opens the link and pays.</li>
            <li>Merchant sees status updates in their dashboard.</li>
          </ul>
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <Link className="btn btnPrimary" href="/dashboard">
            Go to Dashboard
          </Link>
          <Link className="btn" href="/lock">
            Go to Lock Vault
          </Link>
        </div>
      </div>
    </div>
  );
}
