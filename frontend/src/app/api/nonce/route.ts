import { NextResponse } from "next/server";

function randomNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function GET() {
  const nonce = randomNonce();

  const res = NextResponse.json({ nonce });
  res.cookies.set("bp_siwe_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, 
  });

  return res;
}