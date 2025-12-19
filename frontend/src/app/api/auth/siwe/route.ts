// frontend/src/app/api/auth/siwe/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/authOptions";

// If you have prisma or db logic below, keep it — the important part is typing session safely.

type SessionWithUser = {
  user?: {
    email?: string | null;
  } | null;
};

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithUser | null;
  const email = session?.user?.email ?? null;

  if (!email) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  // ---- your existing SIWE / wallet-bind logic goes here ----
  // Example:
  // const { address } = await req.json();
  // await prisma.user.update({ where: { email }, data: { walletAddress: address } });

  return NextResponse.json({ ok: true });
}