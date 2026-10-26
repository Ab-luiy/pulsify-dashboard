/**
 * Never serve local tooling state, even if a deploy directory is prepared badly.
 */
import * as Sentry from '@sentry/cloudflare';
import { accessToken, validateAccess, rememberOperator, hasOperator } from './_shared/access.js';
import { resolveOperatorSession } from './_shared/operator-session.js';
import { resolveClientAccess } from './_shared/client-auth.js';
import { handleLinkHostRequest } from './_shared/link-domains.js';

// The Pages SDK runs before the access gate so route exceptions are captured.
// Keep telemetry limited to exception type and code location: client data,
// request URLs, headers, cookies, messages, and local variables stay out.
export const onRequest = [
  Sentry.sentryPagesPlugin(({ env }) => ({
    dsn: env.SENTRY_DSN || 'https://4a337e96f046d06f3b1694535af48a50@o4512140396724224.ingest.de.sentry.io/4512140568821840',
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      delete event.extra;
      delete event.contexts;
      event.tags = { service: 'pulsify-pages' };
      if (event.message) event.message = 'Unhandled Cloudflare Pages exception';
      for (const value of event.exception?.values || []) {
        value.value = 'Unhandled Cloudflare Pages exception';
        for (const frame of value.stacktrace?.frames || []) delete frame.vars;
      }
      return event;
    },
  })),
  pulsifyMiddleware,
];
const adminApis = new Set(['dashboard-generate','operator-drafts','studio-feedback','transcript','activity','assets','campaigns','clients','client-setup-link','client-brain-export','crm-sync','email-compose','followups','generate','health','impersonate','integration-env','integrations','media','operator-photos','operator-overview','operator-bootstrap','payment','settings','contract-status','provision','payment-matches','webhooks','api-keys','checklist','pipeline','voice-note','account','outreach','outreach-queue','zernio','notifications','realtime-config','search','workspace-archive','access-requests','contracts','workflows','jane-learnings']);
const mixedApis = new Set(['workflows','spine','integrations','payment-matches','webhooks','api-keys','checklist','pipeline','voice-note','account','outreach','outreach-queue','zernio','notifications','realtime-config','search']);
export async function pulsifyMiddleware(context) {
  const { request, next, env } = context;
  // A client's own link domain (go.clientname.com) answers tracked links and nothing else (#73).
  const linkHost = await handleLinkHostRequest(context);
  if (linkHost) return linkHost;
  const path = new URL(request.url).pathname.toLowerCase();
  // Any dot-segment (build caches, tool state), internal notes, configs and
  // source-only folders. The deploy dir is the repo folder, so fail closed here.
  const blocked =
    /\/\.(?!well-known\/)/.test(path) ||
    /^\/(tests|migrations|workers|scripts|tools)(\/|$)/.test(path) ||
    /\.(md|toml|py|cjs|mjs|sql|sh|log)$/.test(path) ||
    path === '/package.json' || path === '/package-lock.json' ||
    path.startsWith('/node_modules/') || path.startsWith('/_worker.bundle/') ||
    path === "/.assetsignore";

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
  // The public homepage is a Next export under /app (pulsify-saas #38). App code
  // stays private, so only the files the build lists in /app/homepage-assets.json
  // are open to visitors. The page itself lives at the apex.
  if (['GET','HEAD'].includes(request.method) && path.startsWith('/app/') && (await homepageAssets(env, url)).has(path)) {
    if (path === '/app/homepage' || path === '/app/homepage.html') return Response.redirect(url.origin + '/', 302);
    return next();
  }
  if (/^\/(?:client(?:\.html)?|portal\.html)\/?$/.test(path) &&['GET','HEAD'].includes(request.method)) return Response.redirect(url.origin+'/portal',302);
  const legacyView = /^\/(integrations|settings|campaigns)(?:\.html)?\/?$/.exec(path);
  if (legacyView && ['GET','HEAD'].includes(request.method)) return Response.redirect('https://pulsify-ai.com/app/'+legacyView[1],302);
  // The old combined sign-in's operator mode now has its own branded page.
  if (path === '/portal/login' && url.searchParams.get('operator') === '1' && ['GET','HEAD'].includes(request.method)) {
    return Response.redirect(url.origin + (url.searchParams.get('logout') === '1' ? '/api/operator-logout' : '/login/operator'), 302);
  }
  // The client portal (/app/portal) authenticates clients in functions/app/portal/[[path]].js,
  // and hashed build assets under /app/_next/static are shared by both surfaces.
  const clientSurface = /^\/app\/portal(\/|$)/.test(path) || path.startsWith('/app/_next/static/');
  const appPage = (path === '/app' || path.startsWith('/app/')) && !clientSurface;
  const consolePage = appPage || ['/admin','/integrations','/settings','/campaigns'].some(p => path.startsWith(p));
  // Operators sign in through PropelAuth (functions/_shared/operator-session.js).
  // A Cloudflare Access token is still honoured for the ops dashboard and API keys.
  let operator = await validateAccess(accessToken(request), api ? [env.ACCESS_AUD,env.ACCESS_DASHBOARD_AUD] : env.ACCESS_AUD);
  if (!operator) operator = await resolveOperatorSession(request, env);
  // App code is only served to someone signed in: the Next.js build and the
  // remaining shared scripts. Everyone else gets a plain 404, so the code
  // cannot be downloaded from the public site.
  if (privateAsset(path) && !operator) {
    const client = await resolveClientAccess(request, env, { allowHeaderToken: false, allowQueryToken: false, allowImpersonated: true, clientHint: '' });
    if (client.error || operatorOnlyAsset(path)) return notFound();
  }
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
  // Cutover 2026-09-24: the operator console is the Next.js app at /app. The
  // legacy console page (and any old /admin?view=<id> link in emails, alerts or
  // bookmarks) forwards to the matching new page. Legacy assets stay reachable.
  if (operator && operator.via !== 'key' && ['GET','HEAD'].includes(request.method) && /^\/admin(?:\.html)?\/?$/.test(path)) {
    return Response.redirect(url.origin + appPathForView(url.searchParams.get('view') || ''), 302);
  }
  if ((consolePage || (api && adminApis.has(path.split('/')[2]) && !mixedApis.has(path.split('/')[2]))) && !operator) {
    if (url.hostname === 'pulsify-funnels.pages.dev' || url.hostname.endsWith('.pulsify-funnels.pages.dev')) return Response.redirect('https://pulsify-ai.com'+url.pathname+url.search,302);
    // Signed-out operators land on the branded sign-in, never a third-party screen.
    if (appPage && ['GET','HEAD'].includes(request.method)) return Response.redirect(operatorLogin(url.pathname + url.search),302);
    if (consolePage && ['GET','HEAD'].includes(request.method)) {
      const target = path.startsWith('/admin') ? appPathForView(url.searchParams.get('view') || '') : appPathForView(path.split('/')[1]);
      return Response.redirect(operatorLogin(target),302);
    }
    return new Response(JSON.stringify({ok:false,error:'operator sign-in required'}),{status:401,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }
  const response = await next();
  if (!operator) return response;
  const headers = new Headers(response.headers);
  headers.set('cache-control','no-store');
  headers.delete('access-control-allow-origin');
  return new Response(response.body,{status:response.status,headers});
}

const VIEW_ROUTES = {
  overview:'/app/', home:'/app/clients', clients:'/app/clients', leads:'/app/leads', queue:'/app/today', today:'/app/today',
  search:'/app/search', outreach:'/app/outreach', crm:'/app/crm', instagram:'/app/instagram', youtube:'/app/youtube', metrics:'/app/youtube',
  content:'/app/content', delivery:'/app/delivery', brain:'/app/brain', campaigns:'/app/campaigns', email:'/app/email',
  integrations:'/app/integrations', payments:'/app/payments', settings:'/app/settings', dashboard:'/app/dashboard',
  live:'/app/dashboard?tab=live', plan:'/app/dashboard?tab=plan', income:'/app/dashboard?tab=income', payouts:'/app/dashboard?tab=payouts',
  cashflow:'/app/dashboard?tab=cashflow', calendar:'/app/dashboard?tab=calendar', sales:'/app/dashboard?tab=sales',
};
export function appPathForView(view) {
  return VIEW_ROUTES[String(view).split(':')[0].toLowerCase()] || '/app/';
}

function operatorLogin(next) {
  const login = new URL('/login/operator', 'https://pulsify-ai.com');
  if (next && next !== '/app/' && next !== '/app') login.searchParams.set('next', next);
  return login.toString();
}

let homepageAssetSet = null;
export async function homepageAssets(env, url) {
  if (homepageAssetSet) return homepageAssetSet;
  try {
    const res = await env.ASSETS.fetch(new URL('/app/homepage-assets.json', url));
    if (!res.ok) return new Set();
    homepageAssetSet = new Set((await res.json()).map((p) => String(p).toLowerCase()));
    return homepageAssetSet;
  } catch {
    return new Set();
  }
}

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

// Scripts public pages load (client landing pages from templates/).
// These stay downloadable by anyone or every prospect's page breaks.
export const PUBLIC_SCRIPTS = new Set(['/js/funnel-integrations.js']);

// Script and data files that only signed-in people may download.
export function privateAsset(path) {
  if (PUBLIC_SCRIPTS.has(path)) return false;
  if (path.startsWith('/app/_next/static/')) return true;
  if (/^\/portal\/(login|register|references)(\/|$)/.test(path)) return false;
  if (/^\/portal\/[^/]+\.(js|json)$/.test(path)) return true;
  if (/^\/shared\/[^/]+\.js$/.test(path)) return path !== '/shared/theme.js';
  if (/^\/onboard\/[^/]+\.js$/.test(path)) return true;
  return path.startsWith('/js/') || path.startsWith('/admin/');
}

// Of those, the ones that belong to the operator console only.
export function operatorOnlyAsset(path) {
  return path.startsWith('/js/') || path.startsWith('/admin/');
}
