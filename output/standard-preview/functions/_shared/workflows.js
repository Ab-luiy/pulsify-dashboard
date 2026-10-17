// Workflow recipes (ticket #78): a thin layer on what already exists, not a builder.
//
//   recipe  = a named set of flows, each flow a trigger plus an ordered list of steps
//   step    = action (code runs), ai (writes through resolveAi, capped and number-checked),
//             approval (a person looks, may edit, approves or rejects) or wait (until something happens elsewhere)
//   run     = one pass through a flow for one client; every step is logged, so each client has a run history
//
// Built on: webhook_outbox events (sweepOutbox starts runs from them), automation_runs (every run is mirrored there),
// resolveAi with the client's brain, the daily AI allowance and the number check (ai-guard.js).
// Anything sensitive stops at an approval step. Recipes never reach outside through a global: every outside call
// goes through ctx.deps (fetcher), so tests run with mocks and nothing real is touched.
import { generateOpaqueToken, nowIso, parseJson, str } from "./common.js";
import { aiConfigured, generateText, resolveAi } from "./ai-provider.js";
import { findUnsupportedNumbers } from "./ai-guard.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "./client-brain-context.js";

const RECIPES = new Map();

/** Register a recipe: {kind, title, summary, defaultConfig, flows: {name: {label, event?, outbox?, steps: [...]}}}. */
export function defineRecipe(recipe) {
  RECIPES.set(recipe.kind, recipe);
  return recipe;
}
export const getRecipe = (kind) => RECIPES.get(kind) || null;
export const listRecipes = () => [...RECIPES.values()];

// ---- saved recipes ----

export async function loadRecipe(env, client, kind) {
  const row = await env.DB.prepare("SELECT enabled, config_json, public_slug, updated_at FROM workflow_recipes WHERE client_id=? AND kind=?").bind(client, kind).first();
  const def = getRecipe(kind);
  return {
    saved: Boolean(row),
    enabled: Boolean(row?.enabled),
    slug: row?.public_slug || null,
    config: { ...(def?.defaultConfig || {}), ...parseJson(row?.config_json, {}) },
    updated_at: row?.updated_at || null,
  };
}

export async function saveRecipe(env, client, kind, { config, enabled, slug }) {
  const now = nowIso();
  const current = await loadRecipe(env, client, kind);
  const next = config ?? current.config;
  const on = enabled === undefined ? current.enabled : Boolean(enabled);
  await env.DB.prepare(
    `INSERT INTO workflow_recipes (client_id, kind, enabled, config_json, public_slug, created_at, updated_at) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(client_id, kind) DO UPDATE SET enabled=excluded.enabled, config_json=excluded.config_json,
       public_slug=COALESCE(excluded.public_slug, workflow_recipes.public_slug), updated_at=excluded.updated_at`,
  ).bind(client, kind, on ? 1 : 0, JSON.stringify(next), slug || null, now, now).run();
}

// ---- runs ----

const FINAL = new Set(["done", "failed", "rejected", "skipped"]);
const MIRROR = { running: "running", awaiting_approval: "running", waiting: "running", done: "done", failed: "failed", rejected: "skipped", skipped: "skipped" };

function readRun(row) {
  if (!row) return null;
  return { ...row, is_test: Boolean(row.is_test), steps: parseJson(row.steps_json, []), state: parseJson(row.state_json, {}) };
}

async function persist(env, run) {
  const now = nowIso();
  run.updated_at = now;
  if (FINAL.has(run.status) && !run.finished_at) run.finished_at = now;
  await env.DB.prepare("UPDATE workflow_runs SET status=?, step_index=?, steps_json=?, state_json=?, summary=?, error=?, updated_at=?, finished_at=? WHERE id=?")
    .bind(run.status, run.step_index, JSON.stringify(run.steps), JSON.stringify(run.state), run.summary || null, run.error || null, now, run.finished_at || null, run.id).run();
  // The delivery automations table keeps its own picture of every run (idempotency, ops views).
  await env.DB.prepare(
    `INSERT INTO automation_runs (kind, ref, client_id, status, detail, created_at) VALUES (?,?,?,?,?,?)
     ON CONFLICT(kind, ref) DO UPDATE SET status=excluded.status, detail=excluded.detail`,
  ).bind(`workflow:${run.kind}`, `${run.client_id}:${run.trigger_ref}`, run.client_id, MIRROR[run.status] || "running", str(run.summary || run.error).slice(0, 500) || null, run.created_at).run().catch(() => null);
}

export async function getRun(env, id) {
  return readRun(await env.DB.prepare("SELECT * FROM workflow_runs WHERE id=?").bind(id).first());
}

export async function listRuns(env, client, { limit = 50 } = {}) {
  const rows = await env.DB.prepare("SELECT * FROM workflow_runs WHERE client_id=? ORDER BY created_at DESC, rowid DESC LIMIT ?").bind(client, limit).all();
  return rows.results.map(readRun);
}

const log = (run, step, status, note = "") => {
  run.steps.push({ id: step.id, label: step.label, type: step.type, status, note: str(note).slice(0, 300), at: nowIso() });
};

/** Start a run. Idempotent on (client, kind, ref): a repeat returns the existing run with duplicate: true. */
export async function startRun(env, { client, kind, flow, event, ref, data = {}, isTest = false, deps = {} }) {
  const recipe = getRecipe(kind);
  const def = recipe?.flows?.[flow];
  if (!def) throw new Error(`Unknown recipe flow ${kind}/${flow}`);
  const id = `wfr_${generateOpaqueToken(10)}`;
  const triggerRef = str(ref) || id;
  const now = nowIso();
  const state = { trigger: data };
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO workflow_runs (id, client_id, kind, flow, trigger_event, trigger_ref, status, state_json, is_test, created_at, updated_at)
     VALUES (?,?,?,?,?,?,'running',?,?,?,?)`,
  ).bind(id, client, kind, flow, str(event) || def.event || flow, triggerRef, JSON.stringify(state), isTest ? 1 : 0, now, now).run();
  if (!inserted.meta?.changes) {
    const existing = readRun(await env.DB.prepare("SELECT * FROM workflow_runs WHERE client_id=? AND kind=? AND trigger_ref=?").bind(client, kind, triggerRef).first());
    return { run: existing, duplicate: true };
  }
  const run = await getRun(env, id);
  await persist(env, run);
  return { run: await execute(env, run, deps), duplicate: false };
}

function context(env, run, recipe, config, deps) {
  return {
    env,
    client: run.client_id,
    run,
    state: run.state,
    config,
    trigger: run.state.trigger || {},
    deps: { fetcher: fetch, ...deps },
    isTest: run.is_test,
    /** Write with the client's AI. Counts against their daily allowance. Figures not in their proof or brief come back flagged. */
    async ai(prompt, { sources = [], json = false } = {}) {
      const ai = await resolveAi(env, run.client_id);
      if (!aiConfigured(ai)) throw new Error("Writing is not set up for this workspace yet.");
      const brain = buildGeneratorBrainContext(await loadClientBrainData(env, run.client_id));
      const text = String(await generateText({ system: `${prompt.system}\n\n${brain.prompt_text || ""}`.trim(), user: prompt.user }, ai, { json })).trim();
      return { text, flagged: findUnsupportedNumbers(text, [brain.prompt_text, prompt.user, ...sources]), provider: ai.mode };
    },
  };
}

/** Run steps from run.step_index until the run finishes or stops at an approval or a wait. */
export async function execute(env, run, deps = {}) {
  const recipe = getRecipe(run.kind);
  const steps = recipe.flows[run.flow].steps;
  const saved = await loadRecipe(env, run.client_id, run.kind);
  run.status = "running";
  while (run.status === "running") {
    const step = steps[run.step_index];
    if (!step) {
      run.status = "done";
      run.summary = run.summary || recipe.flows[run.flow].doneNote?.(run.state) || "Finished.";
      break;
    }
    const ctx = context(env, run, recipe, saved.config, deps);
    try {
      if (step.type === "approval") {
        const proposal = (await step.propose?.(ctx)) || {};
        run.state.approval = { step: step.id, title: step.label, fields: proposal.fields || {}, flagged: proposal.flagged || [], note: proposal.note || "" };
        log(run, step, "waiting", "Needs a person to approve it");
        run.status = "awaiting_approval";
        break;
      }
      if (step.type === "wait") {
        log(run, step, "waiting", step.label);
        run.status = "waiting";
        break;
      }
      const out = (await step.run(ctx)) || {};
      if (out.skip) {
        log(run, step, "skipped", out.note);
        run.status = "skipped";
        run.summary = out.note;
        break;
      }
      log(run, step, "done", out.note);
      run.step_index += 1;
    } catch (error) {
      log(run, step, "failed", error?.message);
      run.status = "failed";
      run.error = str(error?.message).slice(0, 300) || "A step failed.";
      break;
    }
    await persist(env, run);
  }
  await persist(env, run);
  return run;
}

/** A person approves or rejects. `fields` are their edits to the proposal. Only keys the proposal offered are kept. */
export async function decideApproval(env, runId, { approve, by, fields = {} }, deps = {}) {
  const run = await getRun(env, runId);
  if (!run || run.status !== "awaiting_approval") return { error: "This is not waiting for approval.", status: 409 };
  const recipe = getRecipe(run.kind);
  const step = recipe.flows[run.flow].steps[run.step_index];
  const proposal = run.state.approval;
  if (!approve) {
    log(run, step, "failed", `Rejected by ${by}`);
    run.status = "rejected";
    run.summary = "Rejected. Nothing was sent or changed.";
    await persist(env, run);
    return { run };
  }
  const kept = {};
  for (const key of Object.keys(proposal.fields)) kept[key] = key in fields ? str(fields[key]) : proposal.fields[key];
  run.state.approved = { fields: kept, by, at: nowIso() };
  log(run, step, "done", `Approved by ${by}`);
  run.step_index += 1;
  return { run: await execute(env, run, deps) };
}

/** Something happened outside (a person filled in a page): continue a run that is waiting for it. */
export async function resumeRun(env, runId, name, data = {}, deps = {}) {
  const run = await getRun(env, runId);
  if (!run || run.status !== "waiting") return { error: "This run is not waiting.", status: 409 };
  const step = getRecipe(run.kind).flows[run.flow].steps[run.step_index];
  if (step.event !== name) return { error: "This run is waiting for something else.", status: 409 };
  run.state.resumed = data;
  log(run, step, "done", name);
  run.step_index += 1;
  return { run: await execute(env, run, deps) };
}

/** Try a failed run again from the step that failed. */
export async function retryRun(env, runId, deps = {}) {
  const run = await getRun(env, runId);
  if (!run || run.status !== "failed") return { error: "Only a failed run can be tried again.", status: 409 };
  run.error = null;
  return { run: await execute(env, run, deps) };
}

/**
 * Start runs for outbox events that an enabled recipe listens for (flow.outbox = the event name).
 * Idempotent: the outbox event id is the run's trigger_ref. Looks back two days.
 */
export async function sweepOutbox(env, deps = {}) {
  let started = 0;
  const since = new Date(Date.now() - 2 * 86400000).toISOString();
  for (const recipe of listRecipes()) {
    for (const [flow, def] of Object.entries(recipe.flows)) {
      if (!def.outbox) continue;
      const rows = await env.DB.prepare(
        `SELECT o.id, o.client_id, o.payload_json FROM webhook_outbox o
          JOIN workflow_recipes r ON r.client_id=o.client_id AND r.kind=? AND r.enabled=1
         WHERE o.event=? AND o.is_test=0 AND o.created_at>=? ORDER BY o.created_at LIMIT 100`,
      ).bind(recipe.kind, def.outbox, since).all();
      for (const row of rows.results) {
        const { duplicate } = await startRun(env, { client: row.client_id, kind: recipe.kind, flow, event: def.outbox, ref: row.id, data: parseJson(row.payload_json, {}).data || {}, deps });
        if (!duplicate) started += 1;
      }
    }
  }
  return started;
}

/** What the run history shows for one run. No internals, no secrets. */
export function publicRun(run) {
  const recipe = getRecipe(run.kind);
  return {
    id: run.id,
    kind: run.kind,
    recipe: recipe?.title || run.kind,
    flow: recipe?.flows?.[run.flow]?.label || run.flow,
    status: run.status,
    summary: run.summary || "",
    error: run.error || "",
    is_test: run.is_test,
    created_at: run.created_at,
    finished_at: run.finished_at || null,
    steps: run.steps.map(({ label, type, status, note, at }) => ({ label, type, status, note, at })),
    approval: run.status === "awaiting_approval" ? { title: run.state.approval?.title || "", fields: run.state.approval?.fields || {}, flagged: run.state.approval?.flagged || [], note: run.state.approval?.note || "" } : null,
  };
}
