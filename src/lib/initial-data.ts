import {
  AddOnItem,
  AuditLogEntry,
  CashShiftRecord,
  Customer,
  EmployeeMember,
  ExpenseRecord,
  PlatformTenantSummary,
  Product,
  PurchaseOrder,
  ReturnRecord,
  SaleTransaction,
  StockMovement,
  StoreSettings,
  SubscriptionPaymentRecord,
  SubscriptionPlanInfo,
  Supplier,
} from "@/types/nextpos";

export const DEFAULT_TENANT_ID = "tenant-kelokra-001";

export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  {
    code: "FREE_TRIAL",
    name: "Free / Trial 14 Hari",
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxCashiers: 1,
    maxProducts: 100,
    description: "Trial 14 hari gratis untuk mencoba seluruh alur dasar kasir KELOKRA.",
    features: [
      "1 Akun Owner + 1 Akun Kasir",
      "Hingga 100 Produk Fisik",
      "POS Transaksi Tunai & QRIS",
      "Cetak Struk Thermal 58/80mm",
      "Laporan Penjualan Dasar",
    ],
  },
  {
    code: "STARTER",
    name: "Paket Starter",
    monthlyPrice: 39000,
    yearlyPrice: 390000,
    maxCashiers: 2,
    maxProducts: 500,
    description: "Cocok untuk warung, kedai rintisan, atau toko ritel skala kecil.",
    features: [
      "1 Owner + hingga 2 Akun Kasir",
      "Hingga 500 Produk & Barcode",
      "POS Cepat & Hold Transaksi",
      "Struk Digital WA & Cetak Thermal",
      "Laporan Penjualan Harian",
    ],
  },
  {
    code: "PRO",
    name: "Paket Pro",
    monthlyPrice: 79000,
    yearlyPrice: 790000,
    maxCashiers: 5,
    maxProducts: 999999,
    badge: "Paling Populer",
    description: "Pilihan terbaik untuk bisnis berkembang dengan inventaris, HPP & mode offline.",
    features: [
      "5 Akun Kasir (+1 Owner)",
      "Produk Tanpa Batas",
      "Laporan Lengkap & Perhitungan HPP",
      "Fitur Offline PWA & Auto-Sync",
      "Pembelian, Supplier & Stok Opname",
      "Ekspor Data PDF & Excel/CSV",
    ],
  },
  {
    code: "BUSINESS",
    name: "Paket Business",
    monthlyPrice: 149000,
    yearlyPrice: 1490000,
    maxCashiers: 15,
    maxProducts: 999999,
    description: "Untuk operasional toko padat transaksi dengan audit log & dukungan prioritas.",
    features: [
      "1 Owner + hingga 15 Akun Kasir",
      "Produk & Transaksi Tanpa Batas",
      "Semua Fitur Paket Pro",
      "Manajemen RBAC & Audit Log Penuh",
      "Manajemen Shift Kasir & Arus Kas",
      "Dukungan Prioritas & Backup Terjadwal",
    ],
  },
];

export const INITIAL_ADDONS: AddOnItem[] = [
  {
    id: "addon-cashier",
    name: "Kasir Tambahan (+1 Akun)",
    priceMonthly: 15000,
    description: "Tambahkan kuota akun kasir aktif di atas batas paket langganan Anda.",
    active: false,
  },
  {
    id: "addon-whatsapp",
    name: "Integrasi WhatsApp Otomatis",
    priceMonthly: 25000,
    description: "Kirim struk digital dan laporan penutupan shift langsung ke WhatsApp.",
    active: false,
  },
  {
    id: "addon-analytics",
    name: "Analitik & Insight Lanjutan",
    priceMonthly: 29000,
    description: "Prediksi stok habis, analisis jam ramai, dan margin per produk.",
    active: false,
  },
  {
    id: "addon-branding",
    name: "Kustomisasi Struk & Branding",
    priceMonthly: 19000,
    description: "Tampilkan logo bisnis khusus, pesan promo, dan QR sosial media di struk.",
    active: false,
  },
];

// Seluruh data awal dikosongkan (0 data) agar siap diisi data bisnis asli
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SALES: SaleTransaction[] = [];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_PURCHASES: PurchaseOrder[] = [];

export const INITIAL_RETURNS: ReturnRecord[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_EXPENSES: ExpenseRecord[] = [];

export const INITIAL_SHIFTS: CashShiftRecord[] = [];

export const INITIAL_EMPLOYEES: EmployeeMember[] = [];

export const INITIAL_SUBSCRIPTION_PAYMENTS: SubscriptionPaymentRecord[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: "Toko Saya",
  businessType: "Ritel & UMKM",
  address: "-",
  phone: "-",
  email: "-",
  receiptFooter: "Terima kasih telah berbelanja! Powered by KELOKRA.",
  taxPercentage: 11,
  enableTax: false,
  offlineModeEnabled: true,
  emailNotificationEnabled: true,
  whatsappReceiptEnabled: true,
  printerPaperSize: "58mm",
  autoPrintReceipt: false,
};

export const INITIAL_PLATFORM_TENANTS: PlatformTenantSummary[] = [];

export const HOURLY_SALES_CHART = [
  { hour: "08.00", today: 0, yesterday: 0 },
  { hour: "10.00", today: 0, yesterday: 0 },
  { hour: "12.00", today: 0, yesterday: 0 },
  { hour: "14.00", today: 0, yesterday: 0 },
  { hour: "16.00", today: 0, yesterday: 0 },
  { hour: "18.00", today: 0, yesterday: 0 },
  { hour: "20.00", today: 0, yesterday: 0 },
];

export const WEEKLY_REPORT_CHART = [
  { day: "Sen", sales: 0, profit: 0 },
  { day: "Sel", sales: 0, profit: 0 },
  { day: "Rab", sales: 0, profit: 0 },
  { day: "Kam", sales: 0, profit: 0 },
  { day: "Jum", sales: 0, profit: 0 },
  { day: "Sab", sales: 0, profit: 0 },
  { day: "Min", sales: 0, profit: 0 },
];
