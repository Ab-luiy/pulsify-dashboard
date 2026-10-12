import { withOperator } from '../../_shared/access.js';
import { resolveSpineRead } from '../../_shared/spine-auth.js';
import { parseJson, sha256Hex } from '../../_shared/common.js';

// Fetch only provider URLs already stored in our own snapshot, never a
// caller-supplied URL. Keep a durable copy before Instagram's CDN URL expires.
// ?scope=client serves a signed-in client their own connected Instagram (client-connect.js),
// read only from that client's snapshots and stored under their own key.
export function allowedImageUrl(value) {
  try { const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password && !u.port && /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(u.hostname); } catch { return false; }
}
async function get({request,env}) {
  const url=new URL(request.url);
  const clientScope=url.searchParams.get('scope')==='client';
  const access=await resolveSpineRead(request,env,clientScope?'client':'operator',clientScope?(url.searchParams.get('client')||''):'');
  if(access.error)return access.error;
  const id=url.searchParams.get('id');
  if(!id||id.length>250)return new Response('Not found',{status:404});
  if(id.startsWith('pfp:')){if(access.scope!=='operator')return new Response('Not found',{status:404});return prospectPicture(env,id.slice(4));}
  const owner=access.scope==='client'?access.client:'';
  const key=(owner?`instagram-previews/client/${owner}/`:'instagram-previews/')+await sha256Hex(id);
  const stored=await env.MEDIA?.get(key);
  if(stored)return new Response(stored.body,{headers:{'content-type':stored.httpMetadata?.contentType||'image/jpeg','cache-control':'private, max-age=3600'}});
  const rows=(await env.DB.prepare("SELECT kind,payload_json FROM snapshots WHERE scope=? AND client_id=? AND source='instagram'").bind(access.scope,owner).all()).results||[];
  let uri='';
  for(const row of rows){const p=parseJson(row.payload_json,{});if(id==='profile'&&row.kind==='profile')uri=p.profilePicture||p.profile_picture_url||'';
    if(Array.isArray(p)){const item=p.find(x=>String(x.id||x.permalink)===id);if(item)uri=item.thumbnail_url||item.thumbnailUrl||item.thumbnail||(item.media_type!=='VIDEO'?item.media_url:'')||uri;}}
  if(!allowedImageUrl(uri))return new Response('Preview unavailable',{status:404});
  let response;
  try{response=await fetch(uri,{redirect:'manual',signal:AbortSignal.timeout(8000)});}catch{return new Response('Preview unavailable',{status:502});}
  const type=response.headers.get('content-type')||'';
  if(!response.ok||!/^image\/(jpeg|png|webp)(;|$)/i.test(type)||Number(response.headers.get('content-length')||0)>4*1024*1024)return new Response('Preview unavailable',{status:404});
  const bytes=await response.arrayBuffer();if(bytes.byteLength>4*1024*1024)return new Response('Preview too large',{status:413});
  await env.MEDIA?.put(key,bytes,{httpMetadata:{contentType:type}});
  return new Response(bytes,{headers:{'content-type':type,'cache-control':'private, max-age=3600'}});
}
// A prospect's profile picture. The URL comes from our own ig_outreach row
// (refreshed by the inbox sync), never from the caller. The last good copy is
// kept in R2 so the avatar survives Instagram expiring its CDN link.
async function prospectPicture(env,conversationId){
  if(!/^[\w:.-]{1,120}$/.test(conversationId))return new Response('Not found',{status:404});
  const key='instagram-pfp/'+await sha256Hex(conversationId);
  const row=await env.DB.prepare('SELECT pfp_url FROM ig_outreach WHERE conversation_id=?').bind(conversationId).first().catch(()=>null);
  const uri=row?.pfp_url||'';
  const stored=await env.MEDIA?.get(key);
  const serve=(body,type)=>new Response(body,{headers:{'content-type':type||'image/jpeg','cache-control':'private, max-age=86400'}});
  if(stored&&stored.customMetadata?.src===uri)return serve(stored.body,stored.httpMetadata?.contentType);
  if(allowedImageUrl(uri)){
    try{
      const response=await fetch(uri,{redirect:'manual',signal:AbortSignal.timeout(8000)});
      const type=response.headers.get('content-type')||'';
      if(response.ok&&/^image\/(jpeg|png|webp)(;|$)/i.test(type)){
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength<=2*1024*1024){await env.MEDIA?.put(key,bytes,{httpMetadata:{contentType:type},customMetadata:{src:uri}});return serve(bytes,type);}
      }
    }catch{}
  }
  if(stored)return serve(stored.body,stored.httpMetadata?.contentType);
  return new Response('Picture unavailable',{status:404});
}
export const onRequestGet=withOperator(get);
