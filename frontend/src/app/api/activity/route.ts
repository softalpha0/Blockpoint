import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

function rpcUrl() {
  return (
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://sepolia.base.org"
  );
}

export async function GET() {
  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl()),
    });

    const block = await client.getBlockNumber();
    return NextResponse.json({ ok: true, block });
  } catch (e: any) {
    console.error("api/activity error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
