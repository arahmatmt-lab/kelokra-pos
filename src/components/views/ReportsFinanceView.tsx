"use client";

import React, { useState } from "react";
import {
  Download,
  Printer,
  Star,
  Clock,
  Receipt,
  Plus,
  Wallet,
  Lock,
  Unlock,
  Users,
  X,
} from "lucide-react";
import {
  CashShiftRecord,
  Customer,
  ExpenseRecord,
  Product,
  ReturnRecord,
  SaleTransaction,
} from "@/types/nextpos";
import { WEEKLY_REPORT_CHART } from "@/lib/initial-data";
import { formatIDR, generateId } from "@/lib/format";

interface ReportsFinanceViewProps {
  mode: "reports" | "finance" | "customers";
  sales: SaleTransaction[];
  products: Product[];
  customers: Customer[];
  expenses: ExpenseRecord[];
  returns: ReturnRecord[];
  shifts: CashShiftRecord[];
  onAddExpense: (exp: ExpenseRecord) => void;
  onAddCustomer: (cust: Customer) => void;
  onToggleShift: (openingOrClosingCash: number, notes: string) => void;
}

export function ReportsFinanceView({
  mode,
  sales,
  products,
  customers,
  expenses,
  returns,
  shifts,
  onAddExpense,
  onAddCustomer,
  onToggleShift,
}: ReportsFinanceViewProps) {
  const [reportTab, setReportTab] = useState<
    "Penjualan" | "Produk" | "Pelanggan" | "Keuangan"
  >("Penjualan");
  const [period, setPeriod] = useState("7 Hari Terakhir");

  // Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] =
    useState<ExpenseRecord["category"]>("Operasional");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState(150000);

  // Customer Modal
  const [showCustModal, setShowCustModal] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");

  // Shift Modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftCashAmount, setShiftCashAmount] = useState(500000);
  const [shiftNotes, setShiftNotes] = useState("Setoran kas kasir");

  // Perhitungan 100% dari data riil (tanpa angka dummy)
  const completedSales = sales.filter((s) => s.status === "COMPLETED");
  const grossSales = completedSales.reduce((sum, s) => sum + s.subtotal, 0);
  const totalDiscount = completedSales.reduce(
    (sum, s) => sum + s.discountTotal,
    0
  );
  const customerReturnsTotal = returns
    .filter((r) => r.type === "CUSTOMER_RETURN")
    .reduce((s, r) => s + r.refundAmount, 0);

  // Omzet Bersih = Penjualan - Diskon - Retur Penjualan
  const omzetBersih = Math.max(
    0,
    grossSales - totalDiscount - customerReturnsTotal
  );
  const totalHpp = completedSales.reduce((sum, s) => sum + s.totalHpp, 0);
  // Laba Kotor = Omzet Bersih - HPP
  const labaKotor = omzetBersih - totalHpp;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  // Laba Operasional = Laba Kotor - Pengeluaran Operasional
  const labaOperasional = labaKotor - totalExpenses;

  const bestProduct = [...products]
    .filter((p) => p.soldCount > 0)
    .sort((a, b) => b.soldCount - a.soldCount)[0];

  const avgTransaction =
    completedSales.length > 0
      ? Math.round(omzetBersih / completedSales.length)
      : 0;

  const dayMap = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dynamicWeeklyChart = WEEKLY_REPORT_CHART.map((d) => {
    const daySales = completedSales
      .filter((tx) => dayMap[new Date(tx.createdAt).getDay()] === d.day)
      .reduce((s, tx) => s + tx.grandTotal, 0);
    const dayProfit = completedSales
      .filter((tx) => dayMap[new Date(tx.createdAt).getDay()] === d.day)
      .reduce((s, tx) => s + tx.netProfit, 0);
    return {
      day: d.day,
      sales: daySales,
      profit: dayProfit,
    };
  });

  const maxWeeklyVal = Math.max(
    ...dynamicWeeklyChart.map((d) => Math.max(d.sales, d.profit)),
    100000
  );

  const handleExportCsv = () => {
    const headers = [
      "No Invoice,Tanggal,Pelanggan,Kasir,Metode,Subtotal,Diskon,Grand Total,HPP,Laba Bersih",
    ];
    const rows = sales.map(
      (s) =>
        `${s.invoiceNumber},${s.createdAt},"${s.customerName}","${s.cashierName}",${s.paymentMethod},${s.subtotal},${s.discountTotal},${s.grandTotal},${s.totalHpp},${s.netProfit}`
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Laporan-KELOKRA-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================================
  // MODE 1: LAPORAN & ANALITIK
  // ============================================================================
  if (mode === "reports") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
                Laporan & Analitik
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Perhitungan otomatis Omzet Bersih, Snapshot HPP, dan Laba Operasional KELOKRA.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Filter Periode Laporan"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-navy-800"
              >
                <option value="7 Hari Terakhir">7 Hari Terakhir</option>
                <option value="Hari Ini">Hari Ini</option>
                <option value="30 Hari Terakhir">30 Hari Terakhir</option>
                <option value="Bulan Ini">Bulan Ini</option>
              </select>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy-800 text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel/CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6 border-b border-slate-200 text-sm font-bold">
            {(["Penjualan", "Produk", "Pelanggan", "Keuangan"] as const).map(
              (tab) => {
                const active = reportTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setReportTab(tab)}
                    className={`pb-3 border-b-2 transition ${
                      active
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-slate-500 hover:text-navy-800"
                    }`}
                  >
                    {tab}
                  </button>
                );
              }
            )}
          </div>

          {reportTab === "Penjualan" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-navy-800">
                    Grafik Penjualan
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-navy-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Penjualan
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-300 inline-block" />
                      Laba
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-3 items-end h-48 pt-6 px-2">
                  {dynamicWeeklyChart.map((d) => {
                    const salesHeightPct = Math.max(
                      4,
                      Math.round((d.sales / maxWeeklyVal) * 100)
                    );
                    const profitHeightPct = Math.max(
                      4,
                      Math.round((d.profit / maxWeeklyVal) * 100)
                    );
                    return (
                      <div
                        key={d.day}
                        className="flex flex-col items-center gap-2 h-full justify-end"
                      >
                        <div className="flex items-end gap-1.5 w-full justify-center h-36">
                          <div
                            style={{ height: `${salesHeightPct}%` }}
                            title={`Penjualan ${d.day}: ${formatIDR(d.sales)}`}
                            className="w-3.5 sm:w-4 rounded-t-md bg-emerald-500 transition-all hover:opacity-85"
                          />
                          <div
                            style={{ height: `${profitHeightPct}%` }}
                            title={`Laba ${d.day}: ${formatIDR(d.profit)}`}
                            className="w-3.5 sm:w-4 rounded-t-md bg-emerald-300/80 transition-all hover:opacity-85"
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-1">
                  <p className="text-xs font-medium text-slate-500">
                    Total Penjualan ({period})
                  </p>
                  <p className="text-2xl font-extrabold text-navy-800">
                    {formatIDR(omzetBersih)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    {completedSales.length} transaksi selesai
                  </span>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-1">
                  <p className="text-xs font-medium text-slate-500">
                    Total Laba Kotor ({period})
                  </p>
                  <p className="text-2xl font-extrabold text-navy-800">
                    {formatIDR(labaKotor)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                    Laba Operasional: {formatIDR(labaOperasional)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {reportTab === "Keuangan" && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <h3 className="text-base font-extrabold text-navy-800">
                Perhitungan Laba Rugi Standar KELOKRA
              </h3>
              <div className="divide-y divide-slate-200/80 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-600">
                    Penjualan Kotor (Gross Sales)
                  </span>
                  <span className="font-bold text-navy-800">
                    {formatIDR(grossSales)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-600">
                    Dikurangi: Total Diskon Promo
                  </span>
                  <span className="font-bold text-rose-600">
                    - {formatIDR(totalDiscount)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-600">
                    Dikurangi: Retur Penjualan Pelanggan
                  </span>
                  <span className="font-bold text-rose-600">
                    - {formatIDR(customerReturnsTotal)}
                  </span>
                </div>
                <div className="py-3 flex justify-between bg-emerald-50/60 px-3 rounded-xl font-extrabold text-navy-800">
                  <span>= Omzet Bersih (Penjualan − Diskon − Retur)</span>
                  <span className="text-emerald-700">
                    {formatIDR(omzetBersih)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-600">
                    Dikurangi: HPP (Snapshot Average Cost saat Transaksi)
                  </span>
                  <span className="font-bold text-rose-600">
                    - {formatIDR(totalHpp)}
                  </span>
                </div>
                <div className="py-3 flex justify-between bg-slate-100 px-3 rounded-xl font-extrabold text-navy-800">
                  <span>= Laba Kotor (Omzet Bersih − HPP)</span>
                  <span>{formatIDR(labaKotor)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-600">
                    Dikurangi: Pengeluaran Operasional Toko
                  </span>
                  <span className="font-bold text-rose-600">
                    - {formatIDR(totalExpenses)}
                  </span>
                </div>
                <div className="py-3.5 flex justify-between bg-emerald-500 text-white px-4 rounded-xl font-extrabold text-base">
                  <span>= Laba Operasional Bersih</span>
                  <span>{formatIDR(labaOperasional)}</span>
                </div>
              </div>
            </div>
          )}

          {reportTab === "Produk" &&
            (products.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada data produk.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Produk</th>
                      <th className="py-2.5 px-3">Terjual</th>
                      <th className="py-2.5 px-3">Harga Jual</th>
                      <th className="py-2.5 px-3">HPP Snapshot</th>
                      <th className="py-2.5 px-3">Margin / Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-bold text-navy-800">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.soldCount} {p.unit}
                        </td>
                        <td className="py-2.5 px-3">
                          {formatIDR(p.sellingPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {formatIDR(p.purchasePrice)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">
                          +{formatIDR(p.sellingPrice - p.purchasePrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {reportTab === "Pelanggan" &&
            (customers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada data pelanggan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Nama Pelanggan</th>
                      <th className="py-2.5 px-3">Frekuensi Belanja</th>
                      <th className="py-2.5 px-3">Total Kontribusi Omzet</th>
                      <th className="py-2.5 px-3">Poin Loyalitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-bold text-navy-800">
                          {c.name}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.totalTransactions}x Transaksi
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">
                          {formatIDR(c.totalSpent)}
                        </td>
                        <td className="py-2.5 px-3">{c.loyaltyPoints} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* Insight Penting Row */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-extrabold text-navy-800">
              Insight Penting
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">
                    Produk terlaris
                  </p>
                  <p className="text-sm font-extrabold text-navy-800">
                    {bestProduct ? bestProduct.name : "Belum ada data"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/60 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">
                    Status Transaksi
                  </p>
                  <p className="text-sm font-extrabold text-navy-800">
                    {completedSales.length > 0
                      ? `${completedSales.length} Transaksi Aktif`
                      : "Belum ada transaksi"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">
                    Rata-rata transaksi
                  </p>
                  <p className="text-sm font-extrabold text-navy-800">
                    {formatIDR(avgTransaction)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 2: KEUANGAN, PENGELUARAN & CASH SHIFT KASIR
  // ============================================================================
  if (mode === "finance") {
    const activeShift = shifts.find((s) => s.status === "OPEN");

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  {activeShift ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-navy-800">
                    Manajemen Shift Kasir (Cash Shift)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rekonsiliasi modal kas awal vs uang tunai akhir shift
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShiftCashAmount(
                    activeShift ? activeShift.expectedCash : 500000
                  );
                  setShowShiftModal(true);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm ${
                  activeShift
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {activeShift ? "Tutup Shift Sekarang" : "Buka Shift Baru"}
              </button>
            </div>

            {activeShift ? (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-slate-500">Kasir Bertugas</p>
                  <p className="font-extrabold text-navy-800 text-sm mt-0.5">
                    {activeShift.cashierName}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Saldo Kas Awal</p>
                  <p className="font-extrabold text-navy-800 text-sm mt-0.5">
                    {formatIDR(activeShift.openingCash)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Kas Diharapkan</p>
                  <p className="font-extrabold text-emerald-700 text-sm mt-0.5">
                    {formatIDR(activeShift.expectedCash)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Tidak ada shift kasir yang sedang terbuka. Klik{" "}
                <b>Buka Shift Baru</b> sebelum memulai transaksi tunai.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-navy-800">
                    Pengeluaran Operasional Toko
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mengurangi Laba Kotor untuk menghitung Laba Operasional
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pengeluaran</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Total Pengeluaran Tercatat:
              </span>
              <span className="text-xl font-extrabold text-rose-600">
                {formatIDR(totalExpenses)}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <h3 className="text-base font-extrabold text-navy-800">
            Daftar Pengeluaran Operasional
          </h3>
          {expenses.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada pengeluaran operasional yang dicatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Keterangan Biaya</th>
                    <th className="py-2.5 px-3">Dicatat Oleh</th>
                    <th className="py-2.5 px-3">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {exp.date}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-navy-800">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-navy-800">
                        {exp.description}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {exp.recordedBy}
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-600">
                        {formatIDR(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL CATAT PENGELUARAN */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-navy-800">
                  Catat Pengeluaran Baru
                </h3>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!expDesc.trim()) return;
                  onAddExpense({
                    id: generateId("exp"),
                    category: expCategory,
                    description: expDesc.trim(),
                    amount: Number(expAmount),
                    date: new Date().toLocaleDateString("id-ID"),
                    recordedBy: "Owner",
                  });
                  setExpDesc("");
                  setShowExpenseModal(false);
                }}
                className="space-y-3.5 text-sm"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Biaya
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) =>
                      setExpCategory(
                        e.target.value as ExpenseRecord["category"]
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Operasional">Operasional</option>
                    <option value="Bahan Baku">Bahan Baku</option>
                    <option value="Sewa & Utilitas">Sewa & Utilitas</option>
                    <option value="Gaji & Komisi">Gaji & Komisi</option>
                    <option value="Pemasaran">Pemasaran</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Deskripsi Pengeluaran
                  </label>
                  <input
                    type="text"
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Masukkan keterangan pengeluaran..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL BUKA / TUTUP SHIFT */}
        {showShiftModal && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-navy-800">
                  {activeShift ? "Tutup Shift Kasir" : "Buka Shift Kasir Baru"}
                </h3>
                <button
                  onClick={() => setShowShiftModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onToggleShift(Number(shiftCashAmount), shiftNotes);
                  setShowShiftModal(false);
                }}
                className="space-y-3.5 text-sm"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {activeShift
                      ? "Uang Kas Aktual di Laci (Rp)"
                      : "Modal Kas Awal di Laci (Rp)"}
                  </label>
                  <input
                    type="number"
                    required
                    value={shiftCashAmount}
                    onChange={(e) => setShiftCashAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Shift
                  </label>
                  <input
                    type="text"
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowShiftModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                  >
                    Konfirmasi
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
  // MODE 3: MANAJEMEN PELANGGAN (CRM)
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-navy-800">
                Database Pelanggan & Riwayat Belanja
              </h1>
              <p className="text-xs text-slate-500">
                Kelola pelanggan setia untuk meningkatkan retensi toko Anda
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCustModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Belum ada pelanggan terdaftar. Klik tombol <b>+ Tambah Pelanggan</b> untuk mulai menyimpan data pelanggan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Nama Pelanggan</th>
                  <th className="py-3 px-3">No. WhatsApp</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Total Transaksi</th>
                  <th className="py-3 px-3">Total Belanja</th>
                  <th className="py-3 px-3">Kunjungan Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-navy-800">
                      {c.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{c.phone}</td>
                    <td className="py-3 px-3 text-slate-500">{c.email}</td>
                    <td className="py-3 px-3 font-semibold">
                      {c.totalTransactions}x
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600">
                      {formatIDR(c.totalSpent)}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {c.lastVisit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCustModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                Tambah Pelanggan Baru
              </h3>
              <button
                onClick={() => setShowCustModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!custName.trim()) return;
                onAddCustomer({
                  id: generateId("cust"),
                  name: custName.trim(),
                  phone: custPhone.trim() || "-",
                  email: custEmail.trim() || "-",
                  totalTransactions: 0,
                  totalSpent: 0,
                  lastVisit: new Date().toLocaleDateString("id-ID"),
                  loyaltyPoints: 0,
                });
                setCustName("");
                setCustPhone("");
                setCustEmail("");
                setShowCustModal(false);
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
