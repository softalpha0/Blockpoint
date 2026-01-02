"use client";

import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { connect } from "wagmi/actions";

function isBrowser() {
  return typeof window !== "undefined";
}

function getEnv(name: string) {
  
  const v = process.env[name];
  return v && String(v).trim().length ? String(v).trim() : "";
}

const RPC_URL = getEnv("NEXT_PUBLIC_RPC_URL");

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(RPC_URL || undefined),
  },
  
  connectors: [injected()],
});

let _ready = false;

export async function initAppKit() {
  if (!isBrowser()) return;
  if (_ready) return;
  _ready = true;
}


export async function openAppKit() {
  await initAppKit();
  if (!isBrowser()) return;

  try {
    await connect(wagmiConfig, { connector: injected() as any });
    return;
  } catch (e) {
  }

  const projectId = getEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (Vercel Production env)");
  }

  const wc = walletConnect({
    projectId,
    showQrModal: true,
    metadata: {
      name: "Blockpoint",
      description: "Blockpoint",
      url: "https://blockpoint.netlify.app",
      icons: ["https://blockpoint.netlify.app/favicon.ico"],
    },
  });

  await connect(wagmiConfig, { connector: wc as any });
}
