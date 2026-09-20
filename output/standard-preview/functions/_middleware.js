/**
 * Never serve local tooling state, even if a deploy directory is prepared badly.
 */
import { accessToken, validateAccess, rememberOperator, hasOperator } from './_shared/access.js';
const adminApis = new Set(['dashboard-generate','transcript','activity','assets','campaigns','clients','client-setup-link','client-brain-export','crm-sync','email-compose','followups','generate','health','impersonate','integration-env','integrations','media','operator-overview','operator-bootstrap','payment','settings','contract-status','provision','payment-matches','webhooks','api-keys','checklist','pipeline','voice-note','account','outreach','zernio','notifications','realtime-config','search','workspace-archive']);
const mixedApis = new Set(['spine','integrations','payment-matches','webhooks','api-keys','checklist','pipeline','voice-note','account','outreach','zernio','notifications','realtime-config','search']);
export async function onRequest(context) {
  const { request, next, env } = context;
  const path = new URL(request.url).pathname.toLowerCase();
  const blocked =
    path.startsWith("/.wrangler") ||
    path.startsWith("/.git") ||
    path.startsWith("/.dev.vars") ||
    path.startsWith("/tests/") ||
    path.startsWith("/migrations/");

  if (blocked) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  const url = new URL(request.url), api = path.startsWith('/api/');
  if (/^\/client(?:\.html)?\/?$/.test(path) && ['GET','HEAD'].includes(request.method)) return Response.redirect(url.origin+'/portal',302);
  const legacyView = /^\/(integrations|settings|campaigns)(?:\.html)?\/?$/.exec(path);
  if (legacyView && ['GET','HEAD'].includes(request.method)) return Response.redirect('https://pulsify-ai.com/admin?view='+legacyView[1],302);
  const consolePage = ['/admin','/integrations','/settings','/campaigns'].some(p => path.startsWith(p));
  let operator = await validateAccess(accessToken(request), api ? [env.ACCESS_AUD,env.ACCESS_DASHBOARD_AUD] : env.ACCESS_AUD);
  if (operator && !['GET','HEAD','OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return new Response('Forbidden',{status:403});
  }
  if (!operator && api && hasOperator(request,env)) {
    operator = {email:'automation',via:'key'};
    try {
      await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?, 'admin-key-use', NULL, ?, ?)")
        .bind('automation',JSON.stringify({method:request.method,path:url.pathname}),new Date().toISOString()).run();
    } catch { return new Response('Audit unavailable',{status:503}); }
  }
  // A client session remains tenant-scoped even when the founder also has an
  // Access cookie. Only operator requests opt into the mixed API admin branch.
  if (operator && !consolePage && !adminApis.has(path.split('/')[2]) && !mixedApis.has(path.split('/')[2]) && request.headers.get('x-pulsify-operator') !== '1' && operator.via !== 'key') operator = null;
  if (operator) { context.data.operator = operator; rememberOperator(request,operator); }
  if ((consolePage || (api && adminApis.has(path.split('/')[2]) && !mixedApis.has(path.split('/')[2]))) && !operator) {
    if (url.hostname === 'pulsify-funnels.pages.dev' || url.hostname.endsWith('.pulsify-funnels.pages.dev')) return Response.redirect('https://pulsify-ai.com'+url.pathname+url.search,302);
    if (consolePage && !path.startsWith('/admin')) return Response.redirect('https://pulsify-ai.com/admin?view='+encodeURIComponent(path.split('/')[1]),302);
    return new Response(JSON.stringify({ok:false,error:'operator sign-in required'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }
  const response = await next();
  if (!operator) return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control','no-store');
  headers.delete('access-control-allow-origin');
  return new Response(response.body,{status:response.status,headers});
}
