import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

const NONCE_COOKIE = "bp_siwe_nonce";

function makeNonce() {
  return crypto.randomBytes(16).toString("hex");
}

export async function GET() {
  const nonce = makeNonce();
  const cookieStore = await cookies();

  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 mins
  });

  return NextResponse.json({ nonce });
}
