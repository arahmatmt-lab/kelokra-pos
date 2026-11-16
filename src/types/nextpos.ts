export type UserRole = "OWNER" | "CASHIER" | "SUPER_ADMIN";

export type PlanCode = "FREE_TRIAL" | "STARTER" | "PRO" | "BUSINESS";

export type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "EXPIRED"
  | "CANCELLED";

export type PaymentMethod = "Tunai" | "QRIS" | "Kartu" | "E-Wallet";

export type ProductCategory = "Minuman" | "Makanan" | "Snack" | "Lainnya";

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  purchasePrice: number; // HPP / Average Cost
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  image: string; // SVG data URI or illustration key
  soldCount: number;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // per-item discount in IDR
}

export interface HeldTransaction {
  id: string;
  createdAt: string;
  customerName: string;
  items: CartItem[];
  discount: number;
  note?: string;
}

export interface SaleItemSnapshot {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number; // HPP snapshot at time of transaction (Bab 9.1)
  discount: number;
  subtotal: number;
}

export interface SaleTransaction {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  idempotencyKey: string;
  createdAt: string;
  cashierName: string;
  customerName: string;
  customerId?: string;
  items: SaleItemSnapshot[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  totalHpp: number;
  netProfit: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  changeAmount: number;
  status: "COMPLETED" | "VOIDED" | "RETURNED";
  synced: boolean; // true if synced with cloud, false if queued offline
}

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  sku: string;
  type: "IN" | "OUT" | "OPNAME" | "RETURN_IN" | "RETURN_OUT";
  quantity: number;
  balanceAfter: number;
  reference: string;
  reason: string;
  actor: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  category: string;
}

export interface PurchaseOrder {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    subtotal: number;
  }[];
  totalAmount: number;
  status: "DRAFT" | "RECEIVED";
  createdAt: string;
  receivedAt?: string;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  type: "CUSTOMER_RETURN" | "SUPPLIER_RETURN";
  referenceNumber: string; // Invoice or PO number
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  reason: string;
  restockEligible: boolean; // Bab 9.2: Retur pelanggan menambah stok hanya jika layak jual kembali
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalTransactions: number;
  totalSpent: number;
  lastVisit: string;
  loyaltyPoints: number;
}

export interface ExpenseRecord {
  id: string;
  category: "Operasional" | "Bahan Baku" | "Gaji & Komisi" | "Sewa & Utilitas" | "Pemasaran" | "Lainnya";
  description: string;
  amount: number;
  date: string;
  recordedBy: string;
}

export interface CashShiftRecord {
  id: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  expectedCash: number;
  closingCash?: number;
  difference?: number;
  status: "OPEN" | "CLOSED";
  notes?: string;
}

export interface EmployeeMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "Owner" | "Kasir";
  status: "Aktif" | "Menunggu Undangan" | "Nonaktif";
  lastLogin: string;
  avatarColor: string;
  permissions: string[];
}

export interface SubscriptionPlanInfo {
  code: PlanCode;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxCashiers: number;
  maxProducts: number;
  badge?: string;
  description: string;
  features: string[];
}

export interface SubscriptionPaymentRecord {
  id: string;
  date: string;
  planName: string;
  amount: number;
  method: string;
  status: "Berhasil" | "Menunggu" | "Gagal";
  invoiceNumber: string;
}

export interface AddOnItem {
  id: string;
  name: string;
  priceMonthly: number;
  description: string;
  active: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  module: string;
  details: string;
}

export interface StoreSettings {
  storeName: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
  taxPercentage: number;
  enableTax: boolean;
  offlineModeEnabled: boolean;
  emailNotificationEnabled: boolean;
  whatsappReceiptEnabled: boolean;
  printerPaperSize: "58mm" | "80mm";
  autoPrintReceipt: boolean;
}

export interface PlatformTenantSummary {
  id: string;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  businessType: string;
  plan: PlanCode;
  status: SubscriptionStatus;
  cashierCount: number;
  maxCashiers: number;
  mrrContribution: number;
  joinedDate: string;
  periodEnd: string;
}
