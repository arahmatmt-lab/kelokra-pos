import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KELOKRA — Modern Multi-Tenant SaaS Point of Sale",
  description:
    "Platform Kasir SaaS Multi-Tenant Modern KELOKRA untuk berbagai jenis dan skala usaha. Mendukung POS Cepat, QRIS, Inventaris, HPP, Laporan Laba, dan Mode Offline PWA.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2933",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F2933]">
        {children}
      </body>
    </html>
  );
}
