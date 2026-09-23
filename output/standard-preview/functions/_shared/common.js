import { hasOperator } from './access.js';
export function json(object, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function cleanId(value, fallback = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64) || fallback;
}

export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

export function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function str(value) {
  return String(value ?? "").trim();
}

export function strOrNull(value) {
  const text = str(value);
  return text || null;
}

export function nowIso() {
  return new Date().toISOString();
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function checkAdmin(request, env) {
  if (!hasOperator(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function titleCase(slug) {
  return String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ") || "Pulsify";
}

export function generateOpaqueToken(byteLength = 18) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function amountToCents(value) {
  // `amount` is always major units (dollars), matching the Push API. Callers
  // that already hold cents pass amount_cents instead.
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

export function centsToAmount(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

export function humanCurrency(amountCents, currency) {
  const normalized = String(currency || "USD").toUpperCase();
  return `${centsToAmount(amountCents)} ${normalized}`;
}
