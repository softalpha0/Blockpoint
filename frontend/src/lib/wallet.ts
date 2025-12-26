
import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "wagmi/chains";

let initialized = false;

export const config = new WagmiAdapter({
  networks: [baseSepolia],
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "MISSING_PROJECT_ID",
}).wagmiConfig;

export function openAppKit() {
  if (typeof window === "undefined") return;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  }

  if (initialized) return;

  const adapter = new WagmiAdapter({
    networks: [baseSepolia],
    projectId,
  });

  createAppKit({
    adapters: [adapter],
    networks: [baseSepolia],
    projectId, 
  });

  initialized = true;
}