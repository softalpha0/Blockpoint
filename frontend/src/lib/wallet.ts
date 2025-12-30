/**
 * Wallet / AppKit bootstrap.
 *
 * IMPORTANT for Vercel/Netlify builds:
 * - Never throw at module import time (prerender can import this on the server)
 * - Only validate env vars inside client-only functions (e.g. openAppKit)
 */

export const runtime = "nodejs";

function getWCProjectId(): string {
  // Do NOT throw here — this file can be imported during SSR/prerender.
  return process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
}

/**
 * Call this from a "Connect wallet" click handler.
 * This runs in the browser, so it's safe to validate env vars here.
 */
export async function openAppKit() {
  if (typeof window === "undefined") {
    // If somehow called on server, no-op.
    return;
  }

  const projectId = getWCProjectId();
  if (!projectId) {
    // This message matches what you were seeing, but now it won't kill the build.
    throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  }

  // If your project already had a working openAppKit implementation locally,
  // keep using it — just ensure it only runs in the browser and only checks env here.
  //
  // The safest pattern is to dynamically import any wallet UI libs inside this function
  // so they don't execute during SSR/prerender.

  // If you're using Reown/AppKit or WalletConnect UI libs, import them here:
  // Example (leave commented if not used in your repo):
  //
  // const { createAppKit } = await import("@reown/appkit");
  // ...init and open modal...

  // If your current setup uses a global modal already wired by wagmi/reown,
  // you can trigger it here. If you already had working logic, keep it.
  //
  // For now, we just dispatch a custom event that your existing UI can listen to,
  // OR you can replace this with your real modal call.
  window.dispatchEvent(new CustomEvent("bp:open-wallet"));
}
