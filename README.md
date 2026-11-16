# NEXTPOS — Modern Multi-Tenant SaaS Point of Sale (Versi Revisi 1.1)

Platform Kasir berbasis **Software as a Service (SaaS) Multi-Tenant** untuk berbagai jenis dan skala bisnis (F&B, Kafe, Ritel, Minimarket, Barbershop, Apotek, dan UMKM). Dirancang sesuai spesifikasi **NEXTPOS Versi Revisi 1.1** dengan kombinasi identitas visual **Emerald `#10B981`** dan **Deep Navy `#0F2933`**.

---

## Fitur Utama yang Telah Diimplementasikan

1. **Multi-Role & RBAC (Bab 4):**
   - **Owner (`Andi Pratama`):** Dashboard bisnis, POS, manajemen produk, inventaris, pembelian, laporan laba & HPP, keuangan, karyawan, langganan SaaS, dan pengaturan.
   - **Kasir (`Siti Nurhaliza` & `Budi Santoso`):** Transaksi POS cepat, cetak struk thermal 58/80mm, kirim struk WA, dan manajemen shift kasir.
   - **Super Admin Platform:** Pantau seluruh tenant bisnis, simulasi **MRR Rp 6.950.000** (50 Starter, 35 Pro, 15 Business), ARPU, Churn Rate, dan audit platform.
2. **Transaksi POS & Cetak Struk (Bab 6 & 7.5):**
   - Pencarian cepat, filter kategori, scanner barcode/SKU, keranjang belanja, diskon/voucher, **Hold Transaksi**, metode pembayaran **Tunai, QRIS, Kartu, E-Wallet**, kalkulator kembalian otomatis, cetak struk thermal **58mm/80mm**, dan kirim struk digital via **WhatsApp**.
3. **Aturan Bisnis, Stok & Perhitungan HPP (Bab 9.1 & 9.2):**
   - Snapshot HPP saat transaksi terjadi (*Weighted Average Cost*).
   - Rumus Keuangan Akurat:
     - `Omzet Bersih = Penjualan − Diskon − Retur Penjualan`
     - `Laba Kotor = Omzet Bersih − HPP`
     - `Laba Operasional = Laba Kotor − Pengeluaran Operasional`
   - Riwayat `Stock Movements` otomatis pada penjualan (`OUT`), penerimaan PO (`IN`), stok opname (`OPNAME`), dan retur (`RETURN_IN` / `RETURN_OUT`).
4. **Mode Offline-First PWA & Sinkronisasi (Bab 10.1):**
   - Dilengkapi `manifest.json`, Service Worker (`sw.js`), antrean transaksi lokal dengan `idempotencyKey`, serta validasi bahwa pembayaran **QRIS** memerlukan koneksi online sedangkan **Tunai** dapat antre secara offline.
5. **Database PostgreSQL & Row-Level Security (Bab 8 & 10.2):**
   - Skema lengkap tersedia di `prisma/schema.prisma` dan migrasi kebijakan isolasi multi-tenant PostgreSQL RLS tersedia di `database/migrations/001_init_nextpos_rls.sql`.

---

## Cara Jalankan di Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

---

## Cara Upload & Deploy Gratis (Rp 0) ke Vercel

### Cara 1: Via GitHub + Dashboard Vercel (Paling Direkomendasikan)
1. Buat repository baru di GitHub (misal `nextpos-saas`).
2. Push folder proyek ini ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial NEXTPOS v1.1 SaaS Point of Sale"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/nextpos-saas.git
   git push -u origin main
   ```
3. Buka [vercel.com](https://vercel.com), login dengan akun GitHub Anda, klik **Add New... → Project**.
4. Pilih repository `nextpos-saas`, lalu klik **Deploy**.
5. Dalam ~1 menit, aplikasi kasir Anda langsung online dengan domain `.vercel.app` gratis!

### Cara 2: Langsung dari Terminal dengan Vercel CLI
```bash
npx vercel
```
Ikuti petunjuk login di terminal, lalu jalankan `npx vercel --prod` untuk mendapatkan URL produksi.
