import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  findAccountById,
  isCloudDatabaseConfigured,
  verifySaltedPasswordServer,
} from "@/lib/neon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cloudConfigured = isCloudDatabaseConfigured();
  const session = getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json(
      { error: "Sesi login telah berakhir. Silakan login ulang." },
      { status: 401 }
    );
  }

  if (!cloudConfigured) {
    return NextResponse.json({ cloudConfigured: false, valid: false });
  }

  try {
    const body = await req.json();
    const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!accountId || !password) {
      return NextResponse.json(
        { error: "ID akun dan kata sandi wajib diisi.", cloudConfigured: true },
        { status: 400 }
      );
    }

    const target = await findAccountById(accountId);
    if (!target) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan di database.", cloudConfigured: true },
        { status: 404 }
      );
    }

    const isOwnOwner =
      session.role === "OWNER" &&
      target.role === "OWNER" &&
      target.id === session.accountId;

    const isOwnCashier =
      session.role === "OWNER" &&
      target.role === "CASHIER" &&
      target.parent_owner_id === session.accountId;

    if (session.role !== "SUPER_ADMIN" && !isOwnOwner && !isOwnCashier) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin memverifikasi akun ini." },
        { status: 403 }
      );
    }

    const valid = verifySaltedPasswordServer(
      password,
      target.password_hash,
      target.password_salt
    );

    return NextResponse.json({
      cloudConfigured: true,
      valid,
    });
  } catch (err) {
    console.error("Verify password error:", err);
    return NextResponse.json(
      { error: "Gagal memverifikasi kata sandi ke server." },
      { status: 500 }
    );
  }
}
