import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    updatedAt: Date.now(),
    prices: {
      USDC: 1.0,
      USDT: 1.0,
      BPT: 0.1,
    },
  });
}
