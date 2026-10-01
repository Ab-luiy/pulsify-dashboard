import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet} from '../functions/api/operator-bootstrap.js';
const db=new DatabaseSync(':memory:');
db.exec("CREATE TABLE client_config(client TEXT,status TEXT); INSERT INTO client_config VALUES ('acme','client'),('demo-example','demo')");
db.exec("CREATE TABLE payments(client TEXT,currency TEXT,amount_cents INTEGER,occurred_at TEXT); INSERT INTO payments VALUES ('acme','USD',10000,'2026-09-01'),('acme','USD',20000,'2026-09-17T22:00:00Z'),('acme','USD',99000,'2026-08-31'),('acme','EUR',4000,'2026-09-12'),('demo-example','USD',777700,'2026-09-05')");
const env={ADMIN_KEY:'test',DB:{prepare(sql){let args=[];return{bind(...values){args=values;return this;},async all(){return {results:sql.startsWith('SELECT currency, SUM')?db.prepare(sql).all(...args):[]};}};}}};
async function invoke(query,key='test'){return onRequestGet({env,request:new Request('https://test/api/operator-bootstrap'+query,{headers:{'x-admin-key':key}})});}
assert.equal((await invoke('?from=2026-09-01&to=2026-09-17','bad')).status,401);
let r=await invoke('?from=2026-09-01&to=2026-09-17');assert.equal(r.status,200);
assert.deepEqual((await r.json()).selected,{from:'2026-09-01',to:'2026-09-17',collected_by_currency:{EUR:4000,USD:30000}});
assert.equal((await invoke('?from=2026-09-18&to=2026-09-17')).status,422);
assert.equal((await invoke('?from=invalid&to=2026-09-17')).status,422);
assert.equal((await(await invoke('')).json()).selected,null);
console.log('PASS bootstrap date range: inclusive boundaries, currency separation, auth and invalid ranges. In-memory SQLite.');
