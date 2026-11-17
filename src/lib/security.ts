// Security & Validation Helpers for KELOKRA

export function escapeHtml(input: string | number | undefined | null): string {
  const str = String(input ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeCsvCell(val: string | number | undefined | null): string {
  let str = String(val ?? "");
  // Prevent CSV Formula Injection in Excel / Google Sheets
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape internal double quotes and wrap in quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function clampPositiveInt(value: number, fallback = 1): number {
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPasswordWithSalt(
  password: string,
  salt?: string
): Promise<{ passwordHash: string; passwordSalt: string }> {
  const usedSalt = salt || generateSalt();
  const data = new TextEncoder().encode(`${usedSalt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  const passwordHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { passwordHash, passwordSalt: usedSalt };
}

export async function verifyPasswordWithSalt(
  password: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  if (!storedHash || !salt) return false;
  const { passwordHash } = await hashPasswordWithSalt(password, salt);
  if (passwordHash.length !== storedHash.length) return false;
  // Constant-time string comparison
  let diff = 0;
  for (let i = 0; i < passwordHash.length; i++) {
    diff |= passwordHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function sanitizeJsonObject<T>(input: T): T {
  if (input === null || typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeJsonObject(item)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = sanitizeJsonObject(value);
  }
  return clean as T;
}

export const ALLOWED_QRIS_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
