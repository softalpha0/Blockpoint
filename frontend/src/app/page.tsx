export default function Home() {
  return (
    <div className="container">
      <nav className="nav">
        <div className="logo">Blockpoint</div>
        <div className="navLinks">
          <a href="/faq">FAQ</a>
          <a href="/how-it-works">How it works</a>
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
          <a className="btn" href="/how-it-works">How it works</a>
        </div>
      </header>

      <section className="section">
        <h2>What Blockpoint solves</h2>
        <div className="grid">
          <div className="card"><h3>Instant settlement</h3><p>USDC moves in minutes, not days. Track payment status in real time.</p></div>
          <div className="card"><h3>Audit-ready receipts</h3><p>Invoice IDs + tx hashes make reconciliation clean and verifiable.</p></div>
          <div className="card"><h3>Cross-border friendly</h3><p>Reduce friction and intermediaries. Stablecoin payments without volatility.</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Testnet demo flow</h2>
        <div className="grid">
          <div className="card"><h3>1) Sign in</h3><p>Email magic link (NextAuth). No passwords.</p></div>
          <div className="card"><h3>2) Bind wallet</h3><p>Connect a wallet and sign once to link it to your account.</p></div>
          <div className="card"><h3>3) Pay invoice</h3><p>Open a pay link and pay USDC on Base Sepolia.</p></div>
        </div>
      </section>

      <footer className="footer">
        ©️ {new Date().getFullYear()} Blockpoint — Base Sepolia Testnet MVP
      </footer>
    </div>
  );
}