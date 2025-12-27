import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function randomNonce() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function GET() {
  const nonce = randomNonce();

  const c = await cookies();
  c.set("siwe-nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.json({ nonce });
}
