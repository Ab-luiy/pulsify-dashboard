// The client's own domain for tracked links (pulsify-saas #73), for example go.clientname.com.
//   GET    /api/link-domain[?client=]                the domain (or null), its status and the DNS steps
//   GET    /api/link-domain?all=1                    operator only: every domain, so none waits unseen
//   POST   /api/link-domain {host}                   set it (replaces the old one)
//   POST   /api/link-domain {action:"check"}         look at it from outside and update the status
//   DELETE /api/link-domain                          remove it; links go back to pulsify-ai.com/a/...
// Setting a domain does not switch it on. The client adds one DNS record, Pulsify attaches the domain
// to the Pages project (a step in the Cloudflare dashboard), then the check sees it live and the status
// becomes 'active'. Until then links keep the shared address. Rules in _shared/link-domains.js.
// Reads: client, preview or operator. Writes: client or operator, never a preview.

import { json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import {
  CHECK_COOLDOWN_MS, MAX_LINK_DOMAINS, checkLinkDomain, dnsSetup, domainForClient, linkDomainTarget, normalizeLinkHost,
} from "../_shared/link-domains.js";
import { claimSlug } from "../_shared/link-slug.js";

function view(row, env) {
  if (!row) return null;
  let checked = {};
  try { checked = JSON.parse(row.check_json || "{}"); } catch { checked = {}; }
  return {
    host: row.host,
    status: row.status,
    created_at: row.created_at,
    checked_at: row.checked_at || null,
    activated_at: row.activated_at || null,
    dns_ok: checked.dns_ok ?? null,
    message: checked.message || null,
    setup: dnsSetup(row.host, env),
  };
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  if (url.searchParams.get("all") === "1") {
    const operator = resolveOperator(request, env);
    if (operator.error) return operator.error;
    const rows = await env.DB.prepare(
      "SELECT host, client, status, created_at, checked_at FROM link_domains ORDER BY created_at",
    ).all();
    return json({
      ok: true,
      limit: MAX_LINK_DOMAINS,
      target: linkDomainTarget(env),
      domains: rows.results || [],
      to_attach: (rows.results || []).filter((row) => row.status === "waiting").map((row) => row.host),
    });
  }
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const row = await domainForClient(env, access.client);
  return json({ ok: true, client: access.client, domain: view(row, env), target: linkDomainTarget(env) });
}

// Endings two clients both hold only worked because one of them had its own domain. When that
// domain goes away, the shared domain has one /a/ for everyone, so this client's clashing endings change.
async function renameClashingEndings(env, client) {
  const clashes = await env.DB.prepare(
    `SELECT a.token, a.slug FROM asset_links a
      WHERE a.client=? AND a.slug IS NOT NULL
        AND EXISTS (SELECT 1 FROM asset_links b WHERE b.slug=a.slug AND b.client<>a.client)`,
  ).bind(client).all();
  for (const row of clashes.results || []) {
    await env.DB.prepare("UPDATE asset_links SET slug=NULL WHERE token=?").bind(row.token).run();
    const claimed = await claimSlug(env, client, row.slug, { ownDomain: false });
    await env.DB.prepare("UPDATE asset_links SET slug=? WHERE token=?").bind(claimed.slug || null, row.token).run();
  }
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const current = await domainForClient(env, access.client);

  if (body?.action === "check") {
    if (!current) return json({ ok: false, error: "Add your address first." }, 404);
    if (current.checked_at && Date.now() - Date.parse(current.checked_at) < CHECK_COOLDOWN_MS) {
      return json({ ok: true, domain: view(current, env) });
    }
    const result = await checkLinkDomain(env, current.host, { fetcher: env.LINK_CHECK_FETCH || fetch });
    const now = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE link_domains SET status=?, checked_at=?, activated_at=COALESCE(activated_at, ?), check_json=? WHERE host=?`,
    ).bind(
      result.status, now, result.status === "active" ? now : null,
      JSON.stringify({ dns_ok: result.dns_ok, live: result.live, message: result.message }), current.host,
    ).run();
    return json({ ok: true, domain: view(await domainForClient(env, access.client), env) });
  }

  const normalized = normalizeLinkHost(body?.host);
  if (normalized.error) return json({ ok: false, error: normalized.error }, 422);
  const host = normalized.host;
  if (current?.host === host) return json({ ok: true, domain: view(current, env) });

  const owner = await env.DB.prepare("SELECT client FROM link_domains WHERE host=?").bind(host).first();
  if (owner && owner.client !== access.client) {
    return json({ ok: false, error: "That address is already used by another account. Pick a different one." }, 409);
  }
  if (!current) {
    const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM link_domains").first();
    if (Number(total?.n || 0) >= MAX_LINK_DOMAINS) {
      return json({ ok: false, error: "We can't add more custom addresses right now. Pulsify has been told and will make room." }, 409);
    }
  }
  const now = new Date().toISOString();
  if (current) {
    await env.DB.prepare("DELETE FROM link_domains WHERE client=?").bind(access.client).run();
    if (current.status === "active") await renameClashingEndings(env, access.client);
  }
  await env.DB.prepare(
    "INSERT INTO link_domains (host, client, status, created_at) VALUES (?,?,'waiting',?)",
  ).bind(host, access.client, now).run();
  return json({ ok: true, domain: view(await domainForClient(env, access.client), env) }, 201);
}

async function handleDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportWriter(request, env);
  if (access.error) return access.error;
  const current = await domainForClient(env, access.client);
  if (!current) return json({ ok: true });
  await env.DB.prepare("DELETE FROM link_domains WHERE client=?").bind(access.client).run();
  if (current.status === "active") await renameClashingEndings(env, access.client);
  return json({ ok: true, removed: str(current.host) });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
export const onRequestDelete = withOperator(handleDelete);
