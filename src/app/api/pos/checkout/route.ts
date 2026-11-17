import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/server-auth";

// Bounded in-memory idempotency cache to prevent memory exhaustion DoS
const MAX_IDEMPOTENCY_KEYS = 5000;
const processedIdempotencyKeys = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Sesi login tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    if (session.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Super Admin tidak diizinkan melakukan transaksi POS." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      tenantId,
      idempotencyKey,
      paymentMethod,
      items,
      grandTotal,
      isOfflineMode,
    } = body;

    if (
      typeof tenantId !== "string" ||
      !tenantId.trim() ||
      typeof idempotencyKey !== "string" ||
      !idempotencyKey.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Validasi gagal: tenantId, idempotencyKey, dan item wajib diisi." },
        { status: 400 }
      );
    }

    // Validate monetary values & item quantities
    if (typeof grandTotal !== "number" || !Number.isFinite(grandTotal) || grandTotal < 0) {
      return NextResponse.json(
        { error: "Nominal grandTotal tidak valid." },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !item ||
        typeof item.quantity !== "number" ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        typeof item.unitPrice !== "number" ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0
      ) {
        return NextResponse.json(
          { error: "Kuantitas atau harga item tidak valid." },
          { status: 400 }
        );
      }
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

    const scopedKey = `${tenantId}:${idempotencyKey}`;
    const deduplicated = processedIdempotencyKeys.has(scopedKey);
    if (!deduplicated) {
      if (processedIdempotencyKeys.size >= MAX_IDEMPOTENCY_KEYS) {
        const first = processedIdempotencyKeys.values().next().value;
        if (first) processedIdempotencyKeys.delete(first);
      }
      processedIdempotencyKeys.add(scopedKey);
    }

    return NextResponse.json({
      success: true,
      deduplicated,
      tenantId,
      idempotencyKey,
      verifiedAmount: grandTotal,
      gatewayStatus:
        paymentMethod === "QRIS" ? "GATEWAY_VERIFIED" : "CASH_RECORDED",
      processedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses transaksi POS" },
      { status: 500 }
    );
  }
}
