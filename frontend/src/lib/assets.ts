// frontend/src/lib/assets.ts
export type Asset = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

export const ASSETS: Asset[] = [
  {
    symbol: "USDC",
    address: process.env.NEXT_PUBLIC_USDC as `0x${string}`,
    decimals: 6,
  },
  // Add USDT when you have it deployed on Base Sepolia (or mainnet later)
  // {
  //   symbol: "USDT",
  //   address: process.env.NEXT_PUBLIC_USDT as `0x${string}`,
  //   decimals: 6,
  // },
];

export function getAsset(symbol: string) {
  return ASSETS.find((a) => a.symbol === symbol) ?? ASSETS[0];
}