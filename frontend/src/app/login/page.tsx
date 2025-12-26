"use client";

import { useAccount } from "wagmi";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openAppKit } from "@/lib/wallet";
export default function LoginPage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p>Connect your wallet to continue.</p>

        <button
          onClick={() => openAppKit()}
          className="rounded bg-white text-black px-4 py-2"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );
}