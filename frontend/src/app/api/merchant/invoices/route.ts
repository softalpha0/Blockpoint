import { NextResponse } from "next/server";
import { createInvoice } from "@/lib/merchantPayments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const merchantWallet = String(body?.merchantWallet || body?.wallet || "").trim();
    const token = String(body?.token || "").trim();
    const title = body?.title ? String(body.title).trim() : undefined;
    const amount = String(body?.amount ?? "").trim();

    // We store expiry as a unix timestamp in seconds
    const nowSec = Math.floor(Date.now() / 1000);

    let expiry = Number(body?.expiry);
    if (!Number.isFinite(expiry) || expiry <= 0) {
      const expiresInDays = Number(body?.expiresInDays);
      if (Number.isFinite(expiresInDays) && expiresInDays > 0) {
        expiry = nowSec + Math.floor(expiresInDays * 24 * 60 * 60);
      }
    }

    if (!merchantWallet) return NextResponse.json({ error: "Missing merchant wallet" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
    if (!amount) return NextResponse.json({ error: "Missing amount" }, { status: 400 });
    if (!Number.isFinite(expiry) || expiry <= nowSec) {
      return NextResponse.json({ error: "Invalid expiry" }, { status: 400 });
    }

    const inv = await createInvoice({
      merchantWallet,
      token,
      amount,
      expiry,
    });

    return NextResponse.json({ invoice: inv, payUrl: `/pay/${inv.invoice_code}` });
  } catch (e: any) {
    console.error("create invoice error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
