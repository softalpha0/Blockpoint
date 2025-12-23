export default function HowItWorks() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "64px 20px" }}>
      <h1 style={{ fontSize: 40, marginBottom: 10 }}>How it works</h1>
      <p style={{ opacity: 0.85, fontSize: 18, lineHeight: 1.6 }}>
        Blockpoint lets merchants create USDC invoices and share a pay link.
        Customers pay on Base Sepolia, and the backend indexer updates the invoice status.
      </p>

      <ol style={{ marginTop: 22, lineHeight: 1.8 }}>
        <li>Merchant creates an invoice (amount + expiry) on-chain.</li>
        <li>App generates a pay link: <code>/pay/&lt;invoiceId&gt;</code></li>
        <li>Customer connects wallet and pays in USDC.</li>
        <li>Indexer reads events and marks invoice “paid” in the DB.</li>
      </ol>
    </main>
  );
}