// Explicit live-demo QA. Never prints credentials or client payloads.
import fs from 'node:fs';
import path from 'node:path';
import { SOURCE_NAMES } from '../../output/standard-preview/functions/_shared/source-scrub.js';
const root = process.cwd();
const out = path.join(root, 'output/mvp-readiness-2026-10-12');
const vars = Object.fromEntries(fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
const base=process.env.MVP_CHECK_BASE || 'https://pulsify-ai.com';
if(!/^https:\/\/(?:pulsify-ai\.com|[a-z0-9-]+\.pulsify-funnels\.pages\.dev)$/.test(base))throw Error('Refusing unknown QA origin');
const label=process.env.MVP_CHECK_LABEL || 'live-check';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid evidence label');
let cookie=''; const results=[];
async function req(route, body, auth=true) {
 const r=await fetch(base+route,{method:body?'POST':'GET',headers:{origin:base,...(body?{'content-type':'application/json'}:{}),...(auth&&cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(45000)});
 const data=await r.json().catch(()=>({}));
 return {r,data};
}
function record(name, pass, facts={}) { const row={name,pass,...facts};results.push(row);console.log(JSON.stringify(row)); }
function checkPrivacy(name,prompt){
 const text=String(prompt||'');
 const sourceNamesExposed=SOURCE_NAMES.some(name=>text.toLowerCase().includes(name.toLowerCase()));
 const privatePathsExposed=/\b(?:wiki|raw-sources)\/[\w./-]+|\bSKILL\.md\b/i.test(text);
 record(name+' reference privacy',text.length>100&&!sourceNamesExposed&&!privatePathsExposed,{promptLength:text.length,sourceNamesExposed,privatePathsExposed});
}
try {
 if(!vars.PULSIFY_DEMO_CLIENT_EMAIL||!vars.PULSIFY_DEMO_CLIENT_PASSWORD)throw Error('Stored demo credentials missing');
 const login=await req('/api/client-login',{email:vars.PULSIFY_DEMO_CLIENT_EMAIL,password:vars.PULSIFY_DEMO_CLIENT_PASSWORD},false);
 record('demo login',login.r.status===200,{status:login.r.status,client:login.data.client});
 if(login.data.client!=='demo-example')throw Error('Refusing non-demo workspace');
 cookie=login.r.headers.get('set-cookie')?.split(';')[0]||'';
 if(!cookie)throw Error('No session cookie');
 const routes=['/api/workspace-records','/api/studio-sequences','/api/content-reviews','/api/copy-chat','/api/client-integrations','/api/client-brain','/api/workspace-summary'];
 for(const route of routes){const {r,data}=await req(route);record(route,r.status===200&&data.ok!==false,{status:r.status,mode:data.mode,source:data.source,error:data.error});}
 const denied=await req('/api/workspace-records',null,false);record('anonymous records blocked',[401,403].includes(denied.r.status),{status:denied.r.status});
 const own=await req('/api/workspace-records'); const hinted=await req('/api/workspace-records?client=mvp-readiness-other');
 record('client query cannot change workspace',hinted.r.status===403||(hinted.r.status===200&&JSON.stringify(own.data.rows)===JSON.stringify(hinted.data.rows)),{status:hinted.r.status});
 const mode=await req('/api/copy-chat');
 if(process.env.MVP_REVIEW_TEST==='1'){
  // Isolated synthetic project; generated cleanup SQL is constrained to its exact UUID/title.
  const title='QA disposable '+crypto.randomUUID();
  const data={headline:title,hook:'This is a synthetic acceptance test, not client advice.',outline:'Write the rule, record the decision, review the notes.',stage:'build'};
  const made=await req('/api/workspace-records',{kind:'youtube',title,data});
  const id=made.data.id;
  if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('No valid QA record UUID');
  fs.writeFileSync(path.join(out,'cleanup.sql'),`DELETE FROM notifications WHERE client_id='demo-example' AND body='${title}';\nDELETE FROM content_reviews WHERE client_id='demo-example' AND record_id='${id}';\nDELETE FROM content_items WHERE client='demo-example' AND title='${title}';\nDELETE FROM workspace_records WHERE client_id='demo-example' AND id='${id}' AND title='${title}';\n`);
  const reread=await req('/api/workspace-records');
  record('video project saved and reread',made.r.status===201&&reread.data.rows?.some(r=>r.id===id&&r.data.hook===data.hook),{status:made.r.status,id});
  const stale=await req('/api/workspace-records',{id,kind:'youtube',title,data,updated_at:'stale'});
  record('stale video edit rejected',stale.r.status===409,{status:stale.r.status});
  const submit=await req('/api/content-reviews',{action:'submit',record_id:id});
  record('video submitted for review',submit.r.status===200&&submit.data.status==='review',{status:submit.r.status,id:submit.data.id});
  if(submit.data.id){
   const deny=await req('/api/content-reviews',{action:'approve',id:submit.data.id});
   record('client cannot approve own review',[401,403].includes(deny.r.status),{status:deny.r.status});
   if(!vars.FUNNELS_ADMIN_KEY)throw Error('Operator credential missing');
   const approved=await fetch(base+'/api/content-reviews',{method:'POST',headers:{origin:base,'content-type':'application/json','x-admin-key':vars.FUNNELS_ADMIN_KEY},body:JSON.stringify({action:'approve',id:submit.data.id}),signal:AbortSignal.timeout(45000)});
   const approvedData=await approved.json();
   const read=await req('/api/content-reviews');
   record('operator approval visible to client',approved.status===200&&approvedData.status==='approved'&&read.data.rows?.some(r=>r.record_id===id&&r.status==='approved'),{status:approved.status});
  }
 }
 if(mode.data.mode==='manual'){
  const answers=[{id:'problem',question:'What problem do you solve?',answer:'QA example only: help beginners record a consistent trade journal.'},{id:'method',question:'What is the method?',answer:'Write the entry rule before reviewing the outcome.'},{id:'proof',question:'What evidence do you have?',answer:'No client outcome claims. Demonstrate a fictional labelled worksheet.'}];
  const inputs=[['/api/youtube-ideas',{answers}],['/api/youtube-titles',{idea:{idea:'A trade journal walkthrough',working_title:'review your trading rules',why:'Make the process visible',bucket:'pain',funnel:'MOF',format:'camera'},layout:'screen',answers}],['/api/youtube-build',{video:{idea:'A trade journal walkthrough',title:'review your trading rules',thumbnail_text:'journal review',funnel:'MOF',format:'camera'},next_step:'video',answers}]];
  for(const [route,body]of inputs){const {r,data}=await req(route,body);record(route+' manual handoff',r.status===200&&data.mode==='manual'&&data.prompt?.length>100,{status:r.status,mode:data.mode,promptLength:data.prompt?.length});checkPrivacy(route,data.prompt);}
  let chatId;
  try {
   const sent=await req('/api/copy-chat',{action:'send',message:'QA 2026-10-12: draft a clearly fictional trade-journal example. No results claims.',format:'youtube'});chatId=sent.data.chat_id;
   record('copy chat manual prompt',sent.r.status===200&&!!chatId&&!!sent.data.prompt,{status:sent.r.status,chatId,mode:sent.data.mode});
   if(chatId){const pasted=await req('/api/copy-chat',{action:'paste',chat_id:chatId,content:'QA example only. Write the entry rule, record the trade, and compare the decision with the rule.'});const saved=await req('/api/copy-chat?chat='+chatId);record('copy paste persists after reread',pasted.r.status===200&&saved.data.messages?.some(m=>m.role==='assistant'&&m.content.startsWith('QA example only.')),{status:pasted.r.status});}
  } finally {if(chatId){const deleted=await req('/api/copy-chat',{action:'delete',chat_id:chatId});record('QA chat cleanup',deleted.r.status===200,{status:deleted.r.status});}}
  let seqId;
  try{
   const made=await req('/api/studio-generate',{type:'value-driven',topic:'QA 2026-10-12: a fictional journal workflow',goal:'reach',slide_count:3});seqId=made.data.id;
   record('story manual draft created',made.r.status===200&&!!seqId&&made.data.mode==='manual',{status:made.r.status,id:seqId,mode:made.data.mode});
   checkPrivacy('story manual handoff',made.data.manual_prompt);
   if(seqId){const output={title:'QA example only',slides:[{headline:'Write the rule',body:'A fictional journal workflow.'},{headline:'Record the decision',body:'Compare the decision with the rule.'},{headline:'Review your notes',body:'No performance claims.'}]};const saved=await req('/api/studio-sequences',{action:'save-draft',id:seqId,raw_text:JSON.stringify(output)});const reread=await req('/api/studio-sequences');record('story draft persists after reread',saved.r.status===200&&reread.data.rows?.some(s=>s.id===seqId&&s.output.title===output.title),{status:saved.r.status});}
  }finally{if(seqId){const deleted=await req('/api/studio-sequences',{action:'delete',id:seqId});record('QA story cleanup',deleted.r.status===200,{status:deleted.r.status});}}
 }else record('generation skipped to avoid unbudgeted AI spend',true,{mode:mode.data.mode});
}catch(error){record('run error',false,{error:String(error.message)});process.exitCode=1;}
finally{
 if(cookie){const logout=await req('/api/client-logout',{}).catch(()=>null);record('QA session logout',logout?.r.status===200);}
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({time:new Date().toISOString(),base,results},null,2));
 if(results.some(r=>!r.pass))process.exitCode=1;
}
