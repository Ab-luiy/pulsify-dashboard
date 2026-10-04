import { withOperator } from '../_shared/access.js';
import { json, parseJson } from '../_shared/common.js';
import { resolveReportClient,resolveReportWriter } from '../_shared/client-read.js';
import { parseModelJson } from '../_shared/anthropic.js';
import { eligibleOutcome, outcomeSignature, queueSalesFollowup,salesDraftsForCall,sanitizeFollowup } from '../_shared/sales-followup.js';

async function handleGet({request,env}) {
  const access=await resolveReportClient(request,env); if(access.error) return access.error;
  const ref=new URL(request.url).searchParams.get('booking_ref') || '';
  const drafts=await salesDraftsForCall(env,access.client,ref.slice(0,300));
  return drafts ? json({ok:true,drafts}) : json({ok:false,error:'Call not found.'},404);
}
async function handlePost({request,env}) {
  const body=await request.json().catch(()=>null);
  if(!body || typeof body !== 'object') return json({ok:false,error:'Invalid draft.'},400);
  const access=await resolveReportWriter(request,env,body.client); if(access.error) return access.error;
  if(body.action === 'retry') {
    const o=await env.DB.prepare('SELECT id FROM lead_outcomes WHERE id=? AND client_id=?').bind(Number(body.outcome_id),access.client).first();
    if(!o) return json({ok:false,error:'Call not found.'},404);
    await queueSalesFollowup(env,access.client,o.id);
    return json({ok:true});
  }
  const row=await env.DB.prepare("SELECT * FROM content_reviews WHERE id=? AND client_id=? AND format='sales_followup'").bind(Number(body.id),access.client).first();
  if(!row) return json({ok:false,error:'Draft not found.'},404);
  if(!['draft','rejected'].includes(row.status)) return json({ok:false,error:'This draft is already in review or has been replaced.'},409);
  const snapshot=parseJson(row.snapshot_json,{});
  const outcome=await env.DB.prepare('SELECT * FROM lead_outcomes WHERE id=? AND client_id=?').bind(snapshot.outcome_id,access.client).first();
  if(!eligibleOutcome(outcome) || await outcomeSignature(outcome) !== snapshot.signature) return json({ok:false,error:'This call changed. Refresh its draft.'},409);
  let draft;
  try { draft=sanitizeFollowup(typeof body.answer === 'string' ? parseModelJson(body.answer.slice(0,16000)) : body); }
  catch(error) { return json({ok:false,error:error.message},422); }
  const result=await env.DB.prepare("UPDATE content_reviews SET snapshot_json=?,status='review',submitted_at=?,review_note=NULL,decided_at=NULL WHERE id=? AND client_id=? AND status IN ('draft','rejected')").bind(JSON.stringify({...snapshot,...draft,mode:'manual'}),new Date().toISOString(),row.id,access.client).run();
  return result.meta?.changes ? json({ok:true,status:'review'}) : json({ok:false,error:'This draft changed. Refresh first.'},409);
}
export const onRequestGet=withOperator(handleGet);
export const onRequestPost=withOperator(handlePost);
