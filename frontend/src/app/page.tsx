"use client";

import Link from "next/link";

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {eyebrow ? (
        <div style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {eyebrow}
        </div>
      ) : null}
      <h2 style={{ margin: "6px 0 0", fontSize: 26 }}>{title}</h2>
      {subtitle ? (
        <p className="p" style={{ marginTop: 8, maxWidth: 760 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.2)",
        fontSize: 13,
        color: "var(--text)",
      }}
    >
      {children}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="container">
      {/* NAV */}
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

      {/* HERO */}
      <div className="section" style={{ paddingTop: 24 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <Pill>⚡ Testnet Preview • Base Sepolia</Pill>

          <h1 className="h1" style={{ fontSize: 44, lineHeight: 1.05, margin: 0, maxWidth: 880 }}>
            Onchain fintech for saving, locking, and paying with crypto.
          </h1>

          <p className="p" style={{ fontSize: 16, maxWidth: 760 }}>
            Blockpoint turns crypto into usable money with simple vaults and merchant payments — built for speed, self-custody,
            and global access.
          </p>

          <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Link className="btn btnPrimary" href="/login">
              Get started
            </Link>
            <Link className="btn" href="/dashboard">
              View dashboard
            </Link>
            <Link className="btn" href="/how-it-works">
              How it works
            </Link>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <Pill>🔐 Non-custodial</Pill>
            <Pill>🌍 Borderless payments</Pill>
            <Pill>🏦 Vault-based controls</Pill>
            <Pill>🧾 Invoices + tracking</Pill>
          </div>
        </div>
      </div>

      {/* PROBLEM */}
      <div className="section" style={{ marginTop: 18 }}>
        <SectionTitle
          eyebrow="Why Blockpoint"
          title="Crypto has money — but most people don’t have structure."
          subtitle="Wallets are raw. Banking rails are fragile. Merchant payments are slow or censored. Blockpoint adds the missing primitives: save, lock, and pay — all onchain."
        />

        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <strong>Wallets are unstructured</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Most wallets are just balances — no savings, no discipline, no rails for everyday usage.
            </p>
          </div>

          <div className="card">
            <strong>Banking rails are fragile</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Delays, limits, borders, and freezes make global money movement unreliable.
            </p>
          </div>

          <div className="card">
            <strong>Payments are broken</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Merchants deal with chargebacks, settlement delays, and intermediaries.
            </p>
          </div>
        </div>
      </div>

      {/* SOLUTION */}
      <div className="section" style={{ marginTop: 18 }}>
        <SectionTitle
          eyebrow="What you can do"
          title="Three money primitives: Save, Lock, Pay."
          subtitle="A simple dashboard that feels like fintech — powered by onchain settlement."
        />

        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Savings Vault</h3>
            <p className="p" style={{ marginTop: 8 }}>
              Flexible deposits and withdrawals anytime — a clean ledger and balance view.
            </p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="btn btnPrimary" href="/savings">
                Open Savings Vault
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Lock Vault</h3>
            <p className="p" style={{ marginTop: 8 }}>
              Lock crypto for discipline and yield. Track rewards and claim when available.
            </p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="btn btnPrimary" href="/lock">
                Open Lock Vault
              </Link>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Merchant Payments</h3>
            <p className="p" style={{ marginTop: 8 }}>
              Create invoices, share a link or QR, and track payment status onchain.
            </p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="btn btnPrimary" href="/dashboard">
                Go to Payments
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="section" style={{ marginTop: 18 }}>
        <SectionTitle
          eyebrow="How it works"
          title="Built to feel simple — without giving up control."
          subtitle="Blockpoint keeps the UX clean while preserving self-custody and onchain verification."
        />

        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <strong>1) Connect</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Connect your wallet. You control funds — Blockpoint never holds custody.
            </p>
          </div>
          <div className="card">
            <strong>2) Choose a vault</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Save flexibly or lock for yield. Your activity appears as a ledger.
            </p>
          </div>
          <div className="card">
            <strong>3) Get paid</strong>
            <p className="p" style={{ marginTop: 8 }}>
              Create invoices and track settlement status using transaction hashes.
            </p>
          </div>
        </div>
      </div>

      {/* TRUST / TESTNET NOTICE */}
      <div className="section" style={{ marginTop: 18 }}>
        <div className="card">
          <strong>Testnet preview</strong>
          <p className="p" style={{ marginTop: 8, color: "var(--muted)" }}>
            Blockpoint is currently running on testnet. No real funds are required. This is a product preview for early testers.
          </p>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="section" style={{ marginTop: 18, paddingBottom: 28 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Ready to try Blockpoint?</h2>
          <p className="p" style={{ marginTop: 8 }}>
            Connect your wallet and explore Savings, Lock Vault, and Payments.
          </p>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/login">
              Get started
            </Link>
            <Link className="btn" href="/dashboard">
              View dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}