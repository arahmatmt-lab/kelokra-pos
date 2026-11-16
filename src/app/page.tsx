"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Users,
  BarChart3,
  Wallet,
  UserCog,
  Crown,
  Settings,
  HelpCircle,
  ShieldAlert,
  Search,
  Bell,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  AddOnItem,
  AuditLogEntry,
  CashShiftRecord,
  Customer,
  EmployeeMember,
  ExpenseRecord,
  PlanCode,
  PlatformTenantSummary,
  Product,
  PurchaseOrder,
  ReturnRecord,
  SaleTransaction,
  StockMovement,
  StoreSettings,
  SubscriptionPaymentRecord,
  Supplier,
  UserRole,
} from "@/types/nextpos";
import {
  DEFAULT_TENANT_ID,
  INITIAL_ADDONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_EMPLOYEES,
  INITIAL_EXPENSES,
  INITIAL_PLATFORM_TENANTS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_RETURNS,
  INITIAL_SALES,
  INITIAL_SHIFTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_STORE_SETTINGS,
  INITIAL_SUBSCRIPTION_PAYMENTS,
  INITIAL_SUPPLIERS,
  SUBSCRIPTION_PLANS,
} from "@/lib/initial-data";
import { formatIDR, formatShortTime, generateId } from "@/lib/format";
import { DashboardView } from "@/components/views/DashboardView";
import { PosView } from "@/components/views/PosView";
import { ProductsInventoryView } from "@/components/views/ProductsInventoryView";
import { ReportsFinanceView } from "@/components/views/ReportsFinanceView";
import { SaasSettingsAdminView } from "@/components/views/SaasSettingsAdminView";
import { LandingAuthModal } from "@/components/LandingAuthModal";

const STORAGE_KEY = "kelokra_saas_state_v1";

export default function KelokraApp() {
  // Navigation & RBAC state
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const [currentRole, setCurrentRole] = useState<UserRole>("OWNER");
  const [currentUserName, setCurrentUserName] = useState<string>("Owner");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Command Search state
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Online / Offline PWA Simulation & Sync Queue
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState("-");
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Business Domain States (Initialized Empty)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<SaleTransaction[]>(INITIAL_SALES);
  const [movements, setMovements] = useState<StockMovement[]>(
    INITIAL_STOCK_MOVEMENTS
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [purchases, setPurchases] =
    useState<PurchaseOrder[]>(INITIAL_PURCHASES);
  const [returns, setReturns] = useState<ReturnRecord[]>(INITIAL_RETURNS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [shifts, setShifts] = useState<CashShiftRecord[]>(INITIAL_SHIFTS);
  const [employees, setEmployees] =
    useState<EmployeeMember[]>(INITIAL_EMPLOYEES);
  const [currentPlan, setCurrentPlan] = useState<PlanCode>("PRO");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY"
  );
  const [subscriptionPayments, setSubscriptionPayments] = useState<
    SubscriptionPaymentRecord[]
  >(INITIAL_SUBSCRIPTION_PAYMENTS);
  const [addons, setAddons] = useState<AddOnItem[]>(INITIAL_ADDONS);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(
    INITIAL_STORE_SETTINGS
  );
  const [auditLogs, setAuditLogs] =
    useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [platformTenants, setPlatformTenants] = useState<
    PlatformTenantSummary[]
  >(INITIAL_PLATFORM_TENANTS);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Clear old NEXTPOS dummy storage key & load KELOKRA state
  useEffect(() => {
    try {
      localStorage.removeItem("nextpos_saas_state_v1_1");
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.sales) setSales(parsed.sales);
        if (parsed.movements) setMovements(parsed.movements);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.purchases) setPurchases(parsed.purchases);
        if (parsed.returns) setReturns(parsed.returns);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.employees) setEmployees(parsed.employees);
        if (parsed.currentPlan) setCurrentPlan(parsed.currentPlan);
        if (parsed.storeSettings) setStoreSettings(parsed.storeSettings);
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      }
    } catch {
      // Ignore storage error
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchDropdown((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          products,
          sales,
          movements,
          suppliers,
          purchases,
          returns,
          customers,
          expenses,
          shifts,
          employees,
          currentPlan,
          storeSettings,
          auditLogs,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [
    products,
    sales,
    movements,
    suppliers,
    purchases,
    returns,
    customers,
    expenses,
    shifts,
    employees,
    currentPlan,
    storeSettings,
    auditLogs,
  ]);

  const appendAudit = (action: string, module: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: generateId("aud"),
      timestamp: `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`,
      actor: currentUserName,
      role:
        currentRole === "OWNER"
          ? "Owner"
          : currentRole === "CASHIER"
          ? "Kasir"
          : "Super Admin",
      action,
      module,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Handler 1: Complete POS Sale
  const handleCompleteSale = (sale: SaleTransaction) => {
    setSales((prev) => [sale, ...prev]);

    setProducts((prev) =>
      prev.map((prod) => {
        const soldItem = sale.items.find((i) => i.productId === prod.id);
        if (!soldItem) return prod;
        return {
          ...prod,
          stock: Math.max(0, prod.stock - soldItem.quantity),
          soldCount: prod.soldCount + soldItem.quantity,
        };
      })
    );

    const newMovements: StockMovement[] = sale.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const balanceAfter = Math.max(0, (prod?.stock || 0) - item.quantity);
      return {
        id: generateId("mov"),
        tenantId: DEFAULT_TENANT_ID,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        type: "OUT",
        quantity: -item.quantity,
        balanceAfter,
        reference: sale.invoiceNumber,
        reason: `Penjualan POS (${sale.paymentMethod})`,
        actor: sale.cashierName,
        createdAt: `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`,
      };
    });
    setMovements((prev) => [...newMovements, ...prev]);

    if (sale.paymentMethod === "Tunai") {
      setShifts((prev) =>
        prev.map((sh) =>
          sh.status === "OPEN"
            ? {
                ...sh,
                cashSales: sh.cashSales + sale.grandTotal,
                expectedCash: sh.expectedCash + sale.grandTotal,
              }
            : sh
        )
      );
    }

    appendAudit(
      "SALE_COMPLETED",
      "POS",
      `Transaksi ${sale.invoiceNumber} senilai ${formatIDR(
        sale.grandTotal
      )} (${sale.paymentMethod}) selesai.`
    );

    if (isOnline) {
      setLastSyncTime(formatShortTime());
      showToast(`Transaksi ${sale.invoiceNumber} berhasil & tersinkron!`);
    } else {
      showToast(
        `Transaksi ${sale.invoiceNumber} disimpan di Antrean Offline PWA.`
      );
    }
  };

  // Handler 2: Offline Queue Sync
  const unsyncedSales = sales.filter((s) => !s.synced);

  const handleSyncOfflineTransactions = async () => {
    if (unsyncedSales.length === 0) {
      setIsOnline(true);
      setLastSyncTime(formatShortTime());
      showToast("Semua data transaksi sudah sinkron dengan server Cloud.");
      return;
    }

    setIsSyncing(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: DEFAULT_TENANT_ID,
          queuedTransactions: unsyncedSales.map((u) => ({
            id: u.id,
            idempotencyKey: u.idempotencyKey,
          })),
        }),
      });
    } catch {
      // Continue local state update
    }

    setSales((prev) => prev.map((s) => ({ ...s, synced: true })));
    setIsOnline(true);
    setIsSyncing(false);
    setLastSyncTime(formatShortTime());
    appendAudit(
      "OFFLINE_SYNC",
      "Offline Sync",
      `Sinkronisasi berhasil untuk ${unsyncedSales.length} transaksi antrean lokal.`
    );
    showToast(
      `Berhasil menyinkronkan ${unsyncedSales.length} transaksi offline ke Cloud!`
    );
  };

  // Handler 3: Save / Delete Product
  const handleSaveProduct = (product: Product, isNew: boolean) => {
    if (isNew) {
      setProducts((prev) => [product, ...prev]);
      setMovements((prev) => [
        {
          id: generateId("mov"),
          tenantId: DEFAULT_TENANT_ID,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          type: "IN",
          quantity: product.stock,
          balanceAfter: product.stock,
          reference: "INIT-STOCK",
          reason: "Stok Awal Produk Baru",
          actor: currentUserName,
          createdAt: `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`,
        },
        ...prev,
      ]);
      appendAudit(
        "PRODUCT_CREATED",
        "Produk",
        `Menambahkan produk baru ${product.name} (${product.sku}) dengan stok awal ${product.stock}.`
      );
      showToast(`Produk "${product.name}" berhasil ditambahkan!`);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
      appendAudit(
        "PRODUCT_UPDATED",
        "Produk",
        `Memperbarui informasi produk ${product.name} (${product.sku}).`
      );
      showToast(`Produk "${product.name}" berhasil diperbarui!`);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (target) {
      appendAudit(
        "PRODUCT_DELETED",
        "Produk",
        `Menghapus produk ${target.name} (${target.sku}).`
      );
      showToast(`Produk "${target.name}" dihapus.`);
    }
  };

  // Handler 4: Stok Opname
  const handlePerformOpname = (
    productId: string,
    actualQty: number,
    reason: string
  ) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const diff = actualQty - target.stock;

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: actualQty } : p))
    );

    setMovements((prev) => [
      {
        id: generateId("mov"),
        tenantId: DEFAULT_TENANT_ID,
        productId: target.id,
        productName: target.name,
        sku: target.sku,
        type: "OPNAME",
        quantity: diff,
        balanceAfter: actualQty,
        reference: `OPN-${Math.floor(10 + Math.random() * 89)}`,
        reason,
        actor: currentUserName,
        createdAt: `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`,
      },
      ...prev,
    ]);

    appendAudit(
      "STOCK_OPNAME",
      "Inventaris",
      `Stok Opname ${target.name}: sistem ${target.stock} -> aktual ${actualQty} (selisih ${diff}). Alasan: ${reason}`
    );
    showToast(`Stok Opname "${target.name}" berhasil disimpan!`);
  };

  // Handler 5: Purchases & Returns
  const handleCreatePurchase = (po: PurchaseOrder) => {
    setPurchases((prev) => [po, ...prev]);
    appendAudit(
      "PURCHASE_DRAFT",
      "Pembelian",
      `Membuat draft PO ${po.purchaseNumber} ke ${po.supplierName}.`
    );
    showToast(`Draft ${po.purchaseNumber} berhasil dibuat!`);
  };

  const handleReceivePurchase = (poId: string) => {
    const po = purchases.find((p) => p.id === poId);
    if (!po || po.status === "RECEIVED") return;

    const receivedTime = `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`;
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === poId
          ? { ...p, status: "RECEIVED", receivedAt: receivedTime }
          : p
      )
    );

    setProducts((prev) =>
      prev.map((prod) => {
        const item = po.items.find((i) => i.productId === prod.id);
        if (!item) return prod;
        const oldVal = prod.stock * prod.purchasePrice;
        const newVal = item.quantity * item.unitCost;
        const nextStock = prod.stock + item.quantity;
        const avgCost =
          nextStock > 0
            ? Math.round((oldVal + newVal) / nextStock)
            : item.unitCost;
        return {
          ...prod,
          stock: nextStock,
          purchasePrice: avgCost,
        };
      })
    );

    const poMovements: StockMovement[] = po.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        id: generateId("mov"),
        tenantId: DEFAULT_TENANT_ID,
        productId: item.productId,
        productName: item.productName,
        sku: prod?.sku || "SKU",
        type: "IN",
        quantity: item.quantity,
        balanceAfter: (prod?.stock || 0) + item.quantity,
        reference: po.purchaseNumber,
        reason: `Penerimaan Pembelian dari ${po.supplierName}`,
        actor: currentUserName,
        createdAt: receivedTime,
      };
    });
    setMovements((prev) => [...poMovements, ...prev]);

    appendAudit(
      "PURCHASE_RECEIVED",
      "Pembelian",
      `Penerimaan barang ${po.purchaseNumber} selesai; stok & HPP Average Cost diperbarui.`
    );
    showToast(`Barang ${po.purchaseNumber} diterima & stok bertambah!`);
  };

  const handleCreateReturn = (ret: ReturnRecord) => {
    setReturns((prev) => [ret, ...prev]);
    const prod = products.find((p) => p.id === ret.productId);

    if (prod) {
      if (ret.type === "CUSTOMER_RETURN" && ret.restockEligible) {
        const nextStock = prod.stock + ret.quantity;
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, stock: nextStock } : p))
        );
        setMovements((prev) => [
          {
            id: generateId("mov"),
            tenantId: DEFAULT_TENANT_ID,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: "RETURN_IN",
            quantity: ret.quantity,
            balanceAfter: nextStock,
            reference: ret.returnNumber,
            reason: `Retur Pelanggan Layak Jual (${ret.reason})`,
            actor: currentUserName,
            createdAt: ret.createdAt,
          },
          ...prev,
        ]);
      } else if (ret.type === "SUPPLIER_RETURN") {
        const nextStock = Math.max(0, prod.stock - ret.quantity);
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, stock: nextStock } : p))
        );
        setMovements((prev) => [
          {
            id: generateId("mov"),
            tenantId: DEFAULT_TENANT_ID,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: "RETURN_OUT",
            quantity: -ret.quantity,
            balanceAfter: nextStock,
            reference: ret.returnNumber,
            reason: `Retur ke Supplier (${ret.reason})`,
            actor: currentUserName,
            createdAt: ret.createdAt,
          },
          ...prev,
        ]);
      }
    }

    appendAudit(
      "RETURN_PROCESSED",
      "Retur",
      `Memproses ${ret.returnNumber} untuk ${ret.productName} (${ret.quantity}x).`
    );
    showToast(`Retur ${ret.returnNumber} berhasil dicatat!`);
  };

  // Handler 6: Role Switcher & Onboarding Trial Registration
  const handleSelectRole = (
    role: UserRole,
    customName?: string,
    customStore?: string
  ) => {
    setCurrentRole(role);
    if (role === "OWNER") {
      setCurrentUserName(customName || "Owner");
      if (customStore) {
        setStoreSettings((prev) => ({ ...prev, storeName: customStore }));
        setCurrentPlan("FREE_TRIAL");
        setPlatformTenants((prev) => [
          {
            id: generateId("tenant"),
            businessName: customStore,
            ownerName: customName || "Owner",
            ownerEmail: "owner@bisnis.id",
            businessType: "UMKM / Ritel",
            plan: "FREE_TRIAL",
            status: "TRIALING",
            cashierCount: 1,
            maxCashiers: 1,
            mrrContribution: 0,
            joinedDate: new Date().toLocaleDateString("id-ID"),
            periodEnd: "Trial 14 Hari",
          },
          ...prev,
        ]);
        showToast(
          `Selamat datang! Tenant "${customStore}" aktif dengan Trial Gratis 14 Hari.`
        );
      } else {
        showToast("Berpindah ke akun Owner Bisnis");
      }
      setActiveMenu("dashboard");
    } else if (role === "CASHIER") {
      setCurrentUserName("Kasir");
      setActiveMenu("pos");
      showToast("Berpindah ke tampilan Kasir Operasional");
    } else {
      setCurrentUserName("Super Admin KELOKRA");
      setActiveMenu("super-admin");
      showToast("Berpindah ke Dashboard Super Admin Platform SaaS");
    }
  };

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["OWNER", "CASHIER", "SUPER_ADMIN"],
    },
    {
      id: "pos",
      label: "POS",
      icon: ShoppingCart,
      roles: ["OWNER", "CASHIER"],
    },
    {
      id: "products",
      label: "Produk",
      icon: Package,
      roles: ["OWNER", "CASHIER"],
    },
    {
      id: "inventory",
      label: "Inventaris",
      icon: Boxes,
      roles: ["OWNER", "CASHIER"],
    },
    {
      id: "purchases",
      label: "Pembelian",
      icon: Truck,
      roles: ["OWNER"],
    },
    {
      id: "customers",
      label: "Pelanggan",
      icon: Users,
      roles: ["OWNER", "CASHIER"],
    },
    {
      id: "reports",
      label: "Laporan",
      icon: BarChart3,
      roles: ["OWNER"],
    },
    {
      id: "finance",
      label: "Keuangan",
      icon: Wallet,
      roles: ["OWNER", "CASHIER"],
    },
    {
      id: "employees",
      label: "Karyawan",
      icon: UserCog,
      roles: ["OWNER"],
    },
    {
      id: "subscription",
      label: "Langganan",
      icon: Crown,
      roles: ["OWNER"],
    },
    {
      id: "super-admin",
      label: "Platform SaaS",
      icon: ShieldAlert,
      roles: ["OWNER", "SUPER_ADMIN"],
    },
  ].filter((item) => item.roles.includes(currentRole));

  const activePlanInfo =
    SUBSCRIPTION_PLANS.find((p) => p.code === currentPlan) ||
    SUBSCRIPTION_PLANS[2];

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F2933]">
      {/* SIDEBAR NAVIGATION — Deep Navy #0F2933 with KELOKRA Logo */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0F2933] text-white flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => setActiveMenu("dashboard")}
              className="cursor-pointer select-none flex-1"
            >
              <div className="bg-white rounded-xl px-3 py-2 inline-flex items-center justify-center shadow-sm">
                <img
                  src="/kelokra-logo.png"
                  alt="KELOKRA Logo"
                  className="h-7 w-auto object-contain"
                />
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase block mt-1.5 pl-0.5">
                {storeSettings.storeName}
              </span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition ${
                    active
                      ? "bg-[#10B981] text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Widgets */}
        <div className="p-4 space-y-3 border-t border-white/10">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span className="text-xs font-extrabold">
                  {isOnline ? "Online" : "Mode Offline"}
                </span>
              </div>
              <button
                onClick={handleSyncOfflineTransactions}
                title="Sinkronkan Sekarang"
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
                />
                <span>Sync</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {unsyncedSales.length > 0
                ? `${unsyncedSales.length} transaksi antre lokal`
                : `Sinkronisasi terakhir ${lastSyncTime}`}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/90 to-navy-900 border border-emerald-500/30 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold text-white">
                {activePlanInfo.name}
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">Status: Aktif</p>
            </div>
            <button
              onClick={() => setActiveMenu("subscription")}
              className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-extrabold shadow-xs transition"
            >
              Upgrade
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <button
              onClick={() => {
                setActiveMenu("settings");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeMenu === "settings"
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan</span>
            </button>
            <button
              onClick={() => {
                setActiveMenu("help");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeMenu === "help"
                  ? "bg-white/15 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Bantuan</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER BAR */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka Menu"
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-navy-800"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchDropdown(false), 180)
                }
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Cari fitur atau tekan Ctrl + K..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-navy-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />

              {showSearchDropdown && (
                <div className="absolute left-0 right-0 top-11 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 space-y-1">
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">
                    Navigasi Cepat KELOKRA
                  </p>
                  {navItems
                    .filter(
                      (i) =>
                        !globalSearch ||
                        i.label
                          .toLowerCase()
                          .includes(globalSearch.toLowerCase())
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        onMouseDown={() => {
                          setActiveMenu(item.id);
                          setGlobalSearch("");
                          setShowSearchDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-xs font-bold text-navy-800 flex items-center justify-between"
                      >
                        <span>{item.label}</span>
                        <span className="text-[10px] text-emerald-600">
                          Buka →
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => {
                const next = !isOnline;
                setIsOnline(next);
                if (next && unsyncedSales.length > 0) {
                  handleSyncOfflineTransactions();
                } else {
                  showToast(
                    next
                      ? "Koneksi Online Aktif"
                      : "Mode Simulasi Offline Aktif: Transaksi Tunai akan masuk antrean lokal."
                  );
                }
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isOnline
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-300 text-amber-800"
              }`}
              title="Klik untuk menguji skenario Koneksi Putus / Offline-First PWA"
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Offline ({unsyncedSales.length})</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold transition hidden sm:flex items-center gap-1.5"
            >
              <span>Ganti Role / Trial</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                aria-label="Notifikasi"
                className="p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 relative"
              >
                <Bell className="w-4 h-4" />
                {lowStockCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 z-50 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-navy-800">
                      Notifikasi KELOKRA
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Tutup
                    </button>
                  </div>
                  {lowStockCount > 0 ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900">
                      <b>Stok Menipis:</b> {lowStockCount} produk berada di
                      bawah batas stok minimum.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600">
                      Belum ada peringatan baru. Sistem siap digunakan.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition text-left"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                {currentUserName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-extrabold text-navy-800 leading-tight">
                  {currentUserName}
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {currentRole === "OWNER"
                    ? "Owner"
                    : currentRole === "CASHIER"
                    ? "Kasir"
                    : "Super Admin"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>
          </div>
        </header>

        {/* ACTIVE VIEW CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {activeMenu === "dashboard" && (
            <DashboardView
              userName={currentUserName}
              products={products}
              sales={sales}
              onNavigate={setActiveMenu}
            />
          )}

          {activeMenu === "pos" && (
            <PosView
              products={products}
              customers={customers}
              storeSettings={storeSettings}
              isOnline={isOnline}
              cashierName={currentUserName}
              onCompleteSale={handleCompleteSale}
              onNavigate={setActiveMenu}
            />
          )}

          {(activeMenu === "products" ||
            activeMenu === "inventory" ||
            activeMenu === "purchases") && (
            <ProductsInventoryView
              mode={activeMenu}
              products={products}
              movements={movements}
              suppliers={suppliers}
              purchases={purchases}
              returns={returns}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onPerformOpname={handlePerformOpname}
              onAddSupplier={(sup) => {
                setSuppliers((prev) => [sup, ...prev]);
                showToast(`Supplier "${sup.name}" berhasil ditambahkan!`);
              }}
              onCreatePurchase={handleCreatePurchase}
              onReceivePurchase={handleReceivePurchase}
              onCreateReturn={handleCreateReturn}
            />
          )}

          {(activeMenu === "reports" ||
            activeMenu === "finance" ||
            activeMenu === "customers") && (
            <ReportsFinanceView
              mode={activeMenu}
              sales={sales}
              products={products}
              customers={customers}
              expenses={expenses}
              returns={returns}
              shifts={shifts}
              onAddExpense={(exp) => {
                setExpenses((prev) => [exp, ...prev]);
                appendAudit(
                  "EXPENSE_ADDED",
                  "Keuangan",
                  `Mencatat pengeluaran ${exp.description} sebesar ${formatIDR(
                    exp.amount
                  )}.`
                );
                showToast("Pengeluaran operasional berhasil dicatat!");
              }}
              onAddCustomer={(cust) => {
                setCustomers((prev) => [cust, ...prev]);
                showToast(`Pelanggan "${cust.name}" berhasil ditambahkan!`);
              }}
              onToggleShift={(cashAmount, notes) => {
                const openShift = shifts.find((s) => s.status === "OPEN");
                if (openShift) {
                  const diff = cashAmount - openShift.expectedCash;
                  setShifts((prev) =>
                    prev.map((s) =>
                      s.id === openShift.id
                        ? {
                            ...s,
                            status: "CLOSED",
                            closedAt: `${new Date().toLocaleDateString(
                              "id-ID"
                            )} ${formatShortTime()}`,
                            closingCash: cashAmount,
                            difference: diff,
                            notes,
                          }
                        : s
                    )
                  );
                  appendAudit(
                    "SHIFT_CLOSED",
                    "Cash Shift",
                    `Menutup shift kasir dengan kas akhir ${formatIDR(
                      cashAmount
                    )} (Selisih: ${formatIDR(diff)}).`
                  );
                  showToast("Shift kasir berhasil ditutup!");
                } else {
                  setShifts((prev) => [
                    {
                      id: generateId("shift"),
                      cashierName: currentUserName,
                      openedAt: `${new Date().toLocaleDateString(
                        "id-ID"
                      )} ${formatShortTime()}`,
                      openingCash: cashAmount,
                      cashSales: 0,
                      expectedCash: cashAmount,
                      status: "OPEN",
                      notes,
                    },
                    ...prev,
                  ]);
                  appendAudit(
                    "SHIFT_OPENED",
                    "Cash Shift",
                    `Membuka shift baru dengan modal kas awal ${formatIDR(
                      cashAmount
                    )}.`
                  );
                  showToast("Shift kasir baru berhasil dibuka!");
                }
              }}
            />
          )}

          {(activeMenu === "employees" ||
            activeMenu === "subscription" ||
            activeMenu === "settings" ||
            activeMenu === "help" ||
            activeMenu === "super-admin") && (
            <SaasSettingsAdminView
              mode={activeMenu}
              employees={employees}
              currentPlan={currentPlan}
              billingCycle={billingCycle}
              subscriptionPayments={subscriptionPayments}
              addons={addons}
              storeSettings={storeSettings}
              auditLogs={auditLogs}
              platformTenants={platformTenants}
              onAddEmployee={(emp) => {
                setEmployees((prev) => [...prev, emp]);
                appendAudit(
                  "CASHIER_INVITED",
                  "Karyawan",
                  `Mengundang & mengaktifkan akun kasir ${emp.name} (${emp.email}).`
                );
                showToast(`Akun kasir "${emp.name}" berhasil ditambahkan!`);
              }}
              onRemoveEmployee={(empId) => {
                setEmployees((prev) => prev.filter((e) => e.id !== empId));
                showToast("Akun kasir dinonaktifkan.");
              }}
              onChangePlan={(planCode, cycle) => {
                setCurrentPlan(planCode);
                setBillingCycle(cycle);
                const planObj = SUBSCRIPTION_PLANS.find(
                  (p) => p.code === planCode
                );
                if (planObj && planObj.monthlyPrice > 0) {
                  const amount =
                    cycle === "MONTHLY"
                      ? planObj.monthlyPrice
                      : planObj.yearlyPrice;
                  setSubscriptionPayments((prev) => [
                    {
                      id: generateId("subpay"),
                      date: new Date().toLocaleDateString("id-ID"),
                      planName: `${planObj.name} (${
                        cycle === "MONTHLY" ? "Bulanan" : "Tahunan"
                      })`,
                      amount,
                      method: "QRIS / Virtual Account",
                      status: "Berhasil",
                      invoiceNumber: `INV-SAAS-${Math.floor(
                        100000 + Math.random() * 899999
                      )}`,
                    },
                    ...prev,
                  ]);
                }
                appendAudit(
                  "SUBSCRIPTION_UPDATED",
                  "Langganan",
                  `Mengubah paket langganan ke ${planCode} (${cycle}).`
                );
                showToast(`Paket langganan diperbarui ke ${planCode}!`);
              }}
              onToggleAddon={(addonId) => {
                setAddons((prev) =>
                  prev.map((a) =>
                    a.id === addonId ? { ...a, active: !a.active } : a
                  )
                );
                showToast("Status Add-on diperbarui!");
              }}
              onUpdateSettings={(next) => {
                setStoreSettings(next);
                showToast("Pengaturan sistem berhasil disimpan!");
              }}
              onExportBackup={() => {
                const payload = {
                  exportedAt: new Date().toISOString(),
                  tenantId: DEFAULT_TENANT_ID,
                  storeSettings,
                  products,
                  sales,
                  movements,
                  suppliers,
                  customers,
                  expenses,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `KELOKRA-Backup-${new Date()
                  .toISOString()
                  .slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("File Backup JSON berhasil diunduh!");
              }}
              onResetDemoData={() => {
                localStorage.removeItem(STORAGE_KEY);
                setProducts([]);
                setSales([]);
                setMovements([]);
                setSuppliers([]);
                setPurchases([]);
                setReturns([]);
                setCustomers([]);
                setExpenses([]);
                setShifts([]);
                setEmployees([]);
                setSubscriptionPayments([]);
                setAuditLogs([]);
                setPlatformTenants([]);
                setStoreSettings(INITIAL_STORE_SETTINGS);
                showToast("Seluruh data berhasil dikosongkan!");
              }}
            />
          )}
        </main>
      </div>

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-navy-800 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/40 flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LANDING / AUTH / ROLE SWITCHER MODAL */}
      <LandingAuthModal
        isOpen={showAuthModal}
        currentRole={currentRole}
        onClose={() => setShowAuthModal(false)}
        onSelectRole={handleSelectRole}
      />
    </div>
  );
}
