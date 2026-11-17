"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
  AlertCircle,
} from "lucide-react";
import { AuthSession, ManagedAccount } from "@/types/nextpos";
import { getRemainingTimeInfo } from "@/lib/format";
import { verifyPasswordWithSalt } from "@/lib/security";

interface LoginScreenProps {
  accounts: ManagedAccount[];
  defaultStoreName: string;
  externalNotice?: string | null;
  onLoginSuccess: (session: AuthSession) => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export function LoginScreen({
  accounts,
  defaultStoreName,
  externalNotice,
  onLoginSuccess,
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brute-force protection state
  const [failedCount, setFailedCount] = useState(0);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  useEffect(() => {
    if (lockSecondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setLockSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockSecondsLeft]);

  const recordFailure = (msg: string) => {
    const next = failedCount + 1;
    setFailedCount(next);
    if (next >= MAX_FAILED_ATTEMPTS) {
      setLockSecondsLeft(LOCKOUT_SECONDS);
      setFailedCount(0);
      setErrorMsg(
        `Terlalu banyak percobaan login gagal. Coba lagi dalam ${LOCKOUT_SECONDS} detik.`
      );
    } else {
      setErrorMsg(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockSecondsLeft > 0 || isSubmitting) return;
    setErrorMsg(null);

    const uname = username.trim().toLowerCase();
    const pwd = password;

    if (!uname || !pwd) {
      setErrorMsg("Username dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    // 1. Check Owner / Kasir accounts created by Super Admin (verified via salted SHA-256)
    const matched = accounts.find((a) => a.username.toLowerCase() === uname);
    if (matched) {
      let validPwd = false;
      if (matched.passwordHash && matched.passwordSalt) {
        validPwd = await verifyPasswordWithSalt(
          pwd,
          matched.passwordHash,
          matched.passwordSalt
        );
      } else if (matched.password) {
        validPwd = matched.password === pwd;
      }

      if (!validPwd) {
        setIsSubmitting(false);
        recordFailure("Username atau password salah.");
        return;
      }

      const timeInfo = getRemainingTimeInfo(matched.expiresAt);
      if (matched.status !== "AKTIF" || timeInfo.isExpired) {
        setIsSubmitting(false);
        setErrorMsg(
          `Akun "${matched.name}" tidak dapat masuk karena ${
            timeInfo.isExpired
              ? "masa aktif telah habis"
              : "status akun sedang dinonaktifkan"
          }. Hubungi Super Admin untuk perpanjangan.`
        );
        return;
      }

      const sessionToSet: AuthSession = {
        userId: matched.id,
        username: matched.username,
        name: matched.name,
        role: matched.role,
        ownerMode: matched.ownerMode,
        accountId: matched.id,
        storeName: matched.storeName || defaultStoreName,
        loggedInAt: new Date().toISOString(),
      };

      try {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: sessionToSet.username,
            role: sessionToSet.role,
            accountId: sessionToSet.accountId,
          }),
        });
      } catch {
        // Offline PWA fallback
      }

      setIsSubmitting(false);
      setFailedCount(0);
      onLoginSuccess(sessionToSet);
      return;
    }

    // 2. Otherwise verify Super Admin strictly on the server (no hardcoded client password)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: uname,
          password: pwd,
          role: "SUPER_ADMIN",
        }),
      });

      if (!res.ok) {
        setIsSubmitting(false);
        recordFailure("Username atau password salah.");
        return;
      }

      const sessionToSet: AuthSession = {
        userId: "super-admin-001",
        username: uname,
        name: "Super Admin KELOKRA",
        role: "SUPER_ADMIN",
        accountId: null,
        storeName: defaultStoreName,
        loggedInAt: new Date().toISOString(),
      };

      setIsSubmitting(false);
      setFailedCount(0);
      onLoginSuccess(sessionToSet);
    } catch {
      setIsSubmitting(false);
      setErrorMsg(
        "Gagal menghubungi server autentikasi. Periksa koneksi internet Anda."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Deep Navy Brand Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0F2933] via-[#133B49] to-emerald-900/90 text-white p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-5 z-10">
            <div className="inline-block bg-white rounded-2xl px-4 py-2.5 shadow-md">
              <img
                src="/kelokra-logo.png"
                alt="KELOKRA Logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Kasir Multi-Role</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
              Selamat Datang di KELOKRA
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Masuk menggunakan akun <b>Super Admin</b>, <b>Owner</b>, atau{" "}
              <b>Kasir</b> Anda untuk mulai mengelola toko dan transaksi.
            </p>

            <ul className="space-y-3 pt-2 text-xs sm:text-sm text-slate-200">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kontrol Akses Berbasis Role (RBAC)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Password Terenkripsi (Salted SHA-256)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Proteksi Brute-Force & Cookie Tertandatangani</span>
              </li>
            </ul>
          </div>

          <div className="pt-8 z-10 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sesi Login Aman dengan Signed Cookie HttpOnly</span>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2933]">
                Masuk ke Akun Anda
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Masukkan username dan password akun yang terdaftar pada sistem.
              </p>
            </div>

            {externalNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{externalNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    autoComplete="username"
                    required
                    disabled={lockSecondsLeft > 0}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-[#0F2933] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={lockSecondsLeft > 0}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-[#0F2933] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0F2933]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {lockSecondsLeft > 0
                      ? `Terlalu banyak percobaan gagal. Silakan tunggu ${lockSecondsLeft} detik.`
                      : errorMsg}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || lockSecondsLeft > 0}
                className="w-full py-3.5 px-5 rounded-xl bg-[#10B981] hover:bg-emerald-600 disabled:bg-slate-300 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>
                  {lockSecondsLeft > 0
                    ? `Terkunci (${lockSecondsLeft}d)`
                    : isSubmitting
                    ? "Memeriksa Akun..."
                    : "Login Sekarang"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed">
              <b className="text-[#0F2933]">Catatan Keamanan:</b> Kredensial
              Super Admin diverifikasi di server (dapat diatur lewat environment
              variable <code className="bg-slate-200/70 px-1 rounded">SUPER_ADMIN_USERNAME</code>{" "}
              & <code className="bg-slate-200/70 px-1 rounded">SUPER_ADMIN_PASSWORD</code>{" "}
              di Vercel). Akun Owner & Kasir dibuat dari panel Super Admin.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>KELOKRA SaaS Point of Sale</span>
            <span>Versi 1.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
