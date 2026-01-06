import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";

export const dynamic = "force-dynamic";

function rpcUrl() {
  
  return process.env.BASE_SEPOLIA_RPC_URL?.trim() || "https://sepolia.base.org";
}

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = (searchParams.get("wallet") || "").toLowerCase();

  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl(), {
        batch: true,
        retryCount: 1,
        timeout: 10_000,
      }),
    });

   
    await client.getBlockNumber();

    const rows: any[] = [];

    return json({ rows });
  } catch (e: any) {
    console.error("api/activity error:", e);

    
    return json(
      {
        rows: [],
        warning:
          e?.shortMessage ||
          e?.message ||
          "RPC error while loading onchain activity",
        rpc: rpcUrl(),
      },
      200
    );
  }
}