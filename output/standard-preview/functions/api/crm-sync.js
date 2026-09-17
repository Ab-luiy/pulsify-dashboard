import { withOperator } from '../_shared/access.js';
import {checkAdmin,json} from '../_shared/common.js';
const tables={overrides:'crm_overrides',added:'crm_added',removed:'crm_removed'};
async function handle_onRequestGet({request,env}){
 const denied=checkAdmin(request,env);if(denied)return denied;
 return snapshot(env,0);
}
async function handle_onRequestPost({request,env}){
 const denied=checkAdmin(request,env);if(denied)return denied;
 const raw=await request.text();if(raw.length>5*1024*1024)return json({ok:false,error:'Sync payload too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({ok:false,error:'Invalid JSON'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return json({ok:false,error:'Invalid payload'},422);
 const serverTs=Date.now(),statements=[];
 for(const [kind,table]of Object.entries(tables)){
  const rows=body[kind]||{};if(typeof rows!=='object'||Array.isArray(rows))return json({ok:false,error:'Invalid records'},422);
  for(const [name,value]of Object.entries(rows)){
   if(!name||name.length>300||!value||typeof value!=='object'||Array.isArray(value))return json({ok:false,error:'Invalid record'},422);
   const ts=Number(value._ts)||1;if(!Number.isFinite(ts)||ts<0||ts>serverTs+300000)return json({ok:false,error:'Invalid record timestamp'},422);
   statements.push(env.DB.prepare(`INSERT INTO ${table}(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET data=excluded.data,ts=excluded.ts,sts=excluded.sts,updated_at=excluded.updated_at WHERE excluded.ts > ${table}.ts`).bind(name,JSON.stringify(value),ts,serverTs,new Date(serverTs).toISOString()));
  }
 }
 if(statements.length>3000)return json({ok:false,error:'Too many records'},422);
 for(let start=0;start<statements.length;start+=100)await env.DB.batch(statements.slice(start,start+100));
 return snapshot(env,Math.max(0,Number(body.since)||0));
}
async function snapshot(env,since){
 const serverTs=Date.now(),state={};
 for(const[kind,table]of Object.entries(tables)){
  const result=await env.DB.prepare(`SELECT name,data FROM ${table} WHERE sts>=?`).bind(since).all();
  state[kind]=Object.fromEntries((result.results||[]).map(row=>[row.name,JSON.parse(row.data)]));
 }
 return json({ok:true,state,serverTs});
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
