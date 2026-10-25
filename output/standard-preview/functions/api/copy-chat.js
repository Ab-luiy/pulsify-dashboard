// The Copywriter as a conversation (pulsify-saas #18). Every client has their own saved chats, ratings that
// teach it, and a short memory of how they like to work. Tables: migration 0053. Everything is scoped to the
// client resolved from the session; a chat id from the request is only ever a lookup key inside that client.
//   GET                      -> {ok, mode, provider, chats[], memory[]}
//   GET ?chat=ID             -> {ok, chat, messages[]}
//   POST {action:"send", chat_id?, message, format?}
//        generated: text/event-stream of  meta | delta | done | error  events
//        manual   : {ok, mode:"manual", chat_id, prompt}   (no AI key; the client runs it in their own AI)
//   POST {action:"paste", chat_id, content}        the answer from the client's own AI, saved as the reply
//   POST {action:"rate", message_id, rating:"up"|"down"|null, note?}   up teaches by example, down by rule
//   POST {action:"rename"|"delete", chat_id, title?}
//   POST {action:"memory-add", note} | {action:"memory-delete", id}
// The writing is provider-agnostic (ai-provider.js): Opus with an Anthropic key, Gemini with a Gemini key.
import { cleanId, json, nowIso } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { buildJaneBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { aiMode, generateText, providerLabel, resolveAi, streamText } from "../_shared/ai-provider.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { buildCopySystem, buildConversationContext, formatFromText, memoryPrompt, plainReplyChunks, needsCopyReview, groundingReviewPrompt, applyGroundingReview, copyReviewAi, findCopyClaimGaps } from "../_shared/copy-brain.js";
import { retrieveCopyKnowledge, COPY_KNOWLEDGE_VERSION } from "../_shared/copy-knowledge.js";
import { enforceAllowance } from "../_shared/ai-guard.js";
import { createJaneTools, gatherJaneContext, extractJaneMemory, JANE_AGENT_VERSION } from "../_shared/copy-agent.ts";
import { createStreamScrubber, scrubSources } from "../_shared/source-scrub.js";

const MAX_MESSAGE = 8000;
const BURST_PER_MINUTE = 12;
const MEMORY_CAP = 30;
const FORMATS = new Set(["story", "reel", "youtube", "email", "dm", "rewrite"]);
const REMEMBER = /^\s*(?:please\s+)?remember(?:\s+that)?[\s:,-]+([\s\S]{3,200})$/i;

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const titleFrom = (text) => {
  const words = clean(text, 200).split(" ").slice(0, 7).join(" ");
  return words.length > 60 ? `${words.slice(0, 57)}...` : words || "New chat";
};

async function loadChat(env, client, id) {
  const chatId = Number(id);
  if (!Number.isInteger(chatId) || chatId <= 0) return null;
  return env.DB.prepare("SELECT id, title, format, created_at, updated_at FROM copy_chats WHERE id=? AND client_id=?").bind(chatId, client).first();
}

async function loadMemory(env, client, limit = MEMORY_CAP) {
  const rows = await env.DB.prepare("SELECT id, note, source FROM copy_memory WHERE client_id=? AND active=1 ORDER BY id DESC LIMIT ?").bind(client, limit).all();
  return (rows.results || []).map((row) => ({ id: Number(row.id), note: row.note, source: row.source }));
}

export async function onRequestGet({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return access.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const client = cleanId(access.client);
  const chatParam = new URL(request.url).searchParams.get("chat");
  if (chatParam) {
    const chat = await loadChat(env, client, chatParam);
    if (!chat) return json({ ok: false, error: "chat not found" }, 404);
    const rows = await env.DB.prepare("SELECT id, role, content, rating, created_at FROM copy_messages WHERE chat_id=? AND client_id=? ORDER BY id").bind(chat.id, client).all();
    return json({ ok: true, chat, messages: (rows.results || []).map((row) => ({ ...row, id: Number(row.id) })) });
  }
  const chats = await env.DB.prepare("SELECT id, title, format, updated_at FROM copy_chats WHERE client_id=? ORDER BY updated_at DESC, id DESC LIMIT 100").bind(client).all();
  const ai = await resolveAi(env, client);
  return json({
    ok: true,
    mode: aiMode(ai) === "manual" ? "manual" : "generated",
    provider: providerLabel(ai),
    knowledge_version: COPY_KNOWLEDGE_VERSION,
    agent_version: JANE_AGENT_VERSION,
    // "client" = writing on their own key, "platform" = on Pulsify's, "none" = a prompt for their own AI.
    source: ai.source,
    chats: (chats.results || []).map((row) => ({ ...row, id: Number(row.id) })),
    memory: await loadMemory(env, client),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const client = cleanId(access.client);
  const raw = await request.text();
  if (raw.length > MAX_MESSAGE * 2) return json({ ok: false, error: "That message is too long." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "Invalid request." }, 400); }
  const action = String(body?.action || "");

  if (action === "send") return send(context, client, body);

  if (action === "paste") {
    const chat = await loadChat(env, client, body.chat_id);
    const content = String(body.content ?? "").trim();
    if (!chat) return json({ ok: false, error: "chat not found" }, 404);
    if (!content) return json({ ok: false, error: "Paste the answer first." }, 422);
    const id = await addMessage(env, client, chat.id, "assistant", content.slice(0, 24000));
    return json({ ok: true, message_id: id });
  }

  if (action === "rate") {
    const id = Number(body.message_id);
    const rating = body.rating === "up" || body.rating === "down" ? body.rating : null;
    const message = await env.DB.prepare("SELECT id FROM copy_messages WHERE id=? AND client_id=? AND role='assistant'").bind(id, client).first();
    if (!message) return json({ ok: false, error: "message not found" }, 404);
    await env.DB.prepare("UPDATE copy_messages SET rating=? WHERE id=? AND client_id=?").bind(rating, id, client).run();
    const note = clean(body.note, 400);
    if (rating === "down" && note) {
      const now = nowIso();
      await env.DB.prepare("INSERT INTO studio_feedback (client_id, sequence_id, rule, scope, active, created_at, updated_at) VALUES (?, NULL, ?, 'client', 1, ?, ?)").bind(client, note, now, now).run().catch(() => null);
    }
    return json({ ok: true, rating });
  }

  if (action === "rename" || action === "delete") {
    const chat = await loadChat(env, client, body.chat_id);
    if (!chat) return json({ ok: false, error: "chat not found" }, 404);
    if (action === "rename") {
      const title = clean(body.title, 80);
      if (!title) return json({ ok: false, error: "Give the chat a name." }, 422);
      await env.DB.prepare("UPDATE copy_chats SET title=? WHERE id=? AND client_id=?").bind(title, chat.id, client).run();
      return json({ ok: true, title });
    }
    await env.DB.batch([
      env.DB.prepare("DELETE FROM copy_messages WHERE chat_id=? AND client_id=?").bind(chat.id, client),
      env.DB.prepare("DELETE FROM copy_chats WHERE id=? AND client_id=?").bind(chat.id, client),
    ]);
    return json({ ok: true });
  }

  if (action === "memory-add") {
    const note = clean(body.note, 200);
    if (note.length < 3) return json({ ok: false, error: "Write a short note to remember." }, 422);
    await addMemory(env, client, note, "client");
    return json({ ok: true, memory: await loadMemory(env, client) });
  }
  if (action === "memory-delete") {
    await env.DB.prepare("UPDATE copy_memory SET active=0 WHERE id=? AND client_id=?").bind(Number(body.id), client).run();
    return json({ ok: true, memory: await loadMemory(env, client) });
  }
  return json({ ok: false, error: "unknown action" }, 422);
}

async function addMessage(env, client, chatId, role, content) {
  const now = nowIso();
  const result = await env.DB.prepare("INSERT INTO copy_messages (chat_id, client_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").bind(chatId, client, role, content, now).run();
  await env.DB.prepare("UPDATE copy_chats SET updated_at=? WHERE id=? AND client_id=?").bind(now, chatId, client).run();
  return Number(result.meta?.last_row_id || 0);
}

async function addMemory(env, client, note, source) {
  const existing = await env.DB.prepare("SELECT id, note FROM copy_memory WHERE client_id=? AND active=1 ORDER BY id").bind(client).all();
  const rows = existing.results || [];
  if (rows.some((row) => row.note.toLowerCase() === note.toLowerCase())) return;
  await env.DB.prepare("INSERT INTO copy_memory (client_id, note, source, active, created_at) VALUES (?, ?, ?, 1, ?)").bind(client, note, source, nowIso()).run();
  // The oldest notes make room, so memory stays short enough to be useful.
  const overflow = rows.length + 1 - MEMORY_CAP;
  for (const row of rows.slice(0, Math.max(0, overflow))) {
    await env.DB.prepare("UPDATE copy_memory SET active=0 WHERE id=? AND client_id=?").bind(row.id, client).run();
  }
}

async function remember(env, ai, client, userMessage, reply) {
  try {
    if (ai.mode === "workers") {
      const existing = await loadMemory(env, client);
      const notes = await extractJaneMemory(ai.binding, userMessage, existing);
      for (const item of notes) {
        await addMemory(env, client, item.note, "chat");
        for (const id of item.replaces) {
          // Never allow a model-supplied ID to cross the authenticated-client boundary.
          if (existing.some((row) => row.id === id && row.note.toLowerCase() !== item.note.toLowerCase())) {
            await env.DB.prepare("UPDATE copy_memory SET active=0 WHERE id=? AND client_id=?").bind(id, client).run();
          }
        }
      }
      return;
    }
    const existing = (await loadMemory(env, client)).map((row) => row.note);
    const answer = parseModelJson(await generateText(memoryPrompt({ userMessage, reply, existing }), ai, { json: true, temperature: 0.2, maxOutputTokens: 400, uncounted: true }));
    for (const note of (Array.isArray(answer?.notes) ? answer.notes : []).slice(0, 2)) {
      const text = clean(scrubSources(note), 200);
      if (text.length >= 8) await addMemory(env, client, text, "chat");
    }
  } catch {
    // Memory is a bonus; a failed note never affects the chat.
  }
}

async function loadClientBrain(env, client, query, publicDraft) {
  const [context, memory, rules, liked] = await Promise.all([
    // A failed read is different from an empty brain. Never generate blindly on a DB error.
    loadClientBrainData(env, client).then((data) => ({ ...buildJaneBrainContext(data, { query, publicDraft }), data })),
    loadMemory(env, client),
    env.DB.prepare("SELECT rule FROM studio_feedback WHERE active=1 AND (scope='all' OR client_id=?) ORDER BY CASE WHEN scope='all' THEN 0 ELSE 1 END, created_at DESC LIMIT 20").bind(client).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT content FROM copy_messages WHERE client_id=? AND role='assistant' AND rating='up' ORDER BY id DESC LIMIT 3").bind(client).all().catch(() => ({ results: [] })),
  ]);
  return {
    contextText: context.prompt_text,
    data: context.data,
    grounding: { fields_available: context.fields_available, fields_used: context.fields_used,
      fields_excerpted: context.fields_excerpted, fields_omitted: context.fields_omitted, private_fields_excluded: context.private_fields_excluded, truncated: context.truncated },
    memory: memory.map((row) => row.note),
    rules: [...new Set((rules.results || []).map((row) => clean(row.rule, 400)).filter(Boolean))],
    liked: (liked.results || []).map((row) => row.content),
  };
}

async function send(context, client, body) {
  const { env } = context;
  const message = String(body.message ?? "").trim();
  if (!message) return json({ ok: false, error: "Write a message first." }, 422);
  if (message.length > MAX_MESSAGE) return json({ ok: false, error: `Keep a message under ${MAX_MESSAGE.toLocaleString("en-US")} characters.` }, 413);

  const since = new Date(Date.now() - 60000).toISOString();
  const burst = await env.DB.prepare("SELECT COUNT(*) AS n FROM copy_messages WHERE client_id=? AND role='user' AND created_at>=?").bind(client, since).first();
  if (Number(burst?.n || 0) >= BURST_PER_MINUTE) return json({ ok: false, error: "Slow down a little. Try again in a few seconds." }, 429);

  let chat = body.chat_id ? await loadChat(env, client, body.chat_id) : null;
  if (body.chat_id && !chat) return json({ ok: false, error: "chat not found" }, 404);
  const asked = FORMATS.has(String(body.format)) ? String(body.format) : null;
  const inferred = formatFromText(message);
  const format = inferred !== "general" ? inferred : asked || chat?.format || "general";
  const publicDraft = needsCopyReview(message, format);
  const history = chat ? await env.DB.prepare("SELECT role, content FROM copy_messages WHERE chat_id=? AND client_id=? ORDER BY id").bind(chat.id, client).all() : { results: [] };
  // Short follow-ups such as "why?" need the preceding topic for retrieval.
  const query = [message, ...(message.length < 180 ? (history.results || []).filter((row) => row.role === "user").slice(-2).map((row) => row.content.slice(0, 1200)) : [])].join("\n");
  let clientBrain;
  try { clientBrain = await loadClientBrain(env, client, query, publicDraft); }
  catch {
    return json({ ok: false, error: "Jane couldn't load your saved business details. Try again in a moment; your draft is still here." }, 503);
  }
  const knowledge = retrieveCopyKnowledge({ query, format });
  const conversation = buildConversationContext([...(history.results || []), { role: "user", content: message }], query);
  const messages = conversation.messages;
  let system = buildCopySystem({ format, query, knowledge, client: clientBrain, earlierText: conversation.earlierText });
  const grounding = { ...clientBrain.grounding, knowledge_version: knowledge.version,
    method_passages: knowledge.passage_ids.length, earlier_turns: conversation.omitted_turns, agent_version: JANE_AGENT_VERSION };
  const ai = await resolveAi(env, client);
  // The new checker uses only our Cloudflare binding. A connected provider keeps its
  // existing generation path, without new OpenAI/Anthropic/Gemini helper calls.
  const reviewDraft = publicDraft && ai.mode === "workers";
  try { await enforceAllowance(ai); }
  catch (error) {
    if (error?.code === "AI_ALLOWANCE") return json({ ok: false, error: error.message }, 429);
    return json({ ok: false, error: "Jane couldn't start that reply. Your draft is still here. Try again shortly." }, 503);
  }
  if (!chat) {
    const now = nowIso();
    const result = await env.DB.prepare("INSERT INTO copy_chats (client_id, title, format, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(client, titleFrom(message), asked, now, now).run();
    chat = { id: Number(result.meta?.last_row_id || 0), title: titleFrom(message), format: asked };
  }
  if (!chat.format && FORMATS.has(format)) await env.DB.prepare("UPDATE copy_chats SET format=? WHERE id=? AND client_id=?").bind(format, chat.id, client).run();

  const userId = await addMessage(env, client, chat.id, "user", message);
  const direct = REMEMBER.exec(message);
  if (direct) await addMemory(env, client, clean(direct[1], 200), "client");

  if (aiMode(ai) === "manual") {
    const transcript = messages.map((turn) => `${turn.role === "assistant" ? "ASSISTANT" : "CLIENT"}:\n${turn.content}`).join("\n\n");
    return json({ ok: true, mode: "manual", chat_id: chat.id, title: chat.title, message_id: userId, grounding, prompt: `${system}\n\nCONVERSATION SO FAR:\n${transcript}\n\nWrite the next reply.` });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  // A client that closes the tab mid-reply must not lose the reply: failed writes are ignored and the text is still saved.
  const emit = (event, data) => writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)).catch(() => null);

  const work = (async () => {
    const scrubber = createStreamScrubber();
    let full = "";
    try {
      await emit("meta", { chat_id: chat.id, title: chat.title, message_id: userId, format, grounding });
      let lookups = null;
      if (ai.mode === "workers") {
        lookups = await gatherJaneContext({ binding: ai.binding,
          tools: createJaneTools({ env, client, brainData: clientBrain.data, publicDraft }),
          message, messages, currentContext: `${clientBrain.contextText}\n${knowledge.prompt_text}`,
          onLookup: (data) => emit("lookup", data),
        });
        if (lookups.status === "daily_limit") throw new Error("Jane has reached today's free AI allowance. It resets at midnight UTC.");
        system = buildCopySystem({ format, query, knowledge, client: clientBrain, earlierText: conversation.earlierText, toolContext: lookups.prompt_text });
      }
      for await (const chunk of plainReplyChunks(streamText({ system, messages }, ai))) {
        const safe = scrubber.push(chunk);
        if (safe) {
          full += safe;
          if (!reviewDraft) await emit("delta", { text: safe });
        }
      }
      const rest = scrubber.flush();
      if (rest) {
        full += rest;
        if (!reviewDraft) await emit("delta", { text: rest });
      }
      full = full.trim();
      if (!full) throw new Error("empty reply");
      if (reviewDraft) {
        let checkedDraft = full;
        let gaps = [];
        for (let attempt = 0; attempt < 2; attempt++) {
          const checkedContext = [clientBrain.contextText, lookups?.brain_text || ""].filter(Boolean).join("\n\n");
          const review = groundingReviewPrompt({ clientContext: checkedContext,
            // Tool facts are labelled by source; drafts and shared method samples are not
            // factual evidence. Include retrieved fields/earlier user statements in checks.
            messages: [...(conversation.earlierText ? [{ role: "user", content: conversation.earlierText }] : []), ...(lookups?.history_messages || []), ...messages], draft: checkedDraft });
          if (gaps.length) review.user += `\n\nThese unsupported promises MUST be removed or narrowed to the saved delivery facts. Do not replace them with different promises:\n${gaps.join("\n")}`;
          const checked = await generateText(review, copyReviewAi(ai),
            { json: true, temperature: 0.1, maxOutputTokens: 4000, uncounted: true });
          checkedDraft = applyGroundingReview(checkedDraft, checked);
          gaps = findCopyClaimGaps(checkedDraft, checkedContext);
          if (!gaps.length) break;
        }
        if (gaps.length) throw new Error("Unsupported offer commitments remain");
        const reviewed = scrubSources(checkedDraft);
        async function* corrected() { yield reviewed; }
        full = "";
        for await (const text of plainReplyChunks(corrected())) full += text;
        full = full.trim();
        await emit("delta", { text: full });
      }
      const id = await addMessage(env, client, chat.id, "assistant", full);
      await emit("done", { message_id: id, grounding: { lookup_calls: lookups?.calls || 0, lookup_status: lookups?.status || "not_used", agent_version: JANE_AGENT_VERSION } });
    } catch (error) {
      const limit = /today's (?:free AI allowance|limit)|daily free allocation/i.test(String(error?.message || ""));
      await emit("error", { error: limit ? "Jane has reached today's free AI allowance. It resets at midnight UTC. Your message is saved." : "The writing service could not finish that. Your message is saved. Try again in a moment.", prompt: `${system}\n\nCONVERSATION SO FAR:\n${messages.map((turn) => `${turn.role === "assistant" ? "ASSISTANT" : "CLIENT"}:\n${turn.content}`).join("\n\n")}\n\nWrite the next reply.` });
      full = "";
    } finally {
      await writer.close().catch(() => null);
    }
    if (full) await remember(env, ai, client, message, full);
  })();
  context.waitUntil?.(work);

  return new Response(readable, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
