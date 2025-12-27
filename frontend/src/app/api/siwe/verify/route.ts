import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { SiweMessage } from "siwe";
import { signSession, setSessionCookie } from "@/lib/auth";

async function getDomainFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return { domain: "", origin: "" };
  return { domain: host, origin: `${proto}://${host}` };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message;
    const signature = body?.signature;

    if (!message || !signature) {
      return NextResponse.json(
        { ok: false, error: "Missing message/signature" },
        { status: 400 }
      );
    }

    const siwe = new SiweMessage(message);

    const c = await cookies();
    const nonce = c.get("siwe-nonce")?.value;
    if (!nonce) {
      return NextResponse.json(
        { ok: false, error: "Missing nonce cookie" },
        { status: 400 }
      );
    }

    const { domain } = await getDomainFromHeaders();

    const result = await siwe.verify({
      signature,
      domain,
      nonce,
    });

    if (!result.success) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const token = await signSession({
      address: siwe.address,
      chainId: siwe.chainId,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      address: siwe.address.toLowerCase(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Verify failed" },
      { status: 500 }
    );
  }
}
