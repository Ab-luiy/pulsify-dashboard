import { withOperator } from '../_shared/access.js';
import {checkAdmin,json} from '../_shared/common.js';
import {operatorIdentity} from '../_shared/access.js';
import {onRequestGet as overview} from './operator-overview.js';
import {onRequestGet as clients} from './clients.js';
async function handle_onRequestGet(context){
 const denied=checkAdmin(context.request,context.env);if(denied)return denied;
 const [a,b,spine]=await Promise.all([overview(context),clients(context),loadSpine(context.env)]);
 if(!a.ok||!b.ok)return json({ok:false,error:'Workspace data unavailable'},503);
 const params=new URL(context.request.url).searchParams,from=params.get('from'),to=params.get('to');
 let selected=null;
 if(from||to){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||from>to)return json({ok:false,error:'Invalid date range'},422);
  const result=await context.env.DB.prepare('SELECT currency, SUM(amount_cents) AS amount_cents FROM payments WHERE substr(occurred_at,1,10)>=? AND substr(occurred_at,1,10)<=? GROUP BY currency').bind(from,to).all();
  selected={from,to,collected_by_currency:Object.fromEntries((result.results||[]).map(r=>[r.currency||'unknown',Number(r.amount_cents||0)]))};
 }
 return json({ok:true,operator:operatorIdentity(context.request),overview:await a.json(),clients:(await b.json()).clients,selected,spine,version:2});
}

async function loadSpine(env){
 try{
  const result=await env.DB.prepare("SELECT source,kind,captured_at,payload_json FROM snapshots WHERE scope='operator' AND client_id='' ORDER BY source,kind").all();
  return Object.fromEntries((result.results||[]).map(row=>[`${row.source}:${row.kind}`,{captured_at:row.captured_at,payload:JSON.parse(row.payload_json)}]));
 }catch{return{};}
}

export const onRequestGet = withOperator(handle_onRequestGet);
