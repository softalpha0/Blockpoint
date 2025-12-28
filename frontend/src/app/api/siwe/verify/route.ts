import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { SiweMessage } from "siwe";
import { createSessionJWT } from "@/lib/auth";

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

    if (!message || !signature) {
      return textError("Missing message or signature", 400);
    }

    const h = await headers();
    const host = h.get("host");
    if (!host) return textError("Missing host header", 400);

    const cookieStore = await cookies();
    const nonce = cookieStore.get(NONCE_COOKIE)?.value;
    if (!nonce) return textError("Missing nonce cookie. Refresh and try again.", 400);

    const siwe = new SiweMessage(message);

    const result = await siwe.verify({
      signature,
      domain: host,
      nonce,
    });

    if (!result.success) {
      return textError("SIWE verification failed", 401);
    }

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
