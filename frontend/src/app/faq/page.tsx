export default function FAQ() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "64px 20px" }}>
      <h1>FAQ</h1>

      <h3>Is this mainnet?</h3>
      <p>No — this is Base Sepolia testnet for MVP testing.</p>

      <h3>Do customers need crypto?</h3>
      <p>For now yes (wallet + test USDC). Later we can add fiat onramps and hosted wallets.</p>

      <h3>What do merchants receive?</h3>
      <p>USDC goes to the merchant payout address (plus fee if configured).</p>

      <h3>Can I use other tokens?</h3>
      <p>Yes, the Router supports any ERC-20 token address, but we recommend USDC for stability.</p>
    </main>
  );
}