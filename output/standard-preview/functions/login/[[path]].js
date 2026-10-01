// /login, /login/client and /login/operator all serve the one sign-in page. Someone who is already
// signed in is sent on to where they were going instead of seeing the form again.
import { resolveClientAccess } from "../_shared/client-auth.js";
import { serveLoginPage } from "../_shared/login-page.js";
import { resolveOperatorSession } from "../_shared/operator-session.js";

const PAGES = new Set(["", "client", "operator"]);

function readPath(params) {
  const value = params?.path;
  return (Array.isArray(value) ? value.join("/") : String(value || "")).replace(/^\/+|\/+$/g, "");
}

// Same rule as the page itself: a client lands in their portal or onboarding, nowhere else.
function clientLanding(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/app/portal";
  try {
    const url = new URL(raw, "https://pulsify-ai.com");
    if (url.origin !== "https://pulsify-ai.com") return "/app/portal";
    if (!/^\/(?:onboard|portal|app\/portal)(?:\/|$)/.test(url.pathname) || /^\/portal\/(?:login|register)(?:\/|$)/.test(url.pathname)) return "/app/portal";
    return url.pathname + url.search;
  } catch {
    return "/app/portal";
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const path = readPath(context.params);
  if (!PAGES.has(path)) return context.next();
  if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });

  const url = new URL(request.url);
  const passive = !["setup", "auth_error", "signed_out", "view"].some((key) => url.searchParams.has(key));
  if (passive) {
    if (path === "operator") {
      // An operator with a live team session goes straight to the console.
      const operator = await resolveOperatorSession(request, env).catch(() => null);
      if (operator) return redirect(new URL(consoleLanding(url.searchParams.get("next")), url).toString());
    } else {
      const access = await resolveClientAccess(request, env, { allowHeaderToken: false, allowQueryToken: false, allowImpersonated: true }).catch(() => ({ error: true }));
      if (!access.error) {
        const target = new URL(clientLanding(url.searchParams.get("next")), url);
        if (!target.searchParams.has("client")) target.searchParams.set("client", access.client);
        return redirect(target.toString());
      }
    }
  }
  return serveLoginPage(env, request);
}

// Operators only ever land inside the console, never in a client portal.
function consoleLanding(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/app/";
  try {
    const url = new URL(raw, "https://pulsify-ai.com");
    if (url.origin !== "https://pulsify-ai.com" || !/^\/app(\/|$)/.test(url.pathname) || /^\/app\/portal(\/|$)/.test(url.pathname)) return "/app/";
    return url.pathname + url.search;
  } catch {
    return "/app/";
  }
}

function redirect(location) {
  return new Response(null, { status: 302, headers: { location, "cache-control": "no-store" } });
}
