"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart3,
  TrendingUp,
  Eye,
  MessageSquarePlus,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { DeveloperFeedback, ManagedAccount } from "@/types/nextpos";
import { formatDateOnly, getRemainingTimeInfo } from "@/lib/format";
import { StoreAccountDetailModal } from "@/components/StoreAccountDetailModal";

interface SuperAdminDashboardViewProps {
  userName: string;
  accounts: ManagedAccount[];
  feedbacks?: DeveloperFeedback[];
  onNavigate: (menu: string) => void;
  onCreateAccountsBatch: (newAccounts: ManagedAccount[]) => void;
  onExtendAccount: (accountId: string, addMonths: number) => void;
  onToggleAccountStatus: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onResetAccountPassword?: (
    accountId: string,
    passwordHash: string,
    passwordSalt: string
  ) => void;
  onEditAccount?: (
    accountId: string,
    updates: {
      name: string;
      username: string;
      storeName: string;
      email: string;
    }
  ) => void;
  onMarkFeedbackRead?: (feedbackId: string) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function SuperAdminDashboardView({
  userName,
  accounts,
  feedbacks = [],
  onNavigate,
  onCreateAccountsBatch,
  onExtendAccount,
  onToggleAccountStatus,
  onDeleteAccount,
  onResetAccountPassword,
  onEditAccount,
  onMarkFeedbackRead,
  onDeleteFeedback,
}: SuperAdminDashboardViewProps) {
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [detailOwner, setDetailOwner] = useState<ManagedAccount | null>(null);

  // Catatan langganan dihitung khusus saat Super Admin menambahkan akun Owner
  const ownerAccounts = accounts.filter((a) => a.role === "OWNER");
  const cashierAccounts = accounts.filter((a) => a.role === "CASHIER");

  // Grafik 1: Jumlah toko/owner yang mulai berlangganan per bulan (Jan - Des)
  const monthlySignups = MONTH_LABELS.map((label, monthIdx) => {
    const count = ownerAccounts.filter((acc) => {
      const d = new Date(acc.createdAt);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === selectedYear &&
        d.getMonth() === monthIdx
      );
    }).length;
    return { label, monthIdx, count };
  });

  const maxMonthlyCount = Math.max(
    ...monthlySignups.map((m) => m.count),
    1
  );
  const peakMonth = monthlySignups.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    monthlySignups[0]
  );

  // Grafik 2: Perbandingan Langganan Bulanan (< 12 bulan) vs Tahunan (>= 12 bulan)
  const monthlyDurationOwners = ownerAccounts.filter(
    (a) => a.durationMonths < 12
  );
  const yearlyDurationOwners = ownerAccounts.filter(
    (a) => a.durationMonths >= 12
  );

  const count1Month = ownerAccounts.filter(
    (a) => a.durationMonths === 1
  ).length;
  const count2to5Months = ownerAccounts.filter(
    (a) => a.durationMonths >= 2 && a.durationMonths <= 5
  ).length;
  const count6to11Months = ownerAccounts.filter(
    (a) => a.durationMonths >= 6 && a.durationMonths <= 11
  ).length;
  const count1YearPlus = yearlyDurationOwners.length;

  const totalOwners = ownerAccounts.length;
  const monthlyPct =
    totalOwners > 0
      ? Math.round((monthlyDurationOwners.length / totalOwners) * 100)
      : 0;
  const yearlyPct =
    totalOwners > 0
      ? Math.round((yearlyDurationOwners.length / totalOwners) * 100)
      : 0;

  let winnerLabel = "Belum ada data langganan Owner";
  if (totalOwners > 0) {
    if (monthlyDurationOwners.length > yearlyDurationOwners.length) {
      winnerLabel = `Terbanyak: Langganan Bulanan (${monthlyDurationOwners.length} Toko • ${monthlyPct}%)`;
    } else if (yearlyDurationOwners.length > monthlyDurationOwners.length) {
      winnerLabel = `Terbanyak: Langganan Tahunan (${yearlyDurationOwners.length} Toko • ${yearlyPct}%)`;
    } else {
      winnerLabel = `Seimbang: Bulanan (${monthlyDurationOwners.length}) & Tahunan (${yearlyDurationOwners.length})`;
    }
  }

  return (
    <div className="space-y-6">
      {/* Super Admin Hero Banner (NO POS / NO Tambah Produk!) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F2933] via-[#133B49] to-emerald-900/90 text-white p-6 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dashboard Platform Super Admin KELOKRA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat datang, {userName}!
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Pantau statistik pertumbuhan langganan toko (Owner) dari bulan ke bulan serta perbandingan durasi langganan Bulanan vs Tahunan.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate("super-admin")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-sm transition inline-flex items-center gap-2"
            >
              <span>Kelola & Tambah Akun Owner / Kasir</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Khusus Super Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Owner / Toko
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Total Toko Berlangganan
          </p>
          <p className="text-2xl font-extrabold text-navy-800 mt-0.5">
            {ownerAccounts.length} Toko
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
              Akun Kasir
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Total Akun Kasir Terdaftar
          </p>
          <p className="text-2xl font-extrabold text-navy-800 mt-0.5">
            {cashierAccounts.length} Kasir
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              &lt; 12 Bulan
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Owner Langganan Bulanan
          </p>
          <p className="text-2xl font-extrabold text-navy-800 mt-0.5">
            {monthlyDurationOwners.length} Toko
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
              <CalendarRange className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              ≥ 12 Bulan
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Owner Langganan Tahunan
          </p>
          <p className="text-2xl font-extrabold text-navy-800 mt-0.5">
            {yearlyDurationOwners.length} Toko
          </p>
        </div>
      </div>

      {/* 2 GRAFIK LANGGANAN (Menggantikan Grafik Tren Penjualan untuk Super Admin) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAFIK 1: Mulai dari bulan apa toko banyak berlangganan */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
                  Grafik Langganan Toko per Bulan
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Menunjukkan mulai bulan apa toko paling banyak mendaftar langganan (berdasarkan penambahan Owner).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Pilih Tahun Grafik Langganan"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-navy-800"
              >
                {[2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 12-Month Bar Chart */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div className="grid grid-cols-12 gap-2 items-end h-48 pt-6">
              {monthlySignups.map((m) => {
                const heightPct =
                  m.count === 0
                    ? 4
                    : Math.max(14, Math.round((m.count / maxMonthlyCount) * 100));
                const isPeak =
                  peakMonth.count > 0 && m.monthIdx === peakMonth.monthIdx;
                return (
                  <div
                    key={m.label}
                    className="flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <span className="text-[11px] font-extrabold text-navy-800">
                      {m.count > 0 ? m.count : ""}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      title={`${m.label} ${selectedYear}: ${m.count} toko`}
                      className={`w-full max-w-[26px] rounded-t-lg transition-all ${
                        m.count === 0
                          ? "bg-slate-200"
                          : isPeak
                          ? "bg-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                          : "bg-emerald-400/80 hover:bg-emerald-500"
                      }`}
                    />
                    <span
                      className={`text-[10.5px] font-bold ${
                        isPeak ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <span className="font-semibold text-slate-600">
              Bulan terbanyak toko mulai langganan:
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold">
              {peakMonth.count > 0
                ? `${peakMonth.label} ${selectedYear} (${peakMonth.count} Toko)`
                : "Belum ada toko ditambahkan"}
            </span>
          </div>
        </div>

        {/* GRAFIK 2: Perbandingan Langganan Bulanan vs Tahunan */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
                Langganan Terbanyak: Bulanan vs Tahunan
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan jumlah Owner berdasarkan durasi paket yang dipilih Super Admin.
            </p>
          </div>

          {/* Visual Comparison Bars */}
          <div className="space-y-4 py-2">
            {/* Bar 1: Bulanan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-navy-800">
                  Paket Bulanan (1 – 11 Bulan)
                </span>
                <span className="text-sky-600 font-extrabold">
                  {monthlyDurationOwners.length} Toko ({monthlyPct}%)
                </span>
              </div>
              <div className="w-full h-7 bg-slate-100 rounded-xl overflow-hidden p-1">
                <div
                  style={{ width: `${Math.max(monthlyPct, 2)}%` }}
                  className="h-full rounded-lg bg-sky-500 transition-all duration-500"
                />
              </div>
            </div>

            {/* Bar 2: Tahunan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-navy-800">
                  Paket Tahunan (1 Tahun / ≥ 12 Bulan)
                </span>
                <span className="text-emerald-600 font-extrabold">
                  {yearlyDurationOwners.length} Toko ({yearlyPct}%)
                </span>
              </div>
              <div className="w-full h-7 bg-slate-100 rounded-xl overflow-hidden p-1">
                <div
                  style={{ width: `${Math.max(yearlyPct, 2)}%` }}
                  className="h-full rounded-lg bg-emerald-500 transition-all duration-500"
                />
              </div>
            </div>

            {/* Breakdown Pills */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <p className="text-slate-500">Durasi 1 Bulan</p>
                <p className="font-extrabold text-navy-800 text-sm mt-0.5">
                  {count1Month} Toko
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <p className="text-slate-500">Durasi 2 – 5 Bulan</p>
                <p className="font-extrabold text-navy-800 text-sm mt-0.5">
                  {count2to5Months} Toko
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <p className="text-slate-500">Durasi 6 – 11 Bulan</p>
                <p className="font-extrabold text-navy-800 text-sm mt-0.5">
                  {count6to11Months} Toko
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs">
                <p className="text-emerald-700 font-semibold">
                  Durasi 1 Tahun+
                </p>
                <p className="font-extrabold text-emerald-700 text-sm mt-0.5">
                  {count1YearPlus} Toko
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-800 text-white text-xs font-extrabold text-center">
            {winnerLabel}
          </div>
        </div>
      </div>

      {/* Ringkasan Langganan Owner Terbaru */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
              Catatan Langganan Owner Terbaru
            </h2>
            <p className="text-xs text-slate-500">
              Data langganan otomatis tercatat setiap kali Super Admin menambahkan akun Owner baru.
            </p>
          </div>
          <button
            onClick={() => onNavigate("super-admin")}
            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Akun</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {ownerAccounts.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Belum ada akun Owner ditambahkan. Klik <b>Kelola & Tambah Akun Owner / Kasir</b> di atas untuk mulai mencatat langganan toko.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Nama Toko</th>
                  <th className="py-3 px-3">Type Akun</th>
                  <th className="py-3 px-3">Mulai Langganan</th>
                  <th className="py-3 px-3">Jenis Durasi</th>
                  <th className="py-3 px-3">Sisa Waktu</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownerAccounts.slice(0, 6).map((acc) => {
                  const timeInfo = getRemainingTimeInfo(acc.expiresAt);
                  const isYearly = acc.durationMonths >= 12;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <p className="font-bold text-navy-800">
                          {acc.storeName}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-lg ${
                            acc.ownerMode === "OWNER_INCLUDE_KASIR"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {acc.ownerMode === "OWNER_INCLUDE_KASIR"
                            ? "Owner Include Kasir"
                            : "Owner + Kasir"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {formatDateOnly(acc.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-xs font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-lg ${
                            isYearly
                              ? "bg-emerald-500 text-white"
                              : "bg-sky-500 text-white"
                          }`}
                        >
                          {isYearly
                            ? `Tahunan (${acc.durationMonths} Bln)`
                            : `Bulanan (${acc.durationMonths} Bln)`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            timeInfo.isExpired
                              ? "text-rose-600"
                              : timeInfo.isExpiringSoon
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailOwner(acc)}
                          title="Lihat Detail Akun Owner & Kasir"
                          className="p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-navy-800 hover:text-emerald-700 inline-flex items-center justify-center transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Catatan Saran Pengembang dari Client */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
                Catatan Saran Pengembang dari Client
              </h2>
              <p className="text-xs text-slate-500">
                Masukan, ide fitur, dan kendala yang dikirim langsung oleh Owner toko.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("feedback-admin")}
            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Saran</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {feedbacks.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Belum ada saran pengembang yang dikirim oleh Owner toko.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Toko &amp; Pengirim</th>
                  <th className="py-3 px-3">Kategori &amp; Isi Saran</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feedbacks.slice(0, 5).map((fb) => (
                  <tr key={fb.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <p className="font-extrabold text-navy-800">
                        {fb.storeName}
                      </p>
                      <p className="text-xs text-slate-500">{fb.ownerName}</p>
                    </td>
                    <td className="py-3 px-3 max-w-md">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold mb-1">
                        {fb.category}
                      </span>
                      <p className="font-bold text-navy-800 text-xs">
                        {fb.title}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {fb.message}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateOnly(fb.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                          fb.isRead
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {fb.isRead ? "Sudah Dibaca" : "Belum Dibaca"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!fb.isRead && onMarkFeedbackRead && (
                          <button
                            type="button"
                            onClick={() => onMarkFeedbackRead(fb.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saran Sudah Dibaca</span>
                          </button>
                        )}
                        {onDeleteFeedback && (
                          <button
                            type="button"
                            onClick={() => onDeleteFeedback(fb.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Saran</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Akun Owner & Kasir (Icon Mata) */}
      <StoreAccountDetailModal
        ownerAccount={detailOwner}
        allAccounts={accounts}
        onClose={() => setDetailOwner(null)}
        onCreateAccountsBatch={onCreateAccountsBatch}
        onExtendAccount={onExtendAccount}
        onToggleAccountStatus={onToggleAccountStatus}
        onDeleteAccount={onDeleteAccount}
        onResetAccountPassword={onResetAccountPassword}
        onEditAccount={onEditAccount}
      />
    </div>
  );
}
