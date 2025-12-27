export type StrategyQuote = {
  aprBps: number;       
  label: string;        
  risk: "low" | "medium" | "high";
  details: string;
};

export type LockIntent = {
  assetSymbol: string;  
  amount: string;       
  durationDays: number;
};

export interface LockVaultAdapter {
  id: string;
  name: string;
  description: string;
  supportedAssets: string[];
  getQuote(intent: LockIntent): Promise<StrategyQuote[]>;
}

export class MockYieldAdapter implements LockVaultAdapter {
  id = "mock-yield";
  name = "Mock Yield Adapter";
  description = "Placeholder adapter for testnet UX. Replace with Aave/Compound/Morpho later.";
  supportedAssets = ["ETH", "USDC"];

  async getQuote(intent: LockIntent): Promise<StrategyQuote[]> {
    const base = intent.assetSymbol === "USDC" ? 450 : 250;
    return [
      {
        aprBps: base + 120,
        label: "Conservative strategy basket",
        risk: "low",
        details: "Simulated yield. In production this will pull onchain/APR sources.",
      },
      {
        aprBps: base + 380,
        label: "Growth strategy basket",
        risk: "medium",
        details: "Simulated yield. Later: route into audited DeFi adapters.",
      },
    ];
  }
}

export const lockVaultAdapters: LockVaultAdapter[] = [
  new MockYieldAdapter(),
];