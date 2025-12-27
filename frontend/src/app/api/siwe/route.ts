import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { SiweMessage } from "siwe";

function randomNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function getDomainFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return { domain: "", origin: "" };
  return { domain: host, origin: `${proto}://${host}` };
}

// GET nonce
export async function GET() {
  const nonce = randomNonce();

  const c = await cookies();
  c.set("siwe-nonce", nonce, {
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
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json(
        { ok: false, error: "Missing message/signature" },
        { status: 400 }
      );
    }

    const siwe = new SiweMessage(message);

    const c = await cookies();
    const nonce = c.get("siwe-nonce")?.value;

    const { domain } = await getDomainFromHeaders();

    const result = await siwe.verify({
      signature,
      domain,
      nonce,
    });

    if (!result.success) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    c.set("bp-session", siwe.address.toLowerCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ ok: true, address: siwe.address.toLowerCase() });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Verify failed" },
      { status: 500 }
    );
  }
}