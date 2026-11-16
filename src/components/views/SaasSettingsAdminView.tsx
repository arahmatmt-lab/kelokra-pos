"use client";

import React, { useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Crown,
  ArrowRight,
  Settings,
  CreditCard,
  Bell,
  ShieldCheck,
  Plug,
  DatabaseBackup,
  HelpCircle,
  Building2,
  TrendingUp,
  Users,
  Download,
  RotateCcw,
  X,
} from "lucide-react";
import {
  AddOnItem,
  AuditLogEntry,
  EmployeeMember,
  PlanCode,
  PlatformTenantSummary,
  StoreSettings,
  SubscriptionPaymentRecord,
} from "@/types/nextpos";
import { SUBSCRIPTION_PLANS } from "@/lib/initial-data";
import { formatIDR, generateId } from "@/lib/format";

interface SaasSettingsAdminViewProps {
  mode: "employees" | "subscription" | "settings" | "help" | "super-admin";
  employees: EmployeeMember[];
  currentPlan: PlanCode;
  billingCycle: "MONTHLY" | "YEARLY";
  subscriptionPayments: SubscriptionPaymentRecord[];
  addons: AddOnItem[];
  storeSettings: StoreSettings;
  auditLogs: AuditLogEntry[];
  platformTenants: PlatformTenantSummary[];
  onAddEmployee: (emp: EmployeeMember) => void;
  onRemoveEmployee: (empId: string) => void;
  onChangePlan: (plan: PlanCode, cycle: "MONTHLY" | "YEARLY") => void;
  onToggleAddon: (addonId: string) => void;
  onUpdateSettings: (next: StoreSettings) => void;
  onExportBackup: () => void;
  onResetDemoData: () => void;
}

export function SaasSettingsAdminView({
  mode,
  employees,
  currentPlan,
  billingCycle,
  subscriptionPayments,
  addons,
  storeSettings,
  auditLogs,
  platformTenants,
  onAddEmployee,
  onRemoveEmployee,
  onChangePlan,
  onToggleAddon,
  onUpdateSettings,
  onExportBackup,
  onResetDemoData,
}: SaasSettingsAdminViewProps) {
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empUsername, setEmpUsername] = useState("");
  const [empError, setEmpError] = useState<string | null>(null);

  const [settingsTab, setSettingsTab] = useState<
    "Umum" | "Pembayaran" | "Notifikasi" | "Keamanan" | "Integrasi" | "Backup"
  >("Umum");
  const [editingStoreInfo, setEditingStoreInfo] = useState(false);
  const [tempStoreName, setTempStoreName] = useState(storeSettings.storeName);
  const [tempAddress, setTempAddress] = useState(storeSettings.address);
  const [tempPhone, setTempPhone] = useState(storeSettings.phone);

  const activePlanObj =
    SUBSCRIPTION_PLANS.find((p) => p.code === currentPlan) ||
    SUBSCRIPTION_PLANS[2];

  const extraCashierAddon = addons.find(
    (a) => a.id === "addon-cashier" && a.active
  );
  const maxAllowedCashiers =
    activePlanObj.maxCashiers + (extraCashierAddon ? 1 : 0);
  const currentCashierCount = employees.filter(
    (e) => e.role === "Kasir"
  ).length;

  const handleInviteCashier = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError(null);

    if (currentCashierCount >= maxAllowedCashiers) {
      setEmpError(
        `Kuota kasir pada ${activePlanObj.name} penuh (${currentCashierCount}/${maxAllowedCashiers}). Silakan Upgrade Paket atau aktifkan Add-on Kasir Tambahan.`
      );
      return;
    }

    onAddEmployee({
      id: generateId("emp"),
      name: empName.trim(),
      username:
        empUsername.trim() ||
        empName.toLowerCase().replace(/\s+/g, ".") + ".kasir",
      email: empEmail.trim(),
      role: "Kasir",
      status: "Aktif",
      lastLogin: new Date().toLocaleDateString("id-ID"),
      avatarColor: "#10B981",
      permissions: [
        "pos.access",
        "shift.manage_own",
        "receipt.print",
        "products.view",
      ],
    });
    setEmpName("");
    setEmpEmail("");
    setEmpUsername("");
    setShowEmpModal(false);
  };

  // ============================================================================
  // MODE 1: MANAJEMEN KARYAWAN & RBAC
  // ============================================================================
  if (mode === "employees") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
                Manajemen Karyawan
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Kelola akun karyawan dan atur hak akses. Kuota Kasir Aktif:{" "}
                <b className="text-emerald-600">
                  {currentCashierCount} / {maxAllowedCashiers} Akun
                </b>{" "}
                ({activePlanObj.name}).
              </p>
            </div>

            <button
              onClick={() => {
                setEmpError(null);
                setShowEmpModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Karyawan</span>
            </button>
          </div>

          {employees.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada akun karyawan/kasir terdaftar. Klik tombol{" "}
              <b>+ Tambah Karyawan</b> untuk menambahkan kasir.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">Nama</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Terakhir Login</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            style={{ backgroundColor: emp.avatarColor }}
                            className="w-9 h-9 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs"
                          >
                            {emp.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-navy-800">
                              {emp.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {emp.role}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs sm:text-sm">
                        {emp.lastLogin}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setShowEmpModal(true)}
                            title="Edit Izin Karyawan"
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {emp.role !== "Owner" && (
                            <button
                              onClick={() => onRemoveEmployee(emp.id)}
                              title="Hapus Kasir"
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Matriks RBAC */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <h2 className="text-base font-extrabold text-navy-800">
            Matriks Hak Akses Role-Based Access Control (RBAC)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-2.5 px-3">Modul / Fitur</th>
                  <th className="py-2.5 px-3">Super Admin</th>
                  <th className="py-2.5 px-3">Owner Bisnis</th>
                  <th className="py-2.5 px-3">Kasir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Transaksi POS & Cetak Struk
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Tidak</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Ya (Penuh)
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Ya (Operasional)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Manajemen Produk, HPP & Stok Opname
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Administratif</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Kelola Penuh
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Lihat Saja</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Laporan Laba Bersih & HPP
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Tidak Otomatis</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">Ya</td>
                  <td className="py-2.5 px-3 text-rose-500 font-semibold">
                    Dibatasi
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Langganan SaaS & Manajemen Kasir
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Platform Global
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Bisnis Sendiri
                  </td>
                  <td className="py-2.5 px-3 text-rose-500 font-semibold">
                    Tidak
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL UNDANG KASIR */}
        {showEmpModal && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-navy-800">
                  Undang / Tambah Akun Kasir
                </h3>
                <button
                  onClick={() => setShowEmpModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleInviteCashier} className="space-y-3.5 text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Lengkap Kasir
                  </label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="Masukkan nama kasir..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    value={empUsername}
                    onChange={(e) => setEmpUsername(e.target.value)}
                    placeholder="kasir01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Undangan
                  </label>
                  <input
                    type="email"
                    required
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="kasir@tokoanda.id"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                {empError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                    {empError}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmpModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                  >
                    Kirim Undangan & Aktifkan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MODE 2: LANGGANAN & PEMBAYARAN SAAS
  // ============================================================================
  if (mode === "subscription") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
              Langganan & Pembayaran
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola paket aktif bisnis Anda, kuota kasir, add-on, dan riwayat pembayaran invoice.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 border border-emerald-200/80 shadow-xs space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-navy-800 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                    <Crown className="w-8 h-8 fill-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-navy-800">
                        {activePlanObj.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                        Aktif
                      </span>
                    </div>
                    <p className="text-lg font-extrabold text-navy-800">
                      {formatIDR(
                        billingCycle === "MONTHLY"
                          ? activePlanObj.monthlyPrice
                          : activePlanObj.yearlyPrice
                      )}{" "}
                      <span className="text-sm font-medium text-slate-500">
                        / {billingCycle === "MONTHLY" ? "bulan" : "tahun"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70 space-y-3">
                  <h3 className="text-xs sm:text-sm font-extrabold text-navy-800">
                    Fitur yang Anda dapatkan:
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activePlanObj.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-navy-800">
                  Riwayat Pembayaran
                </h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <span>Invoice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {subscriptionPayments.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  Belum ada riwayat pembayaran tagihan.
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptionPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-navy-800">
                            {pay.date}
                          </p>
                          <p className="text-xs font-semibold text-slate-600">
                            {formatIDR(pay.amount)} - {pay.status}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pembayaran Berhasil ({pay.invoiceNumber})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Plans Comparison */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-navy-800">
                Pilihan Paket Harga SaaS KELOKRA
              </h3>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  onClick={() => onChangePlan(currentPlan, "MONTHLY")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    billingCycle === "MONTHLY"
                      ? "bg-white text-navy-800 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => onChangePlan(currentPlan, "YEARLY")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    billingCycle === "YEARLY"
                      ? "bg-white text-navy-800 shadow-xs"
                      : "text-slate-500"
                  }`}
                >
                  Tahunan (Hemat 2 Bulan)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrent = plan.code === currentPlan;
                const price =
                  billingCycle === "MONTHLY"
                    ? plan.monthlyPrice
                    : plan.yearlyPrice;
                return (
                  <div
                    key={plan.code}
                    className={`rounded-2xl border p-5 flex flex-col justify-between relative ${
                      isCurrent
                        ? "border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20"
                        : "border-slate-200/80 bg-white"
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase">
                        {plan.badge}
                      </span>
                    )}
                    <div className="space-y-3">
                      <h4 className="text-base font-extrabold text-navy-800">
                        {plan.name}
                      </h4>
                      <p className="text-2xl font-extrabold text-navy-800">
                        {formatIDR(price)}
                        <span className="text-xs font-normal text-slate-500">
                          /{billingCycle === "MONTHLY" ? "bln" : "thn"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {plan.description}
                      </p>
                      <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => onChangePlan(plan.code, billingCycle)}
                      disabled={isCurrent}
                      className={`mt-5 w-full py-2.5 rounded-xl text-xs font-extrabold transition ${
                        isCurrent
                          ? "bg-slate-200 text-slate-600 cursor-default"
                          : "bg-navy-800 hover:bg-emerald-600 text-white"
                      }`}
                    >
                      {isCurrent ? "Paket Aktif Saat Ini" : "Pilih Paket Ini"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add-ons Catalog */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-base font-extrabold text-navy-800">
              Add-on Tambahan yang Dapat Diaktifkan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-extrabold text-navy-800">
                      {addon.name}{" "}
                      <span className="text-emerald-600">
                        (+{formatIDR(addon.priceMonthly)}/bln)
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {addon.description}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleAddon(addon.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                      addon.active
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {addon.active ? "Aktif" : "Aktifkan"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 3: PENGATURAN SISTEM
  // ============================================================================
  if (mode === "settings") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
            Pengaturan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Atur preferensi sistem sesuai kebutuhan bisnis Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 lg:col-span-3 space-y-1.5">
            {(
              [
                { id: "Umum", label: "Umum", icon: Settings },
                { id: "Pembayaran", label: "Pembayaran", icon: CreditCard },
                { id: "Notifikasi", label: "Notifikasi", icon: Bell },
                { id: "Keamanan", label: "Keamanan", icon: ShieldCheck },
                { id: "Integrasi", label: "Integrasi", icon: Plug },
                { id: "Backup", label: "Backup & Restore", icon: DatabaseBackup },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = settingsTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSettingsTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-500/30"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            {settingsTab === "Umum" && (
              <>
                <h2 className="text-base font-extrabold text-navy-800">
                  Informasi Toko
                </h2>

                <div className="p-5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  {!editingStoreInfo ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-navy-800">
                            {storeSettings.storeName}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Alamat: {storeSettings.address} • Telp:{" "}
                            {storeSettings.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTempStoreName(storeSettings.storeName);
                          setTempAddress(storeSettings.address);
                          setTempPhone(storeSettings.phone);
                          setEditingStoreInfo(true);
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-navy-800"
                      >
                        Ubah
                      </button>
                    </>
                  ) : (
                    <div className="w-full space-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Nama Toko
                          </label>
                          <input
                            type="text"
                            value={tempStoreName}
                            onChange={(e) => setTempStoreName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Telepon Toko
                          </label>
                          <input
                            type="text"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Alamat Lengkap
                        </label>
                        <input
                          type="text"
                          value={tempAddress}
                          onChange={(e) => setTempAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingStoreInfo(false)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSettings({
                              ...storeSettings,
                              storeName: tempStoreName,
                              address: tempAddress,
                              phone: tempPhone,
                            });
                            setEditingStoreInfo(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-800">
                      Aktifkan mode offline
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transaksi tetap bisa dilakukan meski tanpa internet
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={storeSettings.offlineModeEnabled}
                    onClick={() =>
                      onUpdateSettings({
                        ...storeSettings,
                        offlineModeEnabled: !storeSettings.offlineModeEnabled,
                      })
                    }
                    className={`w-12 h-7 rounded-full transition p-1 flex items-center ${
                      storeSettings.offlineModeEnabled
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-800">
                      Notifikasi email
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Terima notifikasi transaksi dan sistem
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={storeSettings.emailNotificationEnabled}
                    onClick={() =>
                      onUpdateSettings({
                        ...storeSettings,
                        emailNotificationEnabled:
                          !storeSettings.emailNotificationEnabled,
                      })
                    }
                    className={`w-12 h-7 rounded-full transition p-1 flex items-center ${
                      storeSettings.emailNotificationEnabled
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </>
            )}

            {settingsTab === "Pembayaran" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Konfigurasi Pajak & Metode Pembayaran
                </h2>
                <div className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-800">
                      Aktifkan Pajak PPN ({storeSettings.taxPercentage}%)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Otomatis menambahkan pajak pada keranjang POS
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...storeSettings,
                        enableTax: !storeSettings.enableTax,
                      })
                    }
                    className={`w-12 h-7 rounded-full transition p-1 flex items-center ${
                      storeSettings.enableTax
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>
            )}

            {settingsTab === "Integrasi" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Perangkat Kasir (Printer Thermal & Scanner)
                </h2>
                <div className="p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-600">
                    Ukuran Kertas Printer Thermal
                  </label>
                  <div className="flex gap-3">
                    {(["58mm", "80mm"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() =>
                          onUpdateSettings({
                            ...storeSettings,
                            printerPaperSize: sz,
                          })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                          storeSettings.printerPaperSize === sz
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        Thermal {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "Keamanan" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Kontrol Keamanan & Audit Log
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <p className="font-extrabold text-navy-800">
                      Tenant Isolation (PostgreSQL RLS)
                    </p>
                    <p className="text-slate-600 mt-1">
                      Aktif • Setiap tabel transaksi diproteksi dengan tenant_id.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <p className="font-extrabold text-navy-800">
                      Idempotency Key Transaksi Offline
                    </p>
                    <p className="text-slate-600 mt-1">
                      Aktif • Mencegah duplikasi transaksi saat koneksi putus-sambung.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Riwayat Audit Log Terbaru
                  </h3>
                  {auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Belum ada aktivitas audit tercatat.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl border border-slate-200/80 text-xs flex justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-navy-800">
                              [{log.action}]
                            </span>{" "}
                            <span className="text-slate-600">
                              {log.details}
                            </span>
                          </div>
                          <span className="text-slate-400 shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "Backup" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Backup & Pemulihan Data
                </h2>
                <p className="text-xs text-slate-500">
                  Unduh seluruh data produk, stok, transaksi, dan pengaturan dalam format JSON, atau hapus/bersihkan seluruh data lokal.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={onExportBackup}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Backup Data (.JSON)</span>
                  </button>
                  <button
                    onClick={onResetDemoData}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Kosongkan Seluruh Data</span>
                  </button>
                </div>
              </div>
            )}

            {settingsTab === "Notifikasi" && (
              <div className="p-5 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-navy-800 text-sm">
                  Pengaturan Notifikasi Pintar
                </p>
                <p>
                  • Peringatan otomatis saat stok produk menyentuh batas minimum.
                </p>
                <p>
                  • Pengingat H-3 sebelum masa langganan bulanan/tahunan berakhir.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 4: BANTUAN & TIKET SUPPORT
  // ============================================================================
  if (mode === "help") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-navy-800">
              Pusat Bantuan & Dukungan Pelanggan KELOKRA
            </h1>
            <p className="text-xs text-slate-500">
              Panduan cepat operasional kasir, printer thermal, dan langganan SaaS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-navy-800">
              1. Cara Cetak Struk Thermal 58/80mm
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Hubungkan printer thermal via Bluetooth/USB, lalu setelah transaksi selesai klik tombol{" "}
              <b>Cetak Struk</b>. Ukuran kertas dapat diatur di menu Pengaturan → Integrasi.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-navy-800">
              2. Bagaimana Mode Offline Bekerja?
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Saat internet terputus, transaksi <b>Tunai</b> tetap berjalan lancar dan disimpan di antrean lokal. Ketika online kembali, klik tombol <b>Sync</b> di bagian kiri bawah.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-navy-800">
              3. Perhitungan HPP & Laba Bersih
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              KELOKRA menyimpan snapshot HPP pada saat transaksi terjadi, sehingga perubahan harga beli di masa depan tidak merusak laporan laba historis Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 5: SUPER ADMIN PLATFORM VIEW
  // ============================================================================
  const totalMrr = platformTenants.reduce(
    (s, t) => s + t.mrrContribution,
    0
  );
  const paidTenants = platformTenants.filter((t) => t.mrrContribution > 0);
  const arpu =
    paidTenants.length > 0 ? Math.round(totalMrr / paidTenants.length) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-navy-800 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white uppercase">
            Super Admin Platform Control
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold">
            Dashboard SaaS Multi-Tenant KELOKRA
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Pantau seluruh tenant bisnis, Monthly Recurring Revenue (MRR), ARPU, dan kesehatan platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-right">
            <p className="text-[11px] text-slate-300">
              Total MRR Aktif ({platformTenants.length} Tenant)
            </p>
            <p className="text-lg font-extrabold text-emerald-400">
              {formatIDR(totalMrr)} / bln
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              MRR Kotor Platform
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-navy-800">
            {formatIDR(totalMrr)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari {platformTenants.length} bisnis terdaftar
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              ARPU (Rata-rata / Bisnis)
            </span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-navy-800">
            {formatIDR(arpu)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {paidTenants.length} pelanggan paket berbayar
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              Tenant Masa Trial
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-navy-800">
            {platformTenants.filter((t) => t.status === "TRIALING").length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Trial 14 Hari</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              Status Infrastruktur
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">Online</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Siap Deploy di Vercel
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
          Daftar Tenant Bisnis Terdaftar di Platform KELOKRA
        </h2>
        {platformTenants.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Belum ada tenant bisnis yang terdaftar. Gunakan tombol <b>Ganti Role / Trial → Daftar Bisnis Baru</b> di bagian atas untuk mendaftarkan tenant baru.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Nama Bisnis / Tenant</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Jenis Usaha</th>
                  <th className="py-3 px-3">Paket</th>
                  <th className="py-3 px-3">Kuota Kasir</th>
                  <th className="py-3 px-3">Kontribusi MRR</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {platformTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-navy-800">
                      {t.businessName}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-700">
                        {t.ownerName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t.ownerEmail}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">
                      {t.businessType}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-navy-800 text-white">
                        {t.plan}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-semibold">
                      {t.cashierCount} / {t.maxCashiers} Kasir
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600">
                      {formatIDR(t.mrrContribution)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {t.status} ({t.periodEnd})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
