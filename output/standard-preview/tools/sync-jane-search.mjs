// Run from the release checkout after build-copy-knowledge --check, before deployment.
// Uses existing Wrangler OAuth, never logs credentials. Shared approved methods ONLY.
//   --apply  index this version (a new namespace; the live site keeps reading its own until deploy)
//   --prune  after the new version is live, delete the vectors of every older indexed version
// tools/jane-search-manifest.json records which vector IDs are indexed, so old versions never pile up
// in the free Vectorize allowance (the full vault is about 240 passages per version).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { COPY_KNOWLEDGE } from '../functions/_shared/copy-knowledge-data.js';
import { JANE_EMBED_MODEL, janeNamespace } from '../functions/_shared/jane-search.ts';
execFileSync(process.execPath, ['tools/build-copy-knowledge.mjs', '--check'], { cwd: new URL('..', import.meta.url), stdio: 'inherit' });
const MANIFEST = new URL('./jane-search-manifest.json', import.meta.url);
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { namespace: null, ids: [], previous: [] };
const ids = COPY_KNOWLEDGE.passages.map(p => `${janeNamespace}:${p.id}`);
if (!process.argv.includes('--apply') && !process.argv.includes('--prune')) {
  console.log(JSON.stringify({ namespace: janeNamespace, passages: ids.length, indexed: manifest.namespace, waiting_to_prune: manifest.previous.map(entry => entry.namespace),
    action: 'dry-run; --apply indexes this version, --prune removes older versions once it is live' }));
  process.exit(0);
}
const cfg = fs.readFileSync(path.join(process.env.APPDATA, 'xdg.config/.wrangler/config/default.toml'), 'utf8');
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(cfg)?.[1];
if (!token) throw Error('Wrangler sign-in unavailable.');
const base = 'https://api.cloudflare.com/client/v4/accounts/437f6dfbb738a4267395bd5da251494a';
async function request(route, body, json = true) {
  const response = await fetch(base + route, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...(json ? { 'content-type': 'application/json' } : {}) },
    body: json ? JSON.stringify(body) : body, signal: AbortSignal.timeout(45000) });
  const data = await response.json();
  if (!response.ok || data.success === false) throw Error(`Cloudflare ${response.status}: ${String(data.errors?.[0]?.message || 'indexing failed').slice(0, 200)}`);
  return data.result;
}
if (process.argv.includes('--prune')) {
  for (const entry of manifest.previous) {
    for (let i = 0; i < entry.ids.length; i += 100) {
      const mutation = await request('/vectorize/v2/indexes/pulsify-search/delete_by_ids', { ids: entry.ids.slice(i, i + 100) });
      console.log(JSON.stringify({ pruned: Math.min(i + 100, entry.ids.length), of: entry.ids.length, namespace: entry.namespace, mutation: mutation?.mutationId }));
    }
  }
  fs.writeFileSync(MANIFEST, `${JSON.stringify({ ...manifest, previous: [] }, null, 2)}\n`);
  process.exit(0);
}
// Batch only ten at a time. A quota/auth failure stops the job; no repeated paid retry loop.
let indexed = 0;
for (let i = 0; i < COPY_KNOWLEDGE.passages.length; i += 10) {
  const parts = COPY_KNOWLEDGE.passages.slice(i, i + 10);
  const result = await request(`/ai/run/${JANE_EMBED_MODEL}`, { text: parts.map(p => `${p.title}\n${p.text}`.slice(0, 1900)) });
  if (result.data?.length !== parts.length) throw Error('Incomplete embedding batch');
  const vectors = parts.map((p, at) => {
    const values = result.data[at];
    if (values?.length !== 768 || values.some(n => !Number.isFinite(n))) throw Error('Invalid embedding');
    return { id: `${janeNamespace}:${p.id}`, namespace: janeNamespace, values, metadata: { passage_id: p.id, version: COPY_KNOWLEDGE.version } };
  });
  const form = new FormData();
  form.append('vectors', new Blob([vectors.map(v => JSON.stringify(v)).join('\n')], { type: 'application/x-ndjson' }), 'vectors.ndjson');
  const mutation = await request('/vectorize/v2/indexes/pulsify-search/upsert', form, false);
  indexed += vectors.length;
  console.log(JSON.stringify({ indexed, total: COPY_KNOWLEDGE.passages.length, mutation: mutation?.mutationId, namespace: janeNamespace }));
}
// The version that was indexed before waits for --prune, so the live site never loses its search mid-release.
const older = manifest.namespace && manifest.namespace !== janeNamespace ? [{ namespace: manifest.namespace, ids: manifest.ids }] : [];
fs.writeFileSync(MANIFEST, `${JSON.stringify({ namespace: janeNamespace, ids, previous: [...manifest.previous.filter(entry => entry.namespace !== janeNamespace), ...older] }, null, 2)}\n`);
