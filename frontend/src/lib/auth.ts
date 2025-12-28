import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "bp_session";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing AUTH_SECRET in env");
  return new TextEncoder().encode(s);
};

export type SessionPayload = {
  address: string;
  chainId: number;
};

export async function createSessionJWT(payload: SessionPayload) {
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 7)
    .setSubject(payload.address.toLowerCase())
    .sign(secret());
}

export async function verifySessionJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const address = (payload as any)?.address as string | undefined;
    const chainId = (payload as any)?.chainId as number | undefined;

    if (!address || !chainId) return null;
    return { address, chainId };
  } catch {
    return null;
  }
}

/**
 * Server-only helper used by RSC/layouts:
 * reads the session cookie and returns the decoded payload.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionJWT(token);
}

/**
 * Optional: server helper for logout route.
 */
export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}