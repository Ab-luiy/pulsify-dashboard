import { json } from '../_shared/common.js';
import { resolveClientAccess } from '../_shared/client-auth.js';
const validKey=key=>/^(launch-checklist|kpi-layout:[a-z0-9:_-]+)$/.test(key);
export async function onRequestGet({request,env}){
 const access=await resolveClientAccess(request,env,{allowHeaderToken:true,allowImpersonated:true});
 if(access.error)return access.error;
 const key=new URL(request.url).searchParams.get('key')||'launch-checklist';
 if(!validKey(key))return json({ok:false,error:'Invalid preference key'},422);
 const row=await env.DB.prepare('SELECT value_json FROM workspace_preferences WHERE client_id=? AND key=?').bind(access.client,key).first();
 return json({ok:true,value:row?JSON.parse(row.value_json):null});
}
export async function onRequestPut({request,env}){
 const access=await resolveClientAccess(request,env,{allowHeaderToken:true});
 if(access.error)return access.error;
 const raw=await request.text();if(raw.length>16000)return json({ok:false,error:'Preferences too large'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({ok:false,error:'Invalid JSON'},400);}
 if(!validKey(body?.key)||!body.value||typeof body.value!=='object'||Array.isArray(body.value))return json({ok:false,error:'Invalid preference'},422);
 await env.DB.prepare('INSERT INTO workspace_preferences(client_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(client_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at').bind(access.client,body.key,JSON.stringify(body.value),new Date().toISOString()).run();
 return json({ok:true});
}
