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
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { aiMode, generateText, providerLabel, streamText } from "../_shared/ai-provider.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { buildCopySystem, conversationFor, formatFromText, memoryPrompt } from "../_shared/copy-brain.js";
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
  return json({
    ok: true,
    mode: aiMode(env) === "manual" ? "manual" : "generated",
    provider: providerLabel(env),
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

async function remember(env, client, userMessage, reply) {
  try {
    const existing = (await loadMemory(env, client)).map((row) => row.note);
    const answer = parseModelJson(await generateText(memoryPrompt({ userMessage, reply, existing }), env, { json: true, temperature: 0.2, maxOutputTokens: 400 }));
    for (const note of (Array.isArray(answer?.notes) ? answer.notes : []).slice(0, 2)) {
      const text = clean(scrubSources(note), 200);
      if (text.length >= 8) await addMemory(env, client, text, "chat");
    }
  } catch {
    // Memory is a bonus; a failed note never affects the chat.
  }
}

async function loadClientBrain(env, client) {
  const [context, memory, rules, liked] = await Promise.all([
    loadClientBrainData(env, client).then((data) => buildGeneratorBrainContext(data).prompt_text).catch(() => ""),
    loadMemory(env, client),
    env.DB.prepare("SELECT rule FROM studio_feedback WHERE active=1 AND (scope='all' OR client_id=?) ORDER BY CASE WHEN scope='all' THEN 0 ELSE 1 END, created_at DESC LIMIT 20").bind(client).all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT content FROM copy_messages WHERE client_id=? AND role='assistant' AND rating='up' ORDER BY id DESC LIMIT 3").bind(client).all().catch(() => ({ results: [] })),
  ]);
  return {
    contextText: context,
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
  if (!chat) {
    const now = nowIso();
    const result = await env.DB.prepare("INSERT INTO copy_chats (client_id, title, format, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(client, titleFrom(message), asked, now, now).run();
    chat = { id: Number(result.meta?.last_row_id || 0), title: titleFrom(message), format: asked };
  }
  const format = chat.format || asked || formatFromText(message);
  if (!chat.format && FORMATS.has(format)) await env.DB.prepare("UPDATE copy_chats SET format=? WHERE id=? AND client_id=?").bind(format, chat.id, client).run();

  const userId = await addMessage(env, client, chat.id, "user", message);
  const direct = REMEMBER.exec(message);
  if (direct) await addMemory(env, client, clean(direct[1], 200), "client");

  const history = await env.DB.prepare("SELECT role, content FROM copy_messages WHERE chat_id=? AND client_id=? ORDER BY id").bind(chat.id, client).all();
  const messages = conversationFor(history.results || []);
  const system = buildCopySystem({ format, client: await loadClientBrain(env, client) });

  if (aiMode(env) === "manual") {
    const transcript = messages.map((turn) => `${turn.role === "assistant" ? "ASSISTANT" : "CLIENT"}:\n${turn.content}`).join("\n\n");
    return json({ ok: true, mode: "manual", chat_id: chat.id, title: chat.title, message_id: userId, prompt: `${system}\n\nCONVERSATION SO FAR:\n${transcript}\n\nWrite the next reply.` });
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
      await emit("meta", { chat_id: chat.id, title: chat.title, message_id: userId, format });
      for await (const chunk of streamText({ system, messages }, env)) {
        const safe = scrubber.push(chunk);
        if (safe) {
          full += safe;
          await emit("delta", { text: safe });
        }
      }
      const rest = scrubber.flush();
      if (rest) {
        full += rest;
        await emit("delta", { text: rest });
      }
      full = full.trim();
      if (!full) throw new Error("empty reply");
      const id = await addMessage(env, client, chat.id, "assistant", full);
      await emit("done", { message_id: id });
    } catch {
      await emit("error", { error: "The writing service could not finish that. Your message is saved. Try again in a moment.", prompt: `${system}\n\nCONVERSATION SO FAR:\n${messages.map((turn) => `${turn.role === "assistant" ? "ASSISTANT" : "CLIENT"}:\n${turn.content}`).join("\n\n")}\n\nWrite the next reply.` });
      full = "";
    } finally {
      await writer.close().catch(() => null);
    }
    if (full) await remember(env, client, message, full);
  })();
  context.waitUntil?.(work);

  return new Response(readable, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
