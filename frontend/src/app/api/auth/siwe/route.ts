import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const nonce = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies(); // ✅ Next.js 16 typed as async
  cookieStore.set("siwe-nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return NextResponse.json({ nonce });
}