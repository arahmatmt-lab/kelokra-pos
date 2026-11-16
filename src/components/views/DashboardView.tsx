"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  PackageCheck,
  Wallet,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Sparkles,
  PackagePlus,
} from "lucide-react";
import { Product, SaleTransaction } from "@/types/nextpos";
import { HOURLY_SALES_CHART } from "@/lib/initial-data";
import { formatIDR } from "@/lib/format";
import { ProductVisual } from "@/components/ProductVisual";

interface DashboardViewProps {
  userName: string;
  products: Product[];
  sales: SaleTransaction[];
  onNavigate: (menu: string) => void;
}

export function DashboardView({
  userName,
  products,
  sales,
  onNavigate,
}: DashboardViewProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number>(3);

  const completedSales = sales.filter((s) => s.status === "COMPLETED");

  const totalSalesToday = completedSales.reduce(
    (acc, s) => acc + s.grandTotal,
    0
  );
  const totalTransactionsToday = completedSales.length;
  const totalProductsSoldToday = completedSales.reduce(
    (acc, s) => acc + s.items.reduce((sum, i) => sum + i.quantity, 0),
    0
  );
  const netProfitToday = completedSales.reduce(
    (acc, s) => acc + s.netProfit,
    0
  );

  const topProducts = [...products]
    .filter((p) => p.soldCount > 0)
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 4);

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  // Dynamically bucket sales into hourly chart slots
  const dynamicHourlyChart = HOURLY_SALES_CHART.map((slot) => {
    const slotHour = parseInt(slot.hour.split(".")[0], 10);
    const bucketTotal = completedSales.reduce((sum, tx) => {
      const txHour = new Date(tx.createdAt).getHours();
      if (Math.abs(txHour - slotHour) <= 1) {
        return sum + tx.grandTotal;
      }
      return sum;
    }, 0);
    return {
      ...slot,
      today: bucketTotal,
    };
  });

  const maxDataVal = Math.max(
    ...dynamicHourlyChart.map((d) => Math.max(d.today, d.yesterday)),
    100000
  );
  const maxVal = Math.ceil(maxDataVal / 100000) * 100000;
  const chartWidth = 600;
  const chartHeight = 190;

  const pointsToday = dynamicHourlyChart.map((d, idx) => {
    const x =
      35 + (idx * (chartWidth - 70)) / (dynamicHourlyChart.length - 1);
    const y = chartHeight - 25 - (d.today / maxVal) * (chartHeight - 50);
    return { x, y, ...d };
  });
  const pointsYesterday = dynamicHourlyChart.map((d, idx) => {
    const x =
      35 + (idx * (chartWidth - 70)) / (dynamicHourlyChart.length - 1);
    const y = chartHeight - 25 - (d.yesterday / maxVal) * (chartHeight - 50);
    return { x, y, ...d };
  });

  const linePathToday = pointsToday
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPathToday = `${linePathToday} L ${
    pointsToday[pointsToday.length - 1].x
  } ${chartHeight - 25} L ${pointsToday[0].x} ${chartHeight - 25} Z`;

  const linePathYesterday = pointsYesterday
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const activePoint = pointsToday[hoveredIndex] || pointsToday[3];

  return (
    <div className="space-y-6">
      {/* Hero Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-emerald-50/40 to-emerald-100/60 border border-slate-200/80 p-6 sm:p-7 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>KELOKRA — Sistem Kasir Pintar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-800 tracking-tight">
            Selamat datang, {userName.split(" ")[0]}!{" "}
            <span className="inline-block">👋</span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Pantau penjualan, stok, dan performa toko Anda secara real-time dalam satu layar.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("pos")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-sm transition flex items-center gap-2"
            >
              <span>Buka Kasir (POS)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("products")}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-navy-800 border border-slate-200 font-semibold text-sm transition"
            >
              + Tambah Produk
            </button>
          </div>
        </div>

        {/* Illustrated Cashier & Store Mascot */}
        <div className="hidden lg:flex items-center justify-end relative pr-4 select-none">
          <svg width="240" height="135" viewBox="0 0 240 135" fill="none">
            <circle cx="170" cy="75" r="55" fill="#10B981" fillOpacity="0.14" />
            <circle cx="115" cy="30" r="14" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" />
            <path d="M111 30L114 33L120 27" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="65" y="65" width="44" height="32" rx="8" fill="#FFFFFF" stroke="#0F2933" strokeWidth="1.8" />
            <path d="M74 77H98" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M74 85H90" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="170" cy="42" r="18" fill="#FDE68A" stroke="#0F2933" strokeWidth="2" />
            <path d="M153 38C153 27 161 21 171 21C181 21 188 28 188 38C182 34 162 34 153 38Z" fill="#0F2933" />
            <path d="M142 125C142 96 154 82 170 82C186 82 198 96 198 125H142Z" fill="#10B981" stroke="#0F2933" strokeWidth="2" />
            <rect x="155" y="92" width="30" height="33" rx="4" fill="#0F2933" />
            <circle cx="212" cy="48" r="15" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" />
            <text x="205" y="53" fill="#10B981" fontSize="12" fontWeight="bold">Rp</text>
          </svg>
        </div>
      </div>

      {/* 4 KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Penjualan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Hari Ini
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Total Penjualan</p>
          <p className="text-xl sm:text-2xl font-extrabold text-navy-800 mt-0.5">
            {formatIDR(totalSalesToday)}
          </p>
        </div>

        {/* Card 2: Jumlah Transaksi */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
              Transaksi
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Jumlah Transaksi</p>
          <p className="text-xl sm:text-2xl font-extrabold text-navy-800 mt-0.5">
            {totalTransactionsToday.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Card 3: Produk Terjual */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <PackageCheck className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
              Unit
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Produk Terjual</p>
          <p className="text-xl sm:text-2xl font-extrabold text-navy-800 mt-0.5">
            {totalProductsSoldToday.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Card 4: Laba Bersih */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Profit
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">Laba Bersih</p>
          <p className="text-xl sm:text-2xl font-extrabold text-navy-800 mt-0.5">
            {formatIDR(netProfitToday)}
          </p>
        </div>
      </div>

      {/* Main Chart + Best-Selling Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tren Penjualan Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-navy-800">
                Tren Penjualan
              </h2>
              <p className="text-xs text-slate-500">
                Grafik pergerakan omzet harian per jam
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-navy-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Hari ini
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                Kemarin
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-52 sm:h-56 overflow-visible"
            >
              <defs>
                <linearGradient id="emeraldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const val = Math.round(maxVal * ratio);
                const y = chartHeight - 25 - ratio * (chartHeight - 50);
                return (
                  <g key={idx}>
                    <line
                      x1="30"
                      y1={y}
                      x2={chartWidth - 15}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y={y + 4}
                      fill="#64748B"
                      fontSize="9.5"
                      fontWeight="500"
                    >
                      {val === 0 ? "0" : `${Math.round(val / 1000)}rb`}
                    </text>
                  </g>
                );
              })}

              <path
                d={linePathYesterday}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeDasharray="5 5"
              />

              <path d={areaPathToday} fill="url(#emeraldArea)" />
              <path
                d={linePathToday}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <line
                x1={activePoint.x}
                y1={activePoint.y}
                x2={activePoint.x}
                y2={chartHeight - 25}
                stroke="#10B981"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />

              {pointsToday.map((pt, idx) => (
                <g
                  key={pt.hour}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onClick={() => setHoveredIndex(idx)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIndex === idx ? 6 : 4}
                    fill={hoveredIndex === idx ? "#10B981" : "#FFFFFF"}
                    stroke="#10B981"
                    strokeWidth="2.5"
                  />
                  <text
                    x={pt.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    fill={hoveredIndex === idx ? "#0F2933" : "#64748B"}
                    fontSize="10.5"
                    fontWeight={hoveredIndex === idx ? "700" : "500"}
                  >
                    {pt.hour}
                  </text>
                </g>
              ))}

              <g
                transform={`translate(${Math.min(
                  Math.max(activePoint.x - 68, 35),
                  chartWidth - 150
                )}, ${Math.max(activePoint.y - 54, 4)})`}
              >
                <rect
                  width="136"
                  height="42"
                  rx="8"
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                />
                <text
                  x="68"
                  y="18"
                  textAnchor="middle"
                  fill="#0F2933"
                  fontSize="11.5"
                  fontWeight="800"
                >
                  {formatIDR(activePoint.today)}
                </text>
                <text
                  x="68"
                  y="33"
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="10"
                  fontWeight="500"
                >
                  Pukul {activePoint.hour}
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Produk Terlaris Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-navy-800">
                Produk Terlaris
              </h2>
              <button
                onClick={() => onNavigate("products")}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Kelola Produk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <PackagePlus className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-500">
                  Belum ada data produk terjual
                </p>
                <p className="text-xs text-slate-400">
                  Tambahkan produk di menu Produk lalu mulai transaksi di POS.
                </p>
                <button
                  onClick={() => onNavigate("products")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition"
                >
                  + Tambah Produk Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {topProducts.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate("pos")}
                    className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer border border-transparent hover:border-slate-200/70"
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800"
                          : idx === 1
                          ? "bg-slate-200 text-slate-700"
                          : idx === 2
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <ProductVisual
                      imageKey={item.image}
                      name={item.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-navy-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.soldCount} {item.unit} terjual •{" "}
                        <span className="text-emerald-600 font-semibold">
                          {formatIDR(item.sellingPrice)}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lowStockProducts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div
                onClick={() => onNavigate("inventory")}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/90 border border-amber-200/70 cursor-pointer hover:bg-amber-100/70 transition"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-900">
                    {lowStockProducts.length} produk mendekati stok minimum
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-700 underline">
                  Cek Stok
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-navy-800">
              Transaksi Terbaru Hari Ini
            </h2>
            <p className="text-xs text-slate-500">
              Setiap transaksi otomatis memotong stok dan mencatat snapshot HPP
            </p>
          </div>
          <button
            onClick={() => onNavigate("reports")}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Buka Laporan Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
            <p className="text-sm font-bold text-slate-500">
              Belum ada transaksi tercatat
            </p>
            <p className="text-xs text-slate-400">
              Transaksi yang Anda selesaikan di menu POS akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">No. Invoice</th>
                  <th className="py-3 px-3">Pelanggan</th>
                  <th className="py-3 px-3">Kasir</th>
                  <th className="py-3 px-3">Metode</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Laba (Gross)</th>
                  <th className="py-3 px-3">Status Sinkron</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sales.slice(0, 6).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-bold text-navy-800">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {tx.customerName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {tx.cashierName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-navy-800">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-navy-800">
                      {formatIDR(tx.grandTotal)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-600">
                      +{formatIDR(tx.netProfit)}
                    </td>
                    <td className="py-3 px-3">
                      {tx.synced ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Tersinkron
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5" />
                          Antrean Offline
                        </span>
                      )}
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
