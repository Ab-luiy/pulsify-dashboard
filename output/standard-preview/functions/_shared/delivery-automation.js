// Service-delivery automations (Pulse System components 4 and 5).
//   Pre-call brief   every booked call gets a 60-second brief in the client's call notes
//   Fathom import    recorded client calls land in call notes with summary and action items
//   Weekly report    every Monday a draft report per active client, parked for approval
// Doctrine (wiki/playbooks/pulse-system-stack): the checkpoints never automate.
// Briefs are prep, calls are records; the weekly report is a draft the founder
// sends, never an automatic send.
import { complete, llmAvailable, VOICE_GUARD } from "./llm.js";
import { clientLabel, notify } from "./notifications.js";
import { centsToAmount, normalizeEmail, nowIso, parseJson, str } from "./common.js";
import { recordingBooking } from './call-detail.js';

const DAY = 86400000;

async function claim(env, kind, ref, clientId = "") {
  const r = await env.DB.prepare(
    "INSERT OR IGNORE INTO automation_runs(kind,ref,client_id,status,created_at) VALUES(?,?,?,'running',?)",
  ).bind(kind, ref, clientId, nowIso()).run();
  return Number(r.meta?.changes || 0) > 0;
}
async function finish(env, kind, ref, status, detail = null) {
  await env.DB.prepare("UPDATE automation_runs SET status=?, detail=? WHERE kind=? AND ref=?").bind(status, detail ? str(detail).slice(0, 500) : null, kind, ref).run();
}

async function brainFacts(env, clientId, sections) {
  const rows = (await env.DB.prepare(
    `SELECT section, field, value_json FROM client_brain WHERE client_id=? AND section IN (${sections.map(() => "?").join(",")})`,
  ).bind(clientId, ...sections).all().catch(() => ({ results: [] }))).results || [];
  return rows.map((r) => {
    const v = parseJson(r.value_json, null) ?? r.value_json;
    const text = typeof v === "string" ? v : JSON.stringify(v);
    return text && text !== "null" && text !== '""' ? `${r.section}.${r.field}: ${text.slice(0, 600)}` : "";
  }).filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Pre-call brief

async function leadDossier(env, clientId, email) {
  const e = normalizeEmail(email);
  if (!e) return { email: "", lines: ["No email on the booking, so no application or activity could be linked."] };
  const [lead, touches, watch, views] = await Promise.all([
    env.DB.prepare("SELECT name, revenue, situation, answers_json, applied_at, source, utm_json FROM leads WHERE client=? AND lower(email)=? ORDER BY id DESC LIMIT 1").bind(clientId, e).first().catch(() => null),
    env.DB.prepare("SELECT kind, ts, source, amount_cents FROM pipeline_touches WHERE client_id=? AND contact_email=? ORDER BY ts").bind(clientId, e).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT MAX(percent) AS pct, SUM(COALESCE(watch_seconds,0)) AS secs FROM watch_events WHERE client=? AND lower(email)=?").bind(clientId, e).first().catch(() => null),
    env.DB.prepare("SELECT COUNT(*) AS n, MIN(at) AS first FROM page_events WHERE client=? AND lower(email)=? AND event='page_view'").bind(clientId, e).first().catch(() => null),
  ]);
  const answers = parseJson(lead?.answers_json, {});
  const lines = [];
  if (lead) {
    lines.push(`Applied ${str(lead.applied_at).slice(0, 10) || "date unknown"} via ${lead.source || "form"}.`);
    if (lead.revenue) lines.push(`Stated revenue: ${lead.revenue}`);
    if (lead.situation) lines.push(`Stated situation: ${lead.situation}`);
    for (const [k, v] of Object.entries(answers)) if (v != null && String(v).trim()) lines.push(`Answer (${k}): ${Array.isArray(v) ? v.join(", ") : String(v).slice(0, 400)}`);
  } else lines.push("No application form on file for this email.");
  const t = touches?.results || [];
  if (t.length) lines.push(`History: ${t.map((x) => `${x.kind} ${str(x.ts).slice(0, 10)}${x.amount_cents ? ` (${centsToAmount(x.amount_cents)})` : ""}`).join(", ")}`);
  if (Number(views?.n)) lines.push(`Viewed the landing page ${views.n} time${Number(views.n) === 1 ? "" : "s"}, first on ${str(views.first).slice(0, 10)}.`);
  if (watch?.pct != null) lines.push(`Watched up to ${Math.round(Number(watch.pct))}% of the video (${Math.round(Number(watch.secs || 0) / 60)} min in total).`);
  return { email: e, name: lead?.name || "", lines };
}

export async function briefBooking(env, { clientId, eventId, email, name, startsAt, provider, fetcher = fetch }) {
  const ref = `${provider}:${eventId}`;
  if (!clientId || !eventId || !(await claim(env, "precall-brief", ref, clientId))) return null;
  try {
    const [dossier, offer, clientName] = await Promise.all([
      leadDossier(env, clientId, email),
      brainFacts(env, clientId, ["offer", "icp", "proof"]),
      clientLabel(env, clientId),
    ]);
    const who = name || dossier.name || email || "the lead";
    let body = `Lead facts\n${dossier.lines.map((l) => `- ${l}`).join("\n")}`;
    let provider_ = "none";
    if (llmAvailable(env)) {
      const prompt = `You are prepping a closer for a high-ticket sales call. The closer is ${clientName} (the coach), selling their own offer. They have 60 seconds to read this. Where data is missing, write "unknown"; a wrong assumption on a call is worse than a gap.

Lead: ${who}${email ? ` (${email})` : ""}
Call time: ${startsAt || "unknown"}
Booked via: ${provider}

What we know about the lead:
${dossier.lines.join("\n")}

The coach's offer and audience (from their brand brain; may be incomplete):
${offer || "unknown"}

Output exactly these lines, plain text, one line each:
WANT: what the lead says they want, close to their own words.
NEED: what the data says they actually need.
LEAD WITH: a specific opener that proves the homework was done.
AVOID: the landmine visible in their answers, or "none visible".
CLOSE ON: the angle most likely to close: which outcome, which proof, which objection to pre-empt.
QUALIFICATION: strong / fit-with-questions / weak, with a one-line reason.
MONEY: their stated revenue or budget answer verbatim, or "unknown".

${VOICE_GUARD}`;
      const result = await complete(env, { prompt, maxTokens: 700, fetcher });
      if (result.text) { body = `${result.text.trim()}\n\n${body}`; provider_ = result.provider; }
    }
    await env.DB.prepare(
      "INSERT INTO call_notes (client, call_date, title, summary, decisions, actions, recording_url, created_at, booking_ref,lead_email,source_kind) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    ).bind(clientId, startsAt || null, `Pre-call brief: ${who}`, body.slice(0, 8000), null, null, null, nowIso(),String(eventId),normalizeEmail(email) || null,'precall').run();
    await notify(env, { scope: "operator", clientId, kind: "brief", severity: "info", title: `Pre-call brief ready: ${who} with ${clientName}`, body: startsAt ? `Call ${new Date(startsAt).toUTCString().replace(":00 GMT", " UTC")}` : "", link: "delivery", entity: { client: clientId, email: dossier.email, name: who }, dedupeKey: `brief:${ref}` });
    await notify(env, { scope: "client", clientId, kind: "brief", severity: "info", title: `Your brief for the call with ${who} is ready`, body: "Open the call brief before the call.", link: "leads?tab=calls", dedupeKey: `brief-client:${ref}` });
    await finish(env, "precall-brief", ref, "done", provider_);
    return { ok: true, provider: provider_ };
  } catch (error) {
    await finish(env, "precall-brief", ref, "failed", error?.message || error);
    return { ok: false, error: str(error?.message || error) };
  }
}

// Sweep: any booking in the last 3 days with a future start that has no brief.
export async function briefPendingBookings(env, { now = Date.now(), limit = 5 } = {}) {
  const rows = (await env.DB.prepare(
    `SELECT e.provider, e.client, e.external_id, e.payload_summary_json FROM integration_events e
      WHERE e.kind='booking' AND e.ts>=? AND NOT EXISTS (SELECT 1 FROM automation_runs r WHERE r.kind='precall-brief' AND r.ref=e.provider||':'||e.external_id)
      ORDER BY e.ts DESC LIMIT 50`,
  ).bind(new Date(now - 3 * DAY).toISOString()).all().catch(() => ({ results: [] }))).results || [];
  let done = 0;
  for (const row of rows) {
    if (done >= limit) break;
    const s = parseJson(row.payload_summary_json, {});
    if (/cancel/i.test(str(s.status))) continue;
    if (s.starts_at && Date.parse(s.starts_at) < now) continue;
    const r = await briefBooking(env, { clientId: row.client, eventId: row.external_id, email: s.email, name: s.name, startsAt: s.starts_at, provider: row.provider });
    if (r) done += 1;
  }
  return done;
}

// ---------------------------------------------------------------------------
// Fathom import

export async function importFathomCalls(env, { now = Date.now(), fetcher = fetch } = {}) {
  if (!env.FATHOM_API_KEY) return 0;
  const clients = new Map();
  for (const r of ((await env.DB.prepare("SELECT client_id, email FROM client_auth").all().catch(() => ({ results: [] }))).results || [])) {
    const e = normalizeEmail(r.email); if (e) clients.set(e, r.client_id);
  }
  if (!clients.size) return 0;
  const qs = new URLSearchParams({ include_summary: "true", include_action_items: "true", created_after: new Date(now - 7 * DAY).toISOString() });
  let imported = 0, cursor = "";
  for (let page = 0; page < 5; page += 1) {
    if (cursor) qs.set("cursor", cursor);
    const r = await fetcher(`https://api.fathom.ai/external/v1/meetings?${qs}`, { headers: { "X-Api-Key": env.FATHOM_API_KEY }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`fathom ${r.status}`);
    const d = await r.json();
    for (const m of d.items || d.meetings || d.data || []) {
      const invitees = (m.calendar_invitees || []).map((i) => normalizeEmail(i.email)).filter(Boolean);
      const clientId = invitees.map((e) => clients.get(e)).find(Boolean);
      if (!clientId) continue;
      const ref = String(m.recording_id || m.url || "");
      if (!ref || !(await claim(env, "fathom-call", ref, clientId))) continue;
      const actions = (m.action_items || []).map((a) => `- ${str(a.description)}${a.assignee?.name || a.assignee?.email ? ` (${a.assignee.name || a.assignee.email})` : ""}`).filter((x) => x.length > 2);
      const linked = await recordingBooking(env,clientId,invitees,m.scheduled_start_time || m.created_at);
      await env.DB.prepare(
        "INSERT INTO call_notes (client, call_date, title, summary, decisions, actions, recording_url, created_at,booking_ref,lead_email,source_kind) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(clientId, m.scheduled_start_time || m.created_at || null, str(m.meeting_title || m.title || "Call").slice(0, 200), str(m.default_summary?.markdown_formatted).slice(0, 8000) || null, null, actions.join("\n") || null, str(m.url || m.share_url) || null, nowIso(),linked?.booking_ref || null,linked?.lead_email || null,'fathom').run();
      await finish(env, "fathom-call", ref, "done");
      await notify(env, { scope: "operator", clientId, kind: "content.review", severity: "info", title: `Call with ${await clientLabel(env, clientId)} filed`, body: `${actions.length} action item${actions.length === 1 ? "" : "s"} from Fathom. Review in Client work, Call notes.`, link: "delivery", entity: { client: clientId }, dedupeKey: `fathom:${ref}` });
      imported += 1;
    }
    cursor = d.next_cursor || "";
    if (!cursor) break;
  }
  return imported;
}

// ---------------------------------------------------------------------------
// Weekly report (Monday)

async function weekNumbers(env, clientId, from, to) {
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args).first().catch(() => null);
  const [cash, apps, bookings, visitors, plays, content, sequences] = await Promise.all([
    q("SELECT COALESCE(SUM(amount_cents - COALESCE(refunded_cents,0)),0) AS c, COUNT(*) AS n FROM payments WHERE client=? AND occurred_at>=? AND occurred_at<?", clientId, from, to),
    q("SELECT COUNT(*) AS n FROM leads WHERE client=? AND applied_at>=? AND applied_at<?", clientId, from, to),
    q("SELECT COUNT(*) AS n FROM pipeline_touches WHERE client_id=? AND kind='booking' AND ts>=? AND ts<?", clientId, from, to),
    q("SELECT COUNT(DISTINCT COALESCE(visitor_id,session_id)) AS n FROM page_events WHERE client=? AND event='page_view' AND at>=? AND at<?", clientId, from, to),
    q("SELECT COUNT(*) AS n FROM watch_events WHERE client=? AND event='play' AND at>=? AND at<?", clientId, from, to),
    q("SELECT COUNT(*) AS n FROM content_items WHERE client=? AND updated_at>=? AND updated_at<?", clientId, from, to),
    q("SELECT COUNT(*) AS n FROM studio_sequences WHERE client_id=? AND status IN ('approved','published') AND updated_at>=? AND updated_at<?", clientId, from, to),
  ]);
  return {
    cash_cents: Number(cash?.c || 0), payments: Number(cash?.n || 0), applications: Number(apps?.n || 0), bookings: Number(bookings?.n || 0),
    visitors: Number(visitors?.n || 0), video_plays: Number(plays?.n || 0), content_items_updated: Number(content?.n || 0), sequences_approved: Number(sequences?.n || 0),
  };
}

export async function draftWeeklyReports(env, { now = Date.now(), fetcher = fetch } = {}) {
  const week = new Date(now).toISOString().slice(0, 10);
  const clients = (await env.DB.prepare(
    "SELECT client, COALESCE(client_name, client) AS name FROM client_config WHERE COALESCE(status,'') IN ('client','onboarding')",
  ).all().catch(() => ({ results: [] }))).results || [];
  let drafted = 0;
  for (const c of clients) {
    const ref = `${c.client}:${week}`;
    if (!(await claim(env, "weekly-report", ref, c.client))) continue;
    try {
      const to = new Date(now).toISOString(), from = new Date(now - 7 * DAY).toISOString(), prevFrom = new Date(now - 14 * DAY).toISOString();
      const [cur, prev, total, prov, shipped] = await Promise.all([
        weekNumbers(env, c.client, from, to),
        weekNumbers(env, c.client, prevFrom, from),
        env.DB.prepare("SELECT COALESCE(SUM(amount_cents - COALESCE(refunded_cents,0)),0) AS c FROM payments WHERE client=?").bind(c.client).first().catch(() => null),
        env.DB.prepare("SELECT provisioned_at FROM client_provisioning WHERE client_id=?").bind(c.client).first().catch(() => null),
        env.DB.prepare("SELECT title, stage FROM content_items WHERE client=? AND updated_at>=? ORDER BY updated_at DESC LIMIT 8").bind(c.client, from).all().catch(() => ({ results: [] })),
      ]);
      const weekN = prov?.provisioned_at ? Math.max(1, Math.ceil((now - Date.parse(prov.provisioned_at)) / (7 * DAY))) : null;
      const facts = `Client: ${c.name}
Engagement week: ${weekN ? `${weekN} of 12${weekN > 12 ? " (continuation)" : ""}` : "unknown"}
This week (last 7 days): ${JSON.stringify(cur)}
Last week: ${JSON.stringify(prev)}
Attributable revenue to date: ${centsToAmount(total?.c || 0)} (guarantee target 100000.00)
Shipped or updated this week: ${(shipped?.results || []).map((s) => `${s.title} (${s.stage || "in progress"})`).join("; ") || "nothing recorded"}`;
      let subject = `Week ${weekN || ""} report: ${c.name}`.replace("Week  ", "Week ");
      let body = `Numbers from the last 7 days\n${facts}\n\n(No text model is configured, so this is the raw data. Rewrite before sending.)`;
      if (llmAvailable(env)) {
        const result = await complete(env, { fetcher, maxTokens: 900, prompt: `Draft the Monday report Pulsify sends a coaching client. Audience: a coach paying a base fee plus performance share, busy, allergic to fluff. Readable in 90 seconds, honest about what is behind, clear about what happens next. Never spin a number, never project revenue.

${facts}

Structure, plain text for email:
1. Numbers: a compact list of metric, this week, last week. Only metrics with data. Then two or three sentences on what moved and why, bad numbers first with the response.
2. $100k tracker: revenue to date against the target and an honest read (ahead, on pace or behind).
3. Shipped: one line each, from the list above only.
4. This week: leave a line that says "[Founder: add this week's deliverables]".
5. Needed from you: leave a line that says "[Founder: add dated client-side items or 'nothing, we're clear']".

${VOICE_GUARD}` });
        if (result.text) body = `${result.text.trim()}\n\n(Drafted by ${result.provider}. Review every number before sending.)`;
      }
      await env.DB.prepare("INSERT INTO email_drafts (client, subject, body, tag_id, status, created_at) VALUES (?,?,?,?, 'draft', ?)").bind(c.client, subject, body.slice(0, 20000), null, nowIso()).run();
      await notify(env, { scope: "operator", clientId: c.client, kind: "content.review", severity: "info", title: `Weekly report drafted for ${c.name}`, body: "Review the numbers and send it from Email.", link: "email", entity: { client: c.client }, dedupeKey: `weekly:${ref}` });
      await finish(env, "weekly-report", ref, "done");
      drafted += 1;
    } catch (error) { await finish(env, "weekly-report", ref, "failed", error?.message || error); }
  }
  return drafted;
}
