import { NextResponse } from "next/server";
import { ensureKelokraSchema, isCloudDatabaseConfigured } from "@/lib/neon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cloudConfigured = isCloudDatabaseConfigured();
  let databaseConnected = false;

  if (cloudConfigured) {
    try {
      const sql = await ensureKelokraSchema();
      await sql`SELECT 1`;
      databaseConnected = true;
    } catch (err) {
      console.error("Health DB check error:", err);
      databaseConnected = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    product: "KELOKRA Multi-Tenant SaaS POS",
    version: "1.2.0",
    architecture: "Next.js App Router + Serverless API + Neon PostgreSQL",
    cloudConfigured,
    databaseConnected,
    timestamp: new Date().toISOString(),
  });
}
