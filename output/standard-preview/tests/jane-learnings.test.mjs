// Jane's model fallback and learning queue (pulsify-saas #92). Real SQLite, mocked Gemini.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolveJaneAi, generateJaneText, janeStats, janeModels } from '../functions/_shared/jane-provider.js';
import { anonymise, collectJaneLearnings, approvedLearnings } from '../functions/_shared/jane-learnings.js';
import * as learningsApi from '../functions/api/jane-learnings.js';

const ok = text => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 } });
const gemini = (models, fallbacks = '') => ({ JANE_GEMINI_API_KEY: 'synthetic-secret', JANE_GEMINI_MODEL: models, JANE_GEMINI_FALLBACK_MODELS: fallbacks, JANE_GEMINI_FREE_VERIFIED: 'true' });

test('a limited or busy model hands over to the next free model, and is tried last afterwards', async t => {
  const env = gemini('fb-a', 'fb-b, fb-c');
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (!init?.method) return Response.json({ inputTokenLimit: 1000 });
    const model = String(url).split('/models/')[1].split(':')[0];
    seen.push(model);
    if (model === 'fb-a') return new Response('quota', { status: 429 });
    if (model === 'fb-b') return new Response('overloaded', { status: 503 });
    return ok('hello');
  });
  const ai = await resolveJaneAi(env, 'a');
  assert.equal(await generateJaneText({ system: 's', user: 'u' }, ai), 'hello');
  assert.deepEqual(seen, ['fb-a', 'fb-b', 'fb-c']);
  const stats = await janeStats(env, ai, 'a');
  assert.equal(stats.model, 'fb-c');
  assert.equal(stats.selected, 'auto');
  assert.deepEqual(stats.fallbacks, [{ model: 'fb-a', stage: 'review', reason: 'limit' }, { model: 'fb-b', stage: 'review', reason: 'busy' }]);
  assert.equal(stats.calls[0].model, 'fb-c');
  assert.deepEqual(stats.models.map(m => m.id), ['fb-a', 'fb-b', 'fb-c']);
  // The next reply starts with the model that is not cooling down.
  const next = await resolveJaneAi(env, 'a');
  assert.deepEqual(next.order, ['fb-c', 'fb-a', 'fb-b']);
});

test('a chosen model goes first, unknown choices mean Auto, and other errors do not switch model', async t => {
  const env = gemini('pick-a', 'pick-b');
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (!init?.method) return Response.json({});
    seen.push(String(url).split('/models/')[1].split(':')[0]);
    return new Response('bad request', { status: 400 });
  });
  assert.equal((await resolveJaneAi(env, 'a', 'pick-b')).order[0], 'pick-b');
  assert.equal((await resolveJaneAi(env, 'a', 'not-a-model')).selected, 'auto');
  const ai = await resolveJaneAi(env, 'a');
  await assert.rejects(generateJaneText({ system: 's', user: 'u' }, ai), error => error.code === 'GEMINI_ERROR');
  assert.deepEqual(seen, ['pick-a']);
  assert.deepEqual(janeModels({ JANE_GEMINI_MODEL: 'gemini-3.5-flash-lite' })[0], { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', description: 'Fast for everyday writing' });
});

test('shared lessons are anonymised', () => {
  const text = anonymise('Sam Rivera charges $1,500 and 40% of sam@x.com buyers from https://x.co/p ask @samtrades about refunds', 'Sam Rivera');
  assert.doesNotMatch(text, /Sam|Rivera|1,500|40%|sam@|https|@samtrades/);
  assert.match(text, /\[figure\]/);
});

// ---- the queue, end to end
const sql = new DatabaseSync(':memory:');
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT);");
for (const file of ['0053_copy_chat.sql', '0084_jane_learnings.sql']) sql.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
sql.prepare('INSERT INTO client_config VALUES (?, ?), (?, ?)').run('a', 'Alpha Trader', 'b', 'Beta Coach');
const DB = { prepare(q) { let args = []; const st = { bind(...v) { args = v; return st; }, async first() { return sql.prepare(q).get(...args) || null; }, async all() { return { results: sql.prepare(q).all(...args) }; }, async run() { const r = sql.prepare(q).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } }; return st; } };
const env = { DB, ADMIN_KEY: 'admin-test-key' };
const message = 'My buyers keep telling me they tried three courses already and nothing stuck. Also my calls are every Tuesday now. Can you write a hook?';
const reply = 'Here is a hook: You have tried three courses. This time you get a plan you can keep.';
const binding = proposals => ({ async run() { return { response: JSON.stringify({ learnings: proposals }) }; } });

test('learnings are queued only with real evidence, anonymised when shared, and deduplicated', async () => {
  const proposals = [
    { kind: 'objection', text: 'Alpha Trader buyers say they already tried three courses and nothing stuck', evidence: 'they tried three courses already and nothing stuck' },
    { kind: 'client_fact', text: 'Group calls run every Tuesday.', evidence: 'my calls are every Tuesday now' },
    { kind: 'angle', text: 'Invented angle the client never said anything about', evidence: 'this quote is not in the exchange' },
  ];
  // Facts must come from the client, not from Jane's reply, and not repeat what is already saved.
  assert.deepEqual(await collectJaneLearnings(env, { binding: binding([
    { kind: 'client_fact', text: 'The client offers a plan you can keep.', evidence: 'This time you get a plan you can keep.' },
    { kind: 'client_fact', text: 'Their buyers already tried three courses.', evidence: 'they tried three courses already' },
  ]) }, 'a', { chatId: 1, messageId: 2, message, reply, route: 'direct', knownFacts: 'Buyers already tried three courses before joining.' }), []);
  const saved = await collectJaneLearnings(env, { binding: binding(proposals) }, 'a', { chatId: 1, messageId: 2, message, reply, route: 'direct' });
  assert.equal(saved.length, 2);
  const rows = sql.prepare('SELECT kind, shared, text, status FROM jane_learnings ORDER BY id').all();
  assert.deepEqual(rows.map(r => [r.kind, r.shared, r.status]), [['objection', 1, 'pending'], ['client_fact', 0, 'pending']]);
  assert.doesNotMatch(rows[0].text, /Alpha|Trader/);
  // The same lesson again, from another client, is not queued twice.
  assert.equal((await collectJaneLearnings(env, { binding: binding(proposals.slice(0, 1)) }, 'b', { chatId: 9, messageId: 9, message, reply, route: 'direct' })).length, 0);
  // Greetings and short edits never spend a call.
  let called = false;
  await collectJaneLearnings(env, { binding: { async run() { called = true; return {}; } } }, 'a', { message: 'hey', reply: 'hi', route: 'social' });
  assert.equal(called, false);
  // A broken model never breaks the chat.
  assert.deepEqual(await collectJaneLearnings(env, { binding: { async run() { throw new Error('down'); } } }, 'a', { message, reply, route: 'direct' }), []);
});

const op = (body, key = 'admin-test-key', query = '') => new Request(`https://test/api/jane-learnings${query}`, body
  ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': key }, body: JSON.stringify(body) }
  : { headers: { 'x-admin-key': key } });

test('only operators review; approval routes each kind to the right place; nothing pending reaches prompts', async () => {
  assert.equal((await learningsApi.onRequestGet({ request: op(null, 'wrong'), env, data: {} })).status, 401);
  assert.equal((await approvedLearnings(env, 'tried three courses')).ids.length, 0, 'pending items are never used');
  const list = await (await learningsApi.onRequestGet({ request: op(null), env, data: {} })).json();
  assert.equal(list.counts.pending, 2);
  const [fact, objection] = list.learnings;
  assert.equal(fact.kind, 'client_fact');
  assert.equal(fact.client_name, 'Alpha Trader');

  const approved = await (await learningsApi.onRequestPost({ request: op({ action: 'approve', id: fact.id }), env, data: {} })).json();
  assert.equal(approved.status, 'approved');
  assert.deepEqual(sql.prepare("SELECT client_id, note FROM copy_memory").all().map(r => ({ ...r })), [{ client_id: 'a', note: 'Group calls run every Tuesday.' }]);

  // An edited shared lesson is anonymised again.
  const edited = await (await learningsApi.onRequestPost({ request: op({ action: 'approve', id: objection.id, text: 'Alpha Trader buyers already tried three courses; name that first.' }), env, data: {} })).json();
  assert.doesNotMatch(edited.text, /Alpha|Trader/);
  const block = await approvedLearnings(env, 'write a hook for buyers who tried courses');
  assert.equal(block.ids.length, 1);
  assert.match(block.prompt_text, /TEAM-APPROVED NOTES[\s\S]*Buyer objection/);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM copy_memory WHERE client_id='b'").get().n, 0, 'shared lessons never write client memory');

  // Rejecting retires it from prompts.
  await learningsApi.onRequestPost({ request: op({ action: 'reject', id: objection.id }), env, data: {} });
  assert.equal((await approvedLearnings(env, 'write a hook for buyers who tried courses')).ids.length, 0);
});
