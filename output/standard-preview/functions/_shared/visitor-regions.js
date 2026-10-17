// Which visitors count for the main tracker (pulsify-saas #77, founder 2026-10-17).
//
// The main audience is North America and Europe. Every page visit already records a country;
// each client picks the regions that count (default North America and Europe). The main tracker
// shows those visitors. Everyone else, and visitors who look like bots (no time on page, no
// scroll), go to a flagged tracker so they never hide the real picture and are never lost.
// Instagram cannot tag individual followers, so nothing here touches followers.

import { parseJson } from "./common.js";

const KEY = "visitor-regions";

const EU = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE";
const EUROPE_OTHER = "GB CH NO IS LI AD MC SM VA AL BA ME MK RS XK UA MD BY";

export const REGION_GROUPS = [
  { id: "na", label: "North America", countries: "US CA" },
  { id: "eu", label: "Europe", countries: `${EU} ${EUROPE_OTHER}` },
  { id: "latam", label: "Latin America and Caribbean", countries: "MX GT BZ HN SV NI CR PA CU DO HT JM BS BB TT PR CO VE GY SR EC PE BR BO PY UY AR CL" },
  { id: "oceania", label: "Australia and New Zealand", countries: "AU NZ" },
  { id: "asia", label: "Asia", countries: "IN PK BD LK NP CN JP KR TW HK SG MY TH VN PH ID KH LA MM MN KZ UZ" },
  { id: "mea", label: "Middle East and Africa", countries: "AE SA QA KW BH OM IL JO LB TR EG MA DZ TN NG GH KE ZA ET TZ UG SN CI CM" },
].map((g) => ({ ...g, countries: g.countries.split(" ") }));

export const DEFAULT_REGIONS = ["na", "eu"];

const GROUP_OF = new Map();
for (const g of REGION_GROUPS) for (const c of g.countries) GROUP_OF.set(c, g.id);

/** The region group a two-letter country belongs to, "other" for a country we do not list, null for no country. */
export function regionOf(country) {
  const code = String(country || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1") return null;
  return GROUP_OF.get(code) || "other";
}

export function cleanRegions(input) {
  const valid = new Set(REGION_GROUPS.map((g) => g.id));
  const list = Array.isArray(input) ? input : input?.regions;
  const picked = [...new Set((Array.isArray(list) ? list : []).map((v) => String(v)).filter((v) => valid.has(v)))];
  return picked.length ? picked : [...DEFAULT_REGIONS];
}

/** The regions that count for this client: its own setting, else North America and Europe. */
export async function getRegions(env, client) {
  const row = await env.DB.prepare("SELECT value_json FROM workspace_preferences WHERE client_id=? AND key=?").bind(client, KEY).first().catch(() => null);
  return row ? cleanRegions(parseJson(row.value_json, null)) : [...DEFAULT_REGIONS];
}

export async function setRegions(env, client, regions, now) {
  const clean = cleanRegions(regions);
  await env.DB.prepare(
    `INSERT INTO workspace_preferences (client_id, key, value_json, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(client_id, key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`,
  ).bind(client, KEY, JSON.stringify({ regions: clean }), now).run();
  return clean;
}

const BOT_AGENT = /bot\b|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|facebot|preview|monitor|python-requests|curl\/|wget|go-http|okhttp|axios|node-fetch|scrapy/i;
// A visit this young has not had time to send its time on page yet.
const GRACE_MS = 2 * 60000;

/** True when an anonymous visit shows no sign of a person: a robot's browser, or no time and no scroll. */
export function likelyBot(person, now = Date.now()) {
  if (person.email || person.handle || (person.contacts || []).length) return false;
  if (BOT_AGENT.test(String(person.user_agent || ""))) return true;
  const s = person.signals || {};
  const young = Date.parse(person.last_at || "") > now - GRACE_MS;
  if (young) return false;
  return Number(s.active_seconds || 0) < 3 && Number(s.max_scroll || 0) === 0 && !Number(s.ctas || 0) && !Number(s.plays || 0) && !person.stages?.app_start;
}

/**
 * Which tracker a visitor belongs to. `main`: inside the client's regions (or no country on
 * record) and not a likely bot. `flagged`: outside the regions, or a likely bot. A known
 * person is never called a bot, but can sit outside the regions.
 */
export function classifyVisitor(person, regions, now = Date.now()) {
  const group = regionOf(person.place?.country);
  const outside = group !== null && !regions.includes(group);
  const bot = likelyBot(person, now);
  return {
    bucket: outside || bot ? "flagged" : "main",
    flag: outside ? "outside_region" : bot ? "likely_bot" : null,
    region: group,
  };
}
