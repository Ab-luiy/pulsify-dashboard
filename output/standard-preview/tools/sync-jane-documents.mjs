// Explicit manifest, never recursive discovery. No documents are shared globally.
// --manifest absolute.json [--apply]; JANE_SESSION_TOKEN contains the intended client's session.
// Manifest: { origin, documents:[{key,title,source,kind,public_use,file}] }
import fs from 'node:fs';
import path from 'node:path';
const arg = key => process.argv[process.argv.indexOf(key) + 1];
const file = arg('--manifest');
if (!process.argv.includes('--manifest') || !path.isAbsolute(file || '')) throw Error('Pass an absolute --manifest file.');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const origin = new URL(manifest.origin);
if (origin.protocol !== 'https:' || !['pulsify-ai.com', 'pulsify-funnels.pages.dev'].includes(origin.hostname) || origin.username || origin.password) throw Error('Use the verified production origin.');
if (!Array.isArray(manifest.documents) || !manifest.documents.length || manifest.documents.length > 100) throw Error('List 1–100 explicitly approved documents.');
const docs = manifest.documents.map(doc => {
  if (!path.isAbsolute(doc.file || '') || typeof doc.public_use !== 'boolean') throw Error('Each document needs an absolute text file and explicit public_use permission.');
  return { action: 'knowledge-save', key: doc.key, title: doc.title, source: doc.source, kind: doc.kind, public_use: doc.public_use, content: fs.readFileSync(doc.file, 'utf8') };
});
if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'dry-run', documents: docs.map(d => ({ key: d.key, kind: d.kind, public_use: d.public_use, characters: d.content.length })) })); process.exit(0); }
if (!process.env.JANE_SESSION_TOKEN) throw Error('Client session unavailable.');
for (const doc of docs) {
  const response = await fetch(new URL('/api/copy-chat', origin), { method: 'POST', headers: { 'content-type': 'application/json', cookie: `pulsify_client_session=${process.env.JANE_SESSION_TOKEN}` }, body: JSON.stringify(doc), redirect: 'error' });
  const result = await response.json();
  if (!response.ok || !result.ok) throw Error(`Save failed for ${doc.key}: ${result.error || response.status}`);
  console.log(JSON.stringify({ key: result.key, updated_at: result.updated_at }));
}
