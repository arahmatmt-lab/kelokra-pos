"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Banknote,
  QrCode,
  Building2,
  CheckCircle2,
  Printer,
  Share2,
  UserCheck,
  Tag,
  WifiOff,
  History,
  PackagePlus,
  Copy,
  AlertCircle,
  X,
} from "lucide-react";
import {
  CartItem,
  Customer,
  HeldTransaction,
  PaymentMethod,
  Product,
  ProductCategory,
  SaleTransaction,
  StoreSettings,
} from "@/types/nextpos";
import { formatIDR, generateId } from "@/lib/format";
import { clampNonNegative, escapeHtml } from "@/lib/security";
import { ProductVisual } from "@/components/ProductVisual";

interface PosViewProps {
  tenantId?: string;
  products: Product[];
  customers: Customer[];
  storeSettings: StoreSettings;
  isOnline: boolean;
  cashierName: string;
  onCompleteSale: (sale: SaleTransaction) => void;
  onNavigate?: (menu: string) => void;
}

export function PosView({
  tenantId = "tenant-kelokra-001",
  products,
  customers,
  storeSettings,
  isOnline,
  cashierName,
  onCompleteSale,
  onNavigate,
}: PosViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedCustomer, setSelectedCustomer] =
    useState<string>("Pelanggan Umum");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);

  const activeTransferChannels = (storeSettings.transferChannels || []).filter(
    (c) => c.isActive
  );

  const availableMethods: {
    id: PaymentMethod;
    label: string;
    icon: typeof Banknote;
  }[] = [];
  if (storeSettings.cashEnabled) {
    availableMethods.push({ id: "Tunai", label: "Tunai", icon: Banknote });
  }
  if (storeSettings.qrisEnabled) {
    availableMethods.push({ id: "QRIS", label: "QRIS", icon: QrCode });
  }
  if (activeTransferChannels.length > 0) {
    availableMethods.push({
      id: "M-Banking / E-Wallet",
      label: "M-Banking / E-Wallet",
      icon: Building2,
    });
  }

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Tunai");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  // Keep paymentMethod and selectedChannelId in sync with Owner settings
  useEffect(() => {
    if (
      availableMethods.length > 0 &&
      !availableMethods.some((m) => m.id === paymentMethod)
    ) {
      setPaymentMethod(availableMethods[0].id);
    }
    if (
      activeTransferChannels.length > 0 &&
      !activeTransferChannels.some((c) => c.id === selectedChannelId)
    ) {
      setSelectedChannelId(activeTransferChannels[0].id);
    }
  }, [
    storeSettings.cashEnabled,
    storeSettings.qrisEnabled,
    activeTransferChannels.length,
    paymentMethod,
    selectedChannelId,
  ]);

  const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>(
    []
  );
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  // Checkout & Receipt Modal states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);
  const [completedReceipt, setCompletedReceipt] =
    useState<SaleTransaction | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const categories: ("Semua" | ProductCategory)[] = [
    "Semua",
    "Minuman",
    "Makanan",
    "Snack",
    "Lainnya",
  ];

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "Semua" || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q);
    return matchesCategory && matchesSearch && p.isActive;
  });

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.stock) return item;
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + item.product.sellingPrice * item.quantity - item.discount,
    0
  );
  const effectiveDiscount = Math.min(clampNonNegative(cartDiscount), subtotal);
  const afterDiscount = Math.max(0, subtotal - effectiveDiscount);
  const taxTotal = storeSettings.enableTax
    ? Math.round((afterDiscount * storeSettings.taxPercentage) / 100)
    : 0;
  const grandTotal = afterDiscount + taxTotal;

  const handleHoldTransaction = () => {
    if (cart.length === 0) return;
    const held: HeldTransaction = {
      id: generateId("HOLD"),
      createdAt: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      customerName: selectedCustomer,
      items: cart,
      discount: cartDiscount,
    };
    setHeldTransactions((prev) => [held, ...prev]);
    clearCart();
  };

  const handleRecallTransaction = (held: HeldTransaction) => {
    setCart(held.items);
    setCartDiscount(held.discount);
    setSelectedCustomer(held.customerName);
    setHeldTransactions((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeldModal(false);
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const found = products.find(
      (p) =>
        p.barcode === barcodeInput.trim() ||
        p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (found) {
      addToCart(found);
      setBarcodeInput("");
      setShowBarcodeModal(false);
    }
  };

  const openPaymentModal = () => {
    if (cart.length === 0 || availableMethods.length === 0) return;
    setCheckoutError(null);
    setCashReceivedInput(grandTotal);
    setShowCheckoutModal(true);
  };

  const selectedTransferChannel =
    activeTransferChannels.find((c) => c.id === selectedChannelId) ||
    activeTransferChannels[0];

  const finalizeCheckout = async () => {
    if (isProcessingPayment || cart.length === 0) return;
    setCheckoutError(null);

    // Re-check live inventory before finalizing payment to prevent overselling
    for (const item of cart) {
      const liveProd = products.find((p) => p.id === item.product.id);
      if (!liveProd || liveProd.stock < item.quantity) {
        setCheckoutError(
          `Stok "${item.product.name}" tidak mencukupi (tersisa ${
            liveProd ? liveProd.stock : 0
          }). Kurangi jumlah di keranjang.`
        );
        return;
      }
    }

    if (!isOnline && paymentMethod === "QRIS") {
      setCheckoutError(
        "Mode Offline Aktif: Pembayaran QRIS wajib terhubung ke internet untuk verifikasi gateway resmi. Gunakan metode Tunai atau aktifkan koneksi Online."
      );
      return;
    }

    if (
      paymentMethod === "Tunai" &&
      (!Number.isFinite(cashReceivedInput) || cashReceivedInput < grandTotal)
    ) {
      setCheckoutError(
        "Nominal uang tunai yang diterima kurang dari total tagihan."
      );
      return;
    }

    if (
      paymentMethod === "M-Banking / E-Wallet" &&
      !selectedTransferChannel
    ) {
      setCheckoutError(
        "Pilih rekening Bank atau akun E-Wallet tujuan terlebih dahulu."
      );
      return;
    }

    setIsProcessingPayment(true);
    const idempotencyKey = generateId("idem");
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const invoiceNum = `INV-${todayStr}-${String(
      Math.floor(100 + Math.random() * 899)
    )}`;

    const totalHpp = cart.reduce(
      (sum, item) => sum + item.product.purchasePrice * item.quantity,
      0
    );
    const netProfit = grandTotal - taxTotal - totalHpp;

    let paymentDetail = paymentMethod as string;
    if (paymentMethod === "QRIS" && storeSettings.qrisMerchantName) {
      paymentDetail = `QRIS (${storeSettings.qrisMerchantName})`;
    } else if (
      paymentMethod === "M-Banking / E-Wallet" &&
      selectedTransferChannel
    ) {
      paymentDetail = `${selectedTransferChannel.type} ${selectedTransferChannel.bankOrProviderName} (${selectedTransferChannel.accountNumber})`;
    }

    const newSale: SaleTransaction = {
      id: generateId("sale"),
      tenantId,
      invoiceNumber: invoiceNum,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      cashierName,
      customerName: selectedCustomer,
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        unitCost: item.product.purchasePrice,
        discount: item.discount,
        subtotal: item.product.sellingPrice * item.quantity - item.discount,
      })),
      subtotal,
      discountTotal: effectiveDiscount,
      taxTotal,
      grandTotal,
      totalHpp,
      netProfit,
      paymentMethod,
      paymentDetail,
      cashReceived: paymentMethod === "Tunai" ? cashReceivedInput : grandTotal,
      changeAmount:
        paymentMethod === "Tunai"
          ? Math.max(0, cashReceivedInput - grandTotal)
          : 0,
      status: "COMPLETED",
      synced: isOnline,
    };

    try {
      if (isOnline) {
        await fetch("/api/pos/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: newSale.tenantId,
            idempotencyKey: newSale.idempotencyKey,
            paymentMethod: newSale.paymentMethod,
            items: newSale.items,
            grandTotal: newSale.grandTotal,
            isOfflineMode: !isOnline,
          }),
        });
      }
    } catch {
      // Fallback if offline
    }

    setIsProcessingPayment(false);
    onCompleteSale(newSale);
    setCompletedReceipt(newSale);
    clearCart();
    setShowCheckoutModal(false);
  };

  const handlePrintThermalReceipt = (tx: SaleTransaction) => {
    const printWin = window.open("", "_blank", "width=380,height=640");
    if (!printWin) return;
    printWin.opener = null;
    const widthCss = storeSettings.printerPaperSize === "58mm" ? "58mm" : "80mm";
    const itemsHtml = tx.items
      .map(
        (item) => `
        <tr>
          <td colspan="2" style="padding-top:4px;font-weight:600;">${escapeHtml(item.productName)}</td>
        </tr>
        <tr>
          <td style="color:#475569;">${escapeHtml(item.quantity)} x ${escapeHtml(formatIDR(item.unitPrice))}</td>
          <td style="text-align:right;font-weight:600;">${escapeHtml(formatIDR(item.subtotal))}</td>
        </tr>`
      )
      .join("");

    printWin.document.write(`
      <html>
        <head>
          <title>Struk ${escapeHtml(tx.invoiceNumber)}</title>
          <style>
            body { font-family: 'Courier New', monospace; width: ${widthCss}; margin: 0 auto; padding: 12px; font-size: 12px; color: #0F2933; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #64748B; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3 style="margin:0;font-size:15px;">${escapeHtml(storeSettings.storeName)}</h3>
            <p style="margin:2px 0;font-size:11px;">${escapeHtml(storeSettings.address)}</p>
            <p style="margin:2px 0;font-size:11px;">Telp: ${escapeHtml(storeSettings.phone)}</p>
          </div>
          <div class="divider"></div>
          <p style="margin:2px 0;">No: <b>${escapeHtml(tx.invoiceNumber)}</b></p>
          <p style="margin:2px 0;">Kasir: ${escapeHtml(tx.cashierName)}</p>
          <p style="margin:2px 0;">Pelanggan: ${escapeHtml(tx.customerName)}</p>
          <p style="margin:2px 0;">Metode: ${escapeHtml(tx.paymentDetail || tx.paymentMethod)}</p>
          <div class="divider"></div>
          <table>${itemsHtml}</table>
          <div class="divider"></div>
          <table>
            <tr><td>Subtotal</td><td style="text-align:right;">${escapeHtml(formatIDR(tx.subtotal))}</td></tr>
            <tr><td>Diskon</td><td style="text-align:right;">- ${escapeHtml(formatIDR(tx.discountTotal))}</td></tr>
            ${
              tx.taxTotal > 0
                ? `<tr><td>Pajak</td><td style="text-align:right;">${escapeHtml(formatIDR(tx.taxTotal))}</td></tr>`
                : ""
            }
            <tr style="font-size:14px;font-weight:bold;">
              <td style="padding-top:4px;">TOTAL</td>
              <td style="text-align:right;padding-top:4px;">${escapeHtml(formatIDR(tx.grandTotal))}</td>
            </tr>
            <tr><td>Bayar (${escapeHtml(tx.paymentMethod)})</td><td style="text-align:right;">${escapeHtml(formatIDR(tx.cashReceived))}</td></tr>
            <tr><td>Kembali</td><td style="text-align:right;">${escapeHtml(formatIDR(tx.changeAmount))}</td></tr>
          </table>
          <div class="divider"></div>
          <div class="center" style="font-size:11px;margin-top:8px;">
            <p>${escapeHtml(storeSettings.receiptFooter)}</p>
            <p style="margin-top:4px;color:#64748B;">Powered by KELOKRA</p>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT / CENTER: Product Catalog */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-card flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk, SKU, atau scan barcode..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-navy-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <button
            onClick={() => setShowBarcodeModal(true)}
            title="Scan Barcode Produk"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy-800 transition flex items-center gap-2 text-xs font-semibold"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Scan</span>
          </button>

          {heldTransactions.length > 0 && (
            <button
              onClick={() => setShowHeldModal(true)}
              className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5"
            >
              <History className="w-4 h-4" />
              <span>Hold ({heldTransactions.length})</span>
            </button>
          )}

          <button
            onClick={clearCart}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <span>Transaksi Baru</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  active
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Grid or Empty State */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <PackagePlus className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-navy-800">
              Belum Ada Produk di Katalog Kasir
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Silakan tambahkan produk Anda terlebih dahulu di menu{" "}
              <b>Manajemen Produk</b> agar produk muncul di layar kasir POS ini.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("products")}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-sm transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk Sekarang</span>
              </button>
            )}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-2">
            <p className="text-sm font-bold text-slate-500">
              Tidak ada produk yang cocok dengan pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const inCartQty =
                cart.find((c) => c.product.id === product.id)?.quantity || 0;
              const isLowStock = product.stock <= product.minStock;

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`group bg-white rounded-2xl border p-3.5 shadow-card transition cursor-pointer select-none flex flex-col justify-between relative ${
                    inCartQty > 0
                      ? "border-emerald-500 ring-2 ring-emerald-500/15"
                      : "border-slate-200/80 hover:border-emerald-400 hover:shadow-md"
                  }`}
                >
                  {inCartQty > 0 && (
                    <span className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center shadow">
                      {inCartQty}
                    </span>
                  )}

                  <div>
                    <ProductVisual
                      imageKey={product.image}
                      name={product.name}
                      size="md"
                    />
                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-navy-800 group-hover:text-emerald-700 transition line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-sm font-extrabold text-navy-800 mt-0.5">
                        {formatIDR(product.sellingPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">
                      {product.sku}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold ${
                        isLowStock
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      Stok: {product.stock}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Keranjang Belanja */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card sticky top-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-navy-800">
              Keranjang Belanja ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 my-3">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                aria-label="Pilih Pelanggan"
                className="bg-transparent text-xs font-semibold text-navy-800 w-full focus:outline-none"
              >
                <option value="Pelanggan Umum">Pelanggan Umum</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={cartDiscount}
                onChange={(e) => setCartDiscount(Number(e.target.value))}
                aria-label="Pilih Diskon Transaksi"
                className="bg-transparent text-xs font-semibold text-navy-800 w-full focus:outline-none"
              >
                <option value={0}>Tanpa Diskon</option>
                <option value={2000}>Diskon Rp 2.000</option>
                <option value={5000}>Voucher Rp 5.000</option>
                <option value={10000}>Promo Rp 10.000</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-400">
                  Keranjang masih kosong
                </p>
                <p className="text-xs text-slate-400">
                  Klik produk di sebelah kiri atau scan barcode untuk menambahkan item.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductVisual
                      imageKey={item.product.image}
                      name={item.product.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy-800 truncate">
                        {item.product.name}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          x{item.quantity}
                        </span>
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        {formatIDR(item.product.sellingPrice * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      aria-label="Kurangi jumlah"
                      className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center text-navy-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      aria-label="Tambah jumlah"
                      className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label="Hapus item"
                      className="w-6 h-6 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals & Dynamic Payment Controls from Owner */}
        <div className="pt-4 border-t border-slate-200/80 space-y-4 mt-2">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-navy-800">
                {formatIDR(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Diskon</span>
              <span className="font-semibold text-rose-600">
                - {formatIDR(effectiveDiscount)}
              </span>
            </div>
            {storeSettings.enableTax && (
              <div className="flex justify-between text-slate-600">
                <span>PPN ({storeSettings.taxPercentage}%)</span>
                <span className="font-semibold text-navy-800">
                  {formatIDR(taxTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
              <span className="text-base font-extrabold text-navy-800">
                Total
              </span>
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatIDR(grandTotal)}
              </span>
            </div>
          </div>

          {/* Dynamic Payment Method Buttons */}
          {availableMethods.length === 0 ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Belum ada metode pembayaran aktif. Owner dapat mengaktifkannya di menu Metode Pembayaran.
              </span>
            </div>
          ) : (
            <div
              className={`grid gap-2 ${
                availableMethods.length === 1
                  ? "grid-cols-1"
                  : availableMethods.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {availableMethods.map((pm) => {
                const Icon = pm.icon;
                const active = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`py-2.5 px-2 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition text-center ${
                      active
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500"
                        : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="leading-tight">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!isOnline && paymentMethod === "QRIS" && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Mode Offline: Transaksi QRIS membutuhkan internet. Pilih{" "}
                <b>Tunai</b> agar masuk antrean sinkronisasi lokal.
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0 || availableMethods.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-extrabold text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Bayar Sekarang</span>
              <Banknote className="w-5 h-5" />
            </button>

            <button
              onClick={handleHoldTransaction}
              disabled={cart.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-50 text-navy-800 border border-slate-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
            >
              <span>Hold Transaksi</span>
              <PauseCircle className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* BARCODE SCANNER MODAL */}
      {showBarcodeModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-navy-800 flex items-center gap-2">
                <ScanBarcode className="w-5 h-5 text-emerald-600" />
                <span>Scanner Barcode / SKU</span>
              </h3>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Arahkan scanner USB/Bluetooth atau ketik kode barcode/SKU produk:
            </p>
            <form onSubmit={handleBarcodeScan} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Ketik barcode atau SKU..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold"
              >
                Tambah
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HELD TRANSACTIONS MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-navy-800">
                Daftar Transaksi Ditahan (Hold)
              </h3>
              <button
                onClick={() => setShowHeldModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {heldTransactions.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-navy-800">
                      {h.customerName} ({h.items.length} item)
                    </p>
                    <p className="text-xs text-slate-500">Pukul {h.createdAt}</p>
                  </div>
                  <button
                    onClick={() => handleRecallTransaction(h)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold"
                  >
                    Lanjutkan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT PAYMENT CONFIRMATION MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">
                  Pembayaran ({paymentMethod})
                </h3>
                <p className="text-xs text-slate-500">
                  Pelanggan: {selectedCustomer}
                </p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <span className="text-sm font-bold text-navy-800">
                Total Tagihan
              </span>
              <span className="text-2xl font-extrabold text-emerald-600">
                {formatIDR(grandTotal)}
              </span>
            </div>

            {paymentMethod === "Tunai" && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 uppercase">
                  Uang Tunai Diterima (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cashReceivedInput}
                  onChange={(e) => setCashReceivedInput(clampNonNegative(Number(e.target.value)))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-extrabold text-navy-800 focus:outline-none focus:border-emerald-500"
                />
                <div className="grid grid-cols-4 gap-2">
                  {[grandTotal, 20000, 50000, 100000].map((nom, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCashReceivedInput(nom)}
                      className="py-2 px-2 rounded-lg border border-slate-200 hover:border-emerald-500 text-xs font-bold text-navy-800 bg-slate-50"
                    >
                      {i === 0 ? "Uang Pas" : formatIDR(nom)}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 text-sm">
                  <span className="font-semibold text-slate-600">
                    Kembalian:
                  </span>
                  <span className="text-lg font-extrabold text-navy-800">
                    {formatIDR(Math.max(0, cashReceivedInput - grandTotal))}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === "QRIS" && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                {storeSettings.qrisImageDataUrl ? (
                  <>
                    <p className="text-xs font-extrabold text-navy-800">
                      {storeSettings.qrisMerchantName || storeSettings.storeName}
                    </p>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block max-w-[240px]">
                      <img
                        src={storeSettings.qrisImageDataUrl}
                        alt="QRIS Pembayaran Toko"
                        className="w-52 h-auto max-h-64 object-contain mx-auto rounded-lg"
                      />
                    </div>
                    <p className="text-xs font-semibold text-emerald-700">
                      Scan QRIS di atas dengan nominal{" "}
                      <b>{formatIDR(grandTotal)}</b>
                    </p>
                  </>
                ) : (
                  <div className="py-4 space-y-2">
                    <div className="w-28 h-28 mx-auto bg-white p-3 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center">
                      <QrCode className="w-20 h-20 text-slate-300" />
                    </div>
                    <p className="text-xs font-bold text-amber-700">
                      Gambar QRIS belum diupload oleh Owner.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Owner dapat mengupload gambar QRIS toko melalui menu{" "}
                      <b>Metode Pembayaran</b>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "M-Banking / E-Wallet" && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 uppercase">
                  Pilih Tujuan Transfer M-Banking / E-Wallet
                </label>
                <div className="space-y-2">
                  {activeTransferChannels.map((ch) => {
                    const isSelected = selectedTransferChannel?.id === ch.id;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => setSelectedChannelId(ch.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500"
                            : "border-slate-200 hover:border-emerald-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-navy-800 text-white">
                              {ch.type}
                            </span>
                            <span className="text-sm font-extrabold text-navy-800">
                              {ch.bankOrProviderName}
                            </span>
                          </div>
                          <p className="text-sm font-mono font-bold text-emerald-700 mt-1">
                            {ch.accountNumber}
                          </p>
                          {ch.accountHolder && (
                            <p className="text-[11px] text-slate-500">
                              a.n. {ch.accountHolder}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(ch.accountNumber);
                          }}
                          title="Salin Nomor Rekening"
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-600"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {checkoutError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={finalizeCheckout}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md transition"
              >
                {isProcessingPayment ? "Memproses..." : "Selesaikan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE / THERMAL RECEIPT SUCCESS MODAL */}
      {completedReceipt && (
        <div className="fixed inset-0 z-50 bg-navy-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 shadow-2xl border-4 border-navy-800 space-y-5 text-center relative overflow-hidden">
            <div className="flex items-center justify-center pt-1">
              <img
                src="/kelokra-logo.png"
                alt="KELOKRA Logo"
                className="h-8 w-auto object-contain"
              />
            </div>

            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-navy-800">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-slate-500">
                {completedReceipt.invoiceNumber} •{" "}
                {completedReceipt.synced
                  ? "Tersinkron ke Cloud"
                  : "Tersimpan di Antrean Offline PWA"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <p className="text-xs font-medium text-slate-500">
                Total Pembayaran (
                {completedReceipt.paymentDetail ||
                  completedReceipt.paymentMethod}
                )
              </p>
              <p className="text-2xl font-extrabold text-navy-800">
                {formatIDR(completedReceipt.grandTotal)}
              </p>
              {completedReceipt.paymentMethod === "Tunai" && (
                <p className="text-xs font-semibold text-emerald-600">
                  Tunai: {formatIDR(completedReceipt.cashReceived)} • Kembali:{" "}
                  {formatIDR(completedReceipt.changeAmount)}
                </p>
              )}
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                Terima kasih telah berbelanja!
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => handlePrintThermalReceipt(completedReceipt)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk ({storeSettings.printerPaperSize})</span>
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(
                    `*STRUK DIGITAL ${storeSettings.storeName}*\nNo: ${
                      completedReceipt.invoiceNumber
                    }\nTotal: ${formatIDR(
                      completedReceipt.grandTotal
                    )}\nMetode: ${
                      completedReceipt.paymentDetail ||
                      completedReceipt.paymentMethod
                    }\nTerima kasih telah berbelanja!`
                  );
                  window.open(`https://wa.me/?text=${text}`, "_blank");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Kirim Struk Digital via WhatsApp</span>
              </button>

              <button
                onClick={() => setCompletedReceipt(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-navy-800 border border-slate-200 font-bold text-xs transition"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
