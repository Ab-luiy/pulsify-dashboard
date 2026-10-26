// What Jane can read about the client's own work and results (founder 2026-10-26: "scan everything
// there is in the backend ... connect the dots"). Read-only summaries built from the same loaders the
// app's own screens use, for the authenticated client only. Emails, phones and links never leave this
// module. In a public draft, money and people's names are left out too.
import { videoCashReport } from "./video-cash.js";
import { loadPipeline } from "./lead-people.js";
import { loadCalls } from "./lead-calls.js";

type Row = Record<string, any>;
type Env = { DB: any };

export const WORKSPACE_AREAS = ["videos", "leads", "calls", "plan", "projects", "instagram", "proof"] as const;
export type WorkspaceArea = typeof WORKSPACE_AREAS[number];

export const WORKSPACE_CATALOGUE =
  "read_workspace: id = one of videos | leads | calls | plan | projects | instagram | proof; query = what you are looking for. " +
  "videos = their YouTube videos with views, TOF/MOF/BOF stage, calls and cash each one brought in; leads = their pipeline counts and hottest leads with what each did; " +
  "calls = booked-call show and close rates, upcoming calls and the objections people gave; plan = their content calendar; projects = videos and copy they are working on in the app; " +
  "instagram = their logged story sequences with views per slide, DMs and profile visits; proof = their saved proof items and whether each may be shown publicly. " +
  "These are the client's real numbers: use them, never invent others.";

const day = (value: unknown) => String(value ?? "").slice(0, 10);
const money = (cents: unknown) => `$${Math.round(Number(cents || 0) / 100).toLocaleString("en-US")}`;
const pct = (value: unknown) => (value == null || !Number.isFinite(Number(value)) ? null : `${Math.round(Number(value) * 100)}%`);
const short = (text: unknown, max = 160) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const firstName = (name: unknown) => short(name, 40).split(" ")[0] || null;
function parse(value: unknown) {
  try {
    return JSON.parse(String(value ?? ""));
  } catch {
    return null;
  }
}

async function videos(env: Env, client: string, publicDraft: boolean) {
  const report = await videoCashReport(env, client, { range: "all" });
  const rows: Row[] = report.videos || [];
  if (!rows.length) return { note: "No YouTube videos synced for this client yet (YouTube may not be connected).", handle: report.handle || null };
  const byViews = [...rows].sort((a, b) => Number(b.views || 0) - Number(a.views || 0));
  const pick = [...new Map([...rows.slice(0, 8), ...byViews.slice(0, 6)].map((row) => [row.video_id, row])).values()];
  return {
    handle: report.handle || null,
    last_synced: day(report.last_synced_at),
    total_videos: rows.length,
    totals: publicDraft ? { youtube_calls: report.totals?.youtube_calls ?? 0 } : {
      youtube_cash: money(report.totals?.youtube_cash_cents),
      youtube_calls: report.totals?.youtube_calls ?? 0,
      best_earner: report.totals?.best_video?.title || null,
    },
    videos: pick.map((row) => ({
      title: short(row.title, 120),
      published: day(row.published_at),
      views: Number(row.views || 0),
      vs_channel_normal: row.outlier == null ? null : `${Number(row.outlier).toFixed(1)}x`,
      stage: (typeof row.stage === "object" ? row.stage?.value : row.stage) || null,
      clicks: row.clicks ?? 0,
      applications: row.applications ?? 0,
      calls: row.calls ?? 0,
      buyers: row.buyers ?? 0,
      ...(publicDraft ? {} : { cash: money(row.cash_cents), cash_per_1k_views: row.cash_per_1k_views_cents == null ? null : money(row.cash_per_1k_views_cents) }),
    })),
    note: "Ranked by cash brought in, plus the most-viewed. vs_channel_normal compares views with the channel's usual video.",
  };
}

async function leads(env: Env, client: string, publicDraft: boolean) {
  const pipeline = await loadPipeline(env, client, { now: Date.now() });
  const people: Row[] = pipeline.people || [];
  const counts: Record<string, number> = {};
  const bands: Record<string, number> = {};
  for (const person of people) {
    counts[person.status] = (counts[person.status] || 0) + 1;
    if (person.band) bands[person.band] = (bands[person.band] || 0) + 1;
  }
  return {
    total_known: people.length,
    by_stage: counts,
    by_heat: bands,
    hottest: people.slice(0, 8).map((person) => ({
      ...(publicDraft ? {} : { name: firstName(person.name) }),
      stage: person.status,
      heat: person.band,
      came_from: [person.source?.channel, person.source?.video?.title || person.source?.video].filter((part: unknown) => typeof part === "string" && part).join(", ") || null,
      last_seen: day(person.last_at),
      why: (person.reasons || []).slice(0, 3).map((reason: Row | string) => (typeof reason === "string" ? short(reason, 90) : `${short(reason?.key, 60)} ${reason?.points > 0 ? "+" : ""}${reason?.points ?? ""}`.trim())),
      next_step: short(typeof person.next === "string" ? person.next : person.next?.label || person.next?.text, 100) || null,
    })),
    note: "People the app knows by email, phone or handle. Heat is the lead score.",
  };
}

async function calls(env: Env, client: string, publicDraft: boolean) {
  const [summary, objections] = await Promise.all([
    loadCalls(env, client, {}),
    env.DB.prepare("SELECT call_at, attended, result, objection, notes, deal_cents FROM lead_outcomes WHERE client_id=? ORDER BY COALESCE(call_at, created_at) DESC LIMIT 20").bind(client).all(),
  ]);
  const stats = summary.stats || {};
  return {
    last_30_days: { calls_held: stats.held_30d ?? 0, show_rate: pct(stats.show_rate), close_rate: pct(stats.close_rate) },
    upcoming_14_days: stats.upcoming ?? 0,
    waiting_on_post_call_form: stats.needs_form ?? 0,
    recent_outcomes: (objections.results || []).map((row: Row) => ({
      date: day(row.call_at),
      showed: row.attended || null,
      result: row.result || null,
      objection: short(row.objection, 160) || null,
      notes: short(row.notes, 200) || null,
      ...(publicDraft ? {} : { deal: row.deal_cents ? money(row.deal_cents) : null }),
    })),
  };
}

async function plan(env: Env, client: string) {
  const row = await env.DB.prepare("SELECT value_json, updated_at FROM workspace_preferences WHERE client_id=? AND key='content-plan'").bind(client).first();
  const value = parse(row?.value_json) || {};
  const slots: Row[] = Array.isArray(value.slots) ? value.slots : [];
  if (!slots.length) return { note: "No content plan saved yet." };
  return {
    updated: day(row?.updated_at),
    slots: slots.slice(0, 30).map((slot) => ({ date: slot.date, time: slot.time, format: slot.format, title: short(slot.title, 120), repeat: slot.repeat || null })),
  };
}

async function projects(env: Env, client: string) {
  const rows = await env.DB.prepare("SELECT kind, title, data_json, updated_at FROM workspace_records WHERE client_id=? AND kind IN ('youtube','copy','reference') ORDER BY updated_at DESC LIMIT 15").bind(client).all();
  return {
    projects: (rows.results || []).map((row: Row) => {
      const data = parse(row.data_json) || {};
      return { kind: row.kind, title: short(row.title, 120), stage: data.stage || data.copyType || null, headline: short(data.headline, 120) || null, updated: day(row.updated_at) };
    }),
  };
}

async function instagram(env: Env, client: string) {
  const rows = await env.DB.prepare("SELECT posted_on, type, topic, slide_count, slide_views_json, dms, profile_visits FROM sequence_log WHERE client_id=? ORDER BY posted_on DESC, id DESC LIMIT 12").bind(client).all();
  const list = (rows.results || []).map((row: Row) => {
    const views = (parse(row.slide_views_json) || []).map(Number).filter((n: number) => Number.isFinite(n));
    const first = views[0] || 0;
    const last = views[views.length - 1] || 0;
    return {
      posted: day(row.posted_on),
      type: row.type,
      topic: short(row.topic, 120),
      slides: row.slide_count,
      first_slide_views: first || null,
      completion: first ? `${Math.round((last / first) * 100)}%` : null,
      dms: row.dms ?? null,
      profile_visits: row.profile_visits ?? null,
    };
  });
  return list.length ? { sequences: list, note: "Completion = last slide views / first slide views." } : { note: "No story sequences logged yet." };
}

async function proof(env: Env, client: string, publicDraft: boolean) {
  const rows = await env.DB.prepare("SELECT kind, claim, permission, created_at FROM proof_items WHERE client_id=? ORDER BY id DESC LIMIT 30").bind(client).all();
  const items = (rows.results || [])
    .filter((row: Row) => !publicDraft || row.permission === "granted")
    .map((row: Row) => ({ kind: row.kind, claim: short(row.claim, 200) || "(no caption)", may_show_publicly: row.permission === "granted", saved: day(row.created_at) }));
  return items.length ? { items, note: "Only items marked may_show_publicly can be used in public copy." } : { note: publicDraft ? "No proof cleared for public use." : "No proof saved yet." };
}

/** One area of the client's workspace as plain data; errors come back as a note, never thrown. */
export async function readWorkspace(env: Env, client: string, area: string, { publicDraft = false } = {}) {
  try {
    switch (area) {
      case "videos": return await videos(env, client, publicDraft);
      case "leads": return await leads(env, client, publicDraft);
      case "calls": return await calls(env, client, publicDraft);
      case "plan": return await plan(env, client);
      case "projects": return await projects(env, client);
      case "instagram": return await instagram(env, client);
      case "proof": return await proof(env, client, publicDraft);
      default: return { error: `Unknown area. Use one of: ${WORKSPACE_AREAS.join(", ")}.` };
    }
  } catch {
    return { error: `The ${area} data could not be read right now. Do not guess these numbers; say they could not be loaded.` };
  }
}
