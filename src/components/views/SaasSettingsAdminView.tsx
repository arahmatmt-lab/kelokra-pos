"use client";

import React, { useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Settings,
  CreditCard,
  Bell,
  ShieldCheck,
  Plug,
  DatabaseBackup,
  HelpCircle,
  Building2,
  Users,
  Download,
  RotateCcw,
  QrCode,
  Upload,
  Banknote,
  Clock,
  Eye,
  EyeOff,
  CalendarPlus,
  UserPlus,
  Info,
  X,
} from "lucide-react";
import {
  AuditLogEntry,
  ManagedAccount,
  OwnerAccountMode,
  StoreSettings,
  TransferPaymentChannel,
  UserRole,
} from "@/types/nextpos";
import {
  addMonthsToIso,
  formatDateOnly,
  generateId,
  getRemainingTimeInfo,
} from "@/lib/format";

interface SaasSettingsAdminViewProps {
  mode:
    | "employees"
    | "payment-methods"
    | "settings"
    | "help"
    | "super-admin";
  userRole?: UserRole;
  accounts: ManagedAccount[];
  storeSettings: StoreSettings;
  auditLogs: AuditLogEntry[];
  onCreateAccountsBatch: (newAccounts: ManagedAccount[]) => void;
  onExtendAccount: (accountId: string, addMonths: number) => void;
  onToggleAccountStatus: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onUpdateSettings: (next: StoreSettings) => void;
  onExportBackup: () => void;
  onResetAllData: () => void;
  onNavigate?: (menu: string) => void;
}

export function SaasSettingsAdminView({
  mode,
  userRole = "OWNER",
  accounts,
  storeSettings,
  auditLogs,
  onCreateAccountsBatch,
  onExtendAccount,
  onToggleAccountStatus,
  onDeleteAccount,
  onUpdateSettings,
  onExportBackup,
  onResetAllData,
  onNavigate,
}: SaasSettingsAdminViewProps) {
  // Settings sub-tab
  const [settingsTab, setSettingsTab] = useState<
    "Umum" | "Pembayaran" | "Notifikasi" | "Keamanan" | "Integrasi" | "Backup"
  >("Umum");
  const [editingStoreInfo, setEditingStoreInfo] = useState(false);
  const [tempStoreName, setTempStoreName] = useState(storeSettings.storeName);
  const [tempAddress, setTempAddress] = useState(storeSettings.address);
  const [tempPhone, setTempPhone] = useState(storeSettings.phone);

  // Payment Method Channel Modal (Owner adds M-Banking / E-Wallet)
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [chType, setChType] = useState<"M-Banking" | "E-Wallet">("M-Banking");
  const [chBankName, setChBankName] = useState("");
  const [chAccountNumber, setChAccountNumber] = useState("");
  const [chAccountHolder, setChAccountHolder] = useState("");

  // Super Admin Account Creation Modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accName, setAccName] = useState("");
  const [accRole, setAccRole] = useState<"OWNER" | "CASHIER">("OWNER");
  const [accOwnerMode, setAccOwnerMode] =
    useState<OwnerAccountMode>("OWNER_PLUS_KASIR");
  const [accStoreName, setAccStoreName] = useState(storeSettings.storeName);
  const [accUsername, setAccUsername] = useState("");
  const [accPassword, setAccPassword] = useState("");
  const [accEmail, setAccEmail] = useState("");
  const [accDurationMonths, setAccDurationMonths] = useState<number>(12); // default 1 tahun (12 bulan)
  const [cashierDrafts, setCashierDrafts] = useState<
    { name: string; username: string; password: string }[]
  >([{ name: "", username: "", password: "" }]);
  const [accError, setAccError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  // Add Kasir Modal for an existing Owner row ("+ Tambahkan Kasir" replacing "Masuk")
  const [addCashierOwnerTarget, setAddCashierOwnerTarget] =
    useState<ManagedAccount | null>(null);
  const [extraCashierName, setExtraCashierName] = useState("");
  const [extraCashierUsername, setExtraCashierUsername] = useState("");
  const [extraCashierPassword, setExtraCashierPassword] = useState("");
  const [extraCashierError, setExtraCashierError] = useState<string | null>(
    null
  );

  // Extend Duration Modal
  const [extendTargetAccount, setExtendTargetAccount] =
    useState<ManagedAccount | null>(null);
  const [extendMonths, setExtendMonths] = useState<number>(1);

  // Handle QRIS image upload to Base64 Data URL
  const handleQrisFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar QRIS maksimal 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onUpdateSettings({
          ...storeSettings,
          qrisEnabled: true,
          qrisImageDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddChannel = () => {
    setEditingChannelId(null);
    setChType("M-Banking");
    setChBankName("");
    setChAccountNumber("");
    setChAccountHolder("");
    setShowChannelModal(true);
  };

  const openEditChannel = (ch: TransferPaymentChannel) => {
    setEditingChannelId(ch.id);
    setChType(ch.type);
    setChBankName(ch.bankOrProviderName);
    setChAccountNumber(ch.accountNumber);
    setChAccountHolder(ch.accountHolder);
    setShowChannelModal(true);
  };

  const handleSaveChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chBankName.trim() || !chAccountNumber.trim()) return;

    const existing = storeSettings.transferChannels || [];
    let updated: TransferPaymentChannel[];
    if (editingChannelId) {
      updated = existing.map((c) =>
        c.id === editingChannelId
          ? {
              ...c,
              type: chType,
              bankOrProviderName: chBankName.trim(),
              accountNumber: chAccountNumber.trim(),
              accountHolder: chAccountHolder.trim(),
            }
          : c
      );
    } else {
      updated = [
        ...existing,
        {
          id: generateId("pay"),
          type: chType,
          bankOrProviderName: chBankName.trim(),
          accountNumber: chAccountNumber.trim(),
          accountHolder: chAccountHolder.trim(),
          isActive: true,
        },
      ];
    }

    onUpdateSettings({
      ...storeSettings,
      transferChannels: updated,
    });
    setShowChannelModal(false);
  };

  const handleToggleChannel = (channelId: string) => {
    const updated = (storeSettings.transferChannels || []).map((c) =>
      c.id === channelId ? { ...c, isActive: !c.isActive } : c
    );
    onUpdateSettings({
      ...storeSettings,
      transferChannels: updated,
    });
  };

  const handleDeleteChannel = (channelId: string) => {
    const updated = (storeSettings.transferChannels || []).filter(
      (c) => c.id !== channelId
    );
    onUpdateSettings({
      ...storeSettings,
      transferChannels: updated,
    });
  };

  // Reusable Payment Method Editor Component (used in both "payment-methods" menu and Settings -> Pembayaran)
  const renderPaymentMethodsEditor = () => (
    <div className="space-y-6">
      {/* 1. Tunai */}
      <div className="p-5 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-navy-800">
              Pembayaran Tunai (Cash)
            </h3>
            <p className="text-xs text-slate-500">
              Terima pembayaran uang tunai langsung di kasir beserta hitung kembalian otomatis.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={storeSettings.cashEnabled}
          onClick={() =>
            onUpdateSettings({
              ...storeSettings,
              cashEnabled: !storeSettings.cashEnabled,
            })
          }
          className={`w-12 h-7 rounded-full transition p-1 flex items-center shrink-0 ${
            storeSettings.cashEnabled
              ? "bg-emerald-500 justify-end"
              : "bg-slate-300 justify-start"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
        </button>
      </div>

      {/* 2. QRIS + Upload Gambar QRIS */}
      <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-navy-800">
                Pembayaran QRIS
              </h3>
              <p className="text-xs text-slate-500">
                Jika diaktifkan, opsi <b>QRIS</b> dan gambar QRIS toko Anda akan muncul di kasir POS.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={storeSettings.qrisEnabled}
            onClick={() =>
              onUpdateSettings({
                ...storeSettings,
                qrisEnabled: !storeSettings.qrisEnabled,
              })
            }
            className={`w-12 h-7 rounded-full transition p-1 flex items-center shrink-0 ${
              storeSettings.qrisEnabled
                ? "bg-emerald-500 justify-end"
                : "bg-slate-300 justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-7 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nama Merchant QRIS (Opsional)
              </label>
              <input
                type="text"
                value={storeSettings.qrisMerchantName}
                onChange={(e) =>
                  onUpdateSettings({
                    ...storeSettings,
                    qrisMerchantName: e.target.value,
                  })
                }
                placeholder="Contoh: KELOKRA Mart / Kedai Kopi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition">
                <Upload className="w-4 h-4" />
                <span>
                  {storeSettings.qrisImageDataUrl
                    ? "Ganti Gambar QRIS"
                    : "Upload Gambar QRIS"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrisFileUpload}
                  className="hidden"
                />
              </label>

              {storeSettings.qrisImageDataUrl && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...storeSettings,
                      qrisImageDataUrl: "",
                    })
                  }
                  className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                >
                  Hapus Gambar
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Format yang didukung: PNG, JPG, JPEG, WebP (maks. 2 MB).
            </p>
          </div>

          <div className="md:col-span-5 flex justify-center">
            {storeSettings.qrisImageDataUrl ? (
              <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 text-center space-y-1.5">
                <img
                  src={storeSettings.qrisImageDataUrl}
                  alt="Preview QRIS"
                  className="w-36 h-36 object-contain rounded-xl bg-white p-1.5 border border-slate-200 mx-auto"
                />
                <span className="text-[11px] font-bold text-emerald-700 block">
                  Preview QRIS Aktif di Kasir
                </span>
              </div>
            ) : (
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center p-3 text-slate-400">
                <QrCode className="w-10 h-10 mb-1.5 opacity-60" />
                <span className="text-[11px] font-semibold">
                  Belum ada gambar QRIS diupload
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. M-Banking & E-Wallet (Bisa tulis nama bank apa & nomor rekening) */}
      <div className="p-5 rounded-2xl border border-slate-200/80 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-navy-800">
              E-Wallet & M-Banking (Transfer Bank)
            </h3>
            <p className="text-xs text-slate-500">
              Tambahkan rekening M-Banking (tulis nama bank apa & nomor rekening) atau akun E-Wallet yang akan muncul di kasir.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddChannel}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bank / E-Wallet</span>
          </button>
        </div>

        {(storeSettings.transferChannels || []).length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            Belum ada akun M-Banking atau E-Wallet ditambahkan. Klik{" "}
            <b>+ Tambah Bank / E-Wallet</b> untuk menambahkan nomor rekening atau nomor E-Wallet Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {(storeSettings.transferChannels || []).map((ch) => (
              <div
                key={ch.id}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 transition ${
                  ch.isActive
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-slate-200 bg-slate-50 opacity-70"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-navy-800 text-white">
                      {ch.type}
                    </span>
                    <span className="text-sm font-extrabold text-navy-800">
                      {ch.bankOrProviderName}
                    </span>
                  </div>
                  <p className="text-sm font-mono font-bold text-emerald-700">
                    No. Rek / ID: {ch.accountNumber}
                  </p>
                  {ch.accountHolder && (
                    <p className="text-xs text-slate-500">
                      a.n. {ch.accountHolder}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleChannel(ch.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      ch.isActive
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {ch.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditChannel(ch)}
                      title="Edit"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-navy-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(ch.id)}
                      title="Hapus"
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit M-Banking atau E-Wallet */}
      {showChannelModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                {editingChannelId
                  ? "Edit Rekening / E-Wallet"
                  : "Tambah M-Banking / E-Wallet"}
              </h3>
              <button
                onClick={() => setShowChannelModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveChannel} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Metode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["M-Banking", "E-Wallet"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setChType(t)}
                      className={`py-2.5 rounded-xl border text-xs font-extrabold transition ${
                        chType === t
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {chType === "M-Banking"
                    ? "Tulis Nama Bank (Contoh: Bank BCA, BRI, Mandiri, BSI)"
                    : "Tulis Nama E-Wallet (Contoh: DANA, GoPay, OVO, ShopeePay)"}
                </label>
                <input
                  type="text"
                  required
                  value={chBankName}
                  onChange={(e) => setChBankName(e.target.value)}
                  placeholder={
                    chType === "M-Banking"
                      ? "Misal: Bank BCA"
                      : "Misal: DANA / GoPay"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {chType === "M-Banking"
                    ? "Nomor Rekening"
                    : "Nomor HP / Akun E-Wallet"}
                </label>
                <input
                  type="text"
                  required
                  value={chAccountNumber}
                  onChange={(e) => setChAccountNumber(e.target.value)}
                  placeholder="Masukkan nomor rekening / nomor tujuan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atas Nama Pemilik Rekening (Opsional)
                </label>
                <input
                  type="text"
                  value={chAccountHolder}
                  onChange={(e) => setChAccountHolder(e.target.value)}
                  placeholder="Contoh: PT / Nama Pemilik Toko"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChannelModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  Simpan Metode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MODE: METODE PEMBAYARAN (KHUSUS OWNER)
  // ============================================================================
  if (mode === "payment-methods") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
              Pengaturan Metode Pembayaran Toko
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Atur metode pembayaran yang tersedia di Kasir (Tunai, Upload QRIS, serta daftar Rekening Bank M-Banking / E-Wallet).
            </p>
          </div>

          {renderPaymentMethodsEditor()}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE: KARYAWAN / DAFTAR AKUN (Owner TIDAK BISA menambah kasir - Read Only!)
  // ============================================================================
  if (mode === "employees") {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
              Daftar Akun Owner & Kasir
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Lihat daftar akun yang aktif pada toko Anda beserta sisa masa aktif akun.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-start gap-3 text-xs sm:text-sm text-navy-800">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Pembuatan akun Kasir & Owner dikelola oleh Super Admin
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Owner tidak dapat menambah atau menghapus akun Kasir secara langsung. Hubungi Super Admin untuk penambahan akun baru atau perpanjangan masa aktif.
              </p>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
              Belum ada akun Owner atau Kasir yang dibuat oleh Super Admin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                    <th className="py-3.5 px-4">Nama & Username</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Sisa Waktu Aktif</th>
                    <th className="py-3.5 px-4">Berlaku Hingga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {accounts.map((acc) => {
                    const timeInfo = getRemainingTimeInfo(acc.expiresAt);
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              style={{ backgroundColor: acc.avatarColor }}
                              className="w-9 h-9 rounded-full text-white font-extrabold text-xs flex items-center justify-center shrink-0"
                            >
                              {acc.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-navy-800">
                                {acc.name}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">
                                @{acc.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {acc.role === "OWNER" ? "Owner" : "Kasir"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              acc.status === "AKTIF" && !timeInfo.isExpired
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {acc.status === "AKTIF" && !timeInfo.isExpired
                              ? "Aktif"
                              : "Nonaktif / Habis"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs font-bold ${
                              timeInfo.isExpired
                                ? "text-rose-600"
                                : timeInfo.isExpiringSoon
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {timeInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDateOnly(acc.expiresAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Matriks RBAC */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
          <h2 className="text-base font-extrabold text-navy-800">
            Matriks Hak Akses Role-Based Access Control (RBAC)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-2.5 px-3">Modul / Fitur</th>
                  <th className="py-2.5 px-3">Super Admin</th>
                  <th className="py-2.5 px-3">Owner Bisnis</th>
                  <th className="py-2.5 px-3">Kasir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Buat Akun Owner & Kasir + Masa Aktif
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Ya (Penuh)
                  </td>
                  <td className="py-2.5 px-3 text-rose-500 font-semibold">
                    Tidak
                  </td>
                  <td className="py-2.5 px-3 text-rose-500 font-semibold">
                    Tidak
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Edit Metode Pembayaran (QRIS, M-Banking, E-Wallet)
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Administratif</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Ya (Penuh)
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Pakai di POS</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Transaksi POS & Cetak Struk
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Tidak</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Ya (Penuh)
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">
                    Ya (Operasional)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">
                    Laporan Laba Bersih & HPP
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">Tidak Otomatis</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">Ya</td>
                  <td className="py-2.5 px-3 text-rose-500 font-semibold">
                    Dibatasi
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE: PENGATURAN SISTEM
  // ============================================================================
  if (mode === "settings") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-navy-800">
            Pengaturan Sistem
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Atur preferensi sistem, toko, dan metode pembayaran sesuai kebutuhan bisnis Anda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 lg:col-span-3 space-y-1.5">
            {(
              [
                { id: "Umum", label: "Umum", icon: Settings },
                ...(userRole === "OWNER"
                  ? [{ id: "Pembayaran" as const, label: "Pembayaran", icon: CreditCard }]
                  : []),
                { id: "Notifikasi", label: "Notifikasi", icon: Bell },
                { id: "Keamanan", label: "Keamanan", icon: ShieldCheck },
                ...(userRole !== "SUPER_ADMIN"
                  ? [{ id: "Integrasi" as const, label: "Integrasi", icon: Plug }]
                  : []),
                { id: "Backup", label: "Backup & Restore", icon: DatabaseBackup },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = settingsTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSettingsTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-500/30"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-8 lg:col-span-9 space-y-4">
            {settingsTab === "Umum" && (
              <>
                <h2 className="text-base font-extrabold text-navy-800">
                  Informasi Toko
                </h2>

                <div className="p-5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  {!editingStoreInfo ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-navy-800">
                            {storeSettings.storeName}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500">
                            Alamat: {storeSettings.address} • Telp:{" "}
                            {storeSettings.phone}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTempStoreName(storeSettings.storeName);
                          setTempAddress(storeSettings.address);
                          setTempPhone(storeSettings.phone);
                          setEditingStoreInfo(true);
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-navy-800"
                      >
                        Ubah
                      </button>
                    </>
                  ) : (
                    <div className="w-full space-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Nama Toko
                          </label>
                          <input
                            type="text"
                            value={tempStoreName}
                            onChange={(e) => setTempStoreName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Telepon Toko
                          </label>
                          <input
                            type="text"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Alamat Lengkap
                        </label>
                        <input
                          type="text"
                          value={tempAddress}
                          onChange={(e) => setTempAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingStoreInfo(false)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => {
                            onUpdateSettings({
                              ...storeSettings,
                              storeName: tempStoreName,
                              address: tempAddress,
                              phone: tempPhone,
                            });
                            setEditingStoreInfo(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-800">
                      Aktifkan mode offline
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transaksi tetap bisa dilakukan meski tanpa internet
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={storeSettings.offlineModeEnabled}
                    onClick={() =>
                      onUpdateSettings({
                        ...storeSettings,
                        offlineModeEnabled: !storeSettings.offlineModeEnabled,
                      })
                    }
                    className={`w-12 h-7 rounded-full transition p-1 flex items-center ${
                      storeSettings.offlineModeEnabled
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-800">
                      Notifikasi email
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Terima notifikasi transaksi dan sistem
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={storeSettings.emailNotificationEnabled}
                    onClick={() =>
                      onUpdateSettings({
                        ...storeSettings,
                        emailNotificationEnabled:
                          !storeSettings.emailNotificationEnabled,
                      })
                    }
                    className={`w-12 h-7 rounded-full transition p-1 flex items-center ${
                      storeSettings.emailNotificationEnabled
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </>
            )}

            {settingsTab === "Pembayaran" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Metode Pembayaran & Pajak Toko
                </h2>

                {renderPaymentMethodsEditor()}

                <div className="p-5 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-navy-800">
                      Aktifkan Pajak PPN ({storeSettings.taxPercentage}%)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Otomatis menambahkan pajak pada keranjang POS
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        ...storeSettings,
                        enableTax: !storeSettings.enableTax,
                      })
                    }
                    className={`w-12 h-7 rounded-full transition p-1 flex items-center ${
                      storeSettings.enableTax
                        ? "bg-emerald-500 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>
            )}

            {settingsTab === "Integrasi" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Perangkat Kasir (Printer Thermal & Scanner)
                </h2>
                <div className="p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <label className="block text-xs font-bold text-slate-600">
                    Ukuran Kertas Printer Thermal
                  </label>
                  <div className="flex gap-3">
                    {(["58mm", "80mm"] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() =>
                          onUpdateSettings({
                            ...storeSettings,
                            printerPaperSize: sz,
                          })
                        }
                        className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                          storeSettings.printerPaperSize === sz
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        Thermal {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "Keamanan" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Kontrol Keamanan & Audit Log
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <p className="font-extrabold text-navy-800">
                      Tenant Isolation (PostgreSQL RLS)
                    </p>
                    <p className="text-slate-600 mt-1">
                      Aktif • Setiap tabel transaksi diproteksi dengan tenant_id.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <p className="font-extrabold text-navy-800">
                      Idempotency Key Transaksi Offline
                    </p>
                    <p className="text-slate-600 mt-1">
                      Aktif • Mencegah duplikasi transaksi saat koneksi putus-sambung.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Riwayat Audit Log Terbaru
                  </h3>
                  {auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Belum ada aktivitas audit tercatat.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl border border-slate-200/80 text-xs flex justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-navy-800">
                              [{log.action}]
                            </span>{" "}
                            <span className="text-slate-600">
                              {log.details}
                            </span>
                          </div>
                          <span className="text-slate-400 shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "Backup" && (
              <div className="space-y-4">
                <h2 className="text-base font-extrabold text-navy-800">
                  Backup & Pemulihan Data
                </h2>
                <p className="text-xs text-slate-500">
                  Unduh seluruh data produk, stok, transaksi, dan pengaturan dalam format JSON, atau kosongkan seluruh data lokal.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={onExportBackup}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Backup Data (.JSON)</span>
                  </button>
                  <button
                    onClick={onResetAllData}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Kosongkan Seluruh Data</span>
                  </button>
                </div>
              </div>
            )}

            {settingsTab === "Notifikasi" && (
              <div className="p-5 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-navy-800 text-sm">
                  Pengaturan Notifikasi Pintar
                </p>
                <p>
                  • Peringatan otomatis saat stok produk menyentuh batas minimum.
                </p>
                <p>
                  • Peringatan jika sisa masa aktif akun Owner/Kasir kurang dari 7 hari.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE: BANTUAN
  // ============================================================================
  if (mode === "help") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-navy-800">
              Pusat Bantuan KELOKRA
            </h1>
            <p className="text-xs text-slate-500">
              Panduan cepat manajemen akun Super Admin, metode pembayaran Owner, dan kasir POS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-navy-800">
              1. Membuat Akun Owner & Kasir (Super Admin)
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Buka menu <b>Super Admin</b> untuk membuat akun <b>Owner</b> atau <b>Kasir</b> beserta durasi aktifnya (berapa bulan atau 1 tahun), lengkap dengan hitungan sisa waktu.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-navy-800">
              2. Mengatur QRIS & Rekening Bank (Owner)
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Buka menu <b>Metode Pembayaran</b> di role Owner untuk mengaktifkan QRIS, mengupload gambar QRIS toko, serta menambahkan nomor rekening bank (M-Banking) atau E-Wallet.
            </p>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <h3 className="font-extrabold text-navy-800">
              3. Cetak Struk & Mode Offline PWA
            </h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Transaksi Tunai dapat tetap berjalan saat internet putus dan disinkronkan saat online kembali. Struk mendukung printer thermal 58/80mm dan WhatsApp.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE: SUPER ADMIN — BUAT AKUN OWNER & KASIR + DURASI MASA AKTIF (SISA WAKTU)
  // ============================================================================
  const ownerAccountsCount = accounts.filter((a) => a.role === "OWNER").length;
  const cashierAccountsCount = accounts.filter(
    (a) => a.role === "CASHIER"
  ).length;
  const activeAccountsCount = accounts.filter(
    (a) => a.status === "AKTIF" && !getRemainingTimeInfo(a.expiresAt).isExpired
  ).length;
  const expiringSoonCount = accounts.filter((a) => {
    const t = getRemainingTimeInfo(a.expiresAt);
    return !t.isExpired && t.isExpiringSoon;
  }).length;

  const openCreateModal = () => {
    setAccError(null);
    setAccRole("OWNER");
    setAccOwnerMode("OWNER_PLUS_KASIR");
    setAccStoreName(storeSettings.storeName);
    setAccName("");
    setAccUsername("");
    setAccPassword("");
    setAccEmail("");
    setAccDurationMonths(12);
    setCashierDrafts([{ name: "", username: "", password: "" }]);
    setShowAccountModal(true);
  };

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAccError(null);

    if (!accName.trim() || !accUsername.trim() || !accPassword.trim()) {
      setAccError("Nama, Username, dan Password wajib diisi.");
      return;
    }

    const normalizedOwnerUname = accUsername.trim().toLowerCase();
    const existingDuplicate = accounts.find(
      (a) => a.username.toLowerCase() === normalizedOwnerUname
    );
    if (existingDuplicate) {
      setAccError(`Username "${accUsername}" sudah terdaftar.`);
      return;
    }

    const nowIso = new Date().toISOString();
    const months = Math.max(1, Number(accDurationMonths) || 1);
    const expiresIso = addMonthsToIso(nowIso, months);
    const storeLabel = accStoreName.trim() || storeSettings.storeName;

    if (accRole === "OWNER") {
      const ownerId = generateId("acc");
      const createdBatch: ManagedAccount[] = [
        {
          id: ownerId,
          name: accName.trim(),
          username: normalizedOwnerUname,
          password: accPassword,
          email: accEmail.trim() || "-",
          role: "OWNER",
          ownerMode: accOwnerMode,
          storeName: storeLabel,
          durationMonths: months,
          createdAt: nowIso,
          expiresAt: expiresIso,
          status: "AKTIF",
          avatarColor: "#10B981",
          lastLogin: "Belum pernah login",
        },
      ];

      if (accOwnerMode === "OWNER_PLUS_KASIR") {
        const usedUsernames = new Set<string>([
          normalizedOwnerUname,
          ...accounts.map((a) => a.username.toLowerCase()),
        ]);

        for (let i = 0; i < cashierDrafts.length; i++) {
          const draft = cashierDrafts[i];
          if (
            !draft.name.trim() ||
            !draft.username.trim() ||
            !draft.password.trim()
          ) {
            setAccError(
              `Nama, Username, dan Password untuk Kasir ${i + 1} wajib diisi.`
            );
            return;
          }
          const cUname = draft.username.trim().toLowerCase();
          if (usedUsernames.has(cUname)) {
            setAccError(
              `Username kasir "${draft.username}" sudah digunakan atau duplikat.`
            );
            return;
          }
          usedUsernames.add(cUname);

          createdBatch.push({
            id: generateId("acc"),
            name: draft.name.trim(),
            username: cUname,
            password: draft.password,
            email: "-",
            role: "CASHIER",
            parentOwnerId: ownerId,
            storeName: storeLabel,
            durationMonths: months,
            createdAt: nowIso,
            expiresAt: expiresIso,
            status: "AKTIF",
            avatarColor: "#0EA5E9",
            lastLogin: "Belum pernah login",
          });
        }
      }

      onCreateAccountsBatch(createdBatch);
    } else {
      const newCashier: ManagedAccount = {
        id: generateId("acc"),
        name: accName.trim(),
        username: normalizedOwnerUname,
        password: accPassword,
        email: accEmail.trim() || "-",
        role: "CASHIER",
        storeName: storeLabel,
        durationMonths: months,
        createdAt: nowIso,
        expiresAt: expiresIso,
        status: "AKTIF",
        avatarColor: "#0EA5E9",
        lastLogin: "Belum pernah login",
      };
      onCreateAccountsBatch([newCashier]);
    }

    setShowAccountModal(false);
  };

  const handleAddExtraCashierForOwnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCashierOwnerTarget) return;
    setExtraCashierError(null);

    if (
      !extraCashierName.trim() ||
      !extraCashierUsername.trim() ||
      !extraCashierPassword.trim()
    ) {
      setExtraCashierError(
        "Nama, Username, dan Password kasir wajib diisi."
      );
      return;
    }

    const uname = extraCashierUsername.trim().toLowerCase();
    if (accounts.some((a) => a.username.toLowerCase() === uname)) {
      setExtraCashierError(`Username "${extraCashierUsername}" sudah terdaftar.`);
      return;
    }

    const newCashier: ManagedAccount = {
      id: generateId("acc"),
      name: extraCashierName.trim(),
      username: uname,
      password: extraCashierPassword,
      email: "-",
      role: "CASHIER",
      parentOwnerId: addCashierOwnerTarget.id,
      storeName: addCashierOwnerTarget.storeName,
      durationMonths: addCashierOwnerTarget.durationMonths,
      createdAt: new Date().toISOString(),
      expiresAt: addCashierOwnerTarget.expiresAt,
      status: "AKTIF",
      avatarColor: "#0EA5E9",
      lastLogin: "Belum pernah login",
    };

    onCreateAccountsBatch([newCashier]);
    setExtraCashierName("");
    setExtraCashierUsername("");
    setExtraCashierPassword("");
    setAddCashierOwnerTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Top Banner */}
      <div className="bg-navy-800 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white uppercase">
            Super Admin KELOKRA
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold">
            Manajemen Akun Owner & Kasir + Masa Aktif
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Buat akun <b>Owner + Kasir</b> atau <b>Owner Include Kasir</b>, tentukan durasi berapa bulan/setahun, dan pantau sisa waktu aktifnya.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate("dashboard")}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 transition"
            >
              Lihat Grafik Langganan
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-extrabold shadow-md flex items-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Buat Akun (Owner / Kasir)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              Total Akun Dibuat
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-navy-800">
            {accounts.length} Akun
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {ownerAccountsCount} Owner • {cashierAccountsCount} Kasir
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              Akun Masih Aktif
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            {activeAccountsCount} Aktif
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Masa aktif masih berlaku
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              Segera Berakhir (≤ 7 Hari)
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">
            {expiringSoonCount} Akun
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Perlu perpanjangan waktu
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">
              Isolasi & Keamanan
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-navy-800">Siap</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Kontrol penuh oleh Super Admin
          </p>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
              Daftar Akun Owner & Kasir KELOKRA
            </h2>
            <p className="text-xs text-slate-500">
              Memantau durasi langganan akun (bulan/tahun) dan keterangan tinggal berapa lama lagi waktunya.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-navy-800">
              Belum ada akun Owner maupun Kasir yang dibuat
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Klik tombol <b>+ Buat Akun (Owner / Kasir)</b> untuk membuat akun Owner (<b>Owner + Kasir</b> atau <b>Owner Include Kasir</b>) beserta durasi masa aktifnya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">Nama & Toko</th>
                  <th className="py-3 px-3">Role & Tipe</th>
                  <th className="py-3 px-3">Username & Password</th>
                  <th className="py-3 px-3">Durasi Dipilih</th>
                  <th className="py-3 px-3">Sisa Waktu (Countdown)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => {
                  const timeInfo = getRemainingTimeInfo(acc.expiresAt);
                  const showPwd = !!visiblePasswords[acc.id];
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-3">
                        <p className="font-extrabold text-navy-800">
                          {acc.name}
                        </p>
                        <p className="text-xs text-slate-500">{acc.storeName}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                              acc.role === "OWNER"
                                ? "bg-emerald-500 text-white"
                                : "bg-sky-500 text-white"
                            }`}
                          >
                            {acc.role === "OWNER" ? "Owner" : "Kasir"}
                          </span>
                          {acc.role === "OWNER" && (
                            <span className="text-[10px] font-bold text-slate-500">
                              {acc.ownerMode === "OWNER_INCLUDE_KASIR"
                                ? "Owner Include Kasir"
                                : "Owner + Kasir"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs">
                        <p className="font-mono font-bold text-navy-800">
                          @{acc.username}
                        </p>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                          <span className="font-mono">
                            {showPwd ? acc.password : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({
                                ...prev,
                                [acc.id]: !prev[acc.id],
                              }))
                            }
                            className="text-slate-400 hover:text-navy-800"
                          >
                            {showPwd ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs">
                        <p className="font-bold text-navy-800">
                          {acc.durationMonths === 12
                            ? "1 Tahun (12 Bulan)"
                            : `${acc.durationMonths} Bulan`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          s/d {formatDateOnly(acc.expiresAt)}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                            timeInfo.isExpired
                              ? "bg-rose-100 text-rose-700"
                              : timeInfo.isExpiringSoon
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => onToggleAccountStatus(acc.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            acc.status === "AKTIF" && !timeInfo.isExpired
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {acc.status === "AKTIF" && !timeInfo.isExpired
                            ? "Aktif"
                            : "Nonaktif"}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {acc.role === "OWNER" &&
                            acc.ownerMode !== "OWNER_INCLUDE_KASIR" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExtraCashierError(null);
                                  setExtraCashierName("");
                                  setExtraCashierUsername("");
                                  setExtraCashierPassword("");
                                  setAddCashierOwnerTarget(acc);
                                }}
                                title="Tambahkan Akun Kasir untuk Toko Ini"
                                className="px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-emerald-600 text-white text-[11px] font-bold inline-flex items-center gap-1 transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambahkan Kasir</span>
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() => {
                              setExtendTargetAccount(acc);
                              setExtendMonths(1);
                            }}
                            title="Perpanjang Waktu Aktif"
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <CalendarPlus className="w-3 h-3" />
                            <span>Perpanjang</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAccount(acc.id)}
                            title="Hapus Akun"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL BUAT AKUN BARU (OWNER + KASIR / OWNER INCLUDE KASIR / KASIR) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                Buat Akun Baru (Owner / Kasir)
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateAccountSubmit}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Role Akun
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAccRole("OWNER")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition ${
                      accRole === "OWNER"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Owner Bisnis
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccRole("CASHIER")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition ${
                      accRole === "CASHIER"
                        ? "bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    Kasir Operasional
                  </button>
                </div>
              </div>

              {/* Pilihan Mode saat membuat akun OWNER: "Owner + Kasir" vs "Owner Include Kasir" */}
              {accRole === "OWNER" && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <label className="block text-xs font-extrabold text-navy-800">
                    Pilih Tipe Paket Akun Owner
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAccOwnerMode("OWNER_PLUS_KASIR")}
                      className={`p-3 rounded-xl border text-left transition ${
                        accOwnerMode === "OWNER_PLUS_KASIR"
                          ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-white/70 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-extrabold text-navy-800">
                        Owner + Kasir
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Akun Owner kelola toko & langsung dibuatkan akun Kasir terpisah.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccOwnerMode("OWNER_INCLUDE_KASIR")}
                      className={`p-3 rounded-xl border text-left transition ${
                        accOwnerMode === "OWNER_INCLUDE_KASIR"
                          ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-white/70 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-extrabold text-navy-800">
                        Owner Include Kasir
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        1 akun bisa akses semua fitur Owner sekaligus fitur Kasir (POS).
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {accRole === "OWNER"
                      ? "Nama Lengkap Owner"
                      : "Nama Lengkap Kasir"}
                  </label>
                  <input
                    type="text"
                    required
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="Contoh: Andi / Siti"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Toko / Bisnis
                  </label>
                  <input
                    type="text"
                    required
                    value={accStoreName}
                    onChange={(e) => setAccStoreName(e.target.value)}
                    placeholder="Contoh: Toko Utama"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    value={accUsername}
                    onChange={(e) => setAccUsername(e.target.value)}
                    placeholder="Contoh: andi.owner"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Login
                  </label>
                  <input
                    type="text"
                    required
                    value={accPassword}
                    onChange={(e) => setAccPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tentukan Masa Aktif Akun (Berapa Bulan / Setahun)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { label: "1 Bulan", val: 1 },
                    { label: "3 Bulan", val: 3 },
                    { label: "6 Bulan", val: 6 },
                    { label: "1 Tahun", val: 12 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setAccDurationMonths(preset.val)}
                      className={`py-2 rounded-xl border text-xs font-bold transition ${
                        accDurationMonths === preset.val
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-slate-50 border-slate-200 text-navy-800 hover:border-emerald-400"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={accDurationMonths}
                    onChange={(e) =>
                      setAccDurationMonths(Number(e.target.value))
                    }
                    className="w-28 px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-center"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    Bulan • Aktif hingga{" "}
                    <b className="text-emerald-700">
                      {formatDateOnly(
                        addMonthsToIso(
                          new Date().toISOString(),
                          Math.max(1, accDurationMonths || 1)
                        )
                      )}
                    </b>
                  </span>
                </div>
              </div>

              {/* Jika memilih OWNER + KASIR, muncul form buat 1 akun Kasir (+ icon untuk menambah lagi) */}
              {accRole === "OWNER" && accOwnerMode === "OWNER_PLUS_KASIR" && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-navy-800">
                        Buat Akun Kasir Toko Ini ({cashierDrafts.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Otomatis dibuatkan 1 akun Kasir. Klik ikon <b>+</b> jika ingin menambah kasir lagi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCashierDrafts((prev) => [
                          ...prev,
                          { name: "", username: "", password: "" },
                        ])
                      }
                      title="Tambahkan Akun Kasir"
                      className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xs transition shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {cashierDrafts.map((draft, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-sky-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-sky-700">
                            Akun Kasir #{idx + 1}
                          </span>
                          {cashierDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setCashierDrafts((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-rose-500 hover:text-rose-600 p-0.5"
                              title="Hapus baris kasir ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            value={draft.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCashierDrafts((prev) =>
                                prev.map((d, i) =>
                                  i === idx ? { ...d, name: val } : d
                                )
                              );
                            }}
                            placeholder="Nama Kasir"
                            className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                          <input
                            type="text"
                            required
                            value={draft.username}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCashierDrafts((prev) =>
                                prev.map((d, i) =>
                                  i === idx ? { ...d, username: val } : d
                                )
                              );
                            }}
                            placeholder="Username Kasir"
                            className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                          <input
                            type="text"
                            required
                            value={draft.password}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCashierDrafts((prev) =>
                                prev.map((d, i) =>
                                  i === idx ? { ...d, password: val } : d
                                )
                              );
                            }}
                            placeholder="Password Kasir"
                            className="px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {accRole === "OWNER" &&
                accOwnerMode === "OWNER_INCLUDE_KASIR" && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                    Mode <b>Owner Include Kasir</b> aktif: Akun ini bisa mengakses seluruh fitur Owner sekaligus fitur Kasir (POS) tanpa perlu membuat akun Kasir terpisah.
                  </div>
                )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={accEmail}
                  onChange={(e) => setAccEmail(e.target.value)}
                  placeholder="email@toko.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              {accError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                  {accError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  Simpan & Aktifkan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAHKAN KASIR UNTUK OWNER (Pengganti tombol Masuk di tabel) */}
      {addCashierOwnerTarget && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-navy-800">
                  Tambahkan Akun Kasir
                </h3>
                <p className="text-xs text-slate-500">
                  Toko: <b>{addCashierOwnerTarget.storeName}</b> (Owner:{" "}
                  {addCashierOwnerTarget.name})
                </p>
              </div>
              <button
                onClick={() => setAddCashierOwnerTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAddExtraCashierForOwnerSubmit}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kasir
                </label>
                <input
                  type="text"
                  required
                  value={extraCashierName}
                  onChange={(e) => setExtraCashierName(e.target.value)}
                  placeholder="Contoh: Siti Kasir"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username Login Kasir
                </label>
                <input
                  type="text"
                  required
                  value={extraCashierUsername}
                  onChange={(e) => setExtraCashierUsername(e.target.value)}
                  placeholder="Contoh: siti.kasir"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Login Kasir
                </label>
                <input
                  type="text"
                  required
                  value={extraCashierPassword}
                  onChange={(e) => setExtraCashierPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 text-[11px] font-semibold text-emerald-800">
                Masa aktif kasir mengikuti Owner hingga{" "}
                <b>{formatDateOnly(addCashierOwnerTarget.expiresAt)}</b>.
              </div>

              {extraCashierError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                  {extraCashierError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddCashierOwnerTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                >
                  + Tambahkan Kasir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PERPANJANG MASA AKTIF AKUN */}
      {extendTargetAccount && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-navy-800">
                Perpanjang Masa Aktif Akun
              </h3>
              <button
                onClick={() => setExtendTargetAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                Akun: <b>{extendTargetAccount.name}</b> (@
                {extendTargetAccount.username})
              </p>
              <p>
                Berakhir saat ini:{" "}
                <b>{formatDateOnly(extendTargetAccount.expiresAt)}</b> (
                {getRemainingTimeInfo(extendTargetAccount.expiresAt).label})
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "+1 Bln", val: 1 },
                { label: "+3 Bln", val: 3 },
                { label: "+6 Bln", val: 6 },
                { label: "+1 Thn", val: 12 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setExtendMonths(p.val)}
                  className={`py-2 rounded-xl border text-xs font-bold ${
                    extendMonths === p.val
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-slate-50 border-slate-200 text-navy-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <input
                type="number"
                min={1}
                value={extendMonths}
                onChange={(e) => setExtendMonths(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
              />
              <span className="text-slate-600">Bulan tambahan</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExtendTargetAccount(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onExtendAccount(
                    extendTargetAccount.id,
                    Math.max(1, extendMonths || 1)
                  );
                  setExtendTargetAccount(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold"
              >
                Simpan Perpanjangan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
