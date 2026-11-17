import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";
import {
  findAccountById,
  getTenantStoreFromDb,
  isCloudDatabaseConfigured,
  resolveAccountTenantId,
  upsertTenantStoreInDb,
} from "@/lib/neon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedForTenant(
  req: NextRequest,
  requestedTenantId: string
): Promise<{ ok: boolean; status: number }> {
  const session = getSessionFromRequest(req);
  if (!session) return { ok: false, status: 401 };

  if (session.role === "SUPER_ADMIN") {
    return { ok: true, status: 200 };
  }

  let sessionTenant = session.tenantId || null;
  if (!sessionTenant && session.accountId) {
    const row = await findAccountById(session.accountId);
    if (row) sessionTenant = resolveAccountTenantId(row);
  }

  if (!sessionTenant || sessionTenant !== requestedTenantId) {
    return { ok: false, status: 403 };
  }

  return { ok: true, status: 200 };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const cloudConfigured = isCloudDatabaseConfigured();
  if (!cloudConfigured) {
    return NextResponse.json({ cloudConfigured: false, exists: false, store: null });
  }

  const { tenantId } = await context.params;
  const decodedTenantId = decodeURIComponent(tenantId || "").trim();
  if (!decodedTenantId || decodedTenantId === "SUPER_ADMIN_GLOBAL") {
    return NextResponse.json({ error: "Tenant ID tidak valid." }, { status: 400 });
  }

  const auth = await isAuthorizedForTenant(req, decodedTenantId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  try {
    const store = await getTenantStoreFromDb(decodedTenantId);
    return NextResponse.json({
      cloudConfigured: true,
      exists: Boolean(store),
      store,
    });
  } catch (err) {
    console.error("Tenant GET error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data toko dari Neon PostgreSQL." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const cloudConfigured = isCloudDatabaseConfigured();
  if (!cloudConfigured) {
    return NextResponse.json({ cloudConfigured: false, skipped: true });
  }

  const { tenantId } = await context.params;
  const decodedTenantId = decodeURIComponent(tenantId || "").trim();
  if (!decodedTenantId || decodedTenantId === "SUPER_ADMIN_GLOBAL") {
    return NextResponse.json({ error: "Tenant ID tidak valid." }, { status: 400 });
  }

  const auth = await isAuthorizedForTenant(req, decodedTenantId);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  try {
    const body = await req.json();
    await upsertTenantStoreInDb(decodedTenantId, {
      products: Array.isArray(body.products) ? body.products : [],
      sales: Array.isArray(body.sales) ? body.sales : [],
      movements: Array.isArray(body.movements) ? body.movements : [],
      suppliers: Array.isArray(body.suppliers) ? body.suppliers : [],
      purchases: Array.isArray(body.purchases) ? body.purchases : [],
      returns: Array.isArray(body.returns) ? body.returns : [],
      customers: Array.isArray(body.customers) ? body.customers : [],
      expenses: Array.isArray(body.expenses) ? body.expenses : [],
      shifts: Array.isArray(body.shifts) ? body.shifts : [],
      storeSettings:
        body.storeSettings && typeof body.storeSettings === "object"
          ? body.storeSettings
          : {},
    });

    return NextResponse.json({
      success: true,
      cloudConfigured: true,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Tenant PUT error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan data toko ke Neon PostgreSQL." },
      { status: 500 }
    );
  }
}
