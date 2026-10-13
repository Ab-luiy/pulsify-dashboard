import { json } from '../_shared/common.js';
import { resolveClientAccess } from '../_shared/client-auth.js';
// 'idea' = a captured reel thought (pulsify-saas overnight fix 2026-09-25; it used to live only in the browser tab).
const kinds = new Set(['youtube','lead','copy','reference','idea']);
export async function onRequestGet({request,env}) {
 const access=await resolveClientAccess(request,env,{allowHeaderToken:true,allowImpersonated:true});
 if(access.error)return access.error;
 const rows=await env.DB.prepare('SELECT * FROM workspace_records WHERE client_id=? ORDER BY updated_at DESC').bind(access.client).all();
 return json({ok:true,rows:(rows.results||[]).map(row=>({...row,data:JSON.parse(row.data_json),data_json:undefined}))});
}
export async function onRequestPost({request,env}) {
 const access=await resolveClientAccess(request,env,{allowHeaderToken:true});
 if(access.error)return access.error;
 const raw=await request.text();
 if(raw.length>100000)return json({ok:false,error:'Keep each record under 100 KB.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({ok:false,error:'Invalid record.'},400);}
 if(!body||typeof body!=='object')return json({ok:false,error:'Invalid record.'},422);
 if(!kinds.has(body.kind)||!String(body.title||'').trim()||!body.data||typeof body.data!=='object'||Array.isArray(body.data))return json({ok:false,error:'A kind, title and data object are required.'},422);
 const id=body.id?String(body.id):crypto.randomUUID();
 const now=new Date().toISOString();
 if(body.id){
  const row=await env.DB.prepare('SELECT client_id,kind,updated_at FROM workspace_records WHERE id=?').bind(id).first();
  if(!row||row.client_id!==access.client)return json({ok:false,error:'Record not found.'},404);
  if(row.kind!==body.kind)return json({ok:false,error:'Record type cannot change.'},422);
  if(body.updated_at!==row.updated_at)return json({ok:false,error:'This record changed elsewhere. Refresh before editing.'},409);
  const result=await env.DB.prepare('UPDATE workspace_records SET title=?,data_json=?,updated_at=? WHERE id=? AND client_id=? AND updated_at=?').bind(String(body.title).trim().slice(0,250),JSON.stringify(body.data),now,id,access.client,body.updated_at).run();
  if(!result.meta?.changes)return json({ok:false,error:'This record changed elsewhere. Refresh before editing.'},409);
 }else await env.DB.prepare('INSERT INTO workspace_records(id,client_id,kind,title,data_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id,access.client,body.kind,String(body.title).trim().slice(0,250),JSON.stringify(body.data),now,now).run();
 return json({ok:true,id,updated_at:now},body.id?200:201);
}
// Delete one saved record (founder 2026-10-13: "you can't even delete that shit"). Only the owner's own rows.
export async function onRequestDelete({request,env}) {
 const access=await resolveClientAccess(request,env,{allowHeaderToken:true});
 if(access.error)return access.error;
 if(access.impersonated)return json({ok:false,error:'Operator preview is read-only.'},403);
 const id=String(new URL(request.url).searchParams.get('id')||'');
 if(!id)return json({ok:false,error:'Which record?'},422);
 const result=await env.DB.prepare('DELETE FROM workspace_records WHERE id=? AND client_id=?').bind(id,access.client).run();
 if(!result.meta?.changes)return json({ok:false,error:'Record not found.'},404);
 return json({ok:true});
}
