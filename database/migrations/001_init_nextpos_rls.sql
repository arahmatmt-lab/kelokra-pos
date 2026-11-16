-- NEXTPOS v1.1 PostgreSQL Row-Level Security (RLS) & Multi-Tenant Isolation Migration
-- Sesuai Bab 8 & Bab 10.2 Dokumen Spesifikasi NEXTPOS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function untuk mengambil tenant_id aktif dari session PostgreSQL
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Contoh penerapan Row-Level Security (RLS) pada tabel-tabel tenant
-- Pastikan semua tabel bisnis mengaktifkan RLS agar data antar bisnis terisolasi penuh.

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'tenant_members', 'subscriptions', 'stores', 'categories', 'products',
    'stock_balances', 'stock_movements', 'customers', 'suppliers',
    'employees', 'cash_shifts', 'sales', 'sale_items', 'payments',
    'purchases', 'purchase_items', 'expenses', 'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I USING (tenant_id = current_app_tenant_id()) WITH CHECK (tenant_id = current_app_tenant_id());',
        tbl
      );
    END IF;
  END LOOP;
END $$;
