import { NextRequest, NextResponse } from "next/server";
import {
  signSessionToken,
  verifySuperAdminCredentials,
} from "@/lib/server-auth";
import {
  findAccountByUsername,
  isCloudDatabaseConfigured,
  resolveAccountTenantId,
  updateAccountLastLogin,
  verifySaltedPasswordServer,
} from "@/lib/neon-db";

export const runtime = "nodejs";

// Simple in-memory per-IP login rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 25) return false;
  entry.count += 1;
  return true;
}

function formatWibLoginStamp(): string {
  const now = new Date();
  const datePart = now.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
  const timePart = now.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} ${timePart}`;
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
    const { username, password, role, accountId, tenantId } = body;

    if (typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Username wajib diisi." },
        { status: 400 }
      );
    }

    const uname = username.trim().toLowerCase();
    const cloudConfigured = isCloudDatabaseConfigured();

    // 1. Check Super Admin credentials server-side first
    if (
      typeof password === "string" &&
      password.length > 0 &&
      verifySuperAdminCredentials(uname, password)
    ) {
      const issuedAt = new Date().toISOString();
      const token = signSessionToken({
        username: uname,
        role: "SUPER_ADMIN",
        accountId: null,
        tenantId: "SUPER_ADMIN_GLOBAL",
        issuedAt,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const response = NextResponse.json({
        success: true,
        cloudConfigured,
        mode: cloudConfigured ? "cloud" : "local",
        tenantId: "SUPER_ADMIN_GLOBAL",
        session: {
          userId: "super-admin-001",
          username: uname,
          name: "Super Admin KELOKRA",
          role: "SUPER_ADMIN",
          accountId: null,
          storeName: "KELOKRA",
          loggedInAt: issuedAt,
        },
      });

      response.cookies.set("kelokra_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // 2. When Neon Cloud PostgreSQL is configured, authenticate Owner & Kasir from DB
    if (cloudConfigured && role !== "SUPER_ADMIN") {
      if (typeof password !== "string" || !password) {
        return NextResponse.json(
          { error: "Username atau password salah.", cloudConfigured: true },
          { status: 401 }
        );
      }

      const accRow = await findAccountByUsername(uname);
      if (!accRow) {
        return NextResponse.json(
          { error: "Username atau password salah.", cloudConfigured: true },
          { status: 401 }
        );
      }

      const pwdValid = verifySaltedPasswordServer(
        password,
        accRow.password_hash,
        accRow.password_salt
      );
      if (!pwdValid) {
        return NextResponse.json(
          { error: "Username atau password salah.", cloudConfigured: true },
          { status: 401 }
        );
      }

      const expiresMs = Date.parse(accRow.expires_at);
      const isExpired = !accRow.expires_at || Number.isNaN(expiresMs) || expiresMs <= Date.now();
      if (accRow.status !== "AKTIF" || isExpired) {
        return NextResponse.json(
          {
            error: `Akun "${accRow.name}" tidak dapat masuk karena ${
              isExpired
                ? "masa aktif telah habis"
                : "status akun sedang dinonaktifkan"
            }. Hubungi Super Admin untuk perpanjangan.`,
            cloudConfigured: true,
          },
          { status: 403 }
        );
      }

      const resolvedRole = accRow.role === "CASHIER" ? "CASHIER" : "OWNER";
      const resolvedTenantId = resolveAccountTenantId(accRow);
      const issuedAt = new Date().toISOString();

      await updateAccountLastLogin(accRow.id, formatWibLoginStamp()).catch(
        () => {}
      );

      const token = signSessionToken({
        username: accRow.username,
        role: resolvedRole,
        accountId: accRow.id,
        tenantId: resolvedTenantId,
        issuedAt,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const response = NextResponse.json({
        success: true,
        cloudConfigured: true,
        mode: "cloud",
        tenantId: resolvedTenantId,
        session: {
          userId: accRow.id,
          username: accRow.username,
          name: accRow.name,
          role: resolvedRole,
          ...(accRow.owner_mode ? { ownerMode: accRow.owner_mode } : {}),
          accountId: accRow.id,
          storeName: accRow.store_name || "KELOKRA",
          loggedInAt: issuedAt,
        },
      });

      response.cookies.set("kelokra_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // 3. Fallback when running purely in local/offline mode without DATABASE_URL
    if (
      !cloudConfigured &&
      (role === "OWNER" || role === "CASHIER") &&
      typeof accountId === "string" &&
      accountId.trim()
    ) {
      const token = signSessionToken({
        username: uname,
        role,
        accountId,
        tenantId: typeof tenantId === "string" ? tenantId : accountId,
        issuedAt: new Date().toISOString(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      const response = NextResponse.json({
        success: true,
        cloudConfigured: false,
        mode: "local",
        username: uname,
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
    }

    return NextResponse.json(
      {
        error: "Username atau password salah.",
        cloudConfigured,
      },
      { status: 401 }
    );
  } catch (err) {
    console.error("Auth login error:", err);
    return NextResponse.json(
      { error: "Gagal memproses login pada server." },
      { status: 500 }
    );
  }
}
