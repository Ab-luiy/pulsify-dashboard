// Where a client's Instagram followers are from (pulsify-saas #77).
//
// Source: Meta's follower_demographics insight (country and city breakdowns), read through
// Zernio's GET /v1/analytics/instagram/demographics. Checked 2026-10-17: the metric still exists,
// it returns totals only (never individual followers), the top 45 per breakdown, and nothing for
// an account under 100 followers. Instagram cannot tag individual followers.
//
// Needs a client Instagram connected through Zernio. Until one is, every reader gets
// { connected: false } and the screen says so. Tests use a mocked Zernio response; nothing here
// calls Zernio unless a client has connected an account and ZERNIO_API_KEY is set.

import { cleanId, nowIso } from "./common.js";
import { getIntegration } from "./integrations.js";
import { zernioConfigured, zernioFetch } from "./zernio.js";
import { REGION_GROUPS, regionOf } from "./visitor-regions.js";

export const MAX_PLACES = 45;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Names and counts out of one breakdown. Zernio documents the response as "a breakdown per
 * dimension" without the inner shape, so the common shapes are all read: a map of name to count,
 * a list of {name, value}, or Meta's own {results: [{dimension_values: [name], value}]}.
 */
export function parseBreakdown(block) {
  const out = new Map();
  const add = (name, value) => {
    const place = String(name ?? "").trim();
    const followers = Math.round(num(value));
    if (place && followers > 0) out.set(place, (out.get(place) || 0) + followers);
  };
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === "object") {
          if (Array.isArray(item.dimension_values)) add(item.dimension_values[0], item.value);
          else add(item.name ?? item.key ?? item.label ?? item.country ?? item.city ?? item.dimension, item.value ?? item.count ?? item.followers);
        }
      }
      return;
    }
    if (typeof node !== "object") return;
    if (Array.isArray(node.results)) return walk(node.results);
    if (Array.isArray(node.data)) return walk(node.data);
    if (node.total_value) return walk(node.total_value.breakdowns?.[0] ?? node.total_value);
    if (Array.isArray(node.breakdowns)) return walk(node.breakdowns[0]);
    for (const [k, v] of Object.entries(node)) if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))) add(k, v);
  };
  walk(block);
  return [...out].map(([place, followers]) => ({ place, followers })).sort((a, b) => b.followers - a.followers || a.place.localeCompare(b.place)).slice(0, MAX_PLACES);
}

/** The client's connected Instagram account id, or null while nothing is connected. */
export async function clientAccountId(env, client) {
  const record = await getIntegration(env, "client", cleanId(client), "instagram").catch(() => null);
  return record?.config?.account_id || null;
}

/** Which client owns a Zernio account (for DMs). */
export async function clientForAccount(env, accountId) {
  const row = await env.DB.prepare(
    "SELECT client_id FROM integrations WHERE scope='client' AND provider='instagram' AND json_extract(config_json,'$.account_id')=? LIMIT 1",
  ).bind(String(accountId || "")).first().catch(() => null);
  return row?.client_id || null;
}

/** Ask Zernio for the demographics and keep them. Does nothing without a connected account. */
export async function refreshFollowerPlaces(env, client, { fetcher = fetch, now = nowIso() } = {}) {
  const clientId = cleanId(client);
  const accountId = await clientAccountId(env, clientId);
  if (!accountId || !zernioConfigured(env)) return { connected: false, saved: 0 };
  const qs = new URLSearchParams({ accountId, metric: "follower_demographics", breakdown: "country,city", timeframe: "this_month" });
  const body = await zernioFetch(env, `/v1/analytics/instagram/demographics?${qs}`, {}, fetcher);
  const countries = parseBreakdown(body?.demographics?.country);
  const cities = parseBreakdown(body?.demographics?.city);
  // Meta returns nothing under 100 followers: keep what we had rather than blank the panel.
  if (!countries.length && !cities.length) return { connected: true, saved: 0, note: String(body?.note || "") || "Instagram shows this once an account has 100 followers." };
  const statements = [
    env.DB.prepare("DELETE FROM follower_places WHERE client_id=?").bind(clientId),
    ...countries.map((p) => env.DB.prepare("INSERT INTO follower_places (client_id, kind, place, followers, fetched_at) VALUES (?,?,?,?,?)").bind(clientId, "country", p.place, p.followers, now)),
    ...cities.map((p) => env.DB.prepare("INSERT INTO follower_places (client_id, kind, place, followers, fetched_at) VALUES (?,?,?,?,?)").bind(clientId, "city", p.place, p.followers, now)),
  ];
  await env.DB.batch(statements);
  return { connected: true, saved: countries.length + cities.length };
}

/** What the panel shows: the saved totals, grouped, plus the share inside the client's regions. */
export async function loadFollowerPlaces(env, client, regions) {
  const clientId = cleanId(client);
  const accountId = await clientAccountId(env, clientId);
  const rows = (await env.DB.prepare("SELECT kind, place, followers, fetched_at FROM follower_places WHERE client_id=? ORDER BY followers DESC, place").bind(clientId).all().catch(() => ({ results: [] }))).results || [];
  const countries = rows.filter((r) => r.kind === "country").map((r) => ({ place: r.place, followers: r.followers }));
  const cities = rows.filter((r) => r.kind === "city").map((r) => ({ place: r.place, followers: r.followers }));
  const total = countries.reduce((n, c) => n + c.followers, 0);
  const inside = countries.filter((c) => regions.includes(regionOf(c.place))).reduce((n, c) => n + c.followers, 0);
  const groups = REGION_GROUPS.map((g) => ({ id: g.id, label: g.label, followers: countries.filter((c) => regionOf(c.place) === g.id).reduce((n, c) => n + c.followers, 0) }));
  const other = total - groups.reduce((n, g) => n + g.followers, 0);
  return {
    connected: Boolean(accountId),
    as_of: rows[0]?.fetched_at || null,
    total,
    inside_regions: total ? inside / total : null,
    main_regions: regions,
    regions: groups.filter((g) => g.followers > 0).concat(other > 0 ? [{ id: "other", label: "Elsewhere", followers: other }] : []),
    countries,
    cities,
  };
}

