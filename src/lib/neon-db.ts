import crypto from "crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  AuditLogEntry,
  DeveloperFeedback,
  ManagedAccount,
  OwnerAccountMode,
  StoreSettings,
} from "@/types/nextpos";

export interface TenantStorePayload {
  products: unknown[];
  sales: unknown[];
  movements: unknown[];
  suppliers: unknown[];
  purchases: unknown[];
  returns: unknown[];
  customers: unknown[];
  expenses: unknown[];
  shifts: unknown[];
  storeSettings: Partial<StoreSettings>;
}

export interface DbAccountRow {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  password_salt: string;
  email: string;
  role: string;
  owner_mode: string | null;
  parent_owner_id: string | null;
  store_name: string;
  duration_months: number;
  created_at: string;
  expires_at: string;
  status: string;
  avatar_color: string;
  last_login: string;
}

let cachedSchemaUrl: string | null = null;
let schemaPromise: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    "";
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isCloudDatabaseConfigured(): boolean {
  return getDatabaseUrl() !== null;
}

export function getNeonSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  return neon(url);
}

/**
 * Ensures PostgreSQL tables exist idempotently on cold start without requiring
 * manual CLI migration steps after attaching Neon in Vercel.
 */
export async function ensureKelokraSchema(): Promise<
  NeonQueryFunction<false, false>
> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL belum dikonfigurasi.");
  }
  const sql = neon(url);

  if (cachedSchemaUrl === url && schemaPromise) {
    await schemaPromise;
    return sql;
  }

  cachedSchemaUrl = url;
  schemaPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS kelokra_accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL DEFAULT '',
          password_salt TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          role TEXT NOT NULL,
          owner_mode TEXT,
          parent_owner_id TEXT,
          store_name TEXT NOT NULL DEFAULT '',
          duration_months INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'AKTIF',
          avatar_color TEXT NOT NULL DEFAULT '#10b981',
          last_login TEXT NOT NULL DEFAULT '-',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS kelokra_platform_meta (
          id TEXT PRIMARY KEY,
          admin_whatsapp TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        INSERT INTO kelokra_platform_meta (id, admin_whatsapp)
        VALUES ('default', '')
        ON CONFLICT (id) DO NOTHING
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS kelokra_feedbacks (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          store_name TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS kelokra_audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          actor TEXT NOT NULL,
          role TEXT NOT NULL,
          action TEXT NOT NULL,
          module TEXT NOT NULL,
          details TEXT NOT NULL,
          inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS kelokra_tenant_stores (
          tenant_id TEXT PRIMARY KEY,
          products JSONB NOT NULL DEFAULT '[]'::jsonb,
          sales JSONB NOT NULL DEFAULT '[]'::jsonb,
          movements JSONB NOT NULL DEFAULT '[]'::jsonb,
          suppliers JSONB NOT NULL DEFAULT '[]'::jsonb,
          purchases JSONB NOT NULL DEFAULT '[]'::jsonb,
          returns JSONB NOT NULL DEFAULT '[]'::jsonb,
          customers JSONB NOT NULL DEFAULT '[]'::jsonb,
          expenses JSONB NOT NULL DEFAULT '[]'::jsonb,
          shifts JSONB NOT NULL DEFAULT '[]'::jsonb,
          store_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    } catch (err) {
      cachedSchemaUrl = null;
      schemaPromise = null;
      throw err;
    }
  })();

  await schemaPromise;
  return sql;
}

export function verifySaltedPasswordServer(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  if (!storedHash || !salt) return false;
  const computed = crypto
    .createHash("sha256")
    .update(`${salt}:${password}`)
    .digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function mapAccountRow(row: DbAccountRow): ManagedAccount {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    passwordHash: "",
    passwordSalt: "",
    email: row.email || "",
    role: row.role === "CASHIER" ? "CASHIER" : "OWNER",
    ...(row.owner_mode
      ? { ownerMode: row.owner_mode as OwnerAccountMode }
      : {}),
    ...(row.parent_owner_id ? { parentOwnerId: row.parent_owner_id } : {}),
    storeName: row.store_name || "",
    durationMonths: Number(row.duration_months) || 1,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: row.status === "NONAKTIF" ? "NONAKTIF" : "AKTIF",
    avatarColor: row.avatar_color || "#10b981",
    lastLogin: row.last_login || "-",
  };
}

export function resolveAccountTenantId(row: {
  id: string;
  role: string;
  parent_owner_id?: string | null;
}): string {
  if (row.role === "OWNER") return row.id;
  return row.parent_owner_id || row.id;
}

export async function findAccountByUsername(
  username: string
): Promise<DbAccountRow | null> {
  const sql = await ensureKelokraSchema();
  const rows = (await sql`
    SELECT id, name, username, password_hash, password_salt, email, role,
           owner_mode, parent_owner_id, store_name, duration_months,
           created_at, expires_at, status, avatar_color, last_login
    FROM kelokra_accounts
    WHERE LOWER(username) = LOWER(${username.trim()})
    LIMIT 1
  `) as DbAccountRow[];
  return rows[0] || null;
}

export async function findAccountById(id: string): Promise<DbAccountRow | null> {
  const sql = await ensureKelokraSchema();
  const rows = (await sql`
    SELECT id, name, username, password_hash, password_salt, email, role,
           owner_mode, parent_owner_id, store_name, duration_months,
           created_at, expires_at, status, avatar_color, last_login
    FROM kelokra_accounts
    WHERE id = ${id}
    LIMIT 1
  `) as DbAccountRow[];
  return rows[0] || null;
}

export async function updateAccountLastLogin(
  id: string,
  lastLogin: string
): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    UPDATE kelokra_accounts
    SET last_login = ${lastLogin}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function getPlatformDataForRole(
  role: "SUPER_ADMIN" | "OWNER" | "CASHIER",
  accountId: string | null,
  tenantId: string | null
): Promise<{
  accounts: ManagedAccount[];
  feedbacks: DeveloperFeedback[];
  auditLogs: AuditLogEntry[];
  adminWhatsapp: string;
}> {
  const sql = await ensureKelokraSchema();

  const metaRows = (await sql`
    SELECT admin_whatsapp FROM kelokra_platform_meta WHERE id = 'default' LIMIT 1
  `) as { admin_whatsapp: string }[];
  const adminWhatsapp = metaRows[0]?.admin_whatsapp || "";

  if (role === "SUPER_ADMIN") {
    const [accRowsRaw, fbRowsRaw, audRowsRaw] = await Promise.all([
      sql`
        SELECT id, name, username, password_hash, password_salt, email, role,
               owner_mode, parent_owner_id, store_name, duration_months,
               created_at, expires_at, status, avatar_color, last_login
        FROM kelokra_accounts
        ORDER BY updated_at DESC, created_at DESC
      `,
      sql`
        SELECT id, owner_id, owner_name, store_name, category, title, message, created_at, is_read
        FROM kelokra_feedbacks
        ORDER BY inserted_at DESC
        LIMIT 200
      `,
      sql`
        SELECT id, timestamp, actor, role, action, module, details
        FROM kelokra_audit_logs
        ORDER BY inserted_at DESC
        LIMIT 300
      `,
    ]);

    const accRows = accRowsRaw as unknown as DbAccountRow[];
    const fbRows = fbRowsRaw as unknown as {
      id: string;
      owner_id: string;
      owner_name: string;
      store_name: string;
      category: string;
      title: string;
      message: string;
      created_at: string;
      is_read: boolean;
    }[];
    const audRows = audRowsRaw as unknown as AuditLogEntry[];

    return {
      accounts: accRows.map(mapAccountRow),
      feedbacks: fbRows.map((r) => ({
        id: r.id,
        ownerId: r.owner_id,
        ownerName: r.owner_name,
        storeName: r.store_name,
        category: (r.category || "Lainnya") as DeveloperFeedback["category"],
        title: r.title,
        message: r.message,
        createdAt: r.created_at,
        isRead: Boolean(r.is_read),
      })),
      auditLogs: audRows,
      adminWhatsapp,
    };
  }

  const scopedTenant = tenantId || accountId || "";
  const accRows = (await sql`
    SELECT id, name, username, password_hash, password_salt, email, role,
           owner_mode, parent_owner_id, store_name, duration_months,
           created_at, expires_at, status, avatar_color, last_login
    FROM kelokra_accounts
    WHERE id = ${accountId || ""}
       OR id = ${scopedTenant}
       OR parent_owner_id = ${scopedTenant}
    ORDER BY role DESC, created_at DESC
  `) as DbAccountRow[];

  let feedbacks: DeveloperFeedback[] = [];
  if (role === "OWNER" && accountId) {
    const fbRows = (await sql`
      SELECT id, owner_id, owner_name, store_name, category, title, message, created_at, is_read
      FROM kelokra_feedbacks
      WHERE owner_id = ${accountId}
      ORDER BY inserted_at DESC
      LIMIT 100
    `) as {
      id: string;
      owner_id: string;
      owner_name: string;
      store_name: string;
      category: string;
      title: string;
      message: string;
      created_at: string;
      is_read: boolean;
    }[];
    feedbacks = fbRows.map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
      ownerName: r.owner_name,
      storeName: r.store_name,
      category: (r.category || "Lainnya") as DeveloperFeedback["category"],
      title: r.title,
      message: r.message,
      createdAt: r.created_at,
      isRead: Boolean(r.is_read),
    }));
  }

  return {
    accounts: accRows.map(mapAccountRow),
    feedbacks,
    auditLogs: [],
    adminWhatsapp,
  };
}

export async function createAccountsBatchInDb(
  accounts: ManagedAccount[]
): Promise<void> {
  const sql = await ensureKelokraSchema();
  for (const acc of accounts) {
    await sql`
      INSERT INTO kelokra_accounts (
        id, name, username, password_hash, password_salt, email, role,
        owner_mode, parent_owner_id, store_name, duration_months,
        created_at, expires_at, status, avatar_color, last_login, updated_at
      ) VALUES (
        ${acc.id},
        ${acc.name},
        ${acc.username.trim().toLowerCase()},
        ${acc.passwordHash || ""},
        ${acc.passwordSalt || ""},
        ${acc.email || ""},
        ${acc.role},
        ${acc.ownerMode || null},
        ${acc.parentOwnerId || null},
        ${acc.storeName || ""},
        ${Number(acc.durationMonths) || 1},
        ${acc.createdAt},
        ${acc.expiresAt},
        ${acc.status || "AKTIF"},
        ${acc.avatarColor || "#10b981"},
        ${acc.lastLogin || "-"},
        NOW()
      )
    `;
  }
}

export async function extendAccountInDb(
  accountId: string,
  addMonths: number,
  newExpiresAt: string
): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    UPDATE kelokra_accounts
    SET duration_months = duration_months + ${addMonths},
        expires_at = ${newExpiresAt},
        status = 'AKTIF',
        updated_at = NOW()
    WHERE id = ${accountId}
  `;
}

export async function toggleAccountStatusInDb(
  accountId: string
): Promise<string | null> {
  const sql = await ensureKelokraSchema();
  const rows = (await sql`
    UPDATE kelokra_accounts
    SET status = CASE WHEN status = 'AKTIF' THEN 'NONAKTIF' ELSE 'AKTIF' END,
        updated_at = NOW()
    WHERE id = ${accountId}
    RETURNING status
  `) as { status: string }[];
  return rows[0]?.status || null;
}

export async function editAccountInDb(
  accountId: string,
  updates: {
    name: string;
    username: string;
    storeName: string;
    email: string;
  }
): Promise<void> {
  const sql = await ensureKelokraSchema();
  const target = await findAccountById(accountId);
  if (!target) return;

  await sql`
    UPDATE kelokra_accounts
    SET name = ${updates.name},
        username = ${updates.username.trim().toLowerCase()},
        store_name = ${updates.storeName},
        email = ${updates.email},
        updated_at = NOW()
    WHERE id = ${accountId}
  `;

  if (target.role === "OWNER") {
    await sql`
      UPDATE kelokra_accounts
      SET store_name = ${updates.storeName},
          updated_at = NOW()
      WHERE role = 'CASHIER' AND parent_owner_id = ${accountId}
    `;
  }
}

export async function resetAccountPasswordInDb(
  accountId: string,
  passwordHash: string,
  passwordSalt: string,
  updatedEmail?: string
): Promise<void> {
  const sql = await ensureKelokraSchema();
  if (updatedEmail) {
    await sql`
      UPDATE kelokra_accounts
      SET password_hash = ${passwordHash},
          password_salt = ${passwordSalt},
          email = ${updatedEmail},
          updated_at = NOW()
      WHERE id = ${accountId}
    `;
  } else {
    await sql`
      UPDATE kelokra_accounts
      SET password_hash = ${passwordHash},
          password_salt = ${passwordSalt},
          updated_at = NOW()
      WHERE id = ${accountId}
    `;
  }
}

export async function deleteAccountCascadeInDb(accountId: string): Promise<void> {
  const sql = await ensureKelokraSchema();
  const target = await findAccountById(accountId);
  if (!target) return;

  if (target.role === "OWNER") {
    await sql`
      DELETE FROM kelokra_accounts
      WHERE id = ${accountId}
         OR (
           role = 'CASHIER' AND (
             parent_owner_id = ${accountId}
             OR (parent_owner_id IS NULL AND LOWER(store_name) = LOWER(${target.store_name}))
           )
         )
    `;
    await sql`
      DELETE FROM kelokra_tenant_stores
      WHERE tenant_id = ${accountId}
    `;
  } else {
    await sql`
      DELETE FROM kelokra_accounts WHERE id = ${accountId}
    `;
  }
}

export async function addFeedbackInDb(fb: DeveloperFeedback): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    INSERT INTO kelokra_feedbacks (
      id, owner_id, owner_name, store_name, category, title, message, created_at, is_read
    ) VALUES (
      ${fb.id},
      ${fb.ownerId},
      ${fb.ownerName},
      ${fb.storeName},
      ${fb.category},
      ${fb.title},
      ${fb.message},
      ${fb.createdAt},
      ${Boolean(fb.isRead)}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function markFeedbackReadInDb(feedbackId: string): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    UPDATE kelokra_feedbacks SET is_read = TRUE WHERE id = ${feedbackId}
  `;
}

export async function deleteFeedbackInDb(feedbackId: string): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    DELETE FROM kelokra_feedbacks WHERE id = ${feedbackId}
  `;
}

export async function updateAdminWhatsappInDb(digits: string): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    INSERT INTO kelokra_platform_meta (id, admin_whatsapp, updated_at)
    VALUES ('default', ${digits}, NOW())
    ON CONFLICT (id) DO UPDATE
    SET admin_whatsapp = EXCLUDED.admin_whatsapp,
        updated_at = NOW()
  `;
}

export async function appendAuditLogInDb(entry: AuditLogEntry): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    INSERT INTO kelokra_audit_logs (id, timestamp, actor, role, action, module, details)
    VALUES (
      ${entry.id},
      ${entry.timestamp},
      ${entry.actor},
      ${entry.role},
      ${entry.action},
      ${entry.module},
      ${entry.details}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function syncBootstrapPlatformToDb(params: {
  accounts?: ManagedAccount[];
  feedbacks?: DeveloperFeedback[];
  auditLogs?: AuditLogEntry[];
  adminWhatsapp?: string;
}): Promise<void> {
  const sql = await ensureKelokraSchema();

  if (Array.isArray(params.accounts)) {
    for (const acc of params.accounts) {
      if (!acc.id || !acc.username) continue;
      // Only migrate rows that actually contain credentials or omit overwriting existing cloud rows
      await sql`
        INSERT INTO kelokra_accounts (
          id, name, username, password_hash, password_salt, email, role,
          owner_mode, parent_owner_id, store_name, duration_months,
          created_at, expires_at, status, avatar_color, last_login, updated_at
        ) VALUES (
          ${acc.id},
          ${acc.name},
          ${acc.username.trim().toLowerCase()},
          ${acc.passwordHash || ""},
          ${acc.passwordSalt || ""},
          ${acc.email || ""},
          ${acc.role},
          ${acc.ownerMode || null},
          ${acc.parentOwnerId || null},
          ${acc.storeName || ""},
          ${Number(acc.durationMonths) || 1},
          ${acc.createdAt},
          ${acc.expiresAt},
          ${acc.status || "AKTIF"},
          ${acc.avatarColor || "#10b981"},
          ${acc.lastLogin || "-"},
          NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }

  if (Array.isArray(params.feedbacks)) {
    for (const fb of params.feedbacks) {
      if (!fb.id) continue;
      await addFeedbackInDb(fb);
    }
  }

  if (Array.isArray(params.auditLogs)) {
    for (const entry of params.auditLogs.slice(0, 100)) {
      if (!entry.id) continue;
      await appendAuditLogInDb(entry);
    }
  }

  if (typeof params.adminWhatsapp === "string" && params.adminWhatsapp.trim()) {
    const meta = (await sql`
      SELECT admin_whatsapp FROM kelokra_platform_meta WHERE id = 'default' LIMIT 1
    `) as { admin_whatsapp: string }[];
    if (!meta[0]?.admin_whatsapp) {
      await updateAdminWhatsappInDb(params.adminWhatsapp.trim());
    }
  }
}

export async function getTenantStoreFromDb(
  tenantId: string
): Promise<TenantStorePayload | null> {
  const sql = await ensureKelokraSchema();
  const rows = (await sql`
    SELECT products, sales, movements, suppliers, purchases,
           returns, customers, expenses, shifts, store_settings
    FROM kelokra_tenant_stores
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `) as {
    products: unknown[];
    sales: unknown[];
    movements: unknown[];
    suppliers: unknown[];
    purchases: unknown[];
    returns: unknown[];
    customers: unknown[];
    expenses: unknown[];
    shifts: unknown[];
    store_settings: Partial<StoreSettings>;
  }[];

  const row = rows[0];
  if (!row) return null;

  return {
    products: Array.isArray(row.products) ? row.products : [],
    sales: Array.isArray(row.sales) ? row.sales : [],
    movements: Array.isArray(row.movements) ? row.movements : [],
    suppliers: Array.isArray(row.suppliers) ? row.suppliers : [],
    purchases: Array.isArray(row.purchases) ? row.purchases : [],
    returns: Array.isArray(row.returns) ? row.returns : [],
    customers: Array.isArray(row.customers) ? row.customers : [],
    expenses: Array.isArray(row.expenses) ? row.expenses : [],
    shifts: Array.isArray(row.shifts) ? row.shifts : [],
    storeSettings:
      row.store_settings && typeof row.store_settings === "object"
        ? row.store_settings
        : {},
  };
}

export async function upsertTenantStoreInDb(
  tenantId: string,
  payload: TenantStorePayload
): Promise<void> {
  const sql = await ensureKelokraSchema();
  await sql`
    INSERT INTO kelokra_tenant_stores (
      tenant_id, products, sales, movements, suppliers, purchases,
      returns, customers, expenses, shifts, store_settings, updated_at
    ) VALUES (
      ${tenantId},
      ${JSON.stringify(payload.products || [])}::jsonb,
      ${JSON.stringify(payload.sales || [])}::jsonb,
      ${JSON.stringify(payload.movements || [])}::jsonb,
      ${JSON.stringify(payload.suppliers || [])}::jsonb,
      ${JSON.stringify(payload.purchases || [])}::jsonb,
      ${JSON.stringify(payload.returns || [])}::jsonb,
      ${JSON.stringify(payload.customers || [])}::jsonb,
      ${JSON.stringify(payload.expenses || [])}::jsonb,
      ${JSON.stringify(payload.shifts || [])}::jsonb,
      ${JSON.stringify(payload.storeSettings || {})}::jsonb,
      NOW()
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      products = EXCLUDED.products,
      sales = EXCLUDED.sales,
      movements = EXCLUDED.movements,
      suppliers = EXCLUDED.suppliers,
      purchases = EXCLUDED.purchases,
      returns = EXCLUDED.returns,
      customers = EXCLUDED.customers,
      expenses = EXCLUDED.expenses,
      shifts = EXCLUDED.shifts,
      store_settings = EXCLUDED.store_settings,
      updated_at = NOW()
  `;
}
