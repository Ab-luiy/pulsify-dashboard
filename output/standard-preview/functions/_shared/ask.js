// Ask (InfoOS build, 2026-09-30): plain questions about a client's numbers, answered from
// the rows. Each answer is built from computed facts (lead score and pipeline, funnel
// health, payments, calls); nothing is estimated. With ANTHROPIC_API_KEY set, Claude only
// rewords the computed answer and the facts it was handed; any failure falls back to the
// computed answer. Dustin's rule, kept: the AI writes the words, the system computes the numbers.

import { cleanId } from "./common.js";
import { funnelHealthReport } from "./funnel-health.js";
import { loadPipeline } from "./lead-people.js";
import { complete, VOICE_GUARD } from "./llm.js";

const DAY = 86400000;
const SOURCE = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", facebook: "Meta", google: "Google", email: "email", direct: "direct visits", x: "X", linkedin: "LinkedIn" };

export const SUGGESTIONS = [
  "Who should I call first?",
  "How much cash came in this month?",
  "Which video brought the most cash?",
  "Where do my best leads come from?",
  "What should I fix first?",
  "How are my calls going?",
];

const money = (cents, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents || 0) / 100);
  } catch {
    return `${currency} ${Math.round((cents || 0) / 100)}`;
  }
};
const pct = (v) => (v == null ? "no data" : `${Math.round(v * 100)}%`);
const nameOf = (p) => p.name || p.email || "Someone";

// Which question is it? First match wins; the order puts the specific before the general.
const INTENTS = [
  ["fix", /\b(fix|improve|leak|broken|wrong|bottleneck|funnel|convert)\b/i],
  ["call", /\b(call|reach out|contact|follow ?up|hot|warm|who should|priority|leads? to)\b/i],
  ["video", /\b(video|youtube|content|upload)\b/i],
  ["source", /\b(source|where|come from|traffic|channel|platform|best leads)\b/i],
  ["calls", /\b(show|no-?show|close rate|closing|calls?|booked|meeting)\b/i],
  ["cash", /\b(cash|revenue|money|made|earn|sales|sold|paid|payments?|collected)\b/i],
  ["applications", /\b(appl|qualif|opt.?in|signups?)\b/i],
];

export function intentOf(question) {
  for (const [intent, pattern] of INTENTS) if (pattern.test(question)) return intent;
  return "summary";
}

export async function askFacts(env, clientId, now = Date.now()) {
  const client = cleanId(clientId, "");
  const monthStart = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();
  const [pipeline, health, payments, outcomes] = await Promise.all([
    loadPipeline(env, client, { now }),
    funnelHealthReport(env, client, { range: "30d", now }).catch(() => null),
    env.DB.prepare(
      `SELECT COALESCE(SUM(CASE WHEN p.occurred_at >= ? THEN MAX(p.amount_cents - p.refunded_cents, 0) END), 0) AS month,
              COALESCE(SUM(CASE WHEN p.occurred_at >= ? THEN MAX(p.amount_cents - p.refunded_cents, 0) END), 0) AS last30,
              MAX(p.currency) AS currency
         FROM payment_matches m JOIN payments p ON p.id = m.payment_id
        WHERE m.client_id=? AND m.status='confirmed' AND p.kind='charge'`,
    ).bind(monthStart, new Date(now - 30 * DAY).toISOString(), client).first(),
    env.DB.prepare(
      `SELECT SUM(attended='showed') AS held, SUM(attended='no_show') AS no_shows, SUM(result='closed') AS closed
         FROM lead_outcomes WHERE client_id=? AND COALESCE(call_at, created_at) >= ?`,
    ).bind(client, new Date(now - 30 * DAY).toISOString()).first().catch(() => null),
  ]);
  const people = pipeline.people;
  const raw = pipeline.raw;
  const currency = String(payments?.currency || "USD").toUpperCase();
  const bySource = new Map();
  const byVideo = new Map();
  for (const p of raw) {
    const key = p.source?.channel || "direct";
    const s = bySource.get(key) || { source: key, applications: 0, buyers: 0, cash: 0 };
    if (p.stages.applied) s.applications += 1;
    if (p.stages.bought) { s.buyers += 1; s.cash += p.money.collected_cents; }
    bySource.set(key, s);
    if (p.source?.video && p.stages.bought) {
      const v = byVideo.get(p.source.video.video_id) || { title: p.source.video.title || p.source.video.video_id, buyers: 0, cash: 0 };
      v.buyers += 1;
      v.cash += p.money.collected_cents;
      byVideo.set(p.source.video.video_id, v);
    }
  }
  const held = Number(outcomes?.held || 0);
  const noShows = Number(outcomes?.no_shows || 0);
  const upcoming = people.filter((p) => p.call?.state === "upcoming" && p.call.call_at).sort((a, b) => String(a.call.call_at).localeCompare(String(b.call.call_at)));
  return {
    currency,
    cash_month: Number(payments?.month || 0),
    cash_30d: Number(payments?.last30 || 0),
    hot: people.filter((p) => p.band === "hot").slice(0, 5),
    to_call: people.filter((p) => ["applied", "started", "follow_up", "no_show", "cancelled"].includes(p.status)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5),
    upcoming,
    needs_form: people.filter((p) => p.status === "call_done").length,
    sources: [...bySource.values()].sort((a, b) => b.cash - a.cash || b.applications - a.applications),
    videos: [...byVideo.values()].sort((a, b) => b.cash - a.cash),
    show_rate: held + noShows ? held / (held + noShows) : null,
    close_rate: held ? Number(outcomes?.closed || 0) / held : null,
    held,
    applications: people.filter((p) => p.stages?.applied || p.status === "applied").length,
    unqualified: people.filter((p) => p.status === "unqualified").length,
    fix: health?.fixes?.[0] || null,
    score: health?.score?.value ?? null,
    leads: people.length,
  };
}

function when(iso) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

export function answerFrom(intent, f) {
  const facts = [];
  const links = [];
  let answer;
  if (intent === "call") {
    const list = f.hot.length ? f.hot : f.to_call;
    if (!list.length) answer = "Nobody is waiting on a call right now. Every lead has booked, bought, or hasn't shown enough to call.";
    else {
      answer = `${f.hot.length ? "Call these first, hottest first" : "Nobody is hot yet. These are waiting on a call"}:\n` +
        list.map((p, i) => `${i + 1}. ${nameOf(p)} (${p.score ?? "-"}): ${p.next?.text || ""}`).join("\n");
    }
    links.push({ label: "Open the pipeline", route: "leads" });
    facts.push({ label: "Hot leads", value: String(f.hot.length) }, { label: "Waiting on a call", value: String(f.to_call.length) });
  } else if (intent === "cash") {
    answer = `${money(f.cash_month, f.currency)} collected this month, ${money(f.cash_30d, f.currency)} in the last 30 days. That's confirmed payments net of refunds.`;
    facts.push({ label: "This month", value: money(f.cash_month, f.currency) }, { label: "Last 30 days", value: money(f.cash_30d, f.currency) });
    links.push({ label: "Payments", route: "revenue" });
  } else if (intent === "video") {
    const top = f.videos[0];
    answer = top
      ? `"${top.title}" brought the most cash: ${money(top.cash, f.currency)} from ${top.buyers} ${top.buyers === 1 ? "buyer" : "buyers"}.${f.videos[1] ? ` Next is "${f.videos[1].title}" with ${money(f.videos[1].cash, f.currency)}.` : ""}`
      : "No sale has come through a tracked YouTube link yet. Once buyers arrive from a video link, this names the video.";
    links.push({ label: "Videos by cash", route: "youtube/cash" });
  } else if (intent === "source") {
    const top = f.sources.filter((s) => s.applications || s.buyers);
    answer = top.length
      ? top.slice(0, 3).map((s) => `${SOURCE[s.source] || s.source}: ${s.applications} applied, ${s.buyers} bought${s.cash ? `, ${money(s.cash, f.currency)}` : ""}`).join("\n")
      : "No leads with a known source yet.";
    links.push({ label: "Where visitors come from", route: "performance/funnel" });
  } else if (intent === "fix") {
    const fix = f.fix;
    answer = fix
      ? fix.kind === "opportunity"
        ? `Fix ${fix.from_label} to ${fix.to_label} first: ${pct(fix.rate)} against a target of ${pct(fix.target?.rate)}.${fix.dollars_cents ? ` Reaching the target is worth about ${money(fix.dollars_cents, f.currency)} at your current rates.` : ""} ${fix.fix?.text || ""}`
        : fix.fix?.text || "Start with the first item on your fix list."
      : "Nothing is graded yet. Steps are graded once 20 people reach the step before them.";
    if (f.score != null) facts.push({ label: "Funnel score", value: String(f.score) });
    links.push({ label: "Your funnel", route: "home" });
  } else if (intent === "calls") {
    const next = f.upcoming[0];
    answer = `${f.upcoming.length} ${f.upcoming.length === 1 ? "call" : "calls"} coming up${next ? `, next with ${nameOf(next)} on ${when(next.call.call_at)}` : ""}. Over the last 30 days: show rate ${pct(f.show_rate)}, close rate ${pct(f.close_rate)} from ${f.held} held.${f.needs_form ? ` ${f.needs_form} ${f.needs_form === 1 ? "call needs" : "calls need"} a post-call form.` : ""}`;
    facts.push({ label: "Show rate", value: pct(f.show_rate) }, { label: "Close rate", value: pct(f.close_rate) });
    links.push({ label: "Calls", route: "leads?tab=calls" });
  } else if (intent === "applications") {
    answer = `${f.applications} ${f.applications === 1 ? "person has" : "people have"} applied${f.unqualified ? `, ${f.unqualified} marked not a fit by your answers` : ""}.`;
    links.push({ label: "Applications", route: "performance/applications" });
  } else {
    answer = `${money(f.cash_month, f.currency)} this month. ${f.hot.length} hot ${f.hot.length === 1 ? "lead" : "leads"}, ${f.to_call.length} waiting on a call, ${f.upcoming.length} ${f.upcoming.length === 1 ? "call" : "calls"} coming up.`;
    links.push({ label: "Leads", route: "leads" });
  }
  return { answer, facts, links };
}

export async function answerQuestion(env, clientId, question, { now = Date.now(), fetcher } = {}) {
  const intent = intentOf(question);
  const facts = await askFacts(env, clientId, now);
  const computed = answerFrom(intent, facts);
  if (!env?.ANTHROPIC_API_KEY) return { ...computed, source: "computed" };
  try {
    const { text } = await complete(env, {
      fetcher,
      maxTokens: 400,
      system: `You answer a coach's question about their sales funnel. Use only the numbers and names in the answer draft below; never add a number, a name or a claim. Reply in two to four short sentences, plain words.\n${VOICE_GUARD}`,
      prompt: `Question: ${question}\n\nAnswer draft (computed from their data):\n${computed.answer}`,
    });
    return text ? { ...computed, answer: text.trim(), source: "ai" } : { ...computed, source: "computed" };
  } catch {
    return { ...computed, source: "computed" };
  }
}
