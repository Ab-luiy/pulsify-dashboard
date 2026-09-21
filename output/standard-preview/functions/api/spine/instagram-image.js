import { withOperator } from '../../_shared/access.js';
import { resolveSpineRead } from '../../_shared/spine-auth.js';
import { parseJson, sha256Hex } from '../../_shared/common.js';

// Fetch only provider URLs already stored in our operator snapshot, never a
// caller-supplied URL. Keep a durable copy before Instagram's CDN URL expires.
export function allowedImageUrl(value) {
  try { const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password && !u.port && /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(u.hostname); } catch { return false; }
}
async function get({request,env}) {
  const access=await resolveSpineRead(request,env,'operator','');
  if(access.error)return access.error;
  const id=new URL(request.url).searchParams.get('id');
  if(!id||id.length>250)return new Response('Not found',{status:404});
  const key='instagram-previews/'+await sha256Hex(id);
  const stored=await env.MEDIA?.get(key);
  if(stored)return new Response(stored.body,{headers:{'content-type':stored.httpMetadata?.contentType||'image/jpeg','cache-control':'private, max-age=3600'}});
  const rows=(await env.DB.prepare("SELECT kind,payload_json FROM snapshots WHERE scope='operator' AND client_id='' AND source='instagram'").all()).results||[];
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
export const onRequestGet=withOperator(get);
