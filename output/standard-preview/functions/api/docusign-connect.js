import { json, normalizeEmail, sha256Hex, generateOpaqueToken } from '../_shared/common.js';
import { seal, unseal } from '../_shared/secret-box.js';
import { provisionClient, sendWelcome } from '../_shared/provisioning.js';
import { applyEnvelopeStatus, envelopeStatusFromEvent } from '../_shared/contracts.js';

// Sandbox by default; set DOCUSIGN_BASE_URL=https://www.docusign.net for production.
export const docusignBase = (env) => String(env?.DOCUSIGN_BASE_URL || 'https://demo.docusign.net').replace(/\/$/, '');
const encoder = new TextEncoder();
async function authenticated(request, raw, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  for (const [name, value] of request.headers) {
    if (!/^x-docusign-signature-\d+$/i.test(name)) continue;
    try { if (await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(value), c=>c.charCodeAt(0)), raw)) return true; } catch {}
  }
  return false;
}

async function deliver(env, row, origin, signerName = '') {
  if (row.state !== 'pending') return json({ok:true,state:row.state});
  if (Date.parse(row.expires_at) <= Date.now()) {
    await env.DB.prepare("UPDATE contract_provisioning SET state='expired',invitation_cipher=NULL WHERE envelope_id=? AND state='pending'").bind(row.envelope_id).run();
    return json({ok:true,state:'expired',needs_operator:true});
  }
  const link = await unseal(env, row.invitation_cipher, row.envelope_id);
  const existing = await env.DB.prepare('SELECT welcome_state FROM client_provisioning WHERE client_id=?').bind(row.client_id).first().catch(()=>null);
  let welcomeState = existing?.welcome_state || '';
  if (!existing) {
    const provisioned = await provisionClient(env, {
      source:'docusign', client:row.client_id, email:row.email, name:signerName,
      contractRef:row.envelope_id, origin, actor:'docusign', setupLink:link,
    });
    if (!provisioned.ok) return json({ok:false,error:'Workspace created; unified provisioning will retry.'},503);
    welcomeState = provisioned.welcome_state || '';
  } else if (welcomeState !== 'sent') {
    const client = await env.DB.prepare('SELECT client_name FROM client_config WHERE client=?').bind(row.client_id).first().catch(()=>null);
    const welcome = await sendWelcome(env, {clientId:row.client_id,email:row.email,name:client?.client_name||signerName||'Client',setupLink:link});
    welcomeState = welcome.state;
  }
  if (welcomeState !== 'sent') return json({ok:false,error:'Workspace created; welcome delivery will retry.'},503);
  await env.DB.prepare("UPDATE contract_provisioning SET state='delivered',invitation_cipher=NULL,delivered_at=? WHERE envelope_id=? AND state='pending'").bind(new Date().toISOString(),row.envelope_id).run();
  return json({ok:true,state:'delivered'});
}

export async function onRequestPost({request,env}) {
  if (!env.DB || !env.DOCUSIGN_HMAC_SECRET || !env.DOCUSIGN_ACCOUNT_ID || !env.INTEGRATION_ENCRYPTION_KEY || !env.RESEND_API_KEY || !env.EMAIL_FROM) return json({ok:false,error:'Contract onboarding is not configured.'},503);
  if (Number(request.headers.get('content-length')) > 262144) return json({ok:false,error:'Payload too large.'},413);
  const raw = await request.arrayBuffer();
  if (raw.byteLength > 262144) return json({ok:false,error:'Payload too large.'},413);
  if (!await authenticated(request,raw,env.DOCUSIGN_HMAC_SECRET)) return json({ok:false,error:'Invalid signature.'},401);
  let event;try{event=JSON.parse(new TextDecoder().decode(raw));}catch{return json({ok:false,error:'Invalid JSON.'},422);}
  if (!event || typeof event !== 'object' || Array.isArray(event)) return json({ok:false,error:'An event object is required.'},422);
  if (String(event.data?.accountId) !== String(env.DOCUSIGN_ACCOUNT_ID)) return json({ok:false,error:'Account mismatch.'},403);
  // Contract status for the booked pipeline (#80): sent, completed, declined, voided. Never blocks onboarding.
  await applyEnvelopeStatus(env, String(event.data?.envelopeId||''), envelopeStatusFromEvent(event.event)).catch(()=>null);
  if (event.event !== 'envelope-completed') return json({ok:true,ignored:true});
  const summary=event.data?.envelopeSummary,envelope=String(event.data?.envelopeId||'');
  if (!/^[\w-]{8,100}$/.test(envelope) || summary?.status !== 'completed') return json({ok:false,error:'A completed envelope is required.'},422);
  const prior=await env.DB.prepare('SELECT * FROM contract_provisioning WHERE envelope_id=?').bind(envelope).first();
  if(prior)return deliver(env,prior,new URL(request.url).origin);
  // Only envelopes explicitly marked for portal onboarding can provision access.
  const fields=Array.isArray(summary.customFields?.textCustomFields)?summary.customFields.textCustomFields:[];
  if(!fields.some(f=>f?.name==='pulsify_portal'&&f.value==='true'))return json({ok:true,ignored:true});
  const signers=(Array.isArray(summary.recipients?.signers)?summary.recipients.signers:[]).filter(s=>s?.roleName===(env.DOCUSIGN_CLIENT_ROLE||'Client')&&s.status==='completed');
  if(signers.length!==1)return json({ok:false,error:'Exactly one completed Client role signer is required.'},422);
  const signer=signers[0],email=normalizeEmail(signer.email);
  if(!email)return json({ok:false,error:'A valid client signer email is required.'},422);
  const existing=await env.DB.prepare('SELECT client_id FROM client_auth WHERE email=?').bind(email).first();
  const now=new Date().toISOString();
  if(existing){await env.DB.prepare("INSERT OR IGNORE INTO contract_provisioning(envelope_id,account_id,client_id,email,state,created_at) VALUES(?,?,?,?,'existing',?)").bind(envelope,env.DOCUSIGN_ACCOUNT_ID,existing.client_id,email,now).run();return json({ok:true,state:'existing'});}
  const client='client-'+(await sha256Hex(email)).slice(0,24),token=generateOpaqueToken(32),expires=new Date(Date.now()+48*3600000).toISOString();
  const collision=await env.DB.prepare('SELECT client FROM client_config WHERE client=?').bind(client).first();
  if(collision)return json({ok:false,error:'Workspace identity requires operator review.'},409);
  const link=new URL('/portal/register',request.url);link.searchParams.set('client',client);link.searchParams.set('setup',token);
  const cipher=await seal(env,link.href,envelope);
  try{
    await env.DB.batch([
      env.DB.prepare('INSERT INTO client_config(client,client_name,status,updated_at) VALUES(?,?,?,?)').bind(client,String(signer.name||'Client').slice(0,160),'client',now),
      env.DB.prepare('INSERT INTO client_auth(client_id,email,pass_hash,pass_salt,iterations,created_at,updated_at) VALUES(?,?,NULL,NULL,100000,?,?)').bind(client,email,now,now),
      env.DB.prepare('INSERT INTO client_setup_tokens(token_hash,client_id,email,expires_at,created_at) VALUES(?,?,?,?,?)').bind(await sha256Hex(token),client,email,expires,now),
      env.DB.prepare("INSERT INTO contract_provisioning(envelope_id,account_id,client_id,email,state,invitation_cipher,expires_at,created_at) VALUES(?,?,?,?,'pending',?,?,?)").bind(envelope,env.DOCUSIGN_ACCOUNT_ID,client,email,cipher,expires,now)
    ]);
  }catch{
    const raced=await env.DB.prepare('SELECT * FROM contract_provisioning WHERE envelope_id=?').bind(envelope).first();
    if(raced)return deliver(env,raced,new URL(request.url).origin,signer.name);
    return json({ok:false,error:'Provisioning could not complete; retry the event.'},503);
  }
  // The existing encrypted invitation is the setup link used by the unified
  // flow. This produces one valid welcome email and preserves the same link
  // across DocuSign retries.
  return deliver(env,{envelope_id:envelope,client_id:client,email,state:'pending',invitation_cipher:cipher,expires_at:expires},new URL(request.url).origin,signer.name);
}
