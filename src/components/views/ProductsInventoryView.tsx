"use client";

import React, { useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Edit3,
  Trash2,
  ClipboardCheck,
  ArrowUpDown,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  PackagePlus,
  X,
} from "lucide-react";
import {
  Product,
  ProductCategory,
  PurchaseOrder,
  ReturnRecord,
  StockMovement,
  Supplier,
} from "@/types/nextpos";
import { formatIDR, generateId } from "@/lib/format";
import { clampNonNegative, clampPositiveInt } from "@/lib/security";
import { ProductVisual } from "@/components/ProductVisual";

interface ProductsInventoryViewProps {
  mode: "products" | "inventory" | "purchases";
  tenantId?: string;
  products: Product[];
  movements: StockMovement[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  returns: ReturnRecord[];
  onSaveProduct: (product: Product, isNew: boolean) => void;
  onDeleteProduct: (productId: string) => void;
  onPerformOpname: (productId: string, actualQty: number, reason: string) => void;
  onAddSupplier: (sup: Supplier) => void;
  onCreatePurchase: (po: PurchaseOrder) => void;
  onReceivePurchase: (poId: string) => void;
  onCreateReturn: (ret: ReturnRecord) => void;
}

export function ProductsInventoryView({
  mode,
  tenantId = "tenant-kelokra-001",
  products,
  movements,
  suppliers,
  purchases,
  returns,
  onSaveProduct,
  onDeleteProduct,
  onPerformOpname,
  onAddSupplier,
  onCreatePurchase,
  onReceivePurchase,
  onCreateReturn,
}: ProductsInventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Add / Edit Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);

  // Form states for Product
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState("");
  const [prodBarcode, setProdBarcode] = useState("");
  const [prodCategory, setProdCategory] = useState<ProductCategory>("Minuman");
  const [prodPurchasePrice, setProdPurchasePrice] = useState(5000);
  const [prodSellingPrice, setProdSellingPrice] = useState(10000);
  const [prodStock, setProdStock] = useState(50);
  const [prodMinStock, setProdMinStock] = useState(10);
  const [prodUnit, setProdUnit] = useState("pcs");
  const [prodImage, setProdImage] = useState("coffee");

  // Stok Opname Modal
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [opnameProductId, setOpnameProductId] = useState("");
  const [opnameActualQty, setOpnameActualQty] = useState<number>(0);
  const [opnameReason, setOpnameReason] = useState(
    "Stok Opname Rutin & Penyesuaian Fisik Rak"
  );

  // Purchases & Returns Sub-tab
  const [purchaseTab, setPurchaseTab] = useState<"po" | "suppliers" | "returns">(
    "po"
  );
  const [showPoModal, setShowPoModal] = useState(false);
  const [poSupplierName, setPoSupplierName] = useState("");
  const [poProductId, setPoProductId] = useState("");
  const [poQty, setPoQty] = useState(50);
  const [poUnitCost, setPoUnitCost] = useState(5000);

  // Add Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");
  const [supCategory, setSupCategory] = useState("Grosir & Bahan Baku");

  // Return Modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnType, setReturnType] = useState<
    "CUSTOMER_RETURN" | "SUPPLIER_RETURN"
  >("CUSTOMER_RETURN");
  const [returnRef, setReturnRef] = useState("");
  const [returnProdId, setReturnProdId] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState(
    "Tukar produk / kemasan masih layak jual"
  );
  const [restockEligible, setRestockEligible] = useState(true);

  const openAddProduct = () => {
    setEditingProduct(null);
    setFormError(null);
    setProdName("");
    setProdSku(`PRD-${Math.floor(100 + Math.random() * 900)}`);
    setProdBarcode(`899100210${Math.floor(100 + Math.random() * 899)}`);
    setProdCategory("Minuman");
    setProdPurchasePrice(5000);
    setProdSellingPrice(10000);
    setProdStock(50);
    setProdMinStock(10);
    setProdUnit("pcs");
    setProdImage("coffee");
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormError(null);
    setProdName(p.name);
    setProdSku(p.sku);
    setProdBarcode(p.barcode);
    setProdCategory(p.category);
    setProdPurchasePrice(p.purchasePrice);
    setProdSellingPrice(p.sellingPrice);
    setProdStock(p.stock);
    setProdMinStock(p.minStock);
    setProdUnit(p.unit);
    setProdImage(p.image);
    setShowProductModal(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodSku.trim()) {
      setFormError("Nama produk dan SKU wajib diisi.");
      return;
    }

    const duplicateSku = products.find(
      (p) =>
        p.sku.toLowerCase() === prodSku.trim().toLowerCase() &&
        p.id !== editingProduct?.id
    );
    if (duplicateSku) {
      setFormError(
        `SKU "${prodSku}" sudah digunakan oleh produk ${duplicateSku.name}.`
      );
      return;
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : generateId("prod"),
      tenantId,
      name: prodName.trim(),
      sku: prodSku.trim().toUpperCase(),
      barcode: prodBarcode.trim(),
      category: prodCategory,
      purchasePrice: clampNonNegative(Number(prodPurchasePrice)),
      sellingPrice: clampNonNegative(Number(prodSellingPrice)),
      stock: clampNonNegative(Math.floor(Number(prodStock))),
      minStock: clampNonNegative(Math.floor(Number(prodMinStock))),
      unit: prodUnit,
      image: prodImage,
      soldCount: editingProduct ? editingProduct.soldCount : 0,
      isActive: true,
    };

    onSaveProduct(newProd, !editingProduct);
    setShowProductModal(false);
  };

  const handleOpnameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = opnameProductId || products[0]?.id;
    if (!targetId || !opnameReason.trim()) return;
    onPerformOpname(
      targetId,
      clampNonNegative(Math.floor(Number(opnameActualQty))),
      opnameReason.trim()
    );
    setShowOpnameModal(false);
  };

  const handlePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProdId = poProductId || products[0]?.id;
    const prod = products.find((p) => p.id === targetProdId);
    if (!prod || !poSupplierName.trim()) return;

    const safeQty = clampPositiveInt(Number(poQty), 1);
    const safeUnitCost = clampNonNegative(Number(poUnitCost));
    const subtotal = safeQty * safeUnitCost;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const newPo: PurchaseOrder = {
      id: generateId("po"),
      purchaseNumber: `PO-${todayStr}-${Math.floor(100 + Math.random() * 899)}`,
      supplierId: generateId("sup"),
      supplierName: poSupplierName.trim(),
      items: [
        {
          productId: prod.id,
          productName: prod.name,
          quantity: safeQty,
          unitCost: safeUnitCost,
          subtotal,
        },
      ],
      totalAmount: subtotal,
      status: "DRAFT",
      createdAt: new Date().toLocaleDateString("id-ID"),
    };

    onCreatePurchase(newPo);
    setShowPoModal(false);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    onAddSupplier({
      id: generateId("sup"),
      name: supName.trim(),
      phone: supPhone.trim() || "-",
      email: supEmail.trim() || "-",
      address: supAddress.trim() || "-",
      category: supCategory.trim() || "Umum",
    });
    setSupName("");
    setSupPhone("");
    setSupEmail("");
    setSupAddress("");
    setShowSupplierModal(false);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProdId = returnProdId || products[0]?.id;
    const prod = products.find((p) => p.id === targetProdId);
    if (!prod) return;

    const safeQty = clampPositiveInt(Number(returnQty), 1);
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const newRet: ReturnRecord = {
      id: generateId("ret"),
      returnNumber: `RET-${todayStr}-${Math.floor(100 + Math.random() * 899)}`,
      type: returnType,
      referenceNumber: returnRef.trim() || "INV-MANUAL",
      productId: prod.id,
      productName: prod.name,
      quantity: safeQty,
      refundAmount:
        returnType === "CUSTOMER_RETURN"
          ? prod.sellingPrice * safeQty
          : prod.purchasePrice * safeQty,
      reason: returnReason,
      restockEligible:
        returnType === "CUSTOMER_RETURN" ? restockEligible : false,
      createdAt: new Date().toLocaleDateString("id-ID"),
    };

    onCreateReturn(newRet);
    setShowReturnModal(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === "Semua" || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q);
    const matchesLow = !showLowStockOnly || p.stock <= p.minStock;
    return matchesCat && matchesSearch && matchesLow;
  });

  const countByCat = (cat: string) =>
    cat === "Semua"
      ? products.length
      : products.filter((p) => p.category === cat).length;

  // ============================================================================
  // MODE 1: MANAJEMEN PRODUK
  // ============================================================================
  if (mode === "products") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
                Manajemen Produk
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Kelola produk, harga jual, HPP, barcode, dan atur stok dengan mudah.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowLowStockOnly((v) => !v)}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                  showLowStockOnly
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span>
                  {showLowStockOnly ? "Filter: Stok Menipis" : "Filter"}
                </span>
              </button>

              <button
                onClick={openAddProduct}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {(
                ["Semua", "Minuman", "Makanan", "Snack", "Lainnya"] as const
              ).map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-500/40"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    {cat} ({countByCat(cat)})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, SKU, barcode..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-navy-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-14 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <PackagePlus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-navy-800">
                Data Produk Masih Kosong
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Klik tombol <b>+ Tambah Produk</b> untuk mulai memasukkan daftar produk, harga beli (HPP), harga jual, dan stok awal toko Anda.
              </p>
              <button
                onClick={openAddProduct}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-sm transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isLow = product.stock <= product.minStock;
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-card hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <ProductVisual
                        imageKey={product.image}
                        name={product.name}
                        size="lg"
                      />
                      <div className="mt-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-navy-800 line-clamp-1">
                            {product.name}
                          </h3>
                        </div>
                        <p className="text-base font-extrabold text-navy-800 mt-0.5">
                          {formatIDR(product.sellingPrice)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          HPP: {formatIDR(product.purchasePrice)} • SKU:{" "}
                          {product.sku}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isLow
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        Stok: {product.stock}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditProduct(product)}
                          title="Edit Produk"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy-800 transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteProduct(product)}
                          title="Hapus Produk"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditProduct(product)}
                          title="Opsi Lainnya"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADD / EDIT PRODUCT MODAL */}
        {showProductModal && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-navy-800">
                  {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
                </h3>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleProductSubmit}
                className="space-y-3.5 text-xs sm:text-sm"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Masukkan nama produk..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kategori
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) =>
                        setProdCategory(e.target.value as ProductCategory)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Minuman">Minuman</option>
                      <option value="Makanan">Makanan</option>
                      <option value="Snack">Snack</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ikon Visual Produk
                    </label>
                    <select
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="coffee">Kopi / Cup</option>
                      <option value="iced-tea">Es Teh / Minuman Segar</option>
                      <option value="water">Air Mineral Botol</option>
                      <option value="donut">Roti / Donat</option>
                      <option value="noodles">Mie Goreng / Makanan</option>
                      <option value="chips">Keripik / Snack</option>
                      <option value="tea-bottle">Teh Botol</option>
                      <option value="matcha">Matcha Latte</option>
                      <option value="croissant">Croissant / Pastry</option>
                      <option value="bag">Produk Umum / Lainnya</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kode SKU (Unik)
                    </label>
                    <input
                      type="text"
                      required
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Barcode (Opsional)
                    </label>
                    <input
                      type="text"
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Harga Beli / HPP (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={prodPurchasePrice}
                      onChange={(e) =>
                        setProdPurchasePrice(clampNonNegative(Number(e.target.value)))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Harga Jual Kasir (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={prodSellingPrice}
                      onChange={(e) =>
                        setProdSellingPrice(clampNonNegative(Number(e.target.value)))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Stok Saat Ini
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={prodStock}
                      onChange={(e) => setProdStock(clampNonNegative(Math.floor(Number(e.target.value))))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Stok Minimum
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(clampNonNegative(Math.floor(Number(e.target.value))))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Satuan
                    </label>
                    <input
                      type="text"
                      required
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                    {formError}
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm"
                  >
                    Simpan Produk
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MODE 2: INVENTARIS, MUTASI STOK & STOK OPNAME
  // ============================================================================
  if (mode === "inventory") {
    const totalValuation = products.reduce(
      (sum, p) => sum + p.stock * p.purchasePrice,
      0
    );
    const lowStockList = products.filter((p) => p.stock <= p.minStock);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
            <p className="text-xs font-medium text-slate-500">
              Total Valuasi Persediaan (HPP)
            </p>
            <p className="text-2xl font-extrabold text-navy-800 mt-1">
              {formatIDR(totalValuation)}
            </p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              Metode Average Cost
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
            <p className="text-xs font-medium text-slate-500">
              Total Unit Tersedia di Toko
            </p>
            <p className="text-2xl font-extrabold text-navy-800 mt-1">
              {products
                .reduce((s, p) => s + p.stock, 0)
                .toLocaleString("id-ID")}{" "}
              unit
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Dari {products.length} SKU produk aktif
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Peringatan Stok Minimum
              </p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {lowStockList.length} Produk
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Perlu perhatian restock
              </p>
            </div>
            <button
              disabled={products.length === 0}
              onClick={() => {
                setOpnameProductId(products[0]?.id || "");
                setOpnameActualQty(products[0]?.stock || 0);
                setShowOpnameModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Stok Opname</span>
            </button>
          </div>
        </div>

        {/* Saldo Stok Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-navy-800">
                Saldo Stok & Batas Minimum
              </h2>
              <p className="text-xs text-slate-500">
                Setiap perubahan stok tercatat otomatis di tabel Stock Movements
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada produk untuk ditampilkan di inventaris.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-3">Produk</th>
                    <th className="py-3 px-3">SKU / Barcode</th>
                    <th className="py-3 px-3">HPP / Unit</th>
                    <th className="py-3 px-3">Stok Sistem</th>
                    <th className="py-3 px-3">Batas Min</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {products.map((p) => {
                    const low = p.stock <= p.minStock;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-navy-800">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 font-mono">
                          {p.sku} {p.barcode ? `• ${p.barcode}` : ""}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {formatIDR(p.purchasePrice)}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-navy-800">
                          {p.stock} {p.unit}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {p.minStock} {p.unit}
                        </td>
                        <td className="py-3 px-3">
                          {low ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Stok Menipis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              setOpnameProductId(p.id);
                              setOpnameActualQty(p.stock);
                              setShowOpnameModal(true);
                            }}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Sesuaikan Stok
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Riwayat Mutasi Stok */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-extrabold text-navy-800">
                Riwayat Mutasi Stok (Stock Movements)
              </h2>
              <p className="text-xs text-slate-500">
                Jejak audit lengkap barang masuk, keluar POS, stok opname, dan retur
              </p>
            </div>
          </div>

          {movements.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada mutasi stok tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-3">Waktu</th>
                    <th className="py-3 px-3">Produk</th>
                    <th className="py-3 px-3">Tipe</th>
                    <th className="py-3 px-3">Jumlah</th>
                    <th className="py-3 px-3">Saldo Akhir</th>
                    <th className="py-3 px-3">Referensi & Alasan</th>
                    <th className="py-3 px-3">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {m.createdAt}
                      </td>
                      <td className="py-3 px-3 font-bold text-navy-800">
                        {m.productName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            m.quantity > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 font-extrabold ${
                          m.quantity > 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-3 font-bold text-navy-800">
                        {m.balanceAfter}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        <b>{m.reference}</b> — {m.reason}
                      </td>
                      <td className="py-3 px-3 text-xs font-semibold text-slate-700">
                        {m.actor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* STOK OPNAME MODAL */}
        {showOpnameModal && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-navy-800">
                  Formulir Stok Opname
                </h3>
                <button
                  onClick={() => setShowOpnameModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleOpnameSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Produk
                  </label>
                  <select
                    value={opnameProductId}
                    onChange={(e) => {
                      setOpnameProductId(e.target.value);
                      const found = products.find(
                        (p) => p.id === e.target.value
                      );
                      if (found) setOpnameActualQty(found.stock);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stok Sistem: {p.stock} {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kuantitas Aktual Hasil Hitung Fisik
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={opnameActualQty}
                    onChange={(e) => setOpnameActualQty(clampNonNegative(Math.floor(Number(e.target.value))))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alasan Penyesuaian
                  </label>
                  <input
                    type="text"
                    required
                    value={opnameReason}
                    onChange={(e) => setOpnameReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOpnameModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                  >
                    Simpan Opname
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // MODE 3: PEMBELIAN, SUPPLIER & RETUR
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
              Pembelian, Supplier & Retur Barang
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Penerimaan barang otomatis menambah stok gudang dan memperbarui HPP produk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowSupplierModal(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy-800 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Tambah Supplier</span>
            </button>
            <button
              disabled={products.length === 0}
              onClick={() => {
                setReturnProdId(products[0]?.id || "");
                setShowReturnModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-navy-800 text-xs font-bold flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Catat Retur</span>
            </button>
            <button
              disabled={products.length === 0}
              onClick={() => {
                setPoProductId(products[0]?.id || "");
                setPoUnitCost(products[0]?.purchasePrice || 5000);
                setPoSupplierName(suppliers[0]?.name || "");
                setShowPoModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pesanan Pembelian (PO)</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setPurchaseTab("po")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              purchaseTab === "po"
                ? "bg-emerald-500 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pesanan Pembelian ({purchases.length})
          </button>
          <button
            onClick={() => setPurchaseTab("suppliers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              purchaseTab === "suppliers"
                ? "bg-emerald-500 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Daftar Supplier ({suppliers.length})
          </button>
          <button
            onClick={() => setPurchaseTab("returns")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              purchaseTab === "returns"
                ? "bg-emerald-500 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Retur Pelanggan & Supplier ({returns.length})
          </button>
        </div>

        {purchaseTab === "po" &&
          (purchases.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada pesanan pembelian (PO). Tambahkan produk terlebih dahulu lalu klik Buat Pesanan Pembelian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-3">No. PO</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-3">Item Pembelian</th>
                    <th className="py-3 px-3">Total Biaya</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {purchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-navy-800">
                        {po.purchaseNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {po.supplierName}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {po.items
                          .map((i) => `${i.productName} (${i.quantity}x)`)
                          .join(", ")}
                      </td>
                      <td className="py-3 px-3 font-bold text-navy-800">
                        {formatIDR(po.totalAmount)}
                      </td>
                      <td className="py-3 px-3">
                        {po.status === "RECEIVED" ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                            Diterima ({po.receivedAt})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            Draft / Menunggu Barang
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {po.status === "DRAFT" ? (
                          <button
                            onClick={() => onReceivePurchase(po.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Terima Barang (+Stok)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">
                            Stok Telah Masuk
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {purchaseTab === "suppliers" &&
          (suppliers.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada data supplier. Klik tombol <b>+ Tambah Supplier</b> di atas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="p-4 rounded-2xl border border-slate-200/80 space-y-2"
                >
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                    {sup.category}
                  </span>
                  <h3 className="text-base font-extrabold text-navy-800">
                    {sup.name}
                  </h3>
                  <p className="text-xs text-slate-500">{sup.address}</p>
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-0.5">
                    <p>Telp: {sup.phone}</p>
                    <p>Email: {sup.email}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {purchaseTab === "returns" &&
          (returns.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada catatan retur pelanggan maupun supplier.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3 px-3">No. Retur</th>
                    <th className="py-3 px-3">Jenis</th>
                    <th className="py-3 px-3">Referensi</th>
                    <th className="py-3 px-3">Produk & Qty</th>
                    <th className="py-3 px-3">Nilai Refund</th>
                    <th className="py-3 px-3">Status Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {returns.map((ret) => (
                    <tr key={ret.id}>
                      <td className="py-3 px-3 font-bold text-navy-800">
                        {ret.returnNumber}
                      </td>
                      <td className="py-3 px-3 text-xs font-bold">
                        {ret.type === "CUSTOMER_RETURN"
                          ? "Retur Pelanggan"
                          : "Retur ke Supplier"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {ret.referenceNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-navy-800">
                        {ret.productName} ({ret.quantity}x)
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-600">
                        {formatIDR(ret.refundAmount)}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {ret.type === "CUSTOMER_RETURN" ? (
                          ret.restockEligible ? (
                            <span className="text-emerald-700 font-bold">
                              + Masuk Kembali ke Stok Layak Jual
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold">
                              Barang Rusak (Tidak Menambah Stok)
                            </span>
                          )
                        ) : (
                          <span className="text-rose-700 font-bold">
                            - Mengurangi Stok Gudang
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>

      {/* ADD SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                Tambah Supplier Baru
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSupplierSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Perusahaan / Supplier
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Contoh: PT Sumber Makmur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kategori Barang
                  </label>
                  <input
                    type="text"
                    value={supCategory}
                    onChange={(e) => setSupCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat Supplier
                </label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                Buat Pesanan Pembelian (PO)
              </h3>
              <button
                onClick={() => setShowPoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePoSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Supplier
                </label>
                <input
                  type="text"
                  required
                  value={poSupplierName}
                  onChange={(e) => setPoSupplierName(e.target.value)}
                  placeholder="Ketik nama supplier..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Produk yang Dibeli
                </label>
                <select
                  value={poProductId}
                  onChange={(e) => {
                    setPoProductId(e.target.value);
                    const p = products.find(
                      (item) => item.id === e.target.value
                    );
                    if (p) setPoUnitCost(p.purchasePrice);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jumlah Beli
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={poQty}
                    onChange={(e) => setPoQty(clampPositiveInt(Number(e.target.value), 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Harga Beli / Unit (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(clampNonNegative(Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                >
                  Simpan Draft PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RETURN MODAL */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                Catat Retur Barang
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jenis Retur
                </label>
                <select
                  value={returnType}
                  onChange={(e) =>
                    setReturnType(
                      e.target.value as "CUSTOMER_RETURN" | "SUPPLIER_RETURN"
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="CUSTOMER_RETURN">Retur Pelanggan</option>
                  <option value="SUPPLIER_RETURN">Retur ke Supplier</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Invoice / PO Asal
                  </label>
                  <input
                    type="text"
                    required
                    value={returnRef}
                    onChange={(e) => setReturnRef(e.target.value)}
                    placeholder="INV-..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kuantitas
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={returnQty}
                    onChange={(e) => setReturnQty(clampPositiveInt(Number(e.target.value), 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Produk
                </label>
                <select
                  value={returnProdId}
                  onChange={(e) => setReturnProdId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan & Kondisi Barang
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              {returnType === "CUSTOMER_RETURN" && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-semibold text-navy-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockEligible}
                    onChange={(e) => setRestockEligible(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span>
                    Barang layak dijual kembali (Otomatis tambah stok kembali)
                  </span>
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
                >
                  Proses Retur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PRODUCT MODAL */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-navy-800">
                  Hapus Produk?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Produk <b>{confirmDeleteProduct.name}</b> (SKU:{" "}
                  {confirmDeleteProduct.sku}) akan dihapus permanen dari katalog.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(confirmDeleteProduct.id);
                  setConfirmDeleteProduct(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Ya, Hapus Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
