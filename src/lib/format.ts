export function formatIDR(amount: number): string {
  const rounded = Math.round(amount);
  return "Rp " + rounded.toLocaleString("id-ID");
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export function formatShortTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFullDate(date: Date = new Date()): string {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function addMonthsToIso(baseIso: string, months: number): string {
  const date = new Date(baseIso);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    now.setMonth(now.getMonth() + months);
    return now.toISOString();
  }
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

export interface RemainingTimeInfo {
  isExpired: boolean;
  isExpiringSoon: boolean;
  totalDaysLeft: number;
  label: string;
}

export function getRemainingTimeInfo(expiresAtIso: string): RemainingTimeInfo {
  const now = Date.now();
  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) {
    return {
      isExpired: true,
      isExpiringSoon: false,
      totalDaysLeft: 0,
      label: "Tanggal tidak valid",
    };
  }

  const diffMs = exp - now;
  if (diffMs <= 0) {
    return {
      isExpired: true,
      isExpiringSoon: false,
      totalDaysLeft: 0,
      label: "Sudah Kadaluwarsa",
    };
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays <= 1) {
    return {
      isExpired: false,
      isExpiringSoon: true,
      totalDaysLeft: totalDays,
      label: `Tinggal ${totalHours} jam lagi`,
    };
  }

  if (totalDays < 30) {
    return {
      isExpired: false,
      isExpiringSoon: totalDays <= 7,
      totalDaysLeft: totalDays,
      label: `Tinggal ${totalDays} hari lagi`,
    };
  }

  const months = Math.floor(totalDays / 30);
  const remDays = totalDays % 30;

  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const label =
      remMonths > 0
        ? `Tinggal ${years} tahun ${remMonths} bulan lagi (${totalDays} hari)`
        : `Tinggal ${years} tahun lagi (${totalDays} hari)`;
    return {
      isExpired: false,
      isExpiringSoon: false,
      totalDaysLeft: totalDays,
      label,
    };
  }

  const label =
    remDays > 0
      ? `Tinggal ${months} bulan ${remDays} hari lagi`
      : `Tinggal ${months} bulan lagi`;

  return {
    isExpired: false,
    isExpiringSoon: false,
    totalDaysLeft: totalDays,
    label,
  };
}
