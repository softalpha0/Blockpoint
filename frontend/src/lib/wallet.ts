import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { connect } from "@wagmi/core";

let _ready = false;

function env(name: string) {
  const v = process.env[name];
  return v && String(v).trim().length ? String(v).trim() : "";
}

const RPC_URL = env("NEXT_PUBLIC_RPC_URL") || "https://sepolia.base.org";

const WC_PROJECT_ID = env("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(RPC_URL),
  },
  connectors: [
    injected(),
    walletConnect({
      projectId: WC_PROJECT_ID || "00000000000000000000000000000000",
      showQrModal: true,
      metadata: {
        name: "Blockpoint",
        description: "Blockpoint demo",
        url: "https://blockpoint.netlify.app",
        icons: ["https://blockpoint.netlify.app/favicon.ico"],
      },
    }),
  ],
});

export async function initAppKit() {
  if (_ready) return;

  if (!WC_PROJECT_ID) {
    console.warn(
      "[wallet] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is missing/empty. WalletConnect QR will not work, but injected wallets can still connect."
    );
  }

  _ready = true;
}

export async function openAppKit() {
  await initAppKit();

  if (typeof window === "undefined") return;

  const hasInjected = typeof (window as any).ethereum !== "undefined";

  try {
    if (hasInjected) {
      await connect(wagmiConfig, { connector: injected() });
      return;
    }

    if (!WC_PROJECT_ID) {
      throw new Error("WalletConnect Project ID missing. Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in Vercel env.");
    }

    await connect(wagmiConfig, {
      connector: walletConnect({
        projectId: WC_PROJECT_ID,
        showQrModal: true,
        metadata: {
          name: "Blockpoint",
          description: "Blockpoint demo",
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
        },
      }),
    });
  } catch (e) {
    console.error("[wallet] connect failed:", e);
    throw e;
  }
}
