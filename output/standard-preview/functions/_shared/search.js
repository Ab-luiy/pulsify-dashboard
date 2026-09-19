// Semantic search over what Pulsify knows: every Instagram DM and every client
// brain field. Embeddings from Workers AI (bge-base, 768 dims), vectors in
// Cloudflare Vectorize (index pulsify-search), bookkeeping in D1. No keys, no
// second database. The indexer runs from the Worker; the query runs from Pages.
import { nowIso, sha256Hex, str } from "./common.js";

export const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";
export const MAX_TEXT = 1500;        // characters per document
export const BATCH = 50;             // documents embedded per indexer run

// ---- documents ----
// Every document: { id, kind: "dm"|"brain", scope: "operator"|client id, text, meta }
// meta is what search results show without a second query, kept small.

// Vectorize ids are capped at 64 bytes; Instagram message ids run past 150.
// Documents get a hashed id and carry their source id in metadata.
export async function docId(prefix, source) {
  return `${prefix}:${(await sha256Hex(source)).slice(0, 48)}`;
}

export async function pendingDmDocs(env, limit = BATCH) {
  const rows = (await env.DB.prepare(
    `SELECT m.id, m.conversation_id, m.direction, m.sent_at, m.text,
            c.participant_username AS handle, c.participant_name AS name
       FROM ig_messages m JOIN ig_conversations c ON c.id=m.conversation_id
      WHERE m.text IS NOT NULL AND length(m.text)>=12
        AND NOT EXISTS (SELECT 1 FROM search_index_state s WHERE s.source_id=m.id)
      ORDER BY m.sent_at DESC LIMIT ?`,
  ).bind(limit).all()).results || [];
  const out = [];
  for (const r of rows) out.push(await dmDoc(await docId("dm", r.id), r));
  return out;
}

async function dmDoc(id, r) {
  return {
    id,
    source: r.id,
    kind: "dm",
    scope: "operator",
    text: `${r.direction === "outbound" ? "We wrote to" : "Message from"} @${r.handle || r.name || "unknown"}: ${str(r.text).slice(0, MAX_TEXT)}`,
    meta: { kind: "dm", message_id: r.id, conversation_id: r.conversation_id, handle: r.handle || "", name: r.name || "", direction: r.direction, sent_at: r.sent_at, snippet: str(r.text).slice(0, 180) },
  };
}

export async function pendingBrainDocs(env, limit = BATCH) {
  const rows = (await env.DB.prepare(
    `SELECT b.id, b.client_id, b.section, b.field, b.value_json, b.updated_at,
            (SELECT client_name FROM client_config c WHERE c.client=b.client_id) AS client_name
       FROM client_brain b
      WHERE length(b.value_json)>4 ORDER BY b.updated_at DESC LIMIT 500`,
  ).all()).results || [];
  const out = [];
  for (const r of rows) {
    let value = r.value_json;
    try { const parsed = JSON.parse(r.value_json); value = typeof parsed === "string" ? parsed : Array.isArray(parsed) ? parsed.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("; ") : JSON.stringify(parsed); } catch { /* raw */ }
    value = str(value);
    if (value.length < 8) continue;
    const id = await docId("brain", `${r.client_id}:${r.section}:${r.field}`);
    const hash = await sha256Hex(value);
    const state = await env.DB.prepare("SELECT content_hash FROM search_index_state WHERE doc_id=?").bind(id).first();
    if (state?.content_hash === hash) continue;
    out.push({
      id, source: `${r.client_id}:${r.section}:${r.field}`, kind: "brain", scope: r.client_id, hash,
      text: `${r.client_name || r.client_id}, ${r.section} ${r.field.replace(/_/g, " ")}: ${value.slice(0, MAX_TEXT)}`,
      meta: { kind: "brain", client_id: r.client_id, client_name: r.client_name || r.client_id, section: r.section, field: r.field, updated_at: r.updated_at, snippet: value.slice(0, 180) },
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function embed(env, texts) {
  const result = await env.AI.run(EMBED_MODEL, { text: texts });
  return result?.data || [];
}

// One indexer pass: embed up to BATCH pending docs, upsert to Vectorize, record state.
export async function indexPending(env) {
  if (!env.AI || !env.VECTORIZE) return { indexed: 0, skipped: "no bindings" };
  const docs = [...(await pendingDmDocs(env, BATCH)), ...(await pendingBrainDocs(env, Math.max(5, BATCH / 5)))].slice(0, BATCH);
  if (!docs.length) return { indexed: 0 };
  const vectors = await embed(env, docs.map((d) => d.text));
  const upserts = [];
  const now = nowIso();
  for (let i = 0; i < docs.length; i += 1) {
    const values = vectors[i];
    if (!values || !values.length) continue;
    const d = docs[i];
    upserts.push({ id: d.id, values, metadata: { ...d.meta, scope: d.scope } });
  }
  if (upserts.length) await env.VECTORIZE.upsert(upserts);
  for (let i = 0; i < docs.length; i += 1) {
    const d = docs[i];
    if (!upserts.some(vector => vector.id === d.id)) continue;
    await env.DB.prepare(
      "INSERT INTO search_index_state (doc_id, kind, scope, content_hash, indexed_at, source_id) VALUES (?,?,?,?,?,?) ON CONFLICT(doc_id) DO UPDATE SET content_hash=excluded.content_hash, indexed_at=excluded.indexed_at, source_id=excluded.source_id",
    ).bind(d.id, d.kind, d.scope, d.hash || (await sha256Hex(d.text)), now, d.source).run();
  }
  return { indexed: upserts.length, remaining: docs.length >= BATCH };
}

// Query. scope "operator" sees everything; a client sees only its own brain
// (DMs belong to the operator account today).
export async function search(env, { q, scope = "operator", kinds = ["dm", "brain"], topK = 12 }) {
  const query = str(q).slice(0, 500);
  if (!query || !env.AI || !env.VECTORIZE) return [];
  const [vector] = await embed(env, [query]);
  if (!vector) return [];
  const filter = scope === "operator"
    ? { kind: kinds.length === 1 ? kinds[0] : { $in: kinds } }
    : { kind: "brain", scope };
  const res = await env.VECTORIZE.query(vector, { topK: Math.min(50, topK), filter, returnMetadata: "all" });
  return (res?.matches || []).map((m) => ({ id: m.id, score: Math.round(m.score * 1000) / 1000, ...(m.metadata || {}) }));
}
