// Launch checklist: eight fixed steps, server-side progress per client, and
// auto-complete rules evaluated against the client's own data. Each step
// deep-links to the view that completes it.
import { cleanId, nowIso, str } from "./common.js";
import { emitEvent } from "./outbound-webhooks.js";

export const STEPS = [
  { id: "offer-voice-note", title: "Record your offer voice note", detail: "Two minutes on what you sell, to whom, and why it works. We turn it into your brain.", view: "onboard:voice", cta: "Record" },
  { id: "who-you-sell-to", title: "Tell us who you sell to", detail: "Your ideal buyer in plain words. This shapes every sequence and title.", view: "brain:icp", cta: "Describe them" },
  { id: "connect-instagram", title: "Connect Instagram", detail: "Accept the tester invite so your inbox and insights flow in.", view: "integrations:instagram", cta: "Connect" },
  { id: "connect-youtube", title: "Connect YouTube", detail: "Your channel handle is enough to start tracking.", view: "integrations:youtube", cta: "Connect" },
  { id: "connect-payments", title: "Connect payments", detail: "Stripe or Whop, read-only. Cash collected then shows against the lead who paid.", view: "integrations:stripe", cta: "Connect" },
  { id: "first-proof", title: "Upload your first proof", detail: "One real student result. Never lifestyle.", view: "media", cta: "Upload" },
  { id: "first-sequence", title: "Generate your first sequence", detail: "Pick a type, add the proof, and let the studio draft it.", view: "instagram", cta: "Open studio" },
  { id: "ship-it", title: "Ship it", detail: "Post the sequence. It goes live in your library and the loop starts.", view: "content", cta: "Mark live" },
];
const STEP_IDS = new Set(STEPS.map((s) => s.id));

export async function seedChecklist(env, clientId) {
  const client = cleanId(clientId);
  const now = nowIso();
  for (const [index, step] of STEPS.entries()) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO checklist_steps (client_id, step, position, state, updated_at) VALUES (?,?,?,'open',?)",
    ).bind(client, step.id, index, now).run();
  }
}

export async function loadChecklist(env, clientId) {
  const client = cleanId(clientId);
  const rows = await env.DB.prepare(
    "SELECT step, state, completed_by, completed_at FROM checklist_steps WHERE client_id=? ORDER BY position",
  ).bind(client).all();
  const byStep = new Map((rows.results || []).map((r) => [r.step, r]));
  const steps = STEPS.map((s) => ({ ...s, state: byStep.get(s.id)?.state || "open", completed_by: byStep.get(s.id)?.completed_by || null, completed_at: byStep.get(s.id)?.completed_at || null }));
  const done = steps.filter((s) => s.state === "done").length;
  return { steps, done, total: STEPS.length };
}

export async function setStep(env, clientId, stepId, state, actor) {
  const client = cleanId(clientId);
  const step = str(stepId);
  if (!STEP_IDS.has(step) || !["open", "skipped", "done"].includes(state)) return { ok: false, error: "unknown step or state" };
  const prior = await env.DB.prepare("SELECT state FROM checklist_steps WHERE client_id=? AND step=?").bind(client, step).first();
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO checklist_steps (client_id, step, position, state, completed_by, completed_at, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(client_id, step) DO UPDATE SET state=excluded.state, completed_by=excluded.completed_by, completed_at=excluded.completed_at, updated_at=excluded.updated_at`,
  ).bind(client, step, STEPS.findIndex((s) => s.id === step), state, state === "done" ? str(actor) : null, state === "done" ? now : null, now).run();
  if (state === "done" && prior?.state !== "done") {
    await emitEvent(env, { scope: "client", clientId: client, event: "client.checklist_step_completed", data: { step, by: str(actor) } }).catch(() => null);
  }
  return { ok: true, changed: prior?.state !== state };
}

// Auto-complete rules. Each returns true when the client's data satisfies the
// step. Cheap queries only; this runs on every checklist read.
const RULES = {
  "offer-voice-note": async (env, c) => (await exists(env, "SELECT 1 FROM voice_notes WHERE client_id=? AND state IN ('transcribed','applied') LIMIT 1", c))
    || (await exists(env, "SELECT 1 FROM client_brain WHERE client_id=? AND section='offer' AND length(value_json)>4 LIMIT 1", c)),
  "who-you-sell-to": async (env, c) => exists(env, "SELECT 1 FROM client_brain WHERE client_id=? AND section='icp' AND length(value_json)>4 LIMIT 1", c),
  "connect-instagram": async (env, c) => exists(env, "SELECT 1 FROM integrations WHERE scope='client' AND client_id=? AND provider='instagram' AND json_extract(config_json,'$.confirmed')='true' LIMIT 1", c),
  "connect-youtube": async (env, c) => exists(env, "SELECT 1 FROM integrations WHERE scope='client' AND client_id=? AND provider='youtube' AND json_extract(config_json,'$.confirmed')='true' LIMIT 1", c),
  "connect-payments": async (env, c) => exists(env, "SELECT 1 FROM integrations WHERE scope='client' AND client_id=? AND provider IN ('stripe','whop') AND secret_json IS NOT NULL AND length(secret_json)>2 LIMIT 1", c),
  "first-proof": async (env, c) => exists(env, "SELECT 1 FROM proof_items WHERE client_id=? LIMIT 1", c),
  "first-sequence": async (env, c) => exists(env, "SELECT 1 FROM studio_sequences WHERE client_id=? LIMIT 1", c),
  "ship-it": async (env, c) => exists(env, "SELECT 1 FROM studio_sequences WHERE client_id=? AND status IN ('live','published') LIMIT 1", c),
};

async function exists(env, sql, client) {
  try { return Boolean(await env.DB.prepare(sql).bind(client).first()); } catch { return false; }
}

// Evaluate every open or skipped step; mark satisfied ones done by 'system'.
export async function autoComplete(env, clientId) {
  const client = cleanId(clientId);
  const current = await loadChecklist(env, client);
  const completed = [];
  for (const step of current.steps) {
    if (step.state === "done") continue;
    const rule = RULES[step.id];
    if (rule && await rule(env, client)) {
      await setStep(env, client, step.id, "done", "system");
      completed.push(step.id);
    }
  }
  return completed;
}
