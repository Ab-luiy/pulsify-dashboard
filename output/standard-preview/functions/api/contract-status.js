import { withOperator } from '../_shared/access.js';
import {checkAdmin,json} from '../_shared/common.js';
async function handle_onRequestGet({request,env}) {
  const denied=checkAdmin(request,env);if(denied)return denied;
  const required=['DOCUSIGN_ACCOUNT_ID','DOCUSIGN_HMAC_SECRET','INTEGRATION_ENCRYPTION_KEY','RESEND_API_KEY','EMAIL_FROM'];
  const missing=required.filter(name=>!env[name]);
  const rows=await env.DB.prepare('SELECT envelope_id,client_id,state,created_at,delivered_at FROM contract_provisioning ORDER BY created_at DESC LIMIT 30').all();
  return json({ok:true,configured:missing.length===0,missing,webhook:new URL('/api/docusign-connect',request.url).href,role:env.DOCUSIGN_CLIENT_ROLE||'Client',rows:rows.results});
}

export const onRequestGet = withOperator(handle_onRequestGet);
