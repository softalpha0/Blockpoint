import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "bp_session";
const ISSUER = "blockpoint";
const AUDIENCE = "blockpoint-web";


function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing AUTH_SECRET in env");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  address: string;
  chainId?: number;
};

export async function signSession(payload: SessionPayload) {
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    address: payload.address.toLowerCase(),
    chainId: payload.chainId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionJWT(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  const address = String(payload.address ?? "").toLowerCase();
  const chainIdRaw = payload.chainId;

  return {
    address,
    chainId: typeof chainIdRaw === "number" ? chainIdRaw : undefined,
  } as SessionPayload;
}


export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, 
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession() {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifySessionJWT(token);
  } catch {
    return null;
  }
}
