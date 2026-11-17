import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  OTP_COOKIE_NAME,
  getSessionFromRequest,
  hashOtpWithNonce,
  signOtpChallenge,
  verifyOtpChallenge,
} from "@/lib/server-auth";

export const runtime = "nodejs";

const MAX_OTP_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Sesi login tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    if (session.role !== "OWNER" || !session.accountId) {
      return NextResponse.json(
        { error: "Hanya akun Owner yang dapat memverifikasi OTP ini." },
        { status: 403 }
      );
    }

    const challenge = verifyOtpChallenge(req.cookies.get(OTP_COOKIE_NAME)?.value);
    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "Kode OTP sudah kadaluarsa atau belum diminta. Silakan kirim ulang kode ke Gmail Anda.",
        },
        { status: 400 }
      );
    }

    if (challenge.accountId !== session.accountId) {
      return NextResponse.json(
        { error: "Forbidden: Tantangan OTP tidak cocok dengan akun yang sedang aktif." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const submittedOtp =
      typeof body.otp === "string" ? body.otp.replace(/\s+/g, "") : "";

    if (!/^\d{6}$/.test(submittedOtp)) {
      return NextResponse.json(
        { error: "Masukkan 6 digit angka kode OTP dari Gmail Anda." },
        { status: 400 }
      );
    }

    const expectedBuf = Buffer.from(challenge.otpHash, "hex");
    const submittedBuf = Buffer.from(
      hashOtpWithNonce(challenge.nonce, submittedOtp),
      "hex"
    );

    const isMatch =
      expectedBuf.length === submittedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, submittedBuf);

    if (!isMatch) {
      const nextAttempts = challenge.attempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        const lockRes = NextResponse.json(
          {
            error:
              "Kode OTP salah 5 kali berturut-turut. Demi keamanan, kode dibatalkan — silakan kirim kode OTP baru.",
          },
          { status: 429 }
        );
        lockRes.cookies.set(OTP_COOKIE_NAME, "", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 0,
        });
        return lockRes;
      }

      const updatedToken = signOtpChallenge({
        ...challenge,
        attempts: nextAttempts,
      });
      const failRes = NextResponse.json(
        {
          error: `Kode OTP tidak cocok. Sisa kesempatan: ${
            MAX_OTP_ATTEMPTS - nextAttempts
          } kali.`,
        },
        { status: 400 }
      );
      failRes.cookies.set(OTP_COOKIE_NAME, updatedToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: Math.max(1, Math.floor((challenge.exp - Date.now()) / 1000)),
      });
      return failRes;
    }

    // Single-use OTP: invalidate cookie immediately upon successful verification
    const okRes = NextResponse.json({
      verified: true,
      accountId: challenge.accountId,
      email: challenge.email,
    });
    okRes.cookies.set(OTP_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return okRes;
  } catch {
    return NextResponse.json(
      { error: "Gagal memverifikasi kode OTP." },
      { status: 500 }
    );
  }
}
