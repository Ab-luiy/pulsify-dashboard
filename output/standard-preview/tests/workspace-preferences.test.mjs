import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPut} from '../functions/api/workspace-preferences.js';
import {sha256Hex} from '../functions/_shared/common.js';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,portal_token_hash TEXT)');
sql.exec(readFileSync(new URL('../migrations/0026_workspace_preferences.sql',import.meta.url),'utf8'));
sql.prepare('INSERT INTO client_config VALUES(?,?,?),(?,?,?)').run('a','A',await sha256Hex('token-a'),'b','B',await sha256Hex('token-b'));
sql.exec("ALTER TABLE client_config ADD COLUMN status TEXT DEFAULT 'prospect'");
const env={DB:{prepare(query){let args=[];const p={bind(...v){args=v;return p},async first(){return sql.prepare(query).get(...args)||null},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}}}};return p}}};
const request=(token,body,query='')=>new Request('https://test/api/workspace-preferences'+query,{method:body?'PUT':'GET',headers:{'x-portal-token':token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const data={key:'launch-checklist',value:{completed:['voice'],dismissed:false}};
assert.equal((await onRequestPut({env,request:request('token-a',data)})).status,200);
assert.deepEqual((await (await onRequestGet({env,request:request('token-a')})).json()).value,data.value);
assert.equal((await (await onRequestGet({env,request:request('token-b')})).json()).value,null);
assert.equal((await onRequestGet({env,request:request('token-a',null,'?client=b')})).status,403);
assert.equal((await onRequestPut({env,request:request('bad',data)})).status,401);
assert.equal((await onRequestPut({env,request:request('token-a',{...data,key:'admin'})})).status,422);
console.log('PASS preference persistence, tenant isolation, invalid keys and authentication');

// #61: two tabs cannot silently overwrite each other's folder moves.
{
  const folders = (value, base) => ({ key: 'media-folders', value, ...(base === undefined ? {} : { base }) });
  let read = await (await onRequestGet({ env, request: request('token-a', null, '?key=media-folders') })).json();
  assert.equal(read.updated_at, null, 'nothing saved yet');
  // Tab 1 and tab 2 both read "nothing saved". Tab 1 saves first.
  const first = await onRequestPut({ env, request: request('token-a', folders({ assign: { 1: 'proof' } }, null)) });
  assert.equal(first.status, 200);
  const savedAt = (await first.json()).updated_at;
  assert.ok(savedAt, 'a save returns its version');
  // Tab 2 still thinks nothing was saved: refused, and it gets tab 1's folders back.
  const stale = await onRequestPut({ env, request: request('token-a', folders({ assign: { 2: 'scenery' } }, null)) });
  assert.equal(stale.status, 409);
  const staleBody = await stale.json();
  assert.deepEqual(staleBody.value, { assign: { 1: 'proof' } });
  assert.equal(staleBody.updated_at, savedAt);
  // With the version it just read, tab 2's save goes through.
  const retried = await onRequestPut({ env, request: request('token-a', folders({ assign: { 1: 'proof', 2: 'scenery' } }, savedAt)) });
  assert.equal(retried.status, 200);
  read = await (await onRequestGet({ env, request: request('token-a', null, '?key=media-folders') })).json();
  assert.deepEqual(read.value, { assign: { 1: 'proof', 2: 'scenery' } });
  // A save without base keeps the old behaviour.
  assert.equal((await onRequestPut({ env, request: request('token-a', folders({ assign: {} })) })).status, 200);
  console.log('PASS preference version check: stale saves refused with the latest value, fresh saves and base-less saves accepted');
}
