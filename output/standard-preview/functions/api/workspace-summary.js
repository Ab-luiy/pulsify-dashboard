import {json} from '../_shared/common.js';
import {resolveClientAccess} from '../_shared/client-auth.js';
export async function onRequestGet({request,env}) {
 const access=await resolveClientAccess(request,env,{allowHeaderToken:true,allowImpersonated:true});
 if(access.error)return access.error;
 const tables={stories:['studio_sequences','client_id'],carousels:['studio_carousels','client_id'],sequences:['sequence_log','client_id'],images:['proof_items','client_id'],payments:['payments','client']};
 const counts={};
 await Promise.all(Object.entries(tables).map(async([key,[table,column]])=>{
  const row=await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE ${column}=?`).bind(access.client).first();
  counts[key]=Number(row?.total||0);
 }));
 const grouped=await env.DB.prepare('SELECT kind,COUNT(*) AS total FROM workspace_records WHERE client_id=? GROUP BY kind').bind(access.client).all();
 for(const kind of ['youtube','copy','lead','reference'])counts[kind]=Number(grouped.results?.find(r=>r.kind===kind)?.total||0);
 return json({ok:true,counts});
}
