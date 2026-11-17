"use client";

import React, { useState, useEffect } from "react";
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
  KeyRound,
  Lock,
  UserPlus,
  Info,
  AlertTriangle,
  Copy,
  Check,
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
import {
  ALLOWED_QRIS_IMAGE_TYPES,
  clampPositiveInt,
  copyTextSafe,
  hashPasswordWithSalt,
  verifyPasswordWithSalt,
} from "@/lib/security";
import { StoreAccountDetailModal } from "@/components/StoreAccountDetailModal";

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
  onResetAccountPassword?: (
    accountId: string,
    passwordHash: string,
    passwordSalt: string,
    updatedEmail?: string
  ) => void;
  onUpdateSettings: (next: StoreSettings) => void;
  onExportBackup: () => void;
  onImportBackup?: (jsonText: string) => { ok: boolean; message: string };
  onResetAllData: () => void;
  onNavigate?: (menu: string) => void;
}

function GmailLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.25 6.5v11A1.75 1.75 0 0 0 4 19.25h2.75v-7.5L12 15.7l5.25-3.95v7.5H20a1.75 1.75 0 0 0 1.75-1.75v-11c0-1.4-1.58-2.2-2.7-1.36L12 10.45 4.95 5.14C3.83 4.3 2.25 5.1 2.25 6.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M2.25 6.5v11A1.75 1.75 0 0 0 4 19.25h2.75v-7.5L2.25 8.35V6.5Z"
        fill="#4285F4"
      />
      <path
        d="M21.75 6.5v11A1.75 1.75 0 0 1 20 19.25h-2.75v-7.5l4.5-3.4V6.5Z"
        fill="#34A853"
      />
      <path
        d="M17.25 11.75v-4.2l1.8-1.36c1.12-.84 2.7-.04 2.7 1.36v.8l-4.5 3.4Z"
        fill="#FBBC05"
      />
      <path
        d="M2.25 8.35v-1.85c0-1.4 1.58-2.2 2.7-1.36L12 10.45l5.25-3.95v5.25L12 15.7 2.25 8.35Z"
        fill="#EA4335"
      />
    </svg>
  );
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
  onResetAccountPassword,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
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
  const [selectedParentOwnerId, setSelectedParentOwnerId] =
    useState<string>("");
  const [accError, setAccError] = useState<string | null>(null);
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);

  // One-time credential card after Super Admin creates accounts
  const [createdCredentialsOnce, setCreatedCredentialsOnce] = useState<
    { role: string; name: string; username: string; password: string }[] | null
  >(null);
  const [copiedBatchCreds, setCopiedBatchCreds] = useState(false);

  // Payment / Security / Data confirmation states
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [confirmDeleteChannelId, setConfirmDeleteChannelId] = useState<
    string | null
  >(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Selected Owner for Eye Icon Detail Modal
  const [detailOwner, setDetailOwner] = useState<ManagedAccount | null>(null);

  // Owner Change Kasir Password Modal (2-step: verify old password -> enter new & repeat new)
  const [changePwdTarget, setChangePwdTarget] = useState<ManagedAccount | null>(
    null
  );
  const [pwdStep, setPwdStep] = useState<1 | 2>(1);
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [repeatNewPasswordInput, setRepeatNewPasswordInput] = useState("");
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showRepeatPwd, setShowRepeatPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  const openCashierChangePasswordModal = (acc: ManagedAccount) => {
    setChangePwdTarget(acc);
    setPwdStep(1);
    setOldPasswordInput("");
    setNewPasswordInput("");
    setRepeatNewPasswordInput("");
    setShowOldPwd(false);
    setShowNewPwd(false);
    setShowRepeatPwd(false);
    setPwdError(null);
  };

  const handleVerifyOldCashierPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePwdTarget) return;
    setPwdError(null);

    if (!oldPasswordInput) {
      setPwdError("Masukkan kata sandi lama kasir terlebih dahulu.");
      return;
    }

    let matched = false;
    if (changePwdTarget.passwordHash && changePwdTarget.passwordSalt) {
      matched = await verifyPasswordWithSalt(
        oldPasswordInput,
        changePwdTarget.passwordHash,
        changePwdTarget.passwordSalt
      );
    } else if (changePwdTarget.password) {
      matched = changePwdTarget.password === oldPasswordInput;
    }

    if (!matched) {
      setPwdError("Kata sandi lama tidak benar. Periksa kembali.");
      return;
    }

    setPwdStep(2);
    setNewPasswordInput("");
    setRepeatNewPasswordInput("");
  };

  const handleSaveNewCashierPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePwdTarget) return;
    setPwdError(null);

    if (newPasswordInput.trim().length < 6) {
      setPwdError("Kata sandi baru minimal 6 karakter.");
      return;
    }
    if (newPasswordInput !== repeatNewPasswordInput) {
      setPwdError("Pengulangan kata sandi baru tidak cocok.");
      return;
    }

    setIsUpdatingPwd(true);
    try {
      const { passwordHash, passwordSalt } = await hashPasswordWithSalt(
        newPasswordInput
      );
      if (onResetAccountPassword) {
        onResetAccountPassword(changePwdTarget.id, passwordHash, passwordSalt);
      }
      setChangePwdTarget(null);
      setOldPasswordInput("");
      setNewPasswordInput("");
      setRepeatNewPasswordInput("");
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  // Owner Change Own Password Modal (Best-practice 2FA: Current Password + Gmail OTP -> New Password)
  const [ownerPwdTarget, setOwnerPwdTarget] = useState<ManagedAccount | null>(
    null
  );
  const [ownerPwdStep, setOwnerPwdStep] = useState<1 | 2>(1);
  const [ownerCurrentPwd, setOwnerCurrentPwd] = useState("");
  const [ownerEmailInput, setOwnerEmailInput] = useState("");
  const [ownerHasBoundEmail, setOwnerHasBoundEmail] = useState(false);
  const [ownerOtpInput, setOwnerOtpInput] = useState("");
  const [ownerNewPwd, setOwnerNewPwd] = useState("");
  const [ownerRepeatNewPwd, setOwnerRepeatNewPwd] = useState("");
  const [showOwnerCurPwd, setShowOwnerCurPwd] = useState(false);
  const [showOwnerNewPwd, setShowOwnerNewPwd] = useState(false);
  const [showOwnerRepPwd, setShowOwnerRepPwd] = useState(false);
  const [ownerDeliveryMode, setOwnerDeliveryMode] = useState<
    "GMAIL_SMTP" | "SIMULATION" | null
  >(null);
  const [ownerMaskedEmail, setOwnerMaskedEmail] = useState("");
  const [ownerSimOtp, setOwnerSimOtp] = useState<string | null>(null);
  const [ownerCooldownSec, setOwnerCooldownSec] = useState(0);
  const [ownerExpirySec, setOwnerExpirySec] = useState(0);
  const [ownerPwdError, setOwnerPwdError] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (!ownerPwdTarget || ownerPwdStep !== 2) return;
    if (ownerCooldownSec <= 0 && ownerExpirySec <= 0) return;
    const timer = setInterval(() => {
      setOwnerCooldownSec((c) => (c > 0 ? c - 1 : 0));
      setOwnerExpirySec((e) => (e > 0 ? e - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [ownerPwdTarget, ownerPwdStep, ownerCooldownSec, ownerExpirySec]);

  const openOwnerChangePasswordModal = (acc: ManagedAccount) => {
    const validExisting =
      !!acc.email && acc.email !== "-" && acc.email.includes("@");
    setOwnerPwdTarget(acc);
    setOwnerPwdStep(1);
    setOwnerCurrentPwd("");
    setOwnerEmailInput(validExisting ? acc.email : "");
    setOwnerHasBoundEmail(validExisting);
    setOwnerOtpInput("");
    setOwnerNewPwd("");
    setOwnerRepeatNewPwd("");
    setShowOwnerCurPwd(false);
    setShowOwnerNewPwd(false);
    setShowOwnerRepPwd(false);
    setOwnerDeliveryMode(null);
    setOwnerMaskedEmail("");
    setOwnerSimOtp(null);
    setOwnerCooldownSec(0);
    setOwnerExpirySec(0);
    setOwnerPwdError(null);
  };

  const sendOwnerOtpToGmail = async (targetAcc: ManagedAccount, email: string) => {
    setIsRequestingOtp(true);
    setOwnerPwdError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: targetAcc.id,
          email,
          storeName: targetAcc.storeName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOwnerPwdError(
          data.error || "Gagal mengirim kode OTP ke Gmail. Coba lagi."
        );
        return false;
      }
      setOwnerDeliveryMode(data.deliveryMode);
      setOwnerMaskedEmail(data.maskedEmail || email);
      setOwnerSimOtp(data.simulationOtp || null);
      setOwnerCooldownSec(data.resendCooldownSeconds || 60);
      setOwnerExpirySec(data.expiresInSeconds || 300);
      setOwnerPwdStep(2);
      return true;
    } catch {
      setOwnerPwdError(
        "Gagal terhubung ke server untuk mengirim kode OTP Gmail."
      );
      return false;
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleRequestOwnerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerPwdTarget || isRequestingOtp) return;
    setOwnerPwdError(null);

    if (!ownerCurrentPwd) {
      setOwnerPwdError("Masukkan kata sandi saat ini terlebih dahulu.");
      return;
    }

    let matched = false;
    if (ownerPwdTarget.passwordHash && ownerPwdTarget.passwordSalt) {
      matched = await verifyPasswordWithSalt(
        ownerCurrentPwd,
        ownerPwdTarget.passwordHash,
        ownerPwdTarget.passwordSalt
      );
    } else if (ownerPwdTarget.password) {
      matched = ownerPwdTarget.password === ownerCurrentPwd;
    }

    if (!matched) {
      setOwnerPwdError("Kata sandi saat ini tidak benar. Periksa kembali.");
      return;
    }

    const cleanEmail = ownerEmailInput.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setOwnerPwdError("Masukkan alamat email Gmail yang valid.");
      return;
    }

    await sendOwnerOtpToGmail(ownerPwdTarget, cleanEmail);
  };

  const handleVerifyAndSaveOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerPwdTarget || isVerifyingOtp) return;
    setOwnerPwdError(null);

    const cleanOtp = ownerOtpInput.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOwnerPwdError("Kode OTP wajib berupa 6 digit angka.");
      return;
    }

    if (ownerNewPwd.length < 8) {
      setOwnerPwdError(
        "Demi keamanan Owner, kata sandi baru minimal 8 karakter."
      );
      return;
    }
    if (!/[A-Za-z]/.test(ownerNewPwd) || !/\d/.test(ownerNewPwd)) {
      setOwnerPwdError(
        "Kata sandi baru wajib mengombinasikan huruf dan angka agar kuat."
      );
      return;
    }
    if (ownerNewPwd === ownerCurrentPwd) {
      setOwnerPwdError(
        "Kata sandi baru tidak boleh sama dengan kata sandi lama."
      );
      return;
    }
    if (ownerNewPwd !== ownerRepeatNewPwd) {
      setOwnerPwdError("Pengulangan kata sandi baru tidak cocok.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const verifyRes = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: cleanOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        setOwnerPwdError(
          verifyData.error || "Kode OTP salah atau telah kadaluarsa."
        );
        return;
      }

      const { passwordHash, passwordSalt } = await hashPasswordWithSalt(
        ownerNewPwd
      );
      if (onResetAccountPassword) {
        onResetAccountPassword(
          ownerPwdTarget.id,
          passwordHash,
          passwordSalt,
          verifyData.email || ownerEmailInput.trim().toLowerCase()
        );
      }
      setOwnerPwdTarget(null);
      setOwnerCurrentPwd("");
      setOwnerOtpInput("");
      setOwnerNewPwd("");
      setOwnerRepeatNewPwd("");
    } catch {
      setOwnerPwdError("Gagal memverifikasi kode OTP ke server.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle QRIS image upload to Base64 Data URL (SVG blocked to prevent XSS)
  const handleQrisFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrisError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_QRIS_IMAGE_TYPES.has(file.type)) {
      setQrisError(
        "Format gambar tidak diizinkan. Upload PNG, JPG, JPEG, atau WebP saja (SVG ditolak demi keamanan)."
      );
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setQrisError("Ukuran gambar QRIS maksimal 2 MB.");
      e.target.value = "";
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
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
            {qrisError && (
              <p className="text-xs font-bold text-rose-600">{qrisError}</p>
            )}
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
                    {confirmDeleteChannelId === ch.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteChannel(ch.id);
                            setConfirmDeleteChannelId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold"
                        >
                          Hapus?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteChannelId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-200 text-slate-600 text-[10px] font-bold"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteChannelId(ch.id)}
                        title="Hapus"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                    {userRole === "OWNER" && (
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    )}
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
                        {userRole === "OWNER" && (
                          <td className="py-3.5 px-4 text-right">
                            {acc.role === "CASHIER" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openCashierChangePasswordModal(acc)
                                }
                                className="px-3 py-1.5 rounded-xl border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-bold inline-flex items-center gap-1.5 transition"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Ubah Kata Sandi</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openOwnerChangePasswordModal(acc)
                                }
                                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-navy-800 text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs"
                              >
                                <GmailLogo className="w-4 h-4 shrink-0" />
                                <span>Ubah Kata Sandi</span>
                              </button>
                            )}
                          </td>
                        )}
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

        {/* Modal Ubah Kata Sandi Kasir (Khusus Role Owner) */}
        {changePwdTarget && userRole === "OWNER" && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-navy-800 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-emerald-600" />
                    <span>Ubah Kata Sandi Kasir</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Akun Kasir: <b>{changePwdTarget.name}</b> (@
                    {changePwdTarget.username})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setChangePwdTarget(null)}
                  aria-label="Tutup Modal"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {pwdStep === 1 ? (
                <form
                  onSubmit={handleVerifyOldCashierPassword}
                  className="space-y-4 text-sm"
                >
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Masukkan <b>kata sandi lama</b> kasir terlebih dahulu untuk melanjutkan ke pembuatan kata sandi baru.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Lama
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPwd ? "text" : "password"}
                        required
                        autoFocus
                        value={oldPasswordInput}
                        onChange={(e) => setOldPasswordInput(e.target.value)}
                        placeholder="Masukkan kata sandi lama..."
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPwd((v) => !v)}
                        aria-label="Tampilkan Kata Sandi Lama"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
                      >
                        {showOldPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {pwdError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                      {pwdError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setChangePwdTarget(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-navy-800 hover:bg-emerald-600 text-white font-bold text-xs transition"
                    >
                      Verifikasi Kata Sandi Lama
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={handleSaveNewCashierPassword}
                  className="space-y-4 text-sm"
                >
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Kata sandi lama benar. Silakan masukkan kata sandi baru.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? "text" : "password"}
                        required
                        autoFocus
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((v) => !v)}
                        aria-label="Tampilkan Kata Sandi Baru"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
                      >
                        {showNewPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ulangi Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showRepeatPwd ? "text" : "password"}
                        required
                        value={repeatNewPasswordInput}
                        onChange={(e) =>
                          setRepeatNewPasswordInput(e.target.value)
                        }
                        placeholder="Ketik ulang kata sandi baru..."
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRepeatPwd((v) => !v)}
                        aria-label="Tampilkan Ulangi Kata Sandi Baru"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
                      >
                        {showRepeatPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {pwdError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                      {pwdError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setChangePwdTarget(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingPwd}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs transition"
                    >
                      {isUpdatingPwd
                        ? "Menyimpan..."
                        : "Simpan Kata Sandi Baru"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal Ubah Kata Sandi Owner (Via Gmail OTP + Keamanan 2 Lapis) */}
        {ownerPwdTarget && userRole === "OWNER" && (
          <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-center shrink-0">
                    <GmailLogo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-navy-800">
                      Ubah Kata Sandi Owner
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verifikasi via <b>Gmail</b> • @{ownerPwdTarget.username}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOwnerPwdTarget(null)}
                  aria-label="Tutup Modal Owner"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {ownerPwdStep === 1 ? (
                <form
                  onSubmit={handleRequestOwnerOtp}
                  className="space-y-4 text-sm"
                >
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-navy-800 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <b>Keamanan 2 Lapis:</b> Masukkan kata sandi saat ini terlebih dahulu, lalu kirim kode OTP 6 digit ke Gmail Anda.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Saat Ini
                    </label>
                    <div className="relative">
                      <input
                        type={showOwnerCurPwd ? "text" : "password"}
                        required
                        autoFocus
                        value={ownerCurrentPwd}
                        onChange={(e) => setOwnerCurrentPwd(e.target.value)}
                        placeholder="Masukkan kata sandi saat ini..."
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerCurPwd((v) => !v)}
                        aria-label="Tampilkan Kata Sandi Saat Ini"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
                      >
                        {showOwnerCurPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                      <GmailLogo className="w-3.5 h-3.5" />
                      <span>Alamat Gmail Verifikasi (OTP)</span>
                    </label>
                    <input
                      type="email"
                      required
                      readOnly={ownerHasBoundEmail}
                      value={ownerEmailInput}
                      onChange={(e) => setOwnerEmailInput(e.target.value)}
                      placeholder="contoh@gmail.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 ${
                        ownerHasBoundEmail
                          ? "bg-slate-50 text-slate-600 cursor-not-allowed"
                          : ""
                      }`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {ownerHasBoundEmail
                        ? "Dikunci ke alamat Gmail terdaftar pada akun Owner ini demi keamanan."
                        : "Belum ada email terdaftar. Email ini akan dikaitkan permanen ke akun Owner Anda."}
                    </p>
                  </div>

                  {ownerPwdError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                      {ownerPwdError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setOwnerPwdTarget(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isRequestingOtp}
                      className="flex-1 py-2.5 rounded-xl bg-navy-800 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition"
                    >
                      <GmailLogo className="w-4 h-4" />
                      <span>
                        {isRequestingOtp
                          ? "Mengirim Kode..."
                          : "Kirim Kode OTP ke Gmail"}
                      </span>
                    </button>
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={handleVerifyAndSaveOwnerPassword}
                  className="space-y-4 text-sm"
                >
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      ownerDeliveryMode === "GMAIL_SMTP"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold inline-flex items-center gap-1.5">
                        <GmailLogo className="w-4 h-4" />
                        <span>
                          {ownerDeliveryMode === "GMAIL_SMTP"
                            ? `Kode OTP Terkirim ke ${ownerMaskedEmail}`
                            : `Mode Simulasi OTP (${ownerMaskedEmail})`}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-[11px]">
                        {Math.floor(ownerExpirySec / 60)}:
                        {String(ownerExpirySec % 60).padStart(2, "0")}
                      </span>
                    </div>
                    {ownerDeliveryMode === "GMAIL_SMTP" ? (
                      <p>
                        Periksa Kotak Masuk atau folder Spam pada Gmail Anda, lalu masukkan 6 digit kode di bawah.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <p>
                          SMTP Gmail belum diset di server (<code>GMAIL_USER</code> &amp; <code>GMAIL_APP_PASSWORD</code>), sehingga kode uji coba ditampilkan sementara:
                        </p>
                        {ownerSimOtp && (
                          <p className="font-mono font-extrabold text-base tracking-widest text-navy-800 bg-white px-3 py-1.5 rounded-lg border border-amber-300 inline-block">
                            {ownerSimOtp}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Kode OTP Gmail (6 Digit)
                      </label>
                      <button
                        type="button"
                        disabled={ownerCooldownSec > 0 || isRequestingOtp}
                        onClick={() =>
                          sendOwnerOtpToGmail(
                            ownerPwdTarget,
                            ownerEmailInput.trim().toLowerCase()
                          )
                        }
                        className="text-[11px] font-bold text-emerald-700 hover:underline disabled:text-slate-400 disabled:no-underline"
                      >
                        {ownerCooldownSec > 0
                          ? `Kirim ulang (${ownerCooldownSec}d)`
                          : "Kirim Ulang Kode"}
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      value={ownerOtpInput}
                      onChange={(e) =>
                        setOwnerOtpInput(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Masukkan 6 digit kode OTP"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-base font-extrabold tracking-widest text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Baru (Min. 8 Karakter, Huruf &amp; Angka)
                    </label>
                    <div className="relative">
                      <input
                        type={showOwnerNewPwd ? "text" : "password"}
                        required
                        value={ownerNewPwd}
                        onChange={(e) => setOwnerNewPwd(e.target.value)}
                        placeholder="Contoh: TokoMaju2026"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerNewPwd((v) => !v)}
                        aria-label="Tampilkan Kata Sandi Baru Owner"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
                      >
                        {showOwnerNewPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ulangi Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showOwnerRepPwd ? "text" : "password"}
                        required
                        value={ownerRepeatNewPwd}
                        onChange={(e) => setOwnerRepeatNewPwd(e.target.value)}
                        placeholder="Ketik ulang kata sandi baru..."
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerRepPwd((v) => !v)}
                        aria-label="Tampilkan Ulangi Kata Sandi Baru Owner"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
                      >
                        {showOwnerRepPwd ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {ownerPwdError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                      {ownerPwdError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOwnerPwdStep(1);
                        setOwnerPwdError(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingOtp}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold text-xs transition"
                    >
                      {isVerifyingOtp
                        ? "Memverifikasi OTP..."
                        : "Verifikasi & Simpan Sandi"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
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
                  Unduh atau pulihkan data produk, stok, transaksi, dan pengaturan toko dalam format JSON yang tervalidasi (kredensial login tetap terlindungi).
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Backup Data (.JSON)</span>
                  </button>
                  {onImportBackup && (
                    <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-white text-xs font-bold flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Pulihkan / Restore (.JSON)</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") {
                              const res = onImportBackup(reader.result);
                              setBackupFeedback(res);
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Kosongkan Data Toko</span>
                  </button>
                </div>

                {backupFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold border ${
                      backupFeedback.ok
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {backupFeedback.message}
                  </div>
                )}

                {showResetConfirm && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-extrabold text-rose-900">
                          Konfirmasi Kosongkan Data Operasional Toko
                        </p>
                        <p className="text-rose-800">
                          Produk, riwayat transaksi penjualan, stok, dan pengeluaran pada toko aktif ini akan dikosongkan. Akun login Owner/Kasir tetap aman. Disarankan unduh backup terlebih dahulu.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onResetAllData();
                          setShowResetConfirm(false);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                      >
                        Ya, Kosongkan Data Toko
                      </button>
                    </div>
                  </div>
                )}
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
    setAccStoreName("");
    setAccName("");
    setAccUsername("");
    setAccPassword("");
    setAccEmail("");
    setAccDurationMonths(12);
    setCashierDrafts([{ name: "", username: "", password: "" }]);
    const owners = accounts.filter((a) => a.role === "OWNER");
    setSelectedParentOwnerId(owners.length === 1 ? owners[0].id : "");
    setShowAccountModal(true);
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccError(null);

    if (!accName.trim() || !accUsername.trim() || !accPassword.trim()) {
      setAccError("Nama, Username, dan Password wajib diisi.");
      return;
    }

    if (accPassword.trim().length < 6) {
      setAccError("Password Owner minimal 6 karakter demi keamanan akun.");
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
    const months = Math.min(120, clampPositiveInt(Number(accDurationMonths), 1));
    const expiresIso = addMonthsToIso(nowIso, months);
    const storeLabel = accStoreName.trim() || storeSettings.storeName;

    setIsCreatingAccounts(true);
    try {
      if (accRole === "OWNER") {
        const ownerId = generateId("acc");
        const ownerHash = await hashPasswordWithSalt(accPassword);
        const createdBatch: ManagedAccount[] = [
          {
            id: ownerId,
            name: accName.trim(),
            username: normalizedOwnerUname,
            passwordHash: ownerHash.passwordHash,
            passwordSalt: ownerHash.passwordSalt,
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
        const onceSummary: {
          role: string;
          name: string;
          username: string;
          password: string;
        }[] = [
          {
            role: "Owner",
            name: accName.trim(),
            username: normalizedOwnerUname,
            password: accPassword,
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
            if (draft.password.trim().length < 6) {
              setAccError(
                `Password Kasir ${i + 1} minimal 6 karakter demi keamanan akun.`
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

            const cHash = await hashPasswordWithSalt(draft.password);
            createdBatch.push({
              id: generateId("acc"),
              name: draft.name.trim(),
              username: cUname,
              passwordHash: cHash.passwordHash,
              passwordSalt: cHash.passwordSalt,
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
            onceSummary.push({
              role: "Kasir",
              name: draft.name.trim(),
              username: cUname,
              password: draft.password,
            });
          }
        }

        onCreateAccountsBatch(createdBatch);
        setCreatedCredentialsOnce(onceSummary);
        setCopiedBatchCreds(false);
      } else {
        const ownersList = accounts.filter((a) => a.role === "OWNER");
        const parentOwner = ownersList.find(
          (a) => a.id === selectedParentOwnerId
        );
        if (ownersList.length > 0 && !parentOwner) {
          setAccError(
            "Pilih Toko / Owner pemilik kasir ini terlebih dahulu agar data toko tidak tertukar."
          );
          return;
        }
        const cHash = await hashPasswordWithSalt(accPassword);
        const newCashier: ManagedAccount = {
          id: generateId("acc"),
          name: accName.trim(),
          username: normalizedOwnerUname,
          passwordHash: cHash.passwordHash,
          passwordSalt: cHash.passwordSalt,
          email: accEmail.trim() || "-",
          role: "CASHIER",
          parentOwnerId: parentOwner?.id,
          storeName: parentOwner ? parentOwner.storeName : storeLabel,
          durationMonths: parentOwner ? parentOwner.durationMonths : months,
          createdAt: nowIso,
          expiresAt: parentOwner ? parentOwner.expiresAt : expiresIso,
          status: "AKTIF",
          avatarColor: "#0EA5E9",
          lastLogin: "Belum pernah login",
        };
        onCreateAccountsBatch([newCashier]);
        setCreatedCredentialsOnce([
          {
            role: "Kasir",
            name: newCashier.name,
            username: normalizedOwnerUname,
            password: accPassword,
          },
        ]);
        setCopiedBatchCreds(false);
      }

      setShowAccountModal(false);
    } finally {
      setIsCreatingAccounts(false);
    }
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

      {/* One-time Credential Display Card */}
      {createdCredentialsOnce && createdCredentialsOnce.length > 0 && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Kredensial Akun Baru (Tampil 1 Kali — Simpan Sekarang)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = createdCredentialsOnce
                    .map(
                      (c) =>
                        `[${c.role}] ${c.name} -> Username: ${c.username} | Password: ${c.password}`
                    )
                    .join("\n");
                  copyTextSafe(text);
                  setCopiedBatchCreds(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
              >
                {copiedBatchCreds ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Semua Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Semua Kredensial</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentialsOnce(null)}
                className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
          <p className="text-xs text-emerald-900/80">
            Password telah dienkripsi menggunakan SHA-256 + salt dan tidak dapat dilihat lagi setelah kartu ini ditutup (gunakan tombol Reset Password di detail toko jika lupa).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {createdCredentialsOnce.map((c, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-emerald-200 text-xs font-mono text-navy-800 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="font-sans font-bold text-emerald-700 mr-1.5">
                    [{c.role}]
                  </span>
                  <span className="font-sans font-semibold">{c.name}</span>
                </div>
                <div>
                  @<b>{c.username}</b> / <b>{c.password}</b>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts Table (Sama dengan Catatan Langganan: Nama Toko | Type Akun | Mulai Langganan | Jenis Durasi | Sisa Waktu | Icon Mata) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-navy-800">
              Daftar Semua Akun Toko & Langganan KELOKRA
            </h2>
            <p className="text-xs text-slate-500">
              Klik ikon mata (<Eye className="w-3.5 h-3.5 inline text-emerald-600" />) untuk melihat detail akun Owner & Kasir, memperpanjang, menghapus, atau menambah kasir.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Akun Baru</span>
          </button>
        </div>

        {accounts.filter((a) => a.role === "OWNER").length === 0 ? (
          <div className="py-12 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-navy-800">
              Belum ada akun Owner yang dibuat
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
                  <th className="py-3 px-3">Nama Toko</th>
                  <th className="py-3 px-3">Type Akun</th>
                  <th className="py-3 px-3">Mulai Langganan</th>
                  <th className="py-3 px-3">Jenis Durasi</th>
                  <th className="py-3 px-3">Sisa Waktu</th>
                  <th className="py-3 px-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts
                  .filter((a) => a.role === "OWNER")
                  .map((acc) => {
                    const timeInfo = getRemainingTimeInfo(acc.expiresAt);
                    const isYearly = acc.durationMonths >= 12;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-3">
                          <p className="font-extrabold text-navy-800">
                            {acc.storeName}
                          </p>
                        </td>
                        <td className="py-3.5 px-3 text-xs font-bold">
                          <span
                            className={`px-2.5 py-1 rounded-lg ${
                              acc.ownerMode === "OWNER_INCLUDE_KASIR"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {acc.ownerMode === "OWNER_INCLUDE_KASIR"
                              ? "Owner Include Kasir"
                              : "Owner + Kasir"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-600">
                          {formatDateOnly(acc.createdAt)}
                        </td>
                        <td className="py-3.5 px-3 text-xs font-bold">
                          <span
                            className={`px-2.5 py-1 rounded-lg ${
                              isYearly
                                ? "bg-emerald-500 text-white"
                                : "bg-sky-500 text-white"
                            }`}
                          >
                            {isYearly
                              ? `Tahunan (${acc.durationMonths} Bln)`
                              : `Bulanan (${acc.durationMonths} Bln)`}
                          </span>
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
                        <td className="py-3.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setDetailOwner(acc)}
                            title="Lihat Detail Akun Owner & Kasir"
                            className="p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-navy-800 hover:text-emerald-700 inline-flex items-center justify-center transition"
                          >
                            <Eye className="w-4 h-4" />
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

              {accRole === "CASHIER" &&
                accounts.some((a) => a.role === "OWNER") && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hubungkan ke Toko / Owner
                    </label>
                    <select
                      required
                      value={selectedParentOwnerId}
                      onChange={(e) => {
                        setSelectedParentOwnerId(e.target.value);
                        const found = accounts.find(
                          (a) => a.id === e.target.value
                        );
                        if (found) setAccStoreName(found.storeName);
                        else setAccStoreName("");
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm"
                    >
                      <option value="">-- Pilih Toko / Owner --</option>
                      {accounts
                        .filter((a) => a.role === "OWNER")
                        .map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.storeName} (Owner: {o.name} • @{o.username})
                          </option>
                        ))}
                    </select>
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
                    required={accRole === "OWNER"}
                    readOnly={
                      accRole === "CASHIER" &&
                      accounts.some((a) => a.role === "OWNER")
                    }
                    value={
                      accRole === "CASHIER" && selectedParentOwnerId
                        ? accounts.find((a) => a.id === selectedParentOwnerId)
                            ?.storeName || accStoreName
                        : accStoreName
                    }
                    onChange={(e) => setAccStoreName(e.target.value)}
                    placeholder={
                      accRole === "CASHIER"
                        ? "Otomatis mengikuti Owner terpilih"
                        : "Contoh: Toko Kopi A"
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 ${
                      accRole === "CASHIER" &&
                      accounts.some((a) => a.role === "OWNER")
                        ? "bg-slate-50 text-slate-500 cursor-not-allowed"
                        : ""
                    }`}
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
                    placeholder="Minimal 6 karakter"
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
                      setAccDurationMonths(
                        Math.min(120, clampPositiveInt(Number(e.target.value), 1))
                      )
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
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                  <GmailLogo className="w-3.5 h-3.5" />
                  <span>
                    Email Gmail {accRole === "OWNER" ? "Owner (Untuk OTP)" : "(Opsional)"}
                  </span>
                </label>
                <input
                  type="email"
                  value={accEmail}
                  onChange={(e) => setAccEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
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
                  disabled={isCreatingAccounts}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold"
                >
                  {isCreatingAccounts
                    ? "Mengenkripsi Akun..."
                    : "Simpan & Aktifkan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL AKUN OWNER & KASIR (Icon Mata) */}
      <StoreAccountDetailModal
        ownerAccount={detailOwner}
        allAccounts={accounts}
        onClose={() => setDetailOwner(null)}
        onCreateAccountsBatch={onCreateAccountsBatch}
        onExtendAccount={onExtendAccount}
        onToggleAccountStatus={onToggleAccountStatus}
        onDeleteAccount={onDeleteAccount}
        onResetAccountPassword={onResetAccountPassword}
      />
    </div>
  );
}
