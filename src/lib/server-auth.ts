import crypto from "crypto";
import { NextRequest } from "next/server";

const FALLBACK_DEV_SECRET = crypto
  .createHash("sha256")
  .update("kelokra-pos-session-signing-key-v1")
  .digest("hex");

function getSigningSecret(): string {
  return process.env.AUTH_SECRET || FALLBACK_DEV_SECRET;
}

export interface SignedSessionPayload {
  username: string;
  role: "SUPER_ADMIN" | "OWNER" | "CASHIER";
  accountId: string | null;
  issuedAt: string;
  exp: number;
}

export function signSessionToken(payload: SignedSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined
): SignedSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    ) as SignedSessionPayload;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(
  req: NextRequest
): SignedSessionPayload | null {
  const cookieVal = req.cookies.get("kelokra_session")?.value;
  return verifySessionToken(cookieVal);
}

export function verifySuperAdminCredentials(
  username: string,
  password: string
): boolean {
  const expectedUser = (process.env.SUPER_ADMIN_USERNAME || "superadmin")
    .trim()
    .toLowerCase();
  const expectedPass = process.env.SUPER_ADMIN_PASSWORD || "234575";

  const userMatch = username.trim().toLowerCase() === expectedUser;
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(expectedPass).digest();
  return userMatch && crypto.timingSafeEqual(a, b);
}
