"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  KeyRound,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { ManagedAccount } from "@/types/nextpos";
import {
  formatDateOnly,
  generateId,
  getRemainingTimeInfo,
} from "@/lib/format";
import {
  clampPositiveInt,
  copyTextSafe,
  hashPasswordWithSalt,
} from "@/lib/security";

interface StoreAccountDetailModalProps {
  ownerAccount: ManagedAccount | null;
  allAccounts: ManagedAccount[];
  onClose: () => void;
  onCreateAccountsBatch: (newAccounts: ManagedAccount[]) => void;
  onExtendAccount: (accountId: string, addMonths: number) => void;
  onToggleAccountStatus: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onResetAccountPassword?: (
    accountId: string,
    passwordHash: string,
    passwordSalt: string
  ) => void;
}

export function StoreAccountDetailModal({
  ownerAccount,
  allAccounts,
  onClose,
  onCreateAccountsBatch,
  onExtendAccount,
  onToggleAccountStatus,
  onDeleteAccount,
  onResetAccountPassword,
}: StoreAccountDetailModalProps) {
  // Add Kasir form inside detail modal
  const [showAddCashierForm, setShowAddCashierForm] = useState(false);
  const [cashierName, setCashierName] = useState("");
  const [cashierUsername, setCashierUsername] = useState("");
  const [cashierPassword, setCashierPassword] = useState("");
  const [cashierError, setCashierError] = useState<string | null>(null);
  const [isSavingCashier, setIsSavingCashier] = useState(false);

  // One-time credential banner shown right after creating/resetting a password
  const [oneTimeCredential, setOneTimeCredential] = useState<{
    name: string;
    username: string;
    password: string;
    note: string;
  } | null>(null);
  const [copiedCredential, setCopiedCredential] = useState(false);

  // Inline Reset Password panel state
  const [resetTarget, setResetTarget] = useState<ManagedAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  // Inline Delete Confirmation state
  const [confirmDeleteTarget, setConfirmDeleteTarget] =
    useState<ManagedAccount | null>(null);

  // Inline Extend Modal state
  const [extendTarget, setExtendTarget] = useState<ManagedAccount | null>(null);
  const [extendMonths, setExtendMonths] = useState<number>(1);

  if (!ownerAccount) return null;

  // Always read latest version of ownerAccount from allAccounts
  const liveOwner =
    allAccounts.find((a) => a.id === ownerAccount.id) || ownerAccount;

  const storeCashiers = allAccounts.filter(
    (a) =>
      a.role === "CASHIER" &&
      (a.parentOwnerId === liveOwner.id ||
        (!a.parentOwnerId &&
          a.storeName.toLowerCase() === liveOwner.storeName.toLowerCase()))
  );

  const storeAccounts: ManagedAccount[] = [liveOwner, ...storeCashiers];

  const handleAddCashierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashierError(null);

    if (
      !cashierName.trim() ||
      !cashierUsername.trim() ||
      !cashierPassword.trim()
    ) {
      setCashierError("Nama, Username, dan Password kasir wajib diisi.");
      return;
    }

    if (cashierPassword.trim().length < 6) {
      setCashierError("Password kasir minimal 6 karakter demi keamanan.");
      return;
    }

    const uname = cashierUsername.trim().toLowerCase();
    if (allAccounts.some((a) => a.username.toLowerCase() === uname)) {
      setCashierError(`Username "${cashierUsername}" sudah terdaftar.`);
      return;
    }

    setIsSavingCashier(true);
    try {
      const { passwordHash, passwordSalt } = await hashPasswordWithSalt(
        cashierPassword
      );
      const newCashier: ManagedAccount = {
        id: generateId("acc"),
        name: cashierName.trim(),
        username: uname,
        passwordHash,
        passwordSalt,
        email: "-",
        role: "CASHIER",
        parentOwnerId: liveOwner.id,
        storeName: liveOwner.storeName,
        durationMonths: liveOwner.durationMonths,
        createdAt: new Date().toISOString(),
        expiresAt: liveOwner.expiresAt,
        status: "AKTIF",
        avatarColor: "#0EA5E9",
        lastLogin: "Belum pernah login",
      };

      onCreateAccountsBatch([newCashier]);
      setOneTimeCredential({
        name: newCashier.name,
        username: uname,
        password: cashierPassword,
        note: "Akun Kasir berhasil dibuat. Simpan/kirim kredensial ini sekarang karena password tidak ditampilkan lagi setelah ditutup.",
      });
      setCopiedCredential(false);
      setCashierName("");
      setCashierUsername("");
      setCashierPassword("");
      setShowAddCashierForm(false);
    } finally {
      setIsSavingCashier(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    if (resetPasswordValue.trim().length < 6) {
      setResetError("Password baru minimal 6 karakter.");
      return;
    }
    const { passwordHash, passwordSalt } = await hashPasswordWithSalt(
      resetPasswordValue
    );
    if (onResetAccountPassword) {
      onResetAccountPassword(resetTarget.id, passwordHash, passwordSalt);
    }
    setOneTimeCredential({
      name: resetTarget.name,
      username: resetTarget.username,
      password: resetPasswordValue,
      note: "Password berhasil direset & dienkripsi ulang. Salin sekarang sebelum panel ini ditutup.",
    });
    setCopiedCredential(false);
    setResetPasswordValue("");
    setResetTarget(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header with "+ Tambah Kasir" button replacing "+ Tambah Akun Baru" */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-navy-800">
                Detail Akun Toko: {liveOwner.storeName}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  liveOwner.ownerMode === "OWNER_INCLUDE_KASIR"
                    ? "bg-purple-50 text-purple-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {liveOwner.ownerMode === "OWNER_INCLUDE_KASIR"
                  ? "Owner Include Kasir"
                  : "Owner + Kasir"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar lengkap akun Owner dan Kasir ({storeCashiers.length} akun
              kasir terdaftar) beserta durasi, sisa waktu, perpanjangan, dan hapus akun.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCashierError(null);
                setShowAddCashierForm((v) => !v);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kasir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Detail"
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-navy-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Form Tambah Kasir */}
        {showAddCashierForm && (
          <form
            onSubmit={handleAddCashierSubmit}
            className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-extrabold text-navy-800 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-sky-600" />
                <span>Tambah Akun Kasir Baru untuk {liveOwner.storeName}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCashierForm(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <input
                type="text"
                required
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Nama Kasir"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <input
                type="text"
                required
                value={cashierUsername}
                onChange={(e) => setCashierUsername(e.target.value)}
                placeholder="Username Kasir"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
              />
              <input
                type="text"
                required
                value={cashierPassword}
                onChange={(e) => setCashierPassword(e.target.value)}
                placeholder="Password Kasir"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>

            {cashierError && (
              <p className="text-xs font-bold text-rose-600">{cashierError}</p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500">
                Masa aktif kasir mengikuti Owner (s/d{" "}
                <b>{formatDateOnly(liveOwner.expiresAt)}</b>).
              </span>
              <button
                type="submit"
                disabled={isSavingCashier}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold"
              >
                {isSavingCashier ? "Mengenkripsi..." : "Simpan Kasir"}
              </button>
            </div>
          </form>
        )}

        {/* One-time Credential Copy Banner */}
        {oneTimeCredential && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Kredensial Sementara — {oneTimeCredential.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setOneTimeCredential(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Tutup
              </button>
            </div>
            <p className="text-xs text-emerald-900/90">
              {oneTimeCredential.note}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-emerald-200 font-mono text-xs text-navy-800">
              <div>
                <span className="text-slate-500">Username: </span>
                <b>{oneTimeCredential.username}</b>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-slate-500">Password: </span>
                <b>{oneTimeCredential.password}</b>
              </div>
              <button
                type="button"
                onClick={() => {
                  const txt = `KELOKRA Login (${oneTimeCredential.name})\nUsername: ${oneTimeCredential.username}\nPassword: ${oneTimeCredential.password}`;
                  copyTextSafe(txt);
                  setCopiedCredential(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-xs inline-flex items-center gap-1"
              >
                {copiedCredential ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kredensial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Detail Table: Nama Toko | Role | Username & Password | Durasi Dipilih | Sisa Waktu (Countdown) | Status | Button Perpanjang | Button Delete */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-3">Nama Toko</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Username & Password</th>
                <th className="py-3 px-3">Durasi Dipilih</th>
                <th className="py-3 px-3">Sisa Waktu (Countdown)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {storeAccounts.map((acc) => {
                const timeInfo = getRemainingTimeInfo(acc.expiresAt);
                return (
                  <tr key={acc.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-3">
                      <p className="font-extrabold text-navy-800">
                        {acc.storeName}
                      </p>
                      <p className="text-xs text-slate-500">{acc.name}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          acc.role === "OWNER"
                            ? "bg-emerald-500 text-white"
                            : "bg-sky-500 text-white"
                        }`}
                      >
                        {acc.role === "OWNER" ? "Owner" : "Kasir"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <p className="font-mono font-bold text-navy-800">
                        @{acc.username}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Terenkripsi (SHA-256)</span>
                        </span>
                        {onResetAccountPassword && (
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(acc);
                              setResetPasswordValue("");
                              setResetError(null);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        )}
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
                        <button
                          type="button"
                          onClick={() => {
                            setExtendTarget(acc);
                            setExtendMonths(1);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>Perpanjang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTarget(acc)}
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

        {/* Inline Reset Password Panel */}
        {resetTarget && (
          <form
            onSubmit={handleResetPasswordSubmit}
            className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-extrabold text-navy-800 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-sky-600" />
                <span>
                  Reset Password: {resetTarget.name} (@{resetTarget.username})
                </span>
              </p>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-xs font-bold text-slate-500"
              >
                Batal
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                required
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Password baru (min. 6 karakter)"
                className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-emerald-600 text-white text-xs font-bold transition"
              >
                Simpan Password Baru
              </button>
            </div>
            {resetError && (
              <p className="text-xs font-bold text-rose-600">{resetError}</p>
            )}
          </form>
        )}

        {/* Inline Delete Confirmation Panel */}
        {confirmDeleteTarget && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-extrabold text-rose-900">
                  Konfirmasi Hapus Akun @{confirmDeleteTarget.username}
                </p>
                <p className="text-rose-800">
                  {confirmDeleteTarget.role === "OWNER"
                    ? `Menghapus akun Owner ini juga akan menghapus ${storeCashiers.length} akun Kasir di toko "${confirmDeleteTarget.storeName}". Tindakan ini tidak dapat dibatalkan.`
                    : `Akun Kasir "${confirmDeleteTarget.name}" akan dihapus permanen.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = confirmDeleteTarget.id;
                  setConfirmDeleteTarget(null);
                  onDeleteAccount(targetId);
                  if (targetId === liveOwner.id) {
                    onClose();
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        )}

        {/* Inline Extend Panel if Perpanjang clicked */}
        {extendTarget && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm font-extrabold text-navy-800">
                Perpanjang Masa Aktif: {extendTarget.name} (@
                {extendTarget.username})
              </p>
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="text-xs font-bold text-slate-500"
              >
                Batal
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "+1 Bulan", val: 1 },
                { label: "+3 Bulan", val: 3 },
                { label: "+6 Bulan", val: 6 },
                { label: "+1 Tahun", val: 12 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setExtendMonths(p.val)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                    extendMonths === p.val
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white border-slate-200 text-navy-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={120}
                value={extendMonths}
                onChange={(e) =>
                  setExtendMonths(
                    Math.min(120, clampPositiveInt(Number(e.target.value), 1))
                  )
                }
                className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-200 font-bold text-xs text-center bg-white"
              />
              <button
                type="button"
                onClick={() => {
                  const safeMonths = Math.min(
                    120,
                    clampPositiveInt(Number(extendMonths), 1)
                  );
                  onExtendAccount(extendTarget.id, safeMonths);
                  setExtendTarget(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-navy-800 hover:bg-emerald-600 text-white text-xs font-bold transition"
              >
                Simpan Perpanjangan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
