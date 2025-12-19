export default function Home() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="brand">
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--brand)" }} />
          Blockpoint <span className="badge">Base Sepolia • Testnet</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/faq">FAQ</a>
          <a className="btn btnPrimary" href="/login">Get started</a>
        </div>
      </nav>

      <header className="hero">
        <h1 className="h1">USDC invoices, paid in minutes.</h1>
        <p className="p">
          Blockpoint lets merchants create shareable invoice links for USDC payments on Base.
          Customers pay with a wallet, and you get verifiable receipts + clean reconciliation.
        </p>

        <div className="actions">
          <a className="btn btnPrimary" href="/login">Sign in with email</a>
          <a className="btn" href="/dashboard">Go to dashboard</a>
          <a className="btn btnGreen" href="/faq">How it works</a>
        </div>

        <div className="section" style={{ marginTop: 26 }}>
          <div className="grid">
            <div className="card">
              <h3>Instant settlement</h3>
              <p>USDC moves in minutes, not days. Track payment status in real-time.</p>
            </div>
            <div className="card">
              <h3>Audit-ready receipts</h3>
              <p>Invoice IDs + tx hashes make reconciliation clean and verifiable.</p>
            </div>
            <div className="card">
              <h3>Cross-border friendly</h3>
              <p>Reduce friction and intermediaries. Stablecoin payments without volatility.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="section">
        <h2 className="sectionTitle">Testnet demo flow</h2>
        <div className="grid">
          <div className="card">
            <h3>1) Sign in</h3>
            <p>Use email magic link (NextAuth). No passwords.</p>
          </div>
          <div className="card">
            <h3>2) Bind wallet</h3>
            <p>Connect wallet and save it to your account for invoice payouts.</p>
          </div>
          <div className="card">
            <h3>3) Create invoice</h3>
            <p>Generate a payment link and send it to anyone to test.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>©️ {new Date().getFullYear()} Blockpoint — Testnet MVP</span>
        <span>Tip: Share pay link like <span className="kbd">/pay/&lt;invoiceId&gt;</span></span>
      </footer>
    </div>
  );
}