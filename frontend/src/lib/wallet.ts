/**
 * Wallet/AppKit + Wagmi config
 *
 * Exports used by app:
 * - wagmiConfig
 * - initAppKit
 * - openAppKit
 *
 * Safe for SSR/build: does not throw at import time.
 */

import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

function env(name: string): string {
  return process.env[name] || "";
}

export function getWalletConnectProjectId(): string {
  return env("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
}

const wcProjectId = getWalletConnectProjectId();

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      // must be non-empty for wagmi connector init; we swap to real value at connect-time
      projectId: wcProjectId || "00000000000000000000000000000000",
      showQrModal: true,
    }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

let _inited = false;

export async function initAppKit() {
  if (typeof window === "undefined") return;
  if (_inited) return;
  _inited = true;

  if (!getWalletConnectProjectId()) {
    console.warn("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (WalletConnect disabled)");
  }
}

export async function openAppKit() {
  if (typeof window === "undefined") return;

  await initAppKit();

  const projectId = getWalletConnectProjectId();
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  }

  // Your UI can listen for this event to open a modal if needed.
  window.dispatchEvent(new CustomEvent("bp:open-wallet"));
}
