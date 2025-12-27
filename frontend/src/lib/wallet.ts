import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "wagmi/chains";

let initialized = false;
let appKit: ReturnType<typeof createAppKit> | null = null;

export let wagmiConfig: any;

export function initAppKit() {
  if (initialized) return;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  }

  const adapter = new WagmiAdapter({
    projectId,
    networks: [baseSepolia],
  });

  wagmiConfig = adapter.wagmiConfig;

  appKit = createAppKit({
    adapters: [adapter],
    networks: [baseSepolia],
    projectId,
    metadata: {
      name: "Blockpoint",
      description: "Onchain fintech for saving, locking, and growing funds",
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      icons: ["https://avatars.githubusercontent.com/u/37784886"], 
    },
  });

  initialized = true;
}

export function openAppKit() {
  if (!initialized) initAppKit();
  return appKit?.open();
}