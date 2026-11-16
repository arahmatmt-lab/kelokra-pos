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
