import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { onRequestGet, onRequestPost } from "../functions/api/operator-photos.js";
import { onRequestGet as publicMedia, onRequestHead as publicHead } from "../functions/m/[[key]].js";
import { syncRows } from "../../../tools/sync-operator-photos.mjs";
const png = Uint8Array.from([137,80,78,71,13,10,26,10]);
function setup() {
 const db = new DatabaseSync(":memory:"); db.exec(readFileSync(new URL("../migrations/0057_operator_photos.sql", import.meta.url), "utf8"));
 const objects = new Map();
 return { ADMIN_KEY: "test-key", objects, DB: { prepare(sql) { const stmt = db.prepare(sql); let values = []; return { bind(...args) { values=args; return this; }, async first() { return stmt.get(...values) || null; }, async all() { return {results:stmt.all(...values)}; }, async run() { const r=stmt.run(...values); return {meta:{last_row_id:Number(r.lastInsertRowid)}}; } }; } }, MEDIA: { async put(key, bytes) { objects.set(key, bytes); }, async get(key) { return objects.has(key) ? {body:objects.get(key)} : null; }, async delete(key) { objects.delete(key); } } };
}
function upload(bytes=png, folder="portraits", filename="IMG_0001.png", type="image/png", auth=true) {
 const form=new FormData(); form.set("file", new Blob([bytes], {type}),filename); form.set("folder",folder);
 return new Request("https://pulsify.test/api/operator-photos",{method:"POST",headers:auth?{"x-admin-key":"test-key"}:{},body:form});
}
const getRequest = query => new Request(`https://pulsify.test/api/operator-photos${query}`, {headers:{"x-admin-key":"test-key"}});
test("operator auth required before any storage access, including portal token",async()=>{
 const env=setup(); for (const headers of [{},{"x-portal-token":"client"}]) {
  assert.equal((await onRequestGet({env,request:new Request("https://pulsify.test/api/operator-photos?id=1",{headers})})).status,401);
 }
 assert.equal((await onRequestPost({env,request:upload(png,"portraits","x.png","image/png",false)})).status,401);
 assert.equal(env.objects.size,0);
});
test("stores original bytes and hash in isolated table, lists folder, downloads original",async()=>{
 const env=setup();const response=await onRequestPost({env,request:upload()}); assert.equal(response.status,201);
 const {item}=await response.json();assert.equal(item.sha256,createHash("sha256").update(png).digest("hex")); assert.equal(item.filename,"IMG_0001.png");
 const list=await onRequestGet({env,request:getRequest("?folder=portraits")});assert.equal((await list.json()).items.length,1);
 assert.equal((await (await onRequestGet({env,request:getRequest("?folder=scenery")})).json()).items.length,0);
 const original=await onRequestGet({env,request:getRequest("?id=1&download=1")});assert.equal(original.status,200);
 assert.match(original.headers.get("cache-control"),/private/);assert.match(original.headers.get("content-disposition"),/IMG_0001.png/);assert.deepEqual(new Uint8Array(await original.arrayBuffer()),png);
 const row=await env.DB.prepare("SELECT * FROM operator_photos").first();assert.match(row.storage_key,/^operator-photos\//);
 for (const fn of [publicMedia,publicHead]) assert.equal((await fn({env,params:{key:row.storage_key}})).status,404);
});
test("rejects forged signatures, wrong types, oversize and invalid folders without storage writes",async()=>{
 const env=setup();
 for (const [request,status] of [[upload(Uint8Array.from([1,2,3])),415],[upload(png,"other","x.heic","image/heic"),415],[upload(png,"client-id"),422],[upload(new Uint8Array(10*1024*1024+1).map((v,i)=>i<8?png[i]:v)),413]]) {
  assert.equal((await onRequestPost({env,request})).status,status);
 }
 assert.equal(env.objects.size,0);
});
test("safe filenames, absent photo and invalid cursor",async()=>{
 const env=setup(); const {item}=await (await onRequestPost({env,request:upload(png,"other","../portrait.png")})).json();assert.equal(item.filename,"portrait.png");
 for (const query of ["?before=-1","?id=../../x","?folder=client"]) assert.equal((await onRequestGet({env,request:getRequest(query)})).status,422);
 assert.equal((await onRequestGet({env,request:getRequest("?id=999")})).status,404);
});
test("pagination returns all photos without duplicates",async()=>{
 const env=setup();for(let i=0;i<62;i++) await onRequestPost({env,request:upload()});
 const first=await (await onRequestGet({env,request:getRequest("")})).json();assert.equal(first.items.length,60);assert.equal(first.next,3);
 const second=await (await onRequestGet({env,request:getRequest(`?before=${first.next}`)})).json();assert.equal(second.items.length,2);assert.equal(second.next,null);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,62);
});
test("failed record insert cleans up the stored object",async()=>{
 const env=setup(); const prepare=env.DB.prepare;env.DB.prepare=sql=>sql.startsWith("INSERT")?{bind(){return this},run(){throw Error("fail")}}:prepare(sql);
 assert.equal((await onRequestPost({env,request:upload()})).status,500);assert.equal(env.objects.size,0);
});
test("sync verifies originals, resumes, rejects altered files and unsafe keys",()=>{
 const dir=mkdtempSync(join(tmpdir(),"pulsify-photos-"));
 try {
  const row={id:1,filename:"../../photo.png",storage_key:"operator-photos/abc-123.png",size_bytes:png.length,sha256:createHash("sha256").update(png).digest("hex"),folder:"portraits"};
  const download=(key,target)=>writeFileSync(target,png);
  assert.deepEqual(syncRows([row],dir,download),{downloaded:1,total:1});assert.ok(existsSync(join(dir,"1-photo.png")));
  assert.deepEqual(syncRows([row],dir,()=>assert.fail("downloaded twice")),{downloaded:0,total:1});
  writeFileSync(join(dir,"1-photo.png"),"edit");assert.throws(()=>syncRows([row],dir,download),/differs/);assert.equal(readFileSync(join(dir,"1-photo.png"),"utf8"),"edit");
  assert.throws(()=>syncRows([{...row,storage_key:"client/photo.png"}],dir,download),/Invalid/);
  assert.throws(()=>syncRows([{...row,id:2}],dir,(key,target)=>writeFileSync(target,"bad")),/integrity/);assert.equal(existsSync(join(dir,"2-photo.png")),false);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
