import { NextResponse } from "next/server";
import { getInvoiceByCode, markInvoicePaid } from "@/lib/merchantPayments";

export const dynamic = "force-dynamic";

async function unwrapParams<T>(p: T | Promise<T>): Promise<T> {
  // Next 16 can pass params as a Promise
  return typeof (p as any)?.then === "function" ? await (p as Promise<T>) : (p as T);
}

export async function GET(
  _req: Request,
  ctx: { params: { code: string } } | { params: Promise<{ code: string }> }
) {
  try {
    const params = await unwrapParams((ctx as any).params);
    const code = String(params?.code || "").trim();

    if (!code) return NextResponse.json({ error: "Missing invoice code" }, { status: 400 });

    const invoice = await getInvoiceByCode(code);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    return NextResponse.json({ invoice });
  } catch (e: any) {
    console.error("GET /api/payments/invoices/[code] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: { code: string } } | { params: Promise<{ code: string }> }
) {
  try {
    const params = await unwrapParams((ctx as any).params);
    const code = String(params?.code || "").trim();

    if (!code) return NextResponse.json({ error: "Missing invoice code" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const payerWallet = body?.payerWallet ? String(body.payerWallet) : undefined;
    const txHash = body?.txHash ? String(body.txHash) : undefined;
    const chainId = body?.chainId ? Number(body.chainId) : undefined;
    const tokenAddress = body?.tokenAddress ? String(body.tokenAddress) : undefined;

    const updated = await markInvoicePaid({
      invoiceCode: code,
      payerWallet,
      txHash,
      chainId,
      tokenAddress,
    });

    if (!updated) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    return NextResponse.json({ ok: true, invoice: updated });
  } catch (e: any) {
    console.error("POST /api/payments/invoices/[code] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
