// Recipe: lead magnet delivery (tickets #78, #79).
//
//   Someone comments the keyword -> Zernio's comment-to-DM sends them a DM with a link -> they fill in name, email and
//   phone on our small capture page (/get/<slug>) -> the guide is emailed -> they appear in Leads -> the client hears about it.
//
// Flows
//   draft     the AI writes the email, the client approves or edits it (nothing is sent until they approve)
//   activate  turn on the Zernio comment automation (needs a connected Instagram)
//   pause     turn it off
//   deliver   one run per person who fills in the capture page
//
// The email wording is the sensitive part, so deliver refuses to run until a person approved it.
import { generateOpaqueToken, normalizeEmail, nowIso, str } from "../common.js";
import { humanize } from "../humanizer.js";
import { parseModelJson } from "../anthropic.js";
import { getIntegration } from "../integrations.js";
import { emitEvent } from "../outbound-webhooks.js";
import { notify } from "../notifications.js";
import { sendEmail } from "../send-email.js";
import { createAutomation, setAutomationActive, updateAutomation } from "../zernio-automations.js";
import { defineRecipe, loadRecipe, saveRecipe } from "../workflows.js";

export const KIND = "lead-magnet";
export const DEFAULT_DM = "Thanks for commenting. Tap the button and I will send the guide to your email.";
export const PLACEHOLDERS = ["{{first_name}}", "{{link}}"];

export const firstName = (name) => str(name).split(/\s+/)[0] || "there";
export const origin = (env, deps = {}) => String(env?.PUBLIC_ORIGIN || deps.origin || "https://pulsify-ai.com").replace(/\/$/, "");
export const captureUrl = (env, slug, deps) => `${origin(env, deps)}/get/${slug}`;
export const guideUrl = (env, slug, token, deps) => `${origin(env, deps)}/get/${slug}/guide?t=${token}`;

export function renderEmail(text, { name, link }) {
  return String(text).replaceAll("{{first_name}}", firstName(name)).replaceAll("{{link}}", link);
}

/** Why the recipe cannot go live yet, in words the client can act on. Empty when it is ready. */
export function readiness(config, slug) {
  const missing = [];
  if (!str(config.keyword)) missing.push("Pick the word people comment.");
  if (!config.guide?.kind) missing.push("Add the guide.");
  if (!config.email?.approved_at) missing.push("Approve the email wording.");
  if (!slug) missing.push("The page address is not made yet. Save the recipe first.");
  return missing;
}

export function newSlug() {
  return `lm${generateOpaqueToken(8).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}`;
}

/** Instagram connection for one client: connected and the ids Zernio needs. */
export async function instagramFor(env, client) {
  const record = await getIntegration(env, "client", client, "instagram").catch(() => null);
  const config = record?.config || {};
  return { connected: Boolean(config.account_id), accountId: str(config.account_id), profileId: str(config.profile_id), username: str(config.username) };
}

async function clientName(env, client) {
  const row = await env.DB.prepare("SELECT client_name FROM client_config WHERE client=?").bind(client).first().catch(() => null);
  return str(row?.client_name) || client;
}

// ---- deliver flow steps ----

async function addLead(ctx) {
  const { env, client } = ctx;
  const cap = await env.DB.prepare("SELECT * FROM lead_magnet_captures WHERE id=?").bind(ctx.trigger.capture_id).first();
  if (!cap) throw new Error("The capture could not be found.");
  ctx.state.capture = { id: cap.id, slug: cap.slug, name: cap.name, email: cap.email, token: cap.download_token };
  const now = nowIso();
  const source = cap.is_test ? "lead-magnet-test" : "lead-magnet";
  const existing = await env.DB.prepare("SELECT id FROM leads WHERE client=? AND lower(email)=lower(?) ORDER BY id DESC LIMIT 1").bind(client, cap.email).first();
  let leadId = existing?.id || null;
  if (leadId) {
    await env.DB.prepare("UPDATE leads SET name=COALESCE(name,?), phone=COALESCE(phone,?), visitor_id=COALESCE(visitor_id,?), updated_at=? WHERE id=?").bind(cap.name, cap.phone, cap.visitor_id, now, leadId).run();
  } else {
    const result = await env.DB.prepare(
      `INSERT INTO leads (client,email,name,phone,status,source,visitor_id,page_id,response_id,applied_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(client, cap.email, cap.name, cap.phone || null, "opted_in", source, cap.visitor_id || null, `get-${cap.slug}`, `lm:${cap.id}`, now, now).run();
    leadId = result.meta?.last_row_id || null;
  }
  await env.DB.prepare("UPDATE lead_magnet_captures SET lead_id=? WHERE id=?").bind(leadId, cap.id).run();
  // Tracking continues: the visit and what they watch before and after now carry their email.
  if (cap.visitor_id) {
    await env.DB.prepare("INSERT INTO page_events (client,visitor_id,page_id,event,email,path,metadata_json,at) VALUES (?,?,?,?,?,?,?,?)")
      .bind(client, cap.visitor_id, `get-${cap.slug}`, "optin", cap.email, `/get/${cap.slug}`, JSON.stringify({ source: "lead-magnet" }), now).run();
    for (const table of ["page_events", "watch_events"]) {
      await env.DB.prepare(`UPDATE ${table} SET email=? WHERE client=? AND visitor_id=? AND (email IS NULL OR email='')`).bind(cap.email, client, cap.visitor_id).run().catch(() => null);
    }
  }
  if (!cap.is_test) await emitEvent(env, { scope: "client", clientId: client, event: "lead.created", data: { client, name: cap.name, email: cap.email, source: "lead-magnet" } }).catch(() => null);
  return { note: existing ? "They were already a lead. Details updated." : "Added to Leads." };
}

async function emailGuide(ctx) {
  const { env, client, state } = ctx;
  const saved = await loadRecipe(env, client, KIND);
  const cap = state.capture;
  const link = guideUrl(env, cap.slug, cap.token, ctx.deps);
  await sendEmail(env, {
    to: cap.email,
    subject: renderEmail(saved.config.email.subject, { name: cap.name, link }),
    text: renderEmail(saved.config.email.body, { name: cap.name, link }),
    idempotencyKey: `lm-${cap.id}`,
    fetcher: ctx.deps.fetcher,
  });
  await env.DB.prepare("UPDATE lead_magnet_captures SET emailed_at=? WHERE id=?").bind(nowIso(), cap.id).run();
  return { note: `Guide emailed to ${cap.email}.` };
}

async function tellClient(ctx) {
  const { env, client, state } = ctx;
  if (ctx.isTest) return { note: "Test: the client was not notified." };
  await notify(env, { scope: "client", clientId: client, kind: "lead.new", severity: "success", title: `New lead: ${state.capture.name}`, body: `${state.capture.email} asked for your guide.`, link: "leads", dedupeKey: `lm:${state.capture.id}` });
  return { note: "The client was notified." };
}

export const leadMagnet = defineRecipe({
  kind: KIND,
  title: "Lead magnet delivery",
  summary: "Someone comments your word, gets a DM with a link, leaves their details, and the guide lands in their inbox. They show up in Leads.",
  defaultConfig: { keyword: "", dm_message: DEFAULT_DM, guide: { kind: "", name: "", url: "", key: "" }, email: { subject: "", body: "", approved_at: null, approved_by: null }, automation_id: null, post_id: "", activated_at: null },
  flows: {
    draft: {
      label: "Write the email",
      event: "recipe.draft_requested",
      steps: [
        {
          id: "write",
          type: "ai",
          label: "Write the email",
          async run(ctx) {
            const guide = ctx.config.guide?.name || "the guide";
            const name = await clientName(ctx.env, ctx.client);
            const { text, flagged } = await ctx.ai(
              {
                system: "You write one short email that gives a free guide to someone who just asked for it. Plain and warm, like a person, under 90 words. No exclamation marks, no emojis, no invented numbers or claims. Start the body with 'Hi {{first_name}},' and put {{link}} on its own line where the guide link goes. Return JSON only: {\"subject\": \"...\", \"body\": \"...\"}.",
                user: `Sender: ${name}\nGuide: ${guide}\nThe word people comment to get it: ${ctx.config.keyword || "(not set)"}`,
              },
              { json: true },
            );
            const parsed = parseModelJson(text);
            let body = humanize(String(parsed?.body || ""));
            if (!body) throw new Error("The draft came back empty. Try again.");
            if (!body.includes("{{link}}")) body = `${body}\n\n{{link}}`;
            ctx.state.draft = { subject: humanize(String(parsed?.subject || `Your guide: ${guide}`)).slice(0, 120), body, flagged };
            return { note: flagged.length ? `Written. Check these figures: ${flagged.join(", ")}.` : "Written." };
          },
        },
        {
          id: "approve",
          type: "approval",
          label: "Approve the email wording",
          propose: (ctx) => ({
            fields: { subject: ctx.state.draft.subject, body: ctx.state.draft.body },
            flagged: ctx.state.draft.flagged,
            note: "This goes to everyone who asks for the guide. Edit it if you like, then approve.",
          }),
        },
        {
          id: "save",
          type: "action",
          label: "Save the approved wording",
          async run(ctx) {
            const { fields, by } = ctx.state.approved;
            if (!fields.subject || !fields.body.includes("{{link}}")) throw new Error("The email needs a subject and the {{link}} line.");
            const saved = await loadRecipe(ctx.env, ctx.client, KIND);
            await saveRecipe(ctx.env, ctx.client, KIND, { config: { ...saved.config, email: { subject: fields.subject, body: fields.body, approved_at: nowIso(), approved_by: by } } });
            return { note: "Wording saved and approved." };
          },
        },
      ],
      doneNote: () => "Email wording approved.",
    },

    activate: {
      label: "Turn on the comment reply",
      event: "recipe.activate_requested",
      steps: [
        {
          id: "check",
          type: "action",
          label: "Check everything is ready",
          async run(ctx) {
            const saved = await loadRecipe(ctx.env, ctx.client, KIND);
            const missing = readiness(saved.config, saved.slug);
            if (missing.length) throw new Error(missing.join(" "));
            const instagram = await instagramFor(ctx.env, ctx.client);
            if (!instagram.connected) throw new Error("Connect your Instagram first.");
            ctx.state.instagram = instagram;
            return { note: `Instagram @${instagram.username || "account"} is connected.` };
          },
        },
        {
          id: "zernio",
          type: "action",
          label: "Set up the comment reply on Instagram",
          async run(ctx) {
            const saved = await loadRecipe(ctx.env, ctx.client, KIND);
            const cfg = saved.config;
            const input = {
              profileId: ctx.state.instagram.profileId,
              accountId: ctx.state.instagram.accountId,
              name: `Guide: ${cfg.guide.name || cfg.keyword}`,
              keyword: cfg.keyword,
              dmMessage: cfg.dm_message || DEFAULT_DM,
              linkUrl: captureUrl(ctx.env, saved.slug, ctx.deps),
              postId: cfg.post_id,
            };
            if (cfg.automation_id) await updateAutomation(ctx.env, cfg.automation_id, input, ctx.deps.fetcher);
            else cfg.automation_id = (await createAutomation(ctx.env, input, ctx.deps.fetcher)).id;
            cfg.activated_at = nowIso();
            await saveRecipe(ctx.env, ctx.client, KIND, { config: cfg, enabled: true });
            return { note: `People who comment "${cfg.keyword}" now get the DM.` };
          },
        },
      ],
      doneNote: () => "The comment reply is on.",
    },

    pause: {
      label: "Turn off the comment reply",
      event: "recipe.pause_requested",
      steps: [
        {
          id: "zernio",
          type: "action",
          label: "Switch the comment reply off",
          async run(ctx) {
            const saved = await loadRecipe(ctx.env, ctx.client, KIND);
            if (saved.config.automation_id) await setAutomationActive(ctx.env, saved.config.automation_id, false, ctx.deps.fetcher);
            await saveRecipe(ctx.env, ctx.client, KIND, { enabled: false });
            return { note: "Switched off. The capture page stays closed until you turn it back on." };
          },
        },
      ],
      doneNote: () => "The comment reply is off.",
    },

    deliver: {
      label: "Deliver the guide",
      event: "lead_magnet.captured",
      steps: [
        {
          id: "ready",
          type: "action",
          label: "Check the email wording is approved",
          async run(ctx) {
            const saved = await loadRecipe(ctx.env, ctx.client, KIND);
            if (!saved.config.email?.approved_at) return { skip: true, note: "The email wording has not been approved, so nothing was sent." };
            return { note: "Approved wording found." };
          },
        },
        { id: "lead", type: "action", label: "Add them to Leads", run: addLead },
        { id: "email", type: "action", label: "Email the guide", run: emailGuide },
        { id: "notify", type: "action", label: "Tell the client", run: tellClient },
      ],
      doneNote: (state) => `${state.capture?.name || "A new lead"} got the guide.`,
    },
  },
});
