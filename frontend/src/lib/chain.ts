import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 84532);

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});