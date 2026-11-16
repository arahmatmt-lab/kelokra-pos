import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, queuedTransactions } = body;

    if (!tenantId || !Array.isArray(queuedTransactions)) {
      return NextResponse.json(
        { error: "Payload sinkronisasi tidak valid" },
        { status: 400 }
      );
    }

    const syncedIds = queuedTransactions.map(
      (tx: { id: string; idempotencyKey: string }) => ({
        id: tx.id,
        idempotencyKey: tx.idempotencyKey,
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
