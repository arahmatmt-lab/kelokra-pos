import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  findAccountById,
  isCloudDatabaseConfigured,
  resolveAccountTenantId,
} from "@/lib/neon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cloudConfigured = isCloudDatabaseConfigured();
  const session = getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      cloudConfigured,
      session: null,
      tenantId: null,
    });
  }

  if (session.role === "SUPER_ADMIN") {
    return NextResponse.json({
      authenticated: true,
      cloudConfigured,
      tenantId: "SUPER_ADMIN_GLOBAL",
      session: {
        userId: "super-admin-001",
        username: session.username,
        name: "Super Admin KELOKRA",
        role: "SUPER_ADMIN",
        accountId: null,
        storeName: "KELOKRA",
        loggedInAt: session.issuedAt,
      },
    });
  }

  if (!cloudConfigured) {
    return NextResponse.json({
      authenticated: true,
      cloudConfigured: false,
      tenantId: session.tenantId || session.accountId,
      session: null,
    });
  }

  try {
    if (!session.accountId) {
      return NextResponse.json({
        authenticated: false,
        cloudConfigured: true,
        session: null,
        tenantId: null,
      });
    }

    const row = await findAccountById(session.accountId);
    const expiresMs = row ? Date.parse(row.expires_at) : 0;
    const isExpired =
      !row || !row.expires_at || Number.isNaN(expiresMs) || expiresMs <= Date.now();

    if (!row || row.status !== "AKTIF" || isExpired) {
      const res = NextResponse.json({
        authenticated: false,
        cloudConfigured: true,
        reason: "expired_or_disabled",
        session: null,
        tenantId: null,
      });
      res.cookies.delete("kelokra_session");
      return res;
    }

    const tenantId = resolveAccountTenantId(row);
    return NextResponse.json({
      authenticated: true,
      cloudConfigured: true,
      tenantId,
      session: {
        userId: row.id,
        username: row.username,
        name: row.name,
        role: row.role === "CASHIER" ? "CASHIER" : "OWNER",
        ...(row.owner_mode ? { ownerMode: row.owner_mode } : {}),
        accountId: row.id,
        storeName: row.store_name || "KELOKRA",
        loggedInAt: session.issuedAt,
      },
    });
  } catch (err) {
    console.error("Session verify error:", err);
    return NextResponse.json(
      {
        authenticated: false,
        cloudConfigured: true,
        error: "Gagal memverifikasi sesi cloud.",
      },
      { status: 500 }
    );
  }
}
