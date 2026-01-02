"use client";

import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { connect } from "wagmi/actions";
import { injected, walletConnect } from "wagmi/connectors";

let _appKitReady = false;

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const connectors = (() => {
  const list = [injected()];

  if (WC_PROJECT_ID) {
    list.push(
      walletConnect({
        projectId: WC_PROJECT_ID,
        showQrModal: true,
        metadata: {
          name: "Blockpoint",
          description: "Blockpoint demo",
          url: "https://blockpoint.app",
          icons: ["https://avatars.githubusercontent.com/u/37784886?s=200&v=4"],
        },
      })
    );
  }

  return list;
})();

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(RPC_URL),
  },
  connectors,
});

export async function initAppKit() {
  
  if (_appKitReady) return;
  _appKitReady = true;
}

export async function openAppKit() {
  await initAppKit();

  
  const hasInjected =
    typeof window !== "undefined" &&
    typeof (window as any).ethereum !== "undefined";

  if (hasInjected) {
    await connect(wagmiConfig, { connector: injected() });
    return;
  }

  
  if (!WC_PROJECT_ID) {
    throw new Error(
      "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (set it in Vercel Production env)."
    );
  }

  await connect(wagmiConfig, {
    connector: walletConnect({
      projectId: WC_PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: "Blockpoint",
        description: "Blockpoint demo",
        url: typeof window !== "undefined" ? window.location.origin : "https://blockpoint.app",
        icons: ["https://avatars.githubusercontent.com/u/37784886?s=200&v=4"],
      },
    }),
  });
}
