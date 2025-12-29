import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getBackendBase() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:3001"
  ).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const upstream = `${getBackendBase()}/api/fiat/deposit`;

  try {
    const body = await req.text();
    const r = await fetch(upstream, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json", accept: "application/json" },
      body,
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
      { error: "Backend unreachable", details: e?.message || String(e), upstream },
      { status: 502 }
    );
  }
}