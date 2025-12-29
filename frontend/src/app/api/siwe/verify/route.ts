import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { SiweMessage } from "siwe";
import { createSessionJWT } from "@/lib/auth";

export const runtime = "nodejs";

const NONCE_COOKIE = "bp_siwe_nonce";

function textError(message: string, status = 400) {
  return new NextResponse(message, { status });
}

export async function POST(req: Request) {
  try {
    const { message, signature } = (await req.json()) as {
      message?: string;
      signature?: string;
    };

    if (!message || !signature) return textError("Missing message or signature", 400);

    const h = await headers();
    const host = h.get("host");
    if (!host) return textError("Missing host header", 400);

    const siwe = new SiweMessage(message);

    // IMPORTANT:
    // Use nonce from message as the source of truth.
    // If cookie exists, we can optionally compare, but don't hard-fail in demo.
    const cookieStore = await cookies();
    const nonceCookie = cookieStore.get(NONCE_COOKIE)?.value;

    if (nonceCookie && nonceCookie !== siwe.nonce) {
      // soft-fail would still be okay, but let's be strict here:
      return textError("Nonce mismatch. Refresh and try again.", 400);
    }

    const result = await siwe.verify({
      signature,
      domain: host,
      nonce: siwe.nonce,
    });

    if (!result.success) return textError("SIWE verification failed", 401);

    const token = await createSessionJWT({
      address: siwe.address,
      chainId: siwe.chainId,
    });

    cookieStore.set("bp_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // clear nonce cookie
    cookieStore.set(NONCE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ ok: true, address: siwe.address });
  } catch (e: any) {
    return textError(e?.message ?? "Verify error", 400);
  }
}
