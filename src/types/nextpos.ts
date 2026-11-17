export type UserRole = "OWNER" | "CASHIER" | "SUPER_ADMIN";

export type PaymentMethod = "Tunai" | "QRIS" | "M-Banking / E-Wallet";

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
  image: string;
  soldCount: number;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
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
  unitCost: number;
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
  paymentDetail?: string; // e.g., "BCA - 1234567890" or "DANA - 0812xxx" or "QRIS"
  cashReceived: number;
  changeAmount: number;
  status: "COMPLETED" | "VOIDED" | "RETURNED";
  synced: boolean;
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
  referenceNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  reason: string;
  restockEligible: boolean;
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
  category:
    | "Operasional"
    | "Bahan Baku"
    | "Gaji & Komisi"
    | "Sewa & Utilitas"
    | "Pemasaran"
    | "Lainnya";
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

export type OwnerAccountMode = "OWNER_PLUS_KASIR" | "OWNER_INCLUDE_KASIR";

export interface ManagedAccount {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  password?: string; // Legacy migration only; never persisted for new accounts
  email: string;
  role: "OWNER" | "CASHIER";
  ownerMode?: OwnerAccountMode;
  parentOwnerId?: string;
  storeName: string;
  durationMonths: number;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  status: "AKTIF" | "NONAKTIF";
  avatarColor: string;
  lastLogin: string;
}

export interface TransferPaymentChannel {
  id: string;
  type: "M-Banking" | "E-Wallet";
  bankOrProviderName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
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

export interface AuthSession {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  ownerMode?: OwnerAccountMode;
  accountId: string | null;
  storeName: string;
  loggedInAt: string;
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
  // Payment Methods managed by Owner
  cashEnabled: boolean;
  qrisEnabled: boolean;
  qrisMerchantName: string;
  qrisImageDataUrl: string;
  transferChannels: TransferPaymentChannel[];
}
