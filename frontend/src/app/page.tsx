import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container fadeIn">
      <header className="nav">
        <div className="logo">
          <span>Blockpoint</span>
          <span className="badge">Testnet preview · Base Sepolia (84532)</span>
        </div>

        <nav className="navLinks">
          <Link href="/how-it-works">How it works</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="kicker">Onchain fintech — familiar UX, transparent settlement</div>
        <h1 className="h1">Onchain fintech for saving, locking, and growing funds</h1>
        <p className="p">
          Blockpoint delivers a Moniepoint-style banking experience — but with custody rules, vault logic,
          and (eventually) yield routing enforced onchain. Start with predictable saving flows, then lock
          assets into DeFi strategy adapters to earn yield transparently.
        </p>

        <div className="actions">
          <Link className="btn btnPrimary" href="/login">
            Connect wallet
          </Link>
          <Link className="btn" href="/how-it-works">
            Learn how it works
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>Savings & Lock Vaults</h2>
          <div className="sectionHint">Bank-like flows, smart-contract guarantees</div>
        </div>

        <div className="grid">
          <div className="card">
            <h3>Savings Vault</h3>
            <p>Simple, predictable saving powered by smart contracts.</p>
            <ul>
              <li>Low-friction deposits & withdrawals</li>
              <li>Clear balance & transaction history</li>
              <li>Future: automated saving rules (round-ups, schedules)</li>
            </ul>
          </div>

          <div className="card">
            <h3>Lock Vault</h3>
            <p>
              A strategy-ready layer: lock assets for a duration and optionally route into DeFi yield adapters.
            </p>
            <ul>
              <li>Time-locked commitments (terms)</li>
              <li>DeFi plug-in architecture (adapters)</li>
              <li>Future: risk tiers + protocol baskets</li>
            </ul>
          </div>

          <div className="card">
            <h3>BPT Token</h3>
            <p>Testnet utility token for accounting, rewards, and incentives.</p>
            <ul>
              <li>Prototype incentives on testnet</li>
              <li>Usage tracking + rewards experiments</li>
              <li>Optional future: points/governance mechanics</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>Why Blockpoint?</h2>
          <div className="sectionHint">Fintech UX + onchain enforcement</div>
        </div>

        <p className="p" style={{ fontSize: 15 }}>
          Traditional fintech feels simple because complexity lives on the backend. Blockpoint keeps that simplicity
          — while moving key rules onchain: custody logic, vault rules, and (eventually) transparent yield routing.
          The goal is a product that can scale from “save normally” to “earn yield” without changing the user experience.
        </p>

        <div className="grid">
          <div className="card">
            <h3>Fintech UX foundations</h3>
            <p>Clean dashboards, predictable flows, mobile-first polish.</p>
          </div>
          <div className="card">
            <h3>Onchain guarantees</h3>
            <p>Smart contracts enforce vault rules and strategy execution transparently.</p>
          </div>
          <div className="card">
            <h3>Composable DeFi</h3>
            <p>Lock Vault is where DeFi protocols plug in later to deliver yield options.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionTitle">
          <h2>What you can do today (testnet)</h2>
          <div className="sectionHint">Safe sandbox · verify network before signing</div>
        </div>

        <div className="grid">
          <div className="card">
            <h3>Connect</h3>
            <p>Connect a wallet and access the dashboard.</p>
          </div>
          <div className="card">
            <h3>Save</h3>
            <p>Deposit into Savings Vault and track balances.</p>
          </div>
          <div className="card">
            <h3>Lock</h3>
            <p>Try Lock Vault flows (strategy-ready layer for future yield routing).</p>
          </div>
        </div>

        <div className="footer">Testnet only. Always verify addresses + network before signing transactions.</div>
      </section>
    </main>
  );
}