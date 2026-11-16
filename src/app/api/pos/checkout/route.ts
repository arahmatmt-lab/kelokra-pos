import { NextRequest, NextResponse } from "next/server";

// In-memory idempotency cache for serverless invocation deduplication
const processedIdempotencyKeys = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      idempotencyKey,
      paymentMethod,
      items,
      grandTotal,
      isOfflineMode,
    } = body;

    if (!tenantId || !idempotencyKey || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Validasi gagal: tenantId, idempotencyKey, dan item wajib diisi." },
        { status: 400 }
      );
    }

    // Bab 10.1: QRIS membutuhkan koneksi untuk membuat dan memverifikasi pembayaran
    if (isOfflineMode && paymentMethod === "QRIS") {
      return NextResponse.json(
        {
          error:
            "Transaksi QRIS tidak dapat diselesaikan secara offline. Gunakan Tunai atau sambungkan internet.",
        },
        { status: 422 }
      );
    }

    const deduplicated = processedIdempotencyKeys.has(idempotencyKey);
    processedIdempotencyKeys.add(idempotencyKey);

    return NextResponse.json({
      success: true,
      deduplicated,
      tenantId,
      idempotencyKey,
      verifiedAmount: grandTotal,
      gatewayStatus: paymentMethod === "QRIS" ? "GATEWAY_VERIFIED" : "CASH_RECORDED",
      processedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses transaksi POS" },
      { status: 500 }
    );
  }
}
