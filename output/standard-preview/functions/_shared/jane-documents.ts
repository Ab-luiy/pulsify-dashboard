// Explicitly saved text only. No automatic file crawling, URL fetching or cross-client reads.
import { excerpt, relevance, terms } from './copy-knowledge.js';
import { scrubSources } from './source-scrub.js';
type Env = { DB: any };
const KEY = /^[a-z0-9][a-z0-9_-]{0,79}$/;
export async function saveJaneDocument(env: Env, client: string, input: Record<string, unknown>) {
  const key = String(input.key || '');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  const source = typeof input.source === 'string' ? input.source.trim() : '';
  if (!KEY.test(key) || !title || title.length > 160 || content.length < 10 || content.length > 50000 || !source || source.length > 300
    || !['reference', 'transcript', 'approved-example'].includes(String(input.kind)) || typeof input.public_use !== 'boolean') {
    return { ok: false, error: 'Provide a stable key, title, source, kind, public_use permission and 10–50,000 characters of text.' };
  }
  const count = await env.DB.prepare('SELECT COUNT(*) n FROM jane_documents WHERE client_id=? AND document_key<>?').bind(client, key).first();
  if (count.n >= 100) return { ok: false, error: 'This workspace already has 100 documents. Update or remove one first.' };
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO jane_documents(client_id,document_key,title,content,source,kind,public_use,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(client_id,document_key) DO UPDATE SET title=excluded.title,content=excluded.content,source=excluded.source,kind=excluded.kind,public_use=excluded.public_use,updated_at=excluded.updated_at`)
    .bind(client, key, title, content, source, input.kind, input.public_use ? 1 : 0, now).run();
  return { ok: true, key, updated_at: now };
}

export async function searchJaneDocuments(env: Env, client: string, query: string, publicDraft = false) {
  try {
    const words = terms(query).slice(0, 12).map((word: string) => `%${word.replace(/[\\%_]/g, '\\$&')}%`);
    if (!words.length) return { status: 'ready', matches: [] };
    // Rank in D1 before transferring text; at most eight 50k documents reach the Worker.
    const score = words.map(() => "CASE WHEN title || ' ' || content LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END").join(' + ');
    const result = await env.DB.prepare(`SELECT document_key,title,content,source,kind,public_use,updated_at, (${score}) AS hits FROM jane_documents WHERE client_id=?${publicDraft ? ' AND public_use=1' : ''} AND hits>0 ORDER BY hits DESC,updated_at DESC LIMIT 8`).bind(...words, client).all();
    const docs = (result.results || []).map((row: any) => ({ ...row, score: relevance(`${row.title} ${row.content}`, query) }))
      .filter((row: any) => row.score > 0).sort((a: any, b: any) => b.score - a.score).slice(0, 3);
    return { status: 'ready', matches: docs.map((row: any) => ({ id: row.document_key, title: scrubSources(row.title), source: scrubSources(row.source),
      kind: row.kind, saved_at: row.updated_at, text: excerpt(scrubSources(row.content), query, 1400),
      note: row.kind === 'approved-example' ? 'Style reference only. Not factual evidence.' : 'User-supplied reference. Not verified proof. Current saved fields and corrections take precedence.' })) };
  } catch { return { status: 'unavailable', matches: [] }; }
}

export async function readJaneDocument(env: Env, client: string, id: string, query: string, publicDraft = false) {
  if (!KEY.test(id)) return { error: 'Invalid document key.' };
  try {
    const row = await env.DB.prepare(`SELECT title,content,source,kind,updated_at FROM jane_documents WHERE client_id=? AND document_key=?${publicDraft ? ' AND public_use=1' : ''}`).bind(client,id).first();
    return row ? { id, title: scrubSources(row.title), source: scrubSources(row.source), kind: row.kind, saved_at: row.updated_at,
      text: excerpt(scrubSources(row.content),query,5000), note: 'User-supplied reference, not verified proof. Approved examples supply style only.' }
      : { error: 'Document not found or excluded from this task.' };
  } catch { return { error: 'Document lookup unavailable.' }; }
}
