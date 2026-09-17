import { hasOperator } from '../_shared/access.js';
export async function onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return json({ ok: false, error: "valid JSON body required" }, 400);
  }

  const targetUrl = String(body.target_url || "").trim();
  if (!isHttpUrl(targetUrl)) {
    return json({ ok: false, error: "target_url must use http or https" }, 422);
  }

  const token = generateToken();
  const client = cleanId(body.client) || null;
  const label = String(body.label || "").trim().slice(0, 160) || "Tracked asset";
  const leadEmail = String(body.lead_email || "").trim().toLowerCase().slice(0, 254) || null;
  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO asset_links (
      token,client,label,target_url,lead_email,created_at,archived
    ) VALUES (?,?,?,?,?,?,0)`,
  ).bind(token, client, label, targetUrl, leadEmail, createdAt).run();

  return json({
    ok: true,
    token,
    url: `${new URL(request.url).origin}/a/${token}`,
    label,
    target_url: targetUrl,
  });
}

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const clientParam = url.searchParams.get("client");
  const client = clientParam == null ? null : cleanId(clientParam);
  const where = client == null ? "WHERE l.archived=0" : "WHERE l.archived=0 AND l.client=?";
  const statement = env.DB.prepare(
    `SELECT
       l.token,l.label,l.target_url,l.lead_email,l.client,l.created_at,
       COUNT(e.id) AS opens,
       COUNT(DISTINCT e.ip) AS unique_ips,
       MAX(e.at) AS last_open_at
     FROM asset_links l
     LEFT JOIN asset_events e ON e.token=l.token
     ${where}
     GROUP BY l.token,l.label,l.target_url,l.lead_email,l.client,l.created_at
     ORDER BY l.created_at DESC`,
  );
  const result = client == null ? await statement.all() : await statement.bind(client).all();
  const origin = url.origin;
  const assets = (result.results || []).map((row) => ({
    token: row.token,
    label: row.label,
    target_url: row.target_url,
    lead_email: row.lead_email || null,
    client: row.client || null,
    created_at: row.created_at,
    opens: Number(row.opens || 0),
    unique_ips: Number(row.unique_ips || 0),
    last_open_at: row.last_open_at || null,
    url: `${origin}/a/${row.token}`,
  }));

  return json({ ok: true, assets });
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const token = cleanToken(new URL(request.url).searchParams.get("token"));
  if (!token) return json({ ok: false, error: "valid token required" }, 422);

  await env.DB.prepare("UPDATE asset_links SET archived=1 WHERE token=?")
    .bind(token).run();
  return json({ ok: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

function generateToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte & 63]).join("");
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanId(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
}

function cleanToken(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function checkAuth(request, env) {
  if (!hasOperator(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}
