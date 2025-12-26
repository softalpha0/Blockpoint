
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
  
];

export function getAsset(symbol: string) {
  return ASSETS.find((a) => a.symbol === symbol) ?? ASSETS[0];
}