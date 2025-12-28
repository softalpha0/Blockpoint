import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJWT } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bp_session")?.value;

  if (!token) return NextResponse.json({});

  const session = await verifySessionJWT(token);
  if (!session) return NextResponse.json({});

  return NextResponse.json({ address: session.address, chainId: session.chainId });
}