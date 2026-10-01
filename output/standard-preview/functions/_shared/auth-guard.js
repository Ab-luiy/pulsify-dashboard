// Small checks shared by the sign-in endpoints (client-login, client-set-password, client-email-code,
// client-logout, login-lookup, access-request).
import { sha256Hex } from "./common.js";

/** Browsers always say where a POST came from. Refuse the ones that say another site; allow tools that send nothing. */
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

/** A short one-way label for the caller's address, so the throttle never stores the address itself. */
export async function addressHash(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  return ip ? (await sha256Hex(`pulsify-login:${ip}`)).slice(0, 24) : "";
}

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

/** Why a new password is not acceptable, or "" when it is fine. Plain words, shown to the person. */
export function passwordProblem(password, email = "", min = PASSWORD_MIN) {
  const value = String(password || "");
  if (value.length < min) return `Use at least ${min} characters.`;
  if (value.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const lower = value.toLowerCase();
  const letters = lower.replace(/[^a-z0-9]/g, "");
  const local = String(email).toLowerCase().split("@")[0].replace(/[^a-z0-9]/g, "");
  if (/^(.)\1+$/.test(value)) return "That password is too easy to guess. Mix it up.";
  if (/^(password|passw0rd|qwerty|letmein|welcome|iloveyou|admin|pulsify)/.test(letters) && letters.length < 16) return "That password is too easy to guess. Pick something less common.";
  if (/^(0123456789|1234567890|123456789|12345678910|abcdefghij)/.test(letters)) return "That password is too easy to guess. Pick something less common.";
  if (local.length >= 4 && letters.includes(local)) return "Your password should not contain your email name.";
  return "";
}

/** Where a team member may land after signing in: inside the console, never a client portal. */
export function consoleDestination(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/app/";
  try {
    const url = new URL(raw, "https://pulsify-ai.com");
    if (url.origin !== "https://pulsify-ai.com" || !/^\/app(\/|$)/.test(url.pathname) || /^\/app\/portal(\/|$)/.test(url.pathname)) return "/app/";
    return url.pathname + url.search;
  } catch {
    return "/app/";
  }
}
