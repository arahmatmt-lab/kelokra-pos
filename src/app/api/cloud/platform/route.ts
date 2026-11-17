import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  addFeedbackInDb,
  appendAuditLogInDb,
  createAccountsBatchInDb,
  deleteAccountCascadeInDb,
  deleteFeedbackInDb,
  editAccountInDb,
  extendAccountInDb,
  findAccountById,
  getPlatformDataForRole,
  isCloudDatabaseConfigured,
  markFeedbackReadInDb,
  resetAccountPasswordInDb,
  resolveAccountTenantId,
  syncBootstrapPlatformToDb,
  toggleAccountStatusInDb,
  updateAdminWhatsappInDb,
} from "@/lib/neon-db";
import type { ManagedAccount } from "@/types/nextpos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addMonthsIso(baseIso: string, addMonths: number): string {
  const d = new Date(baseIso);
  d.setMonth(d.getMonth() + addMonths);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const cloudConfigured = isCloudDatabaseConfigured();
  if (!cloudConfigured) {
    return NextResponse.json({ cloudConfigured: false });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: Sesi login diperlukan.", cloudConfigured: true },
      { status: 401 }
    );
  }

  try {
    let resolvedTenant = session.tenantId || null;
    if (session.role !== "SUPER_ADMIN" && session.accountId && !resolvedTenant) {
      const row = await findAccountById(session.accountId);
      if (row) resolvedTenant = resolveAccountTenantId(row);
    }

    const data = await getPlatformDataForRole(
      session.role,
      session.accountId,
      resolvedTenant
    );

    return NextResponse.json({
      cloudConfigured: true,
      ...data,
    });
  } catch (err) {
    console.error("Platform GET error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data platform dari Neon PostgreSQL." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const cloudConfigured = isCloudDatabaseConfigured();
  if (!cloudConfigured) {
    return NextResponse.json({ cloudConfigured: false, skipped: true });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized: Sesi login diperlukan." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";

    switch (action) {
      case "create_accounts_batch": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const accounts = Array.isArray(body.accounts)
          ? (body.accounts as ManagedAccount[])
          : [];
        if (accounts.length === 0 || accounts.length > 20) {
          return NextResponse.json(
            { error: "Payload akun tidak valid." },
            { status: 400 }
          );
        }
        await createAccountsBatchInDb(accounts);
        return NextResponse.json({ success: true });
      }

      case "extend_account": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const accountId = String(body.accountId || "");
        const addMonths = Math.max(1, Math.min(120, Number(body.addMonths) || 1));
        const existing = await findAccountById(accountId);
        if (!existing) {
          return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
        }
        const base =
          Date.parse(existing.expires_at) > Date.now()
            ? existing.expires_at
            : new Date().toISOString();
        const newExpiresAt = addMonthsIso(base, addMonths);
        await extendAccountInDb(accountId, addMonths, newExpiresAt);
        return NextResponse.json({ success: true, expiresAt: newExpiresAt });
      }

      case "toggle_status": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const accountId = String(body.accountId || "");
        const status = await toggleAccountStatusInDb(accountId);
        return NextResponse.json({ success: true, status });
      }

      case "edit_account": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const accountId = String(body.accountId || "");
        const updates = body.updates || {};
        await editAccountInDb(accountId, {
          name: String(updates.name || "").trim(),
          username: String(updates.username || "").trim().toLowerCase(),
          storeName: String(updates.storeName || "").trim(),
          email: String(updates.email || "").trim(),
        });
        return NextResponse.json({ success: true });
      }

      case "reset_password": {
        const accountId = String(body.accountId || "");
        const passwordHash = String(body.passwordHash || "");
        const passwordSalt = String(body.passwordSalt || "");
        const updatedEmail =
          typeof body.updatedEmail === "string" && body.updatedEmail.trim()
            ? body.updatedEmail.trim()
            : undefined;

        if (!accountId || !passwordHash || !passwordSalt) {
          return NextResponse.json(
            { error: "Data hash kata sandi tidak lengkap." },
            { status: 400 }
          );
        }

        const target = await findAccountById(accountId);
        if (!target) {
          return NextResponse.json(
            { error: "Akun target tidak ditemukan." },
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
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await resetAccountPasswordInDb(
          accountId,
          passwordHash,
          passwordSalt,
          updatedEmail
        );
        return NextResponse.json({ success: true });
      }

      case "delete_account": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const accountId = String(body.accountId || "");
        await deleteAccountCascadeInDb(accountId);
        return NextResponse.json({ success: true });
      }

      case "add_feedback": {
        if (session.role !== "OWNER" && session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const fb = body.feedback;
        if (!fb || !fb.id || !fb.title || !fb.message) {
          return NextResponse.json(
            { error: "Data saran tidak lengkap." },
            { status: 400 }
          );
        }
        await addFeedbackInDb({
          id: String(fb.id),
          ownerId:
            session.role === "OWNER" && session.accountId
              ? session.accountId
              : String(fb.ownerId || ""),
          ownerName: String(fb.ownerName || ""),
          storeName: String(fb.storeName || ""),
          category: fb.category || "Lainnya",
          title: String(fb.title),
          message: String(fb.message),
          createdAt: String(fb.createdAt || new Date().toISOString()),
          isRead: Boolean(fb.isRead),
        });
        return NextResponse.json({ success: true });
      }

      case "mark_feedback_read": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await markFeedbackReadInDb(String(body.feedbackId || ""));
        return NextResponse.json({ success: true });
      }

      case "delete_feedback": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await deleteFeedbackInDb(String(body.feedbackId || ""));
        return NextResponse.json({ success: true });
      }

      case "update_admin_whatsapp": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await updateAdminWhatsappInDb(String(body.digits || ""));
        return NextResponse.json({ success: true });
      }

      case "append_audit": {
        const entry = body.entry;
        if (!entry || !entry.id || !entry.action) {
          return NextResponse.json({ error: "Audit entry invalid." }, { status: 400 });
        }
        await appendAuditLogInDb(entry);
        return NextResponse.json({ success: true });
      }

      case "sync_bootstrap": {
        if (session.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        await syncBootstrapPlatformToDb({
          accounts: Array.isArray(body.accounts) ? body.accounts : [],
          feedbacks: Array.isArray(body.feedbacks) ? body.feedbacks : [],
          auditLogs: Array.isArray(body.auditLogs) ? body.auditLogs : [],
          adminWhatsapp:
            typeof body.adminWhatsapp === "string" ? body.adminWhatsapp : "",
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Aksi platform tidak dikenal: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const msg =
      err instanceof Error && err.message.includes("unique")
        ? "Username sudah digunakan di database."
        : "Gagal menyimpan perubahan ke Neon PostgreSQL.";
    console.error("Platform POST error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
