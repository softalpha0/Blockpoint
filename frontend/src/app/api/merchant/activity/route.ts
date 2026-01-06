import { NextResponse } from "next/server";
import { listMerchantActivity } from "@/lib/merchantPayments";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet") || "";
  const limit = Number(url.searchParams.get("limit") || "50");

  if (!wallet || !wallet.startsWith("0x")) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  try {
    const rows = await listMerchantActivity(wallet, Number.isFinite(limit) ? Math.min(limit, 200) : 50);
    return NextResponse.json({ rows });
  } catch (e: any) {
    console.error("merchant activity error:", e);
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
