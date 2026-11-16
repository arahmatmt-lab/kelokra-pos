"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Building2,
  X,
} from "lucide-react";
import { UserRole } from "@/types/nextpos";

interface LandingAuthModalProps {
  isOpen: boolean;
  currentRole: UserRole;
  onClose: () => void;
  onSelectRole: (role: UserRole, customName?: string, customStore?: string) => void;
}

export function LandingAuthModal({
  isOpen,
  currentRole,
  onClose,
  onSelectRole,
}: LandingAuthModalProps) {
  const [tab, setTab] = useState<"demo" | "register">("demo");
  const [ownerName, setOwnerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("Kafe & Kedai Kopi");

  if (!isOpen) return null;

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim() || !storeName.trim()) return;
    onSelectRole("OWNER", ownerName.trim(), storeName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-navy-800 text-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-white/10 grid grid-cols-1 md:grid-cols-12">
        {/* Left Promotional Banner matching Bottom-Right Mockup Card */}
        <div className="md:col-span-5 bg-gradient-to-br from-navy-900 via-navy-800 to-emerald-900/80 p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-lg shadow-md">
                N
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                NEXTPOS
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant SaaS POS v1.1</span>
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
                <span>Aman & Terpercaya (Isolasi Data RLS)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bisa di Mana Saja (Mendukung Offline PWA)</span>
              </li>
            </ul>
          </div>

          <div className="pt-8 z-10 text-xs text-slate-400">
            Gratis Trial 14 Hari • Tanpa Kartu Kredit
          </div>
        </div>

        {/* Right Interactive Switcher / Registration Form */}
        <div className="md:col-span-7 bg-white text-navy-800 p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                onClick={() => setTab("demo")}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  tab === "demo"
                    ? "bg-white text-navy-800 shadow-xs"
                    : "text-slate-500"
                }`}
              >
                Demo Instan (3 Role)
              </button>
              <button
                onClick={() => setTab("register")}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  tab === "register"
                    ? "bg-white text-navy-800 shadow-xs"
                    : "text-slate-500"
                }`}
              >
                Daftar Bisnis Baru (Trial 14 Hari)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {tab === "demo" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">
                  Pilih Peran Pengguna (RBAC Demo Instan)
                </h3>
                <p className="text-xs text-slate-500">
                  Klik salah satu akun di bawah untuk mencoba tampilan sesuai hak akses pada dokumen spesifikasi Bab 4:
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    onSelectRole("OWNER");
                    onClose();
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentRole === "OWNER"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white font-extrabold flex items-center justify-center">
                      AP
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-800">
                        Andi Pratama — Owner Bisnis
                      </p>
                      <p className="text-xs text-slate-500">
                        Akses penuh: Dashboard, POS, Produk, HPP, Laporan Laba, Karyawan & Langganan
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
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentRole === "CASHIER"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white font-extrabold flex items-center justify-center">
                      SN
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-800">
                        Siti Nurhaliza — Kasir Operasional
                      </p>
                      <p className="text-xs text-slate-500">
                        Akses fokus: Transaksi POS Cepat, Cetak Struk, Stok Produk & Shift Kasir
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    onSelectRole("SUPER_ADMIN");
                    onClose();
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                    currentRole === "SUPER_ADMIN"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-navy-800 text-amber-400 font-extrabold flex items-center justify-center">
                      SA
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-navy-800">
                        Super Admin Platform (Pemilik SaaS NEXTPOS)
                      </p>
                      <p className="text-xs text-slate-500">
                        Kelola seluruh Tenant, pantau MRR Rp 6.950.000, paket langganan & audit
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-sm">
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">
                  Registrasi Bisnis Baru (Gratis Trial 14 Hari)
                </h3>
                <p className="text-xs text-slate-500">
                  Sesuai Alur 7.1: Sistem membuat tenant terisolasi dan langsung mengaktifkan masa percobaan 14 hari.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pemilik (Owner)
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Contoh: Budi Hartono"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Toko / Bisnis
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Contoh: Kopi Kenangan Kita"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Usaha
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option>Kafe & Kedai Kopi</option>
                    <option>Toko Kelontong / Minimarket</option>
                    <option>Restoran / Kuliner</option>
                    <option>Barbershop & Jasa</option>
                    <option>Apotek & Ritel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Bisnis
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@bisnisanda.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-navy-900 font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>Mulai Sekarang (Aktifkan Trial 14 Hari)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Dilindungi Argon2id & PostgreSQL RLS
            </span>
            <span>NEXTPOS v1.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
