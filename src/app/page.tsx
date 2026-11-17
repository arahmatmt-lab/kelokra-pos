"use client";

import React, { useState, useEffect, useRef } from "react";
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
  CreditCard,
  Settings,
  HelpCircle,
  ShieldCheck,
  Search,
  Bell,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  Menu,
  X,
  Clock,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Download,
  MessageSquarePlus,
  MessageCircle,
} from "lucide-react";
import {
  AuditLogEntry,
  AuthSession,
  CashShiftRecord,
  Customer,
  DeveloperFeedback,
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
import {
  DEFAULT_TENANT_ID,
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_MANAGED_ACCOUNTS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_RETURNS,
  INITIAL_SALES,
  INITIAL_SHIFTS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_STORE_SETTINGS,
  INITIAL_SUPPLIERS,
} from "@/lib/initial-data";
import {
  addMonthsToIso,
  formatDateOnly,
  formatIDR,
  formatShortTime,
  generateId,
  getRemainingTimeInfo,
} from "@/lib/format";
import { DashboardView } from "@/components/views/DashboardView";
import { SuperAdminDashboardView } from "@/components/views/SuperAdminDashboardView";
import { PosView } from "@/components/views/PosView";
import { ProductsInventoryView } from "@/components/views/ProductsInventoryView";
import { ReportsFinanceView } from "@/components/views/ReportsFinanceView";
import { SaasSettingsAdminView } from "@/components/views/SaasSettingsAdminView";
import { LoginScreen } from "@/components/LoginScreen";
import { hashPasswordWithSalt, sanitizeJsonObject } from "@/lib/security";

const STORAGE_KEY = "kelokra_saas_state_v2";
const SESSION_STORAGE_KEY = "kelokra_auth_session_v1";
const TENANT_STORE_PREFIX = "kelokra_tenant_store_v1_";

function resolveTenantId(
  session: AuthSession | null,
  allAccounts: ManagedAccount[]
): string {
  if (!session) return DEFAULT_TENANT_ID;
  if (session.role === "SUPER_ADMIN") return "SUPER_ADMIN_GLOBAL";
  if (session.role === "OWNER") {
    return session.accountId || DEFAULT_TENANT_ID;
  }
  const matchedCashier = allAccounts.find((a) => a.id === session.accountId);
  if (matchedCashier?.parentOwnerId) return matchedCashier.parentOwnerId;
  if (matchedCashier?.storeName) {
    const ownersSameStore = allAccounts.filter(
      (a) =>
        a.role === "OWNER" &&
        a.storeName.toLowerCase() === matchedCashier.storeName.toLowerCase()
    );
    // Only fall back to storeName match if unique; otherwise keep isolated by cashier ID
    if (ownersSameStore.length === 1) return ownersSameStore[0].id;
  }
  return session.accountId || DEFAULT_TENANT_ID;
}

export default function KelokraApp() {
  // Authentication & Session state
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  // Navigation & UI state
  const [activeMenu, setActiveMenu] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Command Search state
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Online / Offline PWA Simulation & Sync Queue
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState("-");
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Tenant Scope (Multi-tenant isolation per Owner/Store)
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const loadedTenantRef = useRef<string | null>(null);

  // Core Business Domain States (Initialized Empty per Tenant)
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
  const [accounts, setAccounts] = useState<ManagedAccount[]>(
    INITIAL_MANAGED_ACCOUNTS
  );
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(
    INITIAL_STORE_SETTINGS
  );
  const [auditLogs, setAuditLogs] =
    useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [feedbacks, setFeedbacks] = useState<DeveloperFeedback[]>([]);
  const [adminWhatsapp, setAdminWhatsapp] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const filterForTenant = <T extends { tenantId?: string }>(
    list: unknown,
    tenantId: string
  ): T[] => {
    if (!Array.isArray(list)) return [];
    return (list as T[])
      .filter(
        (item) =>
          !item.tenantId ||
          item.tenantId === DEFAULT_TENANT_ID ||
          item.tenantId === tenantId
      )
      .map((item) => ({ ...item, tenantId }));
  };

  const loadAndApplyTenantStore = (
    tenantId: string,
    storeNameHint?: string,
    legacyFallback?: Record<string, unknown> | null
  ) => {
    loadedTenantRef.current = tenantId;
    setActiveTenantId(tenantId);

    if (tenantId === "SUPER_ADMIN_GLOBAL") {
      setProducts(INITIAL_PRODUCTS);
      setSales(INITIAL_SALES);
      setMovements(INITIAL_STOCK_MOVEMENTS);
      setSuppliers(INITIAL_SUPPLIERS);
      setPurchases(INITIAL_PURCHASES);
      setReturns(INITIAL_RETURNS);
      setCustomers(INITIAL_CUSTOMERS);
      setExpenses(INITIAL_EXPENSES);
      setShifts(INITIAL_SHIFTS);
      setStoreSettings(INITIAL_STORE_SETTINGS);
      return;
    }

    try {
      const tenantRaw = localStorage.getItem(`${TENANT_STORE_PREFIX}${tenantId}`);
      if (tenantRaw) {
        const parsed = JSON.parse(tenantRaw);
        setProducts(filterForTenant<Product>(parsed.products, tenantId));
        setSales(filterForTenant<SaleTransaction>(parsed.sales, tenantId));
        setMovements(filterForTenant<StockMovement>(parsed.movements, tenantId));
        setSuppliers(Array.isArray(parsed.suppliers) ? parsed.suppliers : []);
        setPurchases(Array.isArray(parsed.purchases) ? parsed.purchases : []);
        setReturns(Array.isArray(parsed.returns) ? parsed.returns : []);
        setCustomers(Array.isArray(parsed.customers) ? parsed.customers : []);
        setExpenses(Array.isArray(parsed.expenses) ? parsed.expenses : []);
        setShifts(Array.isArray(parsed.shifts) ? parsed.shifts : []);
        setStoreSettings({
          ...INITIAL_STORE_SETTINGS,
          ...(parsed.storeSettings || {}),
          storeName:
            parsed.storeSettings?.storeName ||
            storeNameHint ||
            INITIAL_STORE_SETTINGS.storeName,
        });
        return;
      }

      if (legacyFallback) {
        const lf = legacyFallback as Record<string, unknown>;
        setProducts(filterForTenant<Product>(lf.products, tenantId));
        setSales(filterForTenant<SaleTransaction>(lf.sales, tenantId));
        setMovements(filterForTenant<StockMovement>(lf.movements, tenantId));
        setSuppliers(Array.isArray(lf.suppliers) ? lf.suppliers : []);
        setPurchases(Array.isArray(lf.purchases) ? lf.purchases : []);
        setReturns(Array.isArray(lf.returns) ? lf.returns : []);
        setCustomers(Array.isArray(lf.customers) ? lf.customers : []);
        setExpenses(Array.isArray(lf.expenses) ? lf.expenses : []);
        setShifts(Array.isArray(lf.shifts) ? lf.shifts : []);
        setStoreSettings({
          ...INITIAL_STORE_SETTINGS,
          ...((lf.storeSettings as Partial<StoreSettings>) || {}),
          storeName:
            (lf.storeSettings as Partial<StoreSettings>)?.storeName ||
            storeNameHint ||
            INITIAL_STORE_SETTINGS.storeName,
        });
        return;
      }
    } catch {
      // Fall through to clean tenant defaults
    }

    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setMovements(INITIAL_STOCK_MOVEMENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setPurchases(INITIAL_PURCHASES);
    setReturns(INITIAL_RETURNS);
    setCustomers(INITIAL_CUSTOMERS);
    setExpenses(INITIAL_EXPENSES);
    setShifts(INITIAL_SHIFTS);
    setStoreSettings({
      ...INITIAL_STORE_SETTINGS,
      storeName: storeNameHint || INITIAL_STORE_SETTINGS.storeName,
    });
  };

  // Load persisted accounts, migrate legacy plaintext passwords, and restore tenant state
  useEffect(() => {
    let isCancelled = false;

    const initApp = async () => {
      let loadedAccounts: ManagedAccount[] = INITIAL_MANAGED_ACCOUNTS;
      let loadedAuditLogs: AuditLogEntry[] = INITIAL_AUDIT_LOGS;
      let loadedFeedbacks: DeveloperFeedback[] = [];
      let loadedAdminWa = "";
      let legacyOperational: Record<string, unknown> | null = null;

      try {
        localStorage.removeItem("nextpos_saas_state_v1_1");
        localStorage.removeItem("kelokra_saas_state_v1");

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.accounts)) {
            let migratedAny = false;
            const migratedList: ManagedAccount[] = [];
            for (const acc of parsed.accounts as ManagedAccount[]) {
              if (acc.password && (!acc.passwordHash || !acc.passwordSalt)) {
                const { passwordHash, passwordSalt } = await hashPasswordWithSalt(
                  acc.password
                );
                const { password: _legacy, ...cleanAcc } = acc;
                void _legacy;
                migratedList.push({
                  ...cleanAcc,
                  passwordHash,
                  passwordSalt,
                });
                migratedAny = true;
              } else if (acc.password) {
                const { password: _legacy, ...cleanAcc } = acc;
                void _legacy;
                migratedList.push(cleanAcc);
                migratedAny = true;
              } else {
                migratedList.push(acc);
              }
            }
            loadedAccounts = migratedList;
            if (migratedAny) {
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                  accounts: migratedList,
                  auditLogs: Array.isArray(parsed.auditLogs)
                    ? parsed.auditLogs
                    : [],
                })
              );
            }
          }
          if (Array.isArray(parsed.auditLogs)) {
            loadedAuditLogs = parsed.auditLogs;
          }
          if (Array.isArray(parsed.feedbacks)) {
            loadedFeedbacks = parsed.feedbacks;
          }
          if (typeof parsed.adminWhatsapp === "string") {
            loadedAdminWa = parsed.adminWhatsapp;
          }
          if (
            (Array.isArray(parsed.products) && parsed.products.length > 0) ||
            (Array.isArray(parsed.sales) && parsed.sales.length > 0) ||
            (Array.isArray(parsed.customers) && parsed.customers.length > 0)
          ) {
            const owners = loadedAccounts.filter((a) => a.role === "OWNER");
            if (
              owners.length === 1 &&
              !localStorage.getItem(`${TENANT_STORE_PREFIX}${owners[0].id}`)
            ) {
              legacyOperational = parsed;
              localStorage.setItem(
                `${TENANT_STORE_PREFIX}${owners[0].id}`,
                JSON.stringify({
                  products: filterForTenant(parsed.products, owners[0].id),
                  sales: filterForTenant(parsed.sales, owners[0].id),
                  movements: filterForTenant(parsed.movements, owners[0].id),
                  suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
                  purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
                  returns: Array.isArray(parsed.returns) ? parsed.returns : [],
                  customers: Array.isArray(parsed.customers) ? parsed.customers : [],
                  expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
                  shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
                  storeSettings: parsed.storeSettings || INITIAL_STORE_SETTINGS,
                })
              );
            }
            // Strip legacy operational payload from global key immediately so stores remain isolated
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                accounts: loadedAccounts,
                auditLogs: loadedAuditLogs,
                feedbacks: loadedFeedbacks,
                adminWhatsapp: loadedAdminWa,
              })
            );
          }
        }

        if (isCancelled) return;
        setAccounts(loadedAccounts);
        setAuditLogs(loadedAuditLogs);
        setFeedbacks(loadedFeedbacks);
        setAdminWhatsapp(loadedAdminWa);

        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
          const parsedSession = JSON.parse(savedSession) as AuthSession;
          if (parsedSession.role === "SUPER_ADMIN") {
            loadAndApplyTenantStore("SUPER_ADMIN_GLOBAL");
            setAuthSession(parsedSession);
            setActiveMenu("dashboard");
          } else if (parsedSession.accountId) {
            const matchedAcc = loadedAccounts.find(
              (a) => a.id === parsedSession.accountId
            );
            if (
              matchedAcc &&
              matchedAcc.status === "AKTIF" &&
              !getRemainingTimeInfo(matchedAcc.expiresAt).isExpired
            ) {
              const tid = resolveTenantId(parsedSession, loadedAccounts);
              loadAndApplyTenantStore(
                tid,
                parsedSession.storeName,
                legacyOperational
              );
              setAuthSession(parsedSession);
              setActiveMenu(
                parsedSession.role === "CASHIER" ? "pos" : "dashboard"
              );
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
              setLoginNotice(
                "Sesi Anda telah berakhir karena masa aktif akun habis atau dinonaktifkan oleh Super Admin."
              );
            }
          }
        }
      } catch {
        // Ignore storage error
      } finally {
        if (!isCancelled) {
          setIsAuthChecking(false);
        }
      }
    };

    initApp();

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
    return () => {
      isCancelled = true;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Save global accounts, audit logs, feedbacks, and admin WA number
  useEffect(() => {
    if (isAuthChecking) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accounts,
          auditLogs,
          feedbacks,
          adminWhatsapp,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [isAuthChecking, accounts, auditLogs, feedbacks, adminWhatsapp]);

  // Save isolated operational data per Owner store
  useEffect(() => {
    if (
      isAuthChecking ||
      !activeTenantId ||
      activeTenantId === "SUPER_ADMIN_GLOBAL" ||
      loadedTenantRef.current !== activeTenantId
    ) {
      return;
    }
    try {
      localStorage.setItem(
        `${TENANT_STORE_PREFIX}${activeTenantId}`,
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
          storeSettings,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [
    isAuthChecking,
    activeTenantId,
    products,
    sales,
    movements,
    suppliers,
    purchases,
    returns,
    customers,
    expenses,
    shifts,
    storeSettings,
  ]);

  const currentRole = authSession?.role || "OWNER";
  const currentUserName = authSession?.name || "Pengguna";

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

  // Login Success Handler
  const handleLoginSuccess = (session: AuthSession) => {
    const tid = resolveTenantId(session, accounts);
    loadAndApplyTenantStore(tid, session.storeName);
    setAuthSession(session);
    setLoginNotice(null);
    setShowProfileMenu(false);

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage error
    }

    if (session.accountId) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === session.accountId
            ? {
                ...a,
                lastLogin: `${new Date().toLocaleDateString(
                  "id-ID"
                )} ${formatShortTime()}`,
              }
            : a
        )
      );
    }

    setAuditLogs((prev) => [
      {
        id: generateId("aud"),
        timestamp: `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`,
        actor: session.name,
        role:
          session.role === "OWNER"
            ? "Owner"
            : session.role === "CASHIER"
            ? "Kasir"
            : "Super Admin",
        action: "USER_LOGIN",
        module: "Auth",
        details: `Login berhasil ke akun @${session.username} (${session.role}).`,
      },
      ...prev,
    ]);

    if (session.role === "SUPER_ADMIN") {
      setActiveMenu("dashboard");
    } else if (session.role === "CASHIER") {
      setActiveMenu("pos");
    } else {
      setActiveMenu("dashboard");
    }

    showToast(`Selamat datang, ${session.name}!`);
  };

  // Logout Handler — Instant UI reset + non-blocking server cookie clear
  const handleLogout = () => {
    const logoutActor = authSession;

    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }

    loadedTenantRef.current = null;
    setActiveTenantId(null);
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setMovements(INITIAL_STOCK_MOVEMENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setPurchases(INITIAL_PURCHASES);
    setReturns(INITIAL_RETURNS);
    setCustomers(INITIAL_CUSTOMERS);
    setExpenses(INITIAL_EXPENSES);
    setShifts(INITIAL_SHIFTS);
    setStoreSettings(INITIAL_STORE_SETTINGS);
    setShowProfileMenu(false);
    setMobileMenuOpen(false);
    setAuthSession(null);
    setLoginNotice("Anda telah berhasil logout dari sistem.");

    if (logoutActor) {
      setAuditLogs((prev) => [
        {
          id: generateId("aud"),
          timestamp: `${new Date().toLocaleDateString("id-ID")} ${formatShortTime()}`,
          actor: logoutActor.name,
          role:
            logoutActor.role === "OWNER"
              ? "Owner"
              : logoutActor.role === "CASHIER"
              ? "Kasir"
              : "Super Admin",
          action: "USER_LOGOUT",
          module: "Auth",
          details: `Akun @${logoutActor.username} (${logoutActor.role}) keluar dari sistem.`,
        },
        ...prev,
      ]);
    }

    // Clear HttpOnly session cookie in background without freezing the button
    fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(
      () => {}
    );
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
        tenantId: activeTenantId || DEFAULT_TENANT_ID,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        type: "OUT",
        quantity: -item.quantity,
        balanceAfter,
        reference: sale.invoiceNumber,
        reason: `Penjualan POS (${sale.paymentDetail || sale.paymentMethod})`,
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
      )} (${sale.paymentDetail || sale.paymentMethod}) selesai.`
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
          tenantId: activeTenantId || DEFAULT_TENANT_ID,
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
    const resolvedTid = activeTenantId || DEFAULT_TENANT_ID;
    const scopedProduct: Product = {
      ...product,
      tenantId: resolvedTid,
    };
    if (isNew) {
      setProducts((prev) => [scopedProduct, ...prev]);
      setMovements((prev) => [
        {
          id: generateId("mov"),
          tenantId: resolvedTid,
          productId: scopedProduct.id,
          productName: scopedProduct.name,
          sku: scopedProduct.sku,
          type: "IN",
          quantity: scopedProduct.stock,
          balanceAfter: scopedProduct.stock,
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
        `Menambahkan produk baru ${scopedProduct.name} (${scopedProduct.sku}) dengan stok awal ${scopedProduct.stock}.`
      );
      showToast(`Produk "${scopedProduct.name}" berhasil ditambahkan!`);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === scopedProduct.id ? scopedProduct : p))
      );
      appendAudit(
        "PRODUCT_UPDATED",
        "Produk",
        `Memperbarui informasi produk ${scopedProduct.name} (${scopedProduct.sku}).`
      );
      showToast(`Produk "${scopedProduct.name}" berhasil diperbarui!`);
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
        tenantId: activeTenantId || DEFAULT_TENANT_ID,
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
        tenantId: activeTenantId || DEFAULT_TENANT_ID,
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
            tenantId: activeTenantId || DEFAULT_TENANT_ID,
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
            tenantId: activeTenantId || DEFAULT_TENANT_ID,
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

  // Loading state while checking localStorage auth session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-slate-200/80">
          <img
            src="/kelokra-logo.png"
            alt="KELOKRA Logo"
            className="h-9 w-auto object-contain"
          />
        </div>
        <p className="text-xs font-bold text-slate-500 animate-pulse">
          Memeriksa sesi login KELOKRA...
        </p>
      </div>
    );
  }

  // Gate: Show LoginScreen if user is not authenticated
  if (!authSession) {
    return (
      <LoginScreen
        accounts={accounts}
        defaultStoreName={storeSettings.storeName}
        externalNotice={loginNotice}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const activeAccount = authSession.accountId
    ? accounts.find((a) => a.id === authSession.accountId) || null
    : null;
  const activeAccountTime = activeAccount
    ? getRemainingTimeInfo(activeAccount.expiresAt)
    : null;

  const activeOwnerMode =
    activeAccount?.ownerMode || authSession.ownerMode || "OWNER_PLUS_KASIR";
  const canUsePos =
    currentRole === "CASHIER" ||
    (currentRole === "OWNER" && activeOwnerMode === "OWNER_INCLUDE_KASIR");

  const currentTenantId = activeTenantId || DEFAULT_TENANT_ID;
  const scopedProducts = products.filter(
    (p) => !p.tenantId || p.tenantId === currentTenantId
  );
  const scopedSales = sales.filter(
    (s) => !s.tenantId || s.tenantId === currentTenantId
  );
  const scopedMovements = movements.filter(
    (m) => !m.tenantId || m.tenantId === currentTenantId
  );

  // Owner 1-week expiry warning (<= 7 hari lagi)
  const ownerExpiringWithinWeek =
    currentRole === "OWNER" &&
    activeAccountTime !== null &&
    !activeAccountTime.isExpired &&
    activeAccountTime.totalDaysLeft <= 7;

  // Reusable Account & Backup handlers (credential-free export + validated restore)
  const handleExportBackup = () => {
    const tenantId = activeTenantId || DEFAULT_TENANT_ID;
    const safeStoreAccountsMeta = accounts
      .filter(
        (a) =>
          currentRole === "SUPER_ADMIN" ||
          a.id === tenantId ||
          a.parentOwnerId === tenantId
      )
      .map(
        ({
          passwordHash: _h,
          passwordSalt: _s,
          password: _p,
          ...safeMeta
        }) => {
          void _h;
          void _s;
          void _p;
          return safeMeta;
        }
      );

    const payload = {
      schemaVersion: "kelokra-backup-v2",
      exportedAt: new Date().toISOString(),
      tenantId,
      storeSettings,
      products,
      sales,
      movements,
      suppliers,
      purchases,
      returns,
      customers,
      expenses,
      shifts,
      accountsMeta: safeStoreAccountsMeta,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KELOKRA-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup data penjualan & toko (.JSON) berhasil diunduh!");
  };

  const handleImportBackup = (
    jsonText: string
  ): { ok: boolean; message: string } => {
    try {
      const parsedRaw = JSON.parse(jsonText);
      const parsed = sanitizeJsonObject(parsedRaw) as Record<string, unknown>;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed.products) ||
        !Array.isArray(parsed.sales)
      ) {
        return {
          ok: false,
          message:
            "File backup tidak valid: struktur products atau sales tidak ditemukan.",
        };
      }

      const restoreTid = activeTenantId || DEFAULT_TENANT_ID;
      setProducts(
        (parsed.products as Product[]).map((p) => ({
          ...p,
          tenantId: restoreTid,
        }))
      );
      setSales(
        (parsed.sales as SaleTransaction[]).map((s) => ({
          ...s,
          tenantId: restoreTid,
        }))
      );
      if (Array.isArray(parsed.movements)) {
        setMovements(
          (parsed.movements as StockMovement[]).map((m) => ({
            ...m,
            tenantId: restoreTid,
          }))
        );
      }
      if (Array.isArray(parsed.suppliers)) {
        setSuppliers(parsed.suppliers as Supplier[]);
      }
      if (Array.isArray(parsed.purchases)) {
        setPurchases(parsed.purchases as PurchaseOrder[]);
      }
      if (Array.isArray(parsed.returns)) {
        setReturns(parsed.returns as ReturnRecord[]);
      }
      if (Array.isArray(parsed.customers)) {
        setCustomers(parsed.customers as Customer[]);
      }
      if (Array.isArray(parsed.expenses)) {
        setExpenses(parsed.expenses as ExpenseRecord[]);
      }
      if (Array.isArray(parsed.shifts)) {
        setShifts(parsed.shifts as CashShiftRecord[]);
      }
      if (parsed.storeSettings && typeof parsed.storeSettings === "object") {
        const incomingSettings = parsed.storeSettings as Partial<StoreSettings>;
        const safeQrisUrl =
          typeof incomingSettings.qrisImageDataUrl === "string" &&
          /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(
            incomingSettings.qrisImageDataUrl
          )
            ? incomingSettings.qrisImageDataUrl
            : "";
        setStoreSettings({
          ...INITIAL_STORE_SETTINGS,
          ...incomingSettings,
          qrisImageDataUrl: safeQrisUrl,
        });
      }

      appendAudit(
        "BACKUP_RESTORED",
        "Backup",
        `Memulihkan ${parsed.products.length} produk dan ${parsed.sales.length} transaksi dari file backup JSON.`
      );
      showToast("Data backup toko berhasil dipulihkan!");
      return {
        ok: true,
        message: `Berhasil memulihkan ${parsed.products.length} produk & ${parsed.sales.length} transaksi.`,
      };
    } catch {
      return {
        ok: false,
        message: "Gagal membaca file backup: format JSON rusak atau tidak sesuai.",
      };
    }
  };

  const handleCreateAccountsBatch = (newAccounts: ManagedAccount[]) => {
    setAccounts((prev) => [...newAccounts, ...prev]);
    const summaryNames = newAccounts
      .map((a) => `${a.role === "OWNER" ? "Owner" : "Kasir"} (${a.name})`)
      .join(" + ");
    appendAudit(
      "ACCOUNTS_CREATED",
      "Super Admin",
      `Super Admin membuat akun: ${summaryNames} dengan durasi ${newAccounts[0]?.durationMonths} bulan.`
    );
    showToast(`Berhasil membuat akun: ${summaryNames}!`);
  };

  const handleExtendAccount = (accountId: string, addMonths: number) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a;
        const base =
          new Date(a.expiresAt).getTime() > Date.now()
            ? a.expiresAt
            : new Date().toISOString();
        return {
          ...a,
          durationMonths: a.durationMonths + addMonths,
          expiresAt: addMonthsToIso(base, addMonths),
          status: "AKTIF",
        };
      })
    );
    appendAudit(
      "ACCOUNT_EXTENDED",
      "Super Admin",
      `Super Admin memperpanjang masa aktif akun selama +${addMonths} bulan.`
    );
    showToast(`Masa aktif akun diperpanjang +${addMonths} bulan!`);
  };

  const handleToggleAccountStatus = (accountId: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? {
              ...a,
              status: a.status === "AKTIF" ? "NONAKTIF" : "AKTIF",
            }
          : a
      )
    );
    showToast("Status aktif akun diperbarui!");
  };

  const handleResetAccountPassword = (
    accountId: string,
    passwordHash: string,
    passwordSalt: string,
    updatedEmail?: string
  ) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    const isOwnOwnerAccount =
      currentRole === "OWNER" &&
      target.role === "OWNER" &&
      target.id === authSession?.accountId;

    const isOwnStoreCashier =
      currentRole === "OWNER" &&
      target.role === "CASHIER" &&
      (target.parentOwnerId === activeTenantId ||
        (!target.parentOwnerId &&
          activeAccount?.storeName &&
          target.storeName.toLowerCase() ===
            activeAccount.storeName.toLowerCase()));

    // Strict RBAC & multi-tenant ownership check
    const isAllowed =
      currentRole === "SUPER_ADMIN" || isOwnOwnerAccount || isOwnStoreCashier;

    if (!isAllowed) {
      showToast("Akses ditolak: Anda tidak memiliki izin mengubah kata sandi akun ini.");
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a;
        const { password: _legacy, ...clean } = a;
        void _legacy;
        return {
          ...clean,
          passwordHash,
          passwordSalt,
          ...(updatedEmail ? { email: updatedEmail } : {}),
        };
      })
    );
    appendAudit(
      "ACCOUNT_PASSWORD_RESET",
      currentRole === "OWNER" ? "Daftar Akun" : "Super Admin",
      `Kata sandi akun @${target.username} (${target.role === "CASHIER" ? "Kasir" : "Owner"}) berhasil diubah${isOwnOwnerAccount ? " via OTP Gmail" : ""}.`
    );
    showToast(`Kata sandi @${target.username} berhasil diperbarui!`);
  };

  const handleDeleteAccount = (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    if (target.role === "OWNER") {
      setAccounts((prev) =>
        prev.filter(
          (a) =>
            a.id !== accountId &&
            !(
              a.role === "CASHIER" &&
              (a.parentOwnerId === accountId ||
                (!a.parentOwnerId &&
                  a.storeName.toLowerCase() === target.storeName.toLowerCase()))
            )
        )
      );
      try {
        localStorage.removeItem(`${TENANT_STORE_PREFIX}${accountId}`);
      } catch {
        // Ignore storage error
      }
      appendAudit(
        "OWNER_CASCADE_DELETED",
        "Super Admin",
        `Super Admin menghapus Owner @${target.username} (${target.storeName}) beserta seluruh akun kasir dan data tokonya.`
      );
      showToast(
        `Akun Owner "${target.storeName}" & seluruh kasirnya berhasil dihapus.`
      );
    } else {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      appendAudit(
        "CASHIER_DELETED",
        "Super Admin",
        `Super Admin menghapus akun Kasir @${target.username}.`
      );
      showToast(`Akun Kasir @${target.username} berhasil dihapus.`);
    }
  };

  const handleEditAccount = (
    accountId: string,
    updates: {
      name: string;
      username: string;
      storeName: string;
      email: string;
    }
  ) => {
    if (currentRole !== "SUPER_ADMIN") return;
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === accountId) {
          return {
            ...a,
            name: updates.name,
            username: updates.username,
            storeName: updates.storeName,
            email: updates.email,
          };
        }
        // Keep child cashiers' storeName synchronized when Owner storeName changes
        if (
          target.role === "OWNER" &&
          a.role === "CASHIER" &&
          a.parentOwnerId === accountId
        ) {
          return {
            ...a,
            storeName: updates.storeName,
          };
        }
        return a;
      })
    );

    appendAudit(
      "ACCOUNT_UPDATED",
      "Super Admin",
      `Super Admin memperbarui profil @${updates.username} (${updates.storeName}).`
    );
    showToast(`Data akun @${updates.username} berhasil diperbarui!`);
  };

  const handleAddFeedback = (fb: DeveloperFeedback) => {
    setFeedbacks((prev) => [fb, ...prev]);
    appendAudit(
      "FEEDBACK_SUBMITTED",
      "Saran Pengembang",
      `${fb.storeName} (${fb.ownerName}) mengirim saran: "${fb.title}".`
    );
    showToast("Saran pengembang berhasil dikirim ke Super Admin!");
  };

  const handleMarkFeedbackRead = (feedbackId: string) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === feedbackId ? { ...f, isRead: true } : f))
    );
    showToast("Saran ditandai sudah dibaca.");
  };

  const handleDeleteFeedback = (feedbackId: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
    showToast("Saran pengembang dihapus.");
  };

  const handleUpdateAdminWhatsapp = (rawWa: string) => {
    let digits = rawWa.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = `62${digits.slice(1)}`;
    }
    setAdminWhatsapp(digits);
    showToast(
      digits
        ? `Nomor WhatsApp Admin disimpan: +${digits}`
        : "Nomor WhatsApp Admin dikosongkan."
    );
  };

  const buildWaRenewalUrl = () => {
    let digits = adminWhatsapp.replace(/\D/g, "");
    if (digits.startsWith("0")) {
      digits = `62${digits.slice(1)}`;
    }
    const storeLabel = activeAccount?.storeName || storeSettings.storeName;
    const expiryLabel = activeAccount
      ? formatDateOnly(activeAccount.expiresAt)
      : "-";
    const remainingLabel = activeAccountTime?.label || "kurang dari 7 hari";
    const text = `Halo Super Admin KELOKRA, saya Owner toko "${storeLabel}" (@${authSession.username}). Masa aktif akun saya ${remainingLabel} (berakhir ${expiryLabel}). Mohon bantu perpanjangan langganan.`;
    return digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Strict RBAC Navigation Items
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["OWNER", "CASHIER", "SUPER_ADMIN"],
    },
    ...(canUsePos
      ? [
          {
            id: "pos",
            label: "POS",
            icon: ShoppingCart,
            roles: ["OWNER", "CASHIER"],
          },
        ]
      : []),
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
      id: "payment-methods",
      label: "Metode Pembayaran",
      icon: CreditCard,
      roles: ["OWNER"],
    },
    {
      id: "employees",
      label: "Daftar Akun",
      icon: UserCog,
      roles: ["OWNER"],
    },
    {
      id: "feedback",
      label: "Saran Pengembang",
      icon: MessageSquarePlus,
      roles: ["OWNER"],
    },
    {
      id: "super-admin",
      label: "Super Admin",
      icon: ShieldCheck,
      roles: ["SUPER_ADMIN"],
    },
    {
      id: "feedback-admin",
      label: "Saran Client",
      icon: MessageSquarePlus,
      roles: ["SUPER_ADMIN"],
    },
  ].filter((item) => item.roles.includes(currentRole));

  const lowStockCount =
    currentRole === "SUPER_ADMIN"
      ? 0
      : products.filter((p) => p.stock <= p.minStock).length;
  const expiringAccountsCount =
    currentRole === "SUPER_ADMIN"
      ? accounts.filter((a) => {
          const t = getRemainingTimeInfo(a.expiresAt);
          return !t.isExpired && t.isExpiringSoon;
        }).length
      : 0;

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

          {/* Masa Aktif Akun Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/90 to-navy-900 border border-emerald-500/30 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-extrabold">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {activeAccount ? "Masa Aktif Akun" : "Super Admin Platform"}
              </span>
            </div>
            {activeAccount && activeAccountTime ? (
              <>
                <p className="text-xs font-extrabold text-white">
                  {activeAccountTime.label}
                </p>
                <p className="text-[10px] text-slate-300">
                  Berakhir: {formatDateOnly(activeAccount.expiresAt)}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-slate-300">
                {accounts.length} akun Owner & Kasir aktif dikelola
              </p>
            )}
          </div>

          <div className="space-y-1 pt-1">
            {currentRole !== "CASHIER" && (
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
            )}
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
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-500/20 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar (Logout)</span>
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

            <div className="relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                aria-label="Notifikasi"
                className="p-2 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 relative"
              >
                <Bell className="w-4 h-4" />
                {(lowStockCount > 0 ||
                  expiringAccountsCount > 0 ||
                  ownerExpiringWithinWeek) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 z-50 space-y-2.5 text-xs">
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

                  {ownerExpiringWithinWeek && activeAccountTime && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                      <p className="font-extrabold text-rose-700">
                        ⚠️ Masa Aktif {activeAccountTime.label}!
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Silakan lanjutkan langganan ke Super Admin atau{" "}
                        <b>backup data penjualan Anda segera</b> sebelum akun
                        berakhir.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          handleExportBackup();
                          setShowNotifications(false);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] inline-flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Backup Data Penjualan Sekarang</span>
                      </button>
                    </div>
                  )}

                  {currentRole === "SUPER_ADMIN" ? (
                    expiringAccountsCount > 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900">
                        <b>Masa Aktif Segera Habis:</b> {expiringAccountsCount}{" "}
                        akun tersisa ≤ 7 hari lagi.
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600">
                        Semua akun Owner & Kasir dalam kondisi aman.
                      </div>
                    )
                  ) : lowStockCount > 0 ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900">
                      <b>Stok Menipis:</b> {lowStockCount} produk berada di
                      bawah batas stok minimum.
                    </div>
                  ) : !ownerExpiringWithinWeek ? (
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600">
                      Belum ada peringatan baru. Sistem siap digunakan.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Profile Dropdown with Logout */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
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

              {showProfileMenu && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-2.5 text-xs">
                  <div className="pb-2 border-b border-slate-100">
                    <p className="font-extrabold text-navy-800 text-sm">
                      {authSession.name}
                    </p>
                    <p className="text-slate-500 font-mono text-[11px]">
                      @{authSession.username} •{" "}
                      {currentRole === "OWNER"
                        ? "Owner"
                        : currentRole === "CASHIER"
                        ? "Kasir"
                        : "Super Admin"}
                    </p>
                    {activeAccountTime && (
                      <p className="text-emerald-600 font-bold text-[11px] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{activeAccountTime.label}</span>
                      </p>
                    )}
                  </div>

                  {currentRole !== "CASHIER" && (
                    <button
                      onClick={() => {
                        setActiveMenu("settings");
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 font-bold text-navy-800 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Pengaturan Akun & Toko</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 font-extrabold text-rose-600 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Direct Logout Button on Header */}
            <button
              onClick={handleLogout}
              title="Keluar / Logout"
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* ACTIVE VIEW CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-5">
          {/* Peringatan Otomatis 1 Minggu Sebelum Habis untuk Owner */}
          {ownerExpiringWithinWeek && activeAccountTime && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50/70 to-amber-50 border border-rose-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-rose-800">
                    Peringatan Masa Aktif Akun: {activeAccountTime.label} (s/d{" "}
                    {activeAccount ? formatDateOnly(activeAccount.expiresAt) : "-"})
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Lanjutkan langganan Anda dengan menghubungi Super Admin atau{" "}
                    <b>backup data penjualan Anda segera</b> sebelum masa aktif berakhir.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={buildWaRenewalUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs inline-flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Perpanjang via WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xs inline-flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Backup Data Penjualan Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMenu("reports")}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-rose-200 text-rose-700 text-xs font-bold transition"
                >
                  Lihat Laporan
                </button>
              </div>
            </div>
          )}

          {activeMenu === "dashboard" &&
            (currentRole === "SUPER_ADMIN" ? (
              <SuperAdminDashboardView
                userName={currentUserName}
                accounts={accounts}
                feedbacks={feedbacks}
                onNavigate={setActiveMenu}
                onCreateAccountsBatch={handleCreateAccountsBatch}
                onExtendAccount={handleExtendAccount}
                onToggleAccountStatus={handleToggleAccountStatus}
                onDeleteAccount={handleDeleteAccount}
                onResetAccountPassword={handleResetAccountPassword}
                onEditAccount={handleEditAccount}
                onMarkFeedbackRead={handleMarkFeedbackRead}
                onDeleteFeedback={handleDeleteFeedback}
              />
            ) : (
              <DashboardView
                key={`dash-${currentTenantId}`}
                userName={currentUserName}
                userRole={currentRole}
                products={scopedProducts}
                sales={scopedSales}
                canUsePos={canUsePos}
                onNavigate={setActiveMenu}
              />
            ))}

          {activeMenu === "pos" && canUsePos && (
            <PosView
              key={`pos-${currentTenantId}`}
              tenantId={currentTenantId}
              products={scopedProducts}
              customers={customers}
              storeSettings={storeSettings}
              isOnline={isOnline}
              cashierName={currentUserName}
              onCompleteSale={handleCompleteSale}
              onNavigate={setActiveMenu}
            />
          )}

          {currentRole !== "SUPER_ADMIN" &&
            (activeMenu === "products" ||
              activeMenu === "inventory" ||
              activeMenu === "purchases") && (
              <ProductsInventoryView
                key={`prod-${currentTenantId}`}
                mode={activeMenu}
                tenantId={currentTenantId}
                products={scopedProducts}
                movements={scopedMovements}
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

          {currentRole !== "SUPER_ADMIN" &&
            (activeMenu === "reports" ||
              activeMenu === "finance" ||
              activeMenu === "customers") && (
              <ReportsFinanceView
                key={`rep-${currentTenantId}`}
                mode={activeMenu}
                sales={scopedSales}
                products={scopedProducts}
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

          {((activeMenu === "employees" && currentRole === "OWNER") ||
            (activeMenu === "payment-methods" && currentRole === "OWNER") ||
            (activeMenu === "settings" && currentRole !== "CASHIER") ||
            activeMenu === "help" ||
            (activeMenu === "super-admin" && currentRole === "SUPER_ADMIN") ||
            (activeMenu === "feedback" && currentRole === "OWNER") ||
            (activeMenu === "feedback-admin" &&
              currentRole === "SUPER_ADMIN")) && (
            <SaasSettingsAdminView
              mode={activeMenu}
              userRole={currentRole}
              activeOwnerAccount={activeAccount}
              accounts={
                currentRole === "SUPER_ADMIN"
                  ? accounts
                  : accounts.filter(
                      (a) =>
                        a.id === activeTenantId ||
                        a.parentOwnerId === activeTenantId ||
                        (!a.parentOwnerId &&
                          activeAccount?.storeName &&
                          a.storeName.toLowerCase() ===
                            activeAccount.storeName.toLowerCase())
                    )
              }
              storeSettings={storeSettings}
              auditLogs={auditLogs}
              feedbacks={feedbacks}
              adminWhatsapp={adminWhatsapp}
              onUpdateAdminWhatsapp={handleUpdateAdminWhatsapp}
              onNavigate={setActiveMenu}
              onCreateAccountsBatch={handleCreateAccountsBatch}
              onExtendAccount={handleExtendAccount}
              onToggleAccountStatus={handleToggleAccountStatus}
              onDeleteAccount={handleDeleteAccount}
              onResetAccountPassword={handleResetAccountPassword}
              onEditAccount={handleEditAccount}
              onAddFeedback={handleAddFeedback}
              onMarkFeedbackRead={handleMarkFeedbackRead}
              onDeleteFeedback={handleDeleteFeedback}
              onUpdateSettings={(next) => {
                setStoreSettings(next);
                showToast("Pengaturan & metode pembayaran berhasil disimpan!");
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetAllData={() => {
                if (activeTenantId && activeTenantId !== "SUPER_ADMIN_GLOBAL") {
                  try {
                    localStorage.removeItem(
                      `${TENANT_STORE_PREFIX}${activeTenantId}`
                    );
                  } catch {
                    // Ignore storage error
                  }
                }
                setProducts([]);
                setSales([]);
                setMovements([]);
                setSuppliers([]);
                setPurchases([]);
                setReturns([]);
                setCustomers([]);
                setExpenses([]);
                setShifts([]);
                setStoreSettings({
                  ...INITIAL_STORE_SETTINGS,
                  storeName:
                    activeAccount?.storeName || INITIAL_STORE_SETTINGS.storeName,
                });
                appendAudit(
                  "STORE_DATA_RESET",
                  "Backup",
                  `Data operasional toko ${
                    activeAccount?.storeName || ""
                  } dikosongkan.`
                );
                showToast(
                  "Data operasional toko dikosongkan (akun login tetap aman)."
                );
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
    </div>
  );
}
