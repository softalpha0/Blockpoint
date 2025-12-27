import crypto from "crypto";

const COOKIE_NAME = "bp_session";

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(data: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export function createSessionToken({
  address,
  secret,
  ttlSeconds = 60 * 60 * 24 * 7,
}: {
  address: string;
  secret: string;
  ttlSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { a: address.toLowerCase(), iat: now, exp: now + ttlSeconds };
  const body = base64url(JSON.stringify(payload));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string, secret: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  if (sign(body, secret) !== sig) return null;

  const payload = JSON.parse(Buffer.from(body, "base64").toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload as { a: string };
}
