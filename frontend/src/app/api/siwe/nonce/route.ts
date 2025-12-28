import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateNonce } from "siwe";

const NONCE_COOKIE = "bp_siwe_nonce";

export async function GET() {
  const nonce = generateNonce();

  const cookieStore = await cookies();
  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, 
  });

  return NextResponse.json({ nonce });
}