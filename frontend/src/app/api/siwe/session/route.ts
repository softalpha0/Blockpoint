import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJWT } from "@/lib/auth";

export async function GET() {
  const token = cookies().get("bp_session")?.value;

  if (!token) {
    return NextResponse.json({ ok: false });
  }

  const session = await verifySessionJWT(token);
  if (!session) {
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({
    ok: true,
    address: session.address,
    chainId: session.chainId,
  });
}