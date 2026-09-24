import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAccess,accessToken,ISSUER,operatorIdentity} from '../functions/_shared/access.js';
import {onRequest as middlewareChain,pulsifyMiddleware as onRequest} from '../functions/_middleware.js';
import {checkAdmin} from '../functions/_shared/common.js';
import {onRequestGet as clientsHandler} from '../functions/api/clients.js';
import {onRequestGet as slugHandler} from '../functions/[slug].js';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256'};
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(changes={},head={}){const data=encode({alg:'RS256',kid:'test-key',...head})+'.'+encode({aud:['console'],iss:ISSUER,exp:Date.now()/1000+600,email:'operator@example.test',...changes});return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,Buffer.from(data))).toString('base64url');}
const fetcher=async()=>Response.json({keys:[jwk],public_certs:[{kid:jwk.kid,cert:'test representation'}]});
test('Sentry wraps the existing access gate first',()=>{
 assert.equal(middlewareChain.length,2);
 assert.equal(typeof middlewareChain[0],'function');
 assert.equal(middlewareChain[1],onRequest);
});
test('Pages dependency manifests and bundles are not publicly served',async()=>{
 for(const path of ['/package.json','/package-lock.json','/node_modules/@sentry/cloudflare/package.json','/_worker.bundle/index.js']){
  const r=await onRequest({request:new Request('https://pulsify-ai.com'+path),env:{},data:{},next:()=>new Response('asset')});
  assert.equal(r.status,404,path);
 }
});
test('RS256 validates audience, issuer, expiry, signature, algorithm and cookie',async()=>{
 const valid=await token();assert.deepEqual(await validateAccess(valid,'console',{fetcher}),{email:'operator@example.test',via:'access'});
 for(const change of [{aud:['wrong']},{iss:'https://evil.test'},{exp:0},{nbf:Date.now()/1000+300},{email:null}])assert.equal(await validateAccess(await token(change),'console',{fetcher}),null);
 assert.equal(await validateAccess(await token({}, {alg:'HS256'}),'console',{fetcher}),null);
 const parts=valid.split('.');parts[1]=encode({aud:['console'],iss:ISSUER,exp:Date.now()/1000+600,email:'attacker@example.test'});assert.equal(await validateAccess(parts.join('.'),'console',{fetcher}),null);
 const request=new Request('https://pulsify-ai.com/admin',{headers:{cookie:'other=x; CF_Authorization='+valid}});assert.equal(accessToken(request),valid);
 assert.equal(await validateAccess('malformed','console',{fetcher}),null);
});
test('Pages cloned requests retain server-validated identity through context.data',async()=>{
 const env={ACCESS_AUD:'console',DB:{prepare(){return{all:async()=>({results:[]})};}}};
 const request=new Request('https://pulsify-ai.com/api/clients',{headers:{'Cf-Access-Jwt-Assertion':await token()}}),data={};
 const response=await onRequest({request,env,data,next:()=>clientsHandler({request:new Request(request.clone()),env,data})});
 assert.equal(response.status,200);assert.equal(data.operator.email,'operator@example.test');
 assert.equal((await clientsHandler({request:new Request('https://pulsify-ai.com/api/clients',{headers:{'x-pulsify-operator':'1','x-operator-email':'fake@test'}}),env,data:{}})).status,401);
});
test('the app route passes through client-slug routing to static assets',async()=>{
 let called=false;
 const response=await slugHandler({request:new Request('https://pulsify-ai.com/app/'),params:{slug:'app'},env:{},next:()=>{called=true;return new Response('<h1>App</h1>',{headers:{'content-type':'text/html'}});}});
 assert.equal(called,true);
 assert.equal(response.status,200);
 assert.match(await response.text(),/App/);
});
test('middleware redirects bypass hosts, protects HTML aliases, audits API keys and passes trusted identity to handlers',async()=>{
 const env={ACCESS_AUD:'console',ADMIN_KEY:'automation-test',DB:{prepare(){return{bind(){return{run:async()=>{events++;}};}};}}};let events=0;
 async function invoke(url,headers={},method='GET'){const request=new Request(url,{headers,method});const data={};return onRequest({request,env,data,next:async()=>Response.json({operator:data.operator,denied:!!checkAdmin(request,env),identity:operatorIdentity(request)})});}
 for(const path of ['/admin','/admin.html','/settings','/integrations','/campaigns']){const r=await invoke('https://pulsify-funnels.pages.dev'+path);assert.equal(r.status,302);assert.equal(r.headers.get('location'),path.startsWith('/admin')?'https://pulsify-ai.com'+path:'https://pulsify-ai.com/app/'+path.slice(1));}
 assert.equal((await invoke('https://pulsify-funnels.pages.dev/app')).headers.get('location'),'https://pulsify-ai.com/app');
 assert.equal((await invoke('https://pulsify-ai.com/app')).headers.get('location'),'https://pulsify-ai.com/admin');
 assert.equal((await invoke('https://pulsify-ai.com/api/clients')).status,401);
 const valid=await token();const r=await invoke('https://pulsify-ai.com/api/clients',{'Cf-Access-Jwt-Assertion':valid});assert.equal(r.status,200);const d=await r.json();assert.equal(d.operator.email,'operator@example.test');assert.equal(d.denied,false);
 assert.equal((await invoke('https://pulsify-ai.com/app',{'Cf-Access-Jwt-Assertion':valid})).status,200);
 assert.equal((await invoke('https://pulsify-ai.com/app/_next/static/example.js',{'Cf-Access-Jwt-Assertion':valid})).status,200);
 const key=await invoke('https://pulsify-funnels.pages.dev/api/crm-sync',{'x-admin-key':'automation-test'},'POST');assert.equal(key.status,200);assert.equal((await key.json()).operator.via,'key');assert.equal(events,1);
 assert.equal((await invoke('https://pulsify-funnels.pages.dev/admin',{'x-admin-key':'automation-test'})).status,302);
 assert.equal((await invoke('https://pulsify-ai.com/api/settings',{'Cf-Access-Jwt-Assertion':valid,origin:'https://evil.test'},'POST')).status,403);
 assert.equal((await invoke('https://pulsify-ai.com/portal/login')).status,200);
 assert.equal((await invoke('https://pulsify-ai.com/api/client-login',{},'POST')).status,200);
 assert.equal((await invoke('https://pulsify-ai.com/api/api-keys')).status,200);
 assert.equal((await invoke('https://pulsify-ai.com/api/integrations')).status,200);
});

test('cutover: a signed-in operator on /admin lands on the matching new page',async()=>{
 const env={ACCESS_AUD:'console',DB:{prepare(){return{bind(){return{run:async()=>{}};}};}}};
 const valid=await token();
 async function go(url){return onRequest({request:new Request(url,{headers:{'Cf-Access-Jwt-Assertion':valid}}),env,data:{},next:async()=>new Response('legacy')});}
 assert.equal((await go('https://pulsify-ai.com/admin')).headers.get('location'),'https://pulsify-ai.com/app/');
 assert.equal((await go('https://pulsify-ai.com/admin?view=crm')).headers.get('location'),'https://pulsify-ai.com/app/crm');
 assert.equal((await go('https://pulsify-ai.com/admin?view=queue')).headers.get('location'),'https://pulsify-ai.com/app/today');
 assert.equal((await go('https://pulsify-ai.com/admin?view=cashflow')).headers.get('location'),'https://pulsify-ai.com/app/dashboard?tab=cashflow');
 assert.equal((await go('https://pulsify-ai.com/admin.html?view=nonsense')).headers.get('location'),'https://pulsify-ai.com/app/');
 assert.equal(await (await go('https://pulsify-ai.com/admin/console.js')).text(),'legacy','legacy assets stay reachable for rollback');
});
