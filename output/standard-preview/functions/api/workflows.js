// Workflow recipes and their run history (tickets #78, #79).
//   GET  /api/workflows?client=            recipes, the lead magnet settings, the last 50 runs, the AI allowance left
//   POST /api/workflows {action, client?}  save | draft | decide | activate | pause | test | remove_test | retry
//   POST /api/workflows?action=guide&client=&name=   raw PDF body (up to 10 MB): the guide people receive
// A client works on their own workspace; an operator names the client. Operator previews are read-only.
import { withOperator } from "../_shared/access.js";
import { cleanId, generateOpaqueToken, json, normalizeEmail, nowIso, str } from "../_shared/common.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";
import { resolveAi } from "../_shared/ai-provider.js";
import { allowanceLeft } from "../_shared/ai-guard.js";
import "../_shared/recipes/index.js";
import { decideApproval, getRecipe, getRun, listRecipes, listRuns, loadRecipe, publicRun, retryRun, saveRecipe, startRun } from "../_shared/workflows.js";
import { KIND, DEFAULT_DM, captureUrl, instagramFor, newSlug, readiness } from "../_shared/recipes/lead-magnet.js";
import { zernioConfigured } from "../_shared/zernio.js";

const MAX_GUIDE_BYTES = 10 * 1024 * 1024;

async function who(request, env, requested) {
  const access = await resolveSpineRead(request, env, "client", str(requested));
  if (access.error) return access;
  if (!access.client) return { error: json({ ok: false, error: "Pick a client first." }, 422) };
  return access;
}

/** The lead magnet as the screen needs it. Never includes storage keys or tokens. */
export async function leadMagnetView(env, client) {
  const saved = await loadRecipe(env, client, KIND);
  const c = saved.config;
  const instagram = await instagramFor(env, client);
  const missing = readiness(c, saved.slug);
  const captures = await env.DB.prepare("SELECT COUNT(*) AS n FROM lead_magnet_captures WHERE client_id=? AND is_test=0").bind(client).first();
  return {
    kind: KIND,
    title: getRecipe(KIND).title,
    summary: getRecipe(KIND).summary,
    enabled: saved.enabled,
    keyword: c.keyword,
    dm_message: c.dm_message || DEFAULT_DM,
    post_id: c.post_id || "",
    guide: { kind: c.guide?.kind || "", name: c.guide?.name || "", url: c.guide?.kind === "link" ? c.guide.url : "" },
    email: { subject: c.email?.subject || "", body: c.email?.body || "", approved: Boolean(c.email?.approved_at), approved_by: c.email?.approved_by || "" },
    capture_url: saved.slug ? captureUrl(env, saved.slug) : "",
    missing,
    instagram: { connected: instagram.connected, username: instagram.username },
    zernio_configured: zernioConfigured(env),
    people: Number(captures?.n || 0),
  };
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await who(request, env, new URL(request.url).searchParams.get("client"));
  if (access.error) return access.error;
  const client = cleanId(access.client);
  const ai = await resolveAi(env, client);
  const runs = await listRuns(env, client, { limit: 50 });
  return json({
    ok: true,
    client,
    recipes: [await leadMagnetView(env, client)],
    catalog: listRecipes().map((r) => ({ kind: r.kind, title: r.title })),
    runs: runs.map(publicRun),
    allowance_left: await allowanceLeft(env, ai, client),
    email_ready: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  });
}

const cleanKeyword = (value) => str(value).replace(/\s+/g, " ").slice(0, 30);

async function saveSettings(env, client, body, actor) {
  const saved = await loadRecipe(env, client, KIND);
  const c = structuredClone(saved.config);
  const before = JSON.stringify([c.keyword, c.dm_message, c.post_id]);
  if ("keyword" in body) {
    c.keyword = cleanKeyword(body.keyword);
    if (c.keyword.length < 3) return { error: "The word needs at least 3 letters." };
  }
  if ("dm_message" in body) {
    c.dm_message = str(body.dm_message).slice(0, 500);
    if (!c.dm_message) return { error: "Write the message people get in their DMs." };
  }
  if ("post_id" in body) c.post_id = str(body.post_id).slice(0, 80);
  if ("guide_url" in body) {
    const url = str(body.guide_url);
    if (url) {
      if (!/^https:\/\/[^\s]+$/i.test(url)) return { error: "The guide link must start with https://." };
      c.guide = { kind: "link", name: str(body.guide_name).slice(0, 100) || c.guide?.name || "Your guide", url, key: "" };
    }
  } else if ("guide_name" in body && c.guide?.kind) {
    c.guide.name = str(body.guide_name).slice(0, 100);
  }
  if ("email_subject" in body || "email_body" in body) {
    const subject = str(body.email_subject ?? c.email?.subject).slice(0, 120);
    const text = String(body.email_body ?? c.email?.body ?? "").trim().slice(0, 3000);
    if (!subject) return { error: "Add a subject for the email." };
    if (!text.includes("{{link}}")) return { error: "The email needs the line {{link}} where the guide link goes." };
    if (/https?:\/\//i.test(text)) return { error: "Leave links out. The {{link}} line is the only link." };
    c.email = { subject, body: text, approved_at: nowIso(), approved_by: actor };
  }
  const changedWhatPeopleSee = before !== JSON.stringify([c.keyword, c.dm_message, c.post_id]);
  // A running comment reply carries the old word and message until it is turned on again.
  const turnOff = saved.enabled && changedWhatPeopleSee;
  await saveRecipe(env, client, KIND, { config: c, enabled: turnOff ? false : undefined, slug: saved.slug ? undefined : newSlug() });
  return { ok: true, note: turnOff ? "Saved. Turn the comment reply on again to apply it." : "Saved." };
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  let body = {};
  const raw = url.searchParams.get("action") === "guide";
  if (!raw) {
    try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  }
  const access = await who(request, env, raw ? url.searchParams.get("client") : body.client);
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "Operator preview is read-only." }, 403);
  const client = cleanId(access.client);
  const actor = access.role === "operator" ? `operator:${access.operatorEmail}` : `client:${client}`;
  const deps = { origin: url.origin };

  if (raw) {
    if (!env.MEDIA) return json({ ok: false, error: "File storage is not available." }, 500);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (!bytes.length) return json({ ok: false, error: "Choose a PDF." }, 422);
    if (bytes.length > MAX_GUIDE_BYTES) return json({ ok: false, error: "The guide must be 10 MB or smaller." }, 413);
    if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return json({ ok: false, error: "The guide must be a PDF." }, 415);
    const key = `guides/${client}/${crypto.randomUUID()}.pdf`;
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { clientId: client } });
    const saved = await loadRecipe(env, client, KIND);
    const previous = saved.config.guide?.kind === "upload" ? saved.config.guide.key : "";
    const name = str(url.searchParams.get("name")).slice(0, 100) || "Your guide";
    await saveRecipe(env, client, KIND, { config: { ...saved.config, guide: { kind: "upload", name, key, url: "" } }, slug: saved.slug ? undefined : newSlug() });
    if (previous) await env.MEDIA.delete(previous).catch(() => null);
    return json({ ok: true, recipe: await leadMagnetView(env, client) });
  }

  const action = str(body.action);
  const reply = async (extra = {}) => json({ ok: true, recipe: await leadMagnetView(env, client), ...extra });

  if (action === "save") {
    const result = await saveSettings(env, client, body, actor);
    if (result.error) return json({ ok: false, error: result.error }, 422);
    return reply({ note: result.note });
  }

  if (action === "draft") {
    const saved = await loadRecipe(env, client, KIND);
    if (!saved.config.guide?.kind) return json({ ok: false, error: "Add the guide first so the email can name it." }, 422);
    const { run } = await startRun(env, { client, kind: KIND, flow: "draft", ref: `draft-${generateOpaqueToken(6)}`, data: { by: actor }, deps });
    return reply({ run: publicRun(run) });
  }

  if (action === "decide") {
    const run = await getRun(env, str(body.run_id));
    if (!run || run.client_id !== client) return json({ ok: false, error: "That run no longer exists." }, 404);
    const result = await decideApproval(env, run.id, { approve: body.decision === "approve", by: actor, fields: body.fields || {} }, deps);
    if (result.error) return json({ ok: false, error: result.error }, result.status || 409);
    return reply({ run: publicRun(result.run) });
  }

  if (action === "activate" || action === "pause") {
    const saved = await loadRecipe(env, client, KIND);
    if (action === "activate") {
      const missing = readiness(saved.config, saved.slug);
      if (missing.length) return json({ ok: false, error: missing.join(" ") }, 422);
      const instagram = await instagramFor(env, client);
      if (!instagram.connected) return json({ ok: false, not_connected: true, error: "Connect your Instagram first. The comment reply cannot start without it." }, 409);
      if (!zernioConfigured(env)) return json({ ok: false, not_connected: true, error: "Instagram replies are not switched on for Pulsify yet." }, 409);
    }
    const { run } = await startRun(env, { client, kind: KIND, flow: action, ref: `${action}-${generateOpaqueToken(6)}`, data: { by: actor }, deps });
    return reply({ run: publicRun(run) });
  }

  if (action === "retry") {
    const run = await getRun(env, str(body.run_id));
    if (!run || run.client_id !== client) return json({ ok: false, error: "That run no longer exists." }, 404);
    const result = await retryRun(env, run.id, deps);
    if (result.error) return json({ ok: false, error: result.error }, result.status || 409);
    return reply({ run: publicRun(result.run) });
  }

  if (action === "test") {
    // A made-up person goes through the whole delivery, and the guide email goes to the address given (their own).
    const email = normalizeEmail(body.email);
    if (!email) return json({ ok: false, error: "Add your own email address to send the test guide to." }, 422);
    const saved = await loadRecipe(env, client, KIND);
    if (!saved.slug || !saved.config.guide?.kind || !saved.config.email?.approved_at) return json({ ok: false, error: "Add the guide and approve the email wording before a test." }, 422);
    const id = `lmc_${generateOpaqueToken(10)}`;
    const token = generateOpaqueToken(24);
    await env.DB.prepare("INSERT INTO lead_magnet_captures (id,client_id,slug,name,email,phone,visitor_id,download_token,download_expires,is_test,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)")
      .bind(id, client, saved.slug, "Test Person", email, "+10000000000", `test-${id}`, token, new Date(Date.now() + 14 * 86400000).toISOString(), nowIso()).run();
    const { run } = await startRun(env, { client, kind: KIND, flow: "deliver", ref: id, data: { capture_id: id }, isTest: true, deps });
    return reply({ run: publicRun(run) });
  }

  if (action === "remove_test") {
    const leads = await env.DB.prepare("DELETE FROM leads WHERE client=? AND source='lead-magnet-test'").bind(client).run();
    await env.DB.prepare("DELETE FROM page_events WHERE client=? AND visitor_id LIKE 'test-lmc_%'").bind(client).run();
    await env.DB.prepare("DELETE FROM lead_magnet_captures WHERE client_id=? AND is_test=1").bind(client).run();
    await env.DB.prepare("DELETE FROM automation_runs WHERE client_id=? AND kind='workflow:lead-magnet' AND ref IN (SELECT client_id||':'||trigger_ref FROM workflow_runs WHERE client_id=? AND is_test=1)").bind(client, client).run().catch(() => null);
    const runs = await env.DB.prepare("DELETE FROM workflow_runs WHERE client_id=? AND is_test=1").bind(client).run();
    return reply({ removed: { leads: leads.meta?.changes || 0, runs: runs.meta?.changes || 0 } });
  }

  return json({ ok: false, error: "unknown action" }, 422);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
