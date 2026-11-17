import crypto from "crypto";
import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import {
  OTP_COOKIE_NAME,
  getSessionFromRequest,
  hashOtpWithNonce,
  signOtpChallenge,
  verifyOtpChallenge,
} from "@/lib/server-auth";

export const runtime = "nodejs";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_REQUESTS = 5;

const otpRateMap = new Map<string, { count: number; resetAt: number }>();

function checkOtpRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = otpRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    otpRateMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_OTP_REQUESTS) {
    return false;
  }
  entry.count += 1;
  return true;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Sesi login tidak ditemukan atau telah berakhir. Silakan login ulang." },
        { status: 401 }
      );
    }

    if (session.role !== "OWNER" || !session.accountId) {
      return NextResponse.json(
        { error: "Fitur verifikasi OTP Gmail ini khusus untuk akun Owner." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const reqAccountId = typeof body.accountId === "string" ? body.accountId : "";
    const storeName = typeof body.storeName === "string" ? body.storeName.trim() : "KELOKRA";

    if (reqAccountId && reqAccountId !== session.accountId) {
      return NextResponse.json(
        { error: "Forbidden: Anda hanya dapat meminta OTP untuk akun Owner Anda sendiri." },
        { status: 403 }
      );
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(rawEmail)) {
      return NextResponse.json(
        { error: "Format alamat email Gmail tidak valid." },
        { status: 400 }
      );
    }

    // Enforce 60s resend cooldown via signed cookie timestamp
    const existingChallenge = verifyOtpChallenge(req.cookies.get(OTP_COOKIE_NAME)?.value);
    if (
      existingChallenge &&
      existingChallenge.accountId === session.accountId &&
      Date.now() - existingChallenge.issuedAt < RESEND_COOLDOWN_MS
    ) {
      const waitSec = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - existingChallenge.issuedAt)) / 1000
      );
      return NextResponse.json(
        { error: `Tunggu ${waitSec} detik sebelum meminta ulang kode OTP.` },
        { status: 429 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkOtpRateLimit(`${ip}:${session.accountId}`)) {
      return NextResponse.json(
        { error: "Batas permintaan OTP tercapai (maks. 5 kali per 10 menit). Coba lagi nanti." },
        { status: 429 }
      );
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const nonce = crypto.randomBytes(16).toString("hex");
    const now = Date.now();
    const exp = now + OTP_TTL_MS;
    const otpHash = hashOtpWithNonce(nonce, otp);

    const token = signOtpChallenge({
      accountId: session.accountId,
      email: rawEmail,
      otpHash,
      nonce,
      attempts: 0,
      issuedAt: now,
      exp,
    });

    const gmailUser = process.env.GMAIL_USER?.trim();
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim();
    let deliveryMode: "GMAIL_SMTP" | "SIMULATION" = "SIMULATION";

    if (gmailUser && gmailAppPassword) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailAppPassword,
          },
        });

        await transporter.sendMail({
          from: `"KELOKRA Security" <${gmailUser}>`,
          to: rawEmail,
          subject: `Kode OTP Ubah Kata Sandi KELOKRA (${storeName})`,
          text: [
            `Halo Owner ${storeName},`,
            "",
            `Kode verifikasi (OTP) Anda untuk mengubah kata sandi akun KELOKRA adalah:`,
            ``,
            `    ${otp}`,
            ``,
            `Kode ini berlaku selama 5 menit dan bersifat RAHASIA. Jangan berikan kode ini kepada siapa pun termasuk pihak yang mengaku admin.`,
            "",
            `Jika Anda tidak meminta perubahan kata sandi, segera amankan akun Anda.`,
          ].join("\n"),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;color:#0f2933;">
              <h2 style="margin:0 0 8px;color:#0f2933;">Verifikasi Keamanan KELOKRA</h2>
              <p style="font-size:13px;color:#475569;margin:0 0 18px;">
                Anda meminta kode OTP untuk mengubah kata sandi akun Owner <b>${storeName.replace(/[<>&"]/g, "")}</b>.
              </p>
              <div style="background:#ecfdf5;border:1px dashed #10b981;border-radius:12px;padding:16px;text-align:center;margin-bottom:18px;">
                <p style="font-size:11px;color:#047857;margin:0 0 6px;font-weight:bold;letter-spacing:1px;">KODE OTP ANDA (BERLAKU 5 MENIT)</p>
                <p style="font-size:30px;font-weight:800;letter-spacing:6px;margin:0;color:#0f2933;">${otp}</p>
              </div>
              <p style="font-size:12px;color:#64748b;margin:0;">
                Jangan pernah membagikan kode ini kepada siapa pun. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
              </p>
            </div>
          `,
        });

        deliveryMode = "GMAIL_SMTP";
      } catch {
        return NextResponse.json(
          {
            error:
              "Gagal mengirim email via Gmail SMTP. Periksa GMAIL_USER dan GMAIL_APP_PASSWORD pada konfigurasi server.",
          },
          { status: 502 }
        );
      }
    }

    const res = NextResponse.json({
      success: true,
      deliveryMode,
      maskedEmail: maskEmail(rawEmail),
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
      ...(deliveryMode === "SIMULATION" ? { simulationOtp: otp } : {}),
    });

    res.cookies.set(OTP_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(OTP_TTL_MS / 1000),
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses permintaan kode OTP." },
      { status: 500 }
    );
  }
}
