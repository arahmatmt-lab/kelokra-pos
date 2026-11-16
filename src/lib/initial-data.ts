import {
  AuditLogEntry,
  CashShiftRecord,
  Customer,
  ExpenseRecord,
  ManagedAccount,
  Product,
  PurchaseOrder,
  ReturnRecord,
  SaleTransaction,
  StockMovement,
  StoreSettings,
  Supplier,
} from "@/types/nextpos";

export const DEFAULT_TENANT_ID = "tenant-kelokra-001";

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

// Akun Owner & Kasir dibuat oleh Super Admin (mulai dari 0 akun)
export const INITIAL_MANAGED_ACCOUNTS: ManagedAccount[] = [];

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
  // Metode Pembayaran yang dikelola oleh Owner
  cashEnabled: true,
  qrisEnabled: false,
  qrisMerchantName: "",
  qrisImageDataUrl: "",
  transferChannels: [],
};

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
