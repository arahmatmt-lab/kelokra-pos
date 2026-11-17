import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tenantId, queuedTransactions } = body;

    if (
      typeof tenantId !== "string" ||
      !tenantId.trim() ||
      !Array.isArray(queuedTransactions) ||
      queuedTransactions.length > 500
    ) {
      return NextResponse.json(
        { error: "Payload sinkronisasi tidak valid" },
        { status: 400 }
      );
    }

    const syncedIds = queuedTransactions.map(
      (tx: { id: string; idempotencyKey: string }) => ({
        id: String(tx.id || ""),
        idempotencyKey: String(tx.idempotencyKey || ""),
        status: "SYNCED_OK",
      })
    );

    return NextResponse.json({
      success: true,
      tenantId,
      syncedCount: syncedIds.length,
      results: syncedIds,
      syncedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Sinkronisasi offline gagal" },
      { status: 500 }
    );
  }
}
