// Refits the lead score (InfoOS build). Runs on the sync Worker's 30-minute cron, one
// client per run (Cloudflare's free plan allows 10ms of CPU per invocation), oldest
// model first, each client at most every 6 hours. Stores the model the screens and the
// hot-lead alert score with, and a score snapshot per changed lead so the Leads screen
// can show how often past hot leads really bought. Once a day the pooled model (all
// Pulsify funnels) is rebuilt from the client models, cheaply, without reloading anyone.

import { assemble, clientRows, listVisitors, loadPipeline, visitorAggregates } from "./lead-people.js";
import { funnelHealthReport } from "./funnel-health.js";
import {
  BEHAVIOUR, DAY, LADDER, MATURE_DAYS, STATES, fitModel, scorePerson, startingModel, withMeans, withOwnRates,
} from "./lead-score.js";

const REFRESH_MS = 6 * 3600000;
const POOLED_REFRESH_MS = 24 * 3600000;
const ANON_SAMPLE = 180;
const SNAPSHOT_MIN_CHANGE = 3;

export async function refreshLeadModels(env, now = Date.now()) {
  if (!env?.DB) return { ok: false, reason: "no database" };
  const due = await env.DB.prepare(
    `SELECT c.client FROM client_config c
       LEFT JOIN lead_models m ON m.client_id = c.client
      WHERE COALESCE(c.status,'') <> 'archived'
        AND (m.fitted_at IS NULL OR m.fitted_at < ?)
        AND (EXISTS (SELECT 1 FROM page_events p WHERE p.client = c.client)
             OR EXISTS (SELECT 1 FROM pipeline_touches t WHERE t.client_id = c.client))
      ORDER BY COALESCE(m.fitted_at, '') LIMIT 1`,
  ).bind(new Date(now - REFRESH_MS).toISOString()).first();
  const result = { ok: true, client: null, pooled: false };
  if (due?.client) result.client = await refreshClient(env, due.client, now);
  result.pooled = await refreshPooled(env, now);
  return result;
}

export async function refreshClient(env, client, now = Date.now()) {
  const pipeline = await loadPipeline(env, client, { now });
  const { rows, present } = pipeline;
  const known = pipeline.raw;
  const anon = await anonymousSample(env, client, rows, now);
  const everyone = [...known, ...anon.people];

  // Prior: starting weights (or the pooled model) with this funnel's typical behaviour.
  const base = withMeans(startingModel(present, rows.pooledModel), everyone);
  const cutoff = now - MATURE_DAYS * DAY;
  const train = [];
  for (const person of known) {
    const first = Date.parse(person.first_at || "");
    if (person.stages.bought || (Number.isFinite(first) && first <= cutoff)) train.push({ person, y: person.stages.bought ? 1 : 0, weight: 1 });
  }
  for (const person of anon.people) train.push({ person, y: 0, weight: anon.weight });
  const fitted = fitModel(base, train, now);
  const model = fitted.fitted?.applied
    ? fitted
    : { ...withOwnRates(base, known, now, { anonymousVisitors: { matured: rows.anonMatured } }), fitted: fitted.fitted };
  model.computed_at = new Date(now).toISOString();
  model.counts = stageCounts(known, present, now, rows.anonMatured);

  await env.DB.prepare(
    `INSERT INTO lead_models (client_id, model_json, fitted_at) VALUES (?,?,?)
     ON CONFLICT(client_id) DO UPDATE SET model_json=excluded.model_json, fitted_at=excluded.fitted_at`,
  ).bind(client, JSON.stringify(model), model.computed_at).run();

  const snapshots = await writeSnapshots(env, client, known, model, now);
  const funnelScore = await storeFunnelScore(env, client, now).catch(() => null);
  return { client, people: known.length, anonymous_sampled: anon.people.length, fitted: Boolean(model.fitted?.applied), snapshots, funnel_score: funnelScore };
}

// The client's funnel score (30 days, graded steps only), stored once a day so the operator
// overview reads every client's in one query instead of grading each funnel on request.
async function storeFunnelScore(env, client, now) {
  const report = await funnelHealthReport(env, client, { range: "30d", now });
  const value = report.score?.value ?? null;
  await env.DB.prepare(
    `INSERT OR REPLACE INTO metric_points (scope, client_id, source, metric, ts, value, dims_json)
     VALUES ('client', ?, 'funnel', 'score', ?, ?, '{}')`,
  ).bind(client, new Date(now).toISOString().slice(0, 10), value).run();
  return value;
}

// A fixed sample of matured anonymous visitors (never tied to an email), weighted up to
// stand for all of them. Ordered by the tail of the random visitor id, so the sample is
// the same across the queries that read it.
async function anonymousSample(env, client, rows, now) {
  const from = new Date(now - 180 * DAY).toISOString();
  const to = new Date(now - MATURE_DAYS * DAY).toISOString();
  const knownIds = new Set(rows.edges.map((e) => e.visitor_id));
  const picked = await env.DB.prepare(
    `SELECT visitor_id FROM page_events
      WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL AND at >= ? AND at < ?
      GROUP BY visitor_id ORDER BY substr(visitor_id, -5) LIMIT ?`,
  ).bind(client, from, to, ANON_SAMPLE + 60).all();
  const ids = (picked.results || []).map((r) => r.visitor_id).filter((id) => !knownIds.has(id)).slice(0, ANON_SAMPLE);
  if (!ids.length) return { people: [], weight: 1 };
  const byVisitor = new Map();
  for (let i = 0; i < ids.length; i += 90) {
    const part = await visitorAggregates(env, client, listVisitors(ids.slice(i, i + 90)));
    for (const [id, v] of part) byVisitor.set(id, v);
  }
  const people = assemble(client, byVisitor, { ...rows, touches: [], leads: [], payments: [], outcomes: [], edges: [] }, now, {});
  const total = await env.DB.prepare(
    `SELECT COUNT(DISTINCT visitor_id) AS n FROM page_events
      WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL AND at >= ? AND at < ? AND (email IS NULL OR email='')`,
  ).bind(client, from, to).first();
  const weight = Math.max(1, Number(total?.n || ids.length) / ids.length);
  return { people, weight };
}

function stageCounts(people, present, now, anonMatured) {
  const cutoff = now - MATURE_DAYS * DAY;
  const out = {};
  for (const key of present) {
    let n = key === "visit" ? anonMatured : 0;
    let buyers = 0;
    for (const person of people) {
      const at = Date.parse((key === "visit" ? person.first_at : person.stages[key]) || "");
      if (!Number.isFinite(at)) continue;
      if (person.stages.bought) { n += 1; buyers += 1; } else if (at <= cutoff) n += 1;
    }
    out[key] = { people: n, buyers };
  }
  return out;
}

async function writeSnapshots(env, client, people, model, now) {
  const latest = await env.DB.prepare(
    `SELECT s.person_key, s.score, s.band FROM lead_score_snapshots s
      WHERE s.client_id=? AND s.id IN (SELECT MAX(id) FROM lead_score_snapshots WHERE client_id=? GROUP BY person_key)`,
  ).bind(client, client).all();
  const last = new Map((latest.results || []).map((r) => [r.person_key, r]));
  const at = new Date(now).toISOString();
  const inserts = [];
  for (const person of people) {
    const scored = scorePerson(person, model, now);
    if (scored.score == null) continue;
    const prev = last.get(person.key);
    if (prev && prev.band === scored.band && Math.abs(prev.score - scored.score) < SNAPSHOT_MIN_CHANGE) continue;
    inserts.push(env.DB.prepare(
      "INSERT INTO lead_score_snapshots (client_id, person_key, score, band, stage, at) VALUES (?,?,?,?,?,?)",
    ).bind(client, person.key, scored.score, scored.band, scored.stage, at));
  }
  for (let i = 0; i < inserts.length; i += 50) await env.DB.batch(inserts.slice(i, i + 50));
  return inserts.length;
}

// All Pulsify funnels: step rates from every client's counts, weights and typical
// behaviour averaged over the clients whose model was fitted, weighted by people.
export async function refreshPooled(env, now = Date.now()) {
  const current = await env.DB.prepare("SELECT fitted_at FROM lead_models WHERE client_id=''").first();
  if (current && Date.parse(current.fitted_at) > now - POOLED_REFRESH_MS) return false;
  const rows = await env.DB.prepare("SELECT client_id, model_json FROM lead_models WHERE client_id<>''").all();
  const models = (rows.results || []).map((r) => { try { return JSON.parse(r.model_json); } catch { return null; } }).filter(Boolean);
  const stages = {};
  for (const step of LADDER) {
    let people = 0;
    let buyers = 0;
    for (const m of models) { people += m.counts?.[step.key]?.people || 0; buyers += m.counts?.[step.key]?.buyers || 0; }
    if (people > 0) stages[step.key] = { p: Math.max(0.0001, buyers / people), basis: "client", people, buyers };
  }
  const weights = {};
  const fittedModels = models.filter((m) => m.fitted?.applied);
  const totalPeople = fittedModels.reduce((n, m) => n + (m.fitted.people || 0), 0);
  if (totalPeople > 0) {
    for (const f of [...BEHAVIOUR, ...STATES]) {
      weights[f.key] = fittedModels.reduce((sum, m) => sum + (m.weights?.[f.key] ?? f.w) * (m.fitted.people || 0), 0) / totalPeople;
    }
  }
  const means = {};
  for (const step of LADDER) {
    const withMeansAt = models.filter((m) => m.means?.[step.key]?.people > 0);
    const n = withMeansAt.reduce((sum, m) => sum + m.means[step.key].people, 0);
    if (!n) continue;
    means[step.key] = { people: n };
    for (const b of BEHAVIOUR) means[step.key][b.key] = withMeansAt.reduce((sum, m) => sum + (m.means[step.key][b.key] ?? b.mean) * m.means[step.key].people, 0) / n;
  }
  const pooled = { version: 1, pooled: true, stages, weights: totalPeople > 0 ? weights : null, means, clients: models.length, computed_at: new Date(now).toISOString() };
  await env.DB.prepare(
    `INSERT INTO lead_models (client_id, model_json, fitted_at) VALUES ('',?,?)
     ON CONFLICT(client_id) DO UPDATE SET model_json=excluded.model_json, fitted_at=excluded.fitted_at`,
  ).bind(JSON.stringify(pooled), pooled.computed_at).run();
  return true;
}
