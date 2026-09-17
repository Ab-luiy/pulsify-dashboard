import {test} from 'node:test';import assert from 'node:assert/strict';
import{onRequest}from'../functions/_middleware.js';
test('dashboard rejects anonymous and key-only requests and redirects pages.dev paths',async()=>{
 const invoke=(url,headers={})=>onRequest({request:new Request(url,{headers}),env:{ACCESS_AUD:'dashboard'},data:{},next:async()=>new Response('private')});
 for(const path of ['/','/generate','/transcript','/dashboard-data-v2.json']){const r=await invoke('https://pulsify-dashboard.pages.dev'+path);assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://ops.pulsify-ai.com'+path);assert.equal((await invoke('https://ops.pulsify-ai.com'+path)).status,401);assert.equal((await invoke('https://ops.pulsify-ai.com'+path,{'x-admin-key':'any','x-fn-access-token':'any'})).status,401);}
});
import {onRequestPost as generate} from '../functions/generate.js';
import {onRequestPost as transcript} from '../functions/transcript.js';
test('generation and transcript handlers independently reject missing trusted identity',async()=>{
 for(const handler of [generate,transcript])assert.equal((await handler({request:new Request('https://ops.pulsify-ai.com/generate',{method:'POST'}),env:{}})).status,401);
});
