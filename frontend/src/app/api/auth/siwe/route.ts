import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { SiweMessage } from "siwe";

function randomNonce() {
  // good enough for nonce; SIWE libs often do similar
  return crypto.randomUUID().replace(/-/g, "");
}

function getDomainFromHeaders() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return { domain: "", origin: "" };
  return { domain: host, origin: `${proto}://${host}` };
}

// GET nonce
export async function GET() {
  const nonce = randomNonce();
  cookies().set("siwe-nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });
  return NextResponse.json({ nonce });
}

// POST verify
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message;
    const signature = body?.signature;

    if (!message || !signature) {
      return NextResponse.json({ ok: false, error: "Missing message/signature" }, { status: 400 });
    }

    const siwe = new SiweMessage(message);
    const nonceCookie = cookies().get("siwe-nonce")?.value;
    const { domain } = getDomainFromHeaders();

    const result = await siwe.verify({
      signature,
      domain,
      nonce: nonceCookie,
    });

    if (!result.success) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    return NextResponse.json({ ok: true, address: siwe.address.toLowerCase() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Verify failed" }, { status: 500 });
  }
}