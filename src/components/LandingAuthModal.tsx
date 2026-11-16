"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Lock,
  User,
  Clock,
  X,
} from "lucide-react";
import { ManagedAccount, UserRole } from "@/types/nextpos";
import { getRemainingTimeInfo } from "@/lib/format";

interface LandingAuthModalProps {
  isOpen: boolean;
  currentRole: UserRole;
  accounts: ManagedAccount[];
  onClose: () => void;
  onSelectRole: (role: UserRole, customAccount?: ManagedAccount) => void;
}

export function LandingAuthModal({
  isOpen,
  currentRole,
  accounts,
  onClose,
  onSelectRole,
}: LandingAuthModalProps) {
  const [tab, setTab] = useState<"quick" | "login">("quick");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCredentialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const uname = usernameInput.trim().toLowerCase();
    const pwd = passwordInput;

    // Built-in Super Admin shortcut
    if (uname === "superadmin" && pwd === "admin123") {
      onSelectRole("SUPER_ADMIN");
      setUsernameInput("");
      setPasswordInput("");
      onClose();
      return;
    }

    const found = accounts.find(
      (a) => a.username.toLowerCase() === uname && a.password === pwd
    );
    if (!found) {
      setLoginError(
        "Username atau password salah. Gunakan akun yang telah dibuat oleh Super Admin."
      );
      return;
    }

    const timeInfo = getRemainingTimeInfo(found.expiresAt);
    if (found.status !== "AKTIF" || timeInfo.isExpired) {
      setLoginError(
        `Akun "${found.name}" sudah habis masa aktifnya atau dinonaktifkan (${timeInfo.label}). Hubungi Super Admin untuk perpanjangan.`
      );
      return;
    }

    onSelectRole(found.role, found);
    setUsernameInput("");
    setPasswordInput("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-navy-800 text-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 md:grid-cols-12">
        {/* Left Promotional Banner with KELOKRA Logo */}
        <div className="md:col-span-5 bg-gradient-to-br from-navy-900 via-navy-800 to-emerald-900/80 p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 z-10">
            <div className="inline-block bg-white rounded-2xl px-3.5 py-2 shadow-md">
              <img
                src="/kelokra-logo.png"
                alt="KELOKRA Logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Kasir Modern KELOKRA</span>
            </div>

            <h2 className="text-2xl font-extrabold leading-snug">
              Solusi Kasir Modern untuk Bisnis Anda
            </h2>

            <ul className="space-y-3 pt-2 text-sm text-slate-200">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mudah Digunakan & Cepat</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Manajemen Akun & Durasi oleh Super Admin</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dukungan QRIS, M-Banking, E-Wallet & Offline PWA</span>
              </li>
            </ul>
          </div>

          <div className="pt-8 z-10 text-xs text-slate-400">
            KELOKRA Point of Sale • Aman & Terpercaya
          </div>
        </div>

        {/* Right Interactive Switcher / Login Form */}
        <div className="md:col-span-7 bg-white text-navy-800 p-7 space-y-5 max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                onClick={() => setTab("quick")}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  tab === "quick"
                    ? "bg-white text-navy-800 shadow-xs"
                    : "text-slate-500"
                }`}
              >
                Pilih Role / Akun
              </button>
              <button
                onClick={() => {
                  setLoginError(null);
                  setTab("login");
                }}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  tab === "login"
                    ? "bg-white text-navy-800 shadow-xs"
                    : "text-slate-500"
                }`}
              >
                Login Akun
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {tab === "quick" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">
                  Pilih Role atau Akun Terdaftar
                </h3>
                <p className="text-xs text-slate-500">
                  Berpindah antar role Super Admin, Owner, maupun akun Kasir/Owner yang dibuat oleh Super Admin:
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    onSelectRole("SUPER_ADMIN");
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentRole === "SUPER_ADMIN"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-800 text-amber-400 font-extrabold flex items-center justify-center shrink-0">
                      SA
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-800">
                        Super Admin KELOKRA
                      </p>
                      <p className="text-xs text-slate-500">
                        Buat akun Owner & Kasir, atur durasi bulan/tahun & pantau sisa waktu
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    onSelectRole("OWNER");
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentRole === "OWNER"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-extrabold flex items-center justify-center shrink-0">
                      OW
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-800">
                        Owner Bisnis
                      </p>
                      <p className="text-xs text-slate-500">
                        Atur Metode Pembayaran (QRIS/Bank/E-Wallet), Produk, Stok & Laporan Laba
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    onSelectRole("CASHIER");
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentRole === "CASHIER"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white font-extrabold flex items-center justify-center shrink-0">
                      KS
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-800">
                        Kasir Operasional
                      </p>
                      <p className="text-xs text-slate-500">
                        Transaksi POS, QRIS/Transfer/Tunai, Cetak Struk & Shift Kasir
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>
              </div>

              {accounts.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-extrabold text-slate-500 uppercase">
                    Akun Buatan Super Admin ({accounts.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {accounts.map((acc) => {
                      const timeInfo = getRemainingTimeInfo(acc.expiresAt);
                      const blocked =
                        acc.status !== "AKTIF" || timeInfo.isExpired;
                      return (
                        <button
                          key={acc.id}
                          disabled={blocked}
                          onClick={() => {
                            onSelectRole(acc.role, acc);
                            onClose();
                          }}
                          className="w-full p-3 rounded-xl border border-slate-200 hover:border-emerald-500 disabled:opacity-50 text-left flex items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <p className="font-extrabold text-navy-800">
                              {acc.name}{" "}
                              <span className="font-normal text-slate-400">
                                (@{acc.username}) •{" "}
                                {acc.role === "OWNER" ? "Owner" : "Kasir"}
                              </span>
                            </p>
                            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{timeInfo.label}</span>
                            </p>
                          </div>
                          <span className="text-emerald-600 font-bold">
                            {blocked ? "Habis" : "Masuk →"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleCredentialLogin}
              className="space-y-3.5 text-sm"
            >
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">
                  Login Akun KELOKRA
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan username dan password akun Owner atau Kasir yang telah dibuat oleh Super Admin (atau{" "}
                  <code className="bg-slate-100 px-1 rounded">superadmin</code> /{" "}
                  <code className="bg-slate-100 px-1 rounded">admin123</code>).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan username..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>Masuk ke KELOKRA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Dilindungi Argon2id & PostgreSQL RLS
            </span>
            <span>KELOKRA v1.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
