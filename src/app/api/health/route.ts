import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    product: "KELOKRA Multi-Tenant SaaS POS",
    version: "1.1.0",
    architecture: "Modular Monolith (Next.js App Router + Serverless API + PostgreSQL RLS Ready)",
    timestamp: new Date().toISOString(),
  });
}
