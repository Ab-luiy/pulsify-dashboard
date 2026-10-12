// Metadata/status only. Never retrieves real private objects or logs credentials/URLs.
import fs from 'node:fs';
const base=process.env.AUDIT_ORIGIN;
if(!/^https:\/\/(?:pulsify-ai\.com|[a-z0-9-]+\.pulsify-funnels\.pages\.dev)$/.test(base||''))throw Error('Unknown origin');
const vars=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
const results=[];let cookie='';
try{
 const r=await fetch(base+'/api/client-login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:vars.PULSIFY_DEMO_CLIENT_EMAIL,password:vars.PULSIFY_DEMO_CLIENT_PASSWORD})});
 const d=await r.json();if(d.client!=='demo-example')throw Error('Expected demo workspace');
 cookie=r.headers.get('set-cookie')?.split(';')[0];if(!cookie)throw Error('Missing session');
 const brain=await fetch(base+'/api/client-brain',{headers:{cookie}});const data=await brain.json();
 results.push({check:'authenticated demo brain',status:brain.status,pass:brain.status===200});
 const images=(data.proof_items||[]).filter(p=>p.url?.startsWith('/m/')).slice(0,3);
 for(const item of images){const response=await fetch(base+item.url,{method:'HEAD'});results.push({check:'existing demo public image compatibility',status:response.status,pass:response.status===200,contentType:response.headers.get('content-type')});}
 results.push({check:'existing image sample count',count:images.length});
 // Deliberately nonexistent paths only; actual private-key exclusion is proven by local R2 fixtures.
 for(const suffix of ['/m/archive/workspaces/audit-nonexistent/example.json','/m/clients/audit-nonexistent/voice-notes/example','/m/operator-photos/audit-nonexistent.png']){
  const response=await fetch(base+suffix,{method:'HEAD'});results.push({check:'non-public namespace rejects anonymous request',status:response.status,pass:response.status===404,cache:response.headers.get('cache-control')});
 }
}finally{if(cookie)await fetch(base+'/api/client-logout',{method:'POST',headers:{cookie,origin:base,'content-type':'application/json'},body:'{}'});}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin:base,results},null,2));
if(results.some(r=>r.pass===false))process.exitCode=1;
