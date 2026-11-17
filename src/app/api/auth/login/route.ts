import { NextRequest, NextResponse } from "next/server";
import {
  signSessionToken,
  verifySuperAdminCredentials,
} from "@/lib/server-auth";

// Simple in-memory per-IP login rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Tunggu 1 menit." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password, role, accountId } = body;

    if (
      typeof username !== "string" ||
      !username.trim() ||
      (role !== "SUPER_ADMIN" && role !== "OWNER" && role !== "CASHIER")
    ) {
      return NextResponse.json(
        { error: "Username dan role tidak valid." },
        { status: 400 }
      );
    }

    // Super Admin credentials MUST be verified server-side
    if (role === "SUPER_ADMIN") {
      if (
        typeof password !== "string" ||
        !verifySuperAdminCredentials(username, password)
      ) {
        return NextResponse.json(
          { error: "Username atau password Super Admin salah." },
          { status: 401 }
        );
      }
    } else if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        { error: "ID akun tidak valid." },
        { status: 400 }
      );
    }

    const token = signSessionToken({
      username: username.trim().toLowerCase(),
      role,
      accountId: role === "SUPER_ADMIN" ? null : accountId,
      issuedAt: new Date().toISOString(),
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = NextResponse.json({
      success: true,
      username: username.trim().toLowerCase(),
      role,
    });

    response.cookies.set("kelokra_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat sesi login." },
      { status: 500 }
    );
  }
}
