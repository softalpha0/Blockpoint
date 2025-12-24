import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { SiweMessage } from "siwe";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in frontend env`);
  return v;
}

export async function GET() {
  // nonce endpoint: /api/auth/siwe
  const nonce = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("siwe-nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return NextResponse.json({ nonce });
}

export async function POST(req: Request) {
  // verify endpoint: /api/auth/siwe
  const session = await getServerSession(authOptions as any);
  const email = (session as any)?.user?.email as string | undefined;
  if (!email) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const { message, signature } = await req.json();

  const cookieNonce = (await cookies()).get("siwe-nonce")?.value;
  if (!cookieNonce) {
    return NextResponse.json({ ok: false, error: "Missing nonce cookie" }, { status: 400 });
  }

  const siwe = new SiweMessage(message);

  const domain = new URL(mustEnv("NEXTAUTH_URL")).host;

  const result = await siwe.verify({
    signature,
    domain,
    nonce: cookieNonce,
  });

  if (!result.success) {
    return NextResponse.json({ ok: false, error: "SIWE verify failed" }, { status: 401 });
  }

  const address = siwe.address.toLowerCase();
  const chainId = Number(siwe.chainId);

  // find user + upsert wallet
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  await prisma.wallet.upsert({
    where: { address_chainId: { address, chainId } },
    update: { userId: user.id },
    create: { address, chainId, userId: user.id },
  });

  return NextResponse.json({ ok: true, address, chainId });
}