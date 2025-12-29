import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getBackendBase() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:3001"
  ).replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") || "";
  const currency = searchParams.get("currency") || "";

  if (!wallet || !currency) {
    return NextResponse.json({ error: "Missing wallet or currency" }, { status: 400 });
  }

  const upstream = `${getBackendBase()}/api/fiat/balance?wallet=${encodeURIComponent(
    wallet
  )}&currency=${encodeURIComponent(currency)}`;

  try {
    const r = await fetch(upstream, {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Backend unreachable",
        details: e?.message || String(e),
        upstream,
      },
      { status: 502 }
    );
  }
}