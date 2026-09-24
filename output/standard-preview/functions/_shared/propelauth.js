import { cleanId, constantTimeEqual, generateOpaqueToken } from './common.js';
import { issueClientSession, parseCookies } from './client-auth.js';
import { isOperatorEmail, issueOperatorSession } from './operator-session.js';

const FLOW_COOKIE = '__Host-pulsify_propelauth_flow';
const FLOW_SECONDS = 600;
const SESSION_SECONDS = 12 * 60 * 60;

export function propelConfig(env) {
  if (env.PROPELAUTH_ENABLED !== '1') return null;
  try {
    const auth = new URL(env.PROPELAUTH_AUTH_URL);
    const callback = new URL(env.PROPELAUTH_CALLBACK_URL);
    if (auth.protocol !== 'https:' || callback.protocol !== 'https:' ||
        auth.username || auth.password || auth.search || auth.hash ||
        callback.pathname !== '/api/propelauth/callback' || callback.search || callback.hash ||
        !env.PROPELAUTH_CLIENT_ID) return null;
    return {authOrigin:auth.origin, clientId:env.PROPELAUTH_CLIENT_ID, callback:callback.toString()};
  } catch { return null; }
}

export function flowCookie(value, maxAge = FLOW_SECONDS) {
  return `${FLOW_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// Where a finished sign-in may land. Clients: their portal or onboarding.
// Operators: the console under /app (never the client portal). Anything else,
// including absolute or protocol-relative URLs, falls back to the default.
function safeDestination(raw, audience = 'client') {
  const fallback = audience === 'operator' ? '/app/' : '/app/portal';
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  try {
    const value = new URL(raw, 'https://pulsify-ai.com');
    if (value.origin !== 'https://pulsify-ai.com') return fallback;
    const path = value.pathname;
    if (audience === 'operator') {
      if (!/^\/app(\/|$)/.test(path) || /^\/app\/portal(\/|$)/.test(path)) return fallback;
    } else if (!/^\/(portal|onboard|app\/portal)(\/|$)/.test(path) || /^\/portal\/(login|register)(\/|$)/.test(path)) {
      return fallback;
    }
    return path + value.search;
  } catch { return fallback; }
}

const loginPage = audience => audience === 'operator' ? '/login/operator' : '/login/client';

function callbackError(kind, audience = 'client') {
  const destination = new URL(loginPage(audience), 'https://pulsify-ai.com');
  destination.searchParams.set('auth_error',kind);
  return new Response(null,{status:302,headers:{location:destination.toString(),'set-cookie':flowCookie('',0),'cache-control':'no-store'}});
}

export async function startPropelAuth({request,env}) {
  const config = propelConfig(env);
  if (!config || new URL(request.url).origin !== new URL(config.callback).origin) return new Response('Sign-in is not configured',{status:503,headers:{'cache-control':'no-store'}});
  const url = new URL(request.url);
  const audience = url.searchParams.get('as') === 'operator' ? 'operator' : 'client';
  const hint = audience === 'operator' ? '' : url.searchParams.get('client') || '';
  if (hint && (!/^[a-z0-9_-]{1,64}$/.test(hint) || cleanId(hint) !== hint)) return new Response('Invalid workspace',{status:400});
  const state = generateOpaqueToken(24);
  const verifier = generateOpaqueToken(48);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const flow = encodeURIComponent(JSON.stringify({state,verifier,as:audience,client:hint,next:safeDestination(url.searchParams.get('next'),audience),at:Date.now()}));
  const authorize = new URL('/propelauth/oauth/authorize',config.authOrigin);
  authorize.searchParams.set('redirect_uri',config.callback);
  authorize.searchParams.set('client_id',config.clientId);
  authorize.searchParams.set('response_type','code');
  authorize.searchParams.set('state',state);
  authorize.searchParams.set('code_challenge',challenge);
  authorize.searchParams.set('code_challenge_method','S256');
  return new Response(null,{status:302,headers:{location:authorize.toString(),'set-cookie':flowCookie(flow),'cache-control':'no-store'}});
}

export async function finishPropelAuth({request,env},{fetcher=fetch}={}) {
  const config = propelConfig(env);
  if (!config || new URL(request.url).origin !== new URL(config.callback).origin) return callbackError('unavailable');
  const url = new URL(request.url);
  const raw = parseCookies(request.headers.get('cookie')).get(FLOW_COOKIE);
  let flow;
  try { flow = JSON.parse(decodeURIComponent(raw || '')); } catch { return callbackError('expired'); }
  const audience = flow?.as === 'operator' ? 'operator' : 'client';
  const fail = kind => callbackError(kind, audience);
  if (!flow || !constantTimeEqual(String(flow.state || ''),url.searchParams.get('state') || '') ||
      !/^[A-Za-z0-9_-]{40,100}$/.test(flow.verifier || '') ||
      !Number.isFinite(flow.at) || Date.now()-flow.at > FLOW_SECONDS*1000 || flow.at > Date.now()+30000 ||
      !url.searchParams.get('code')) return fail('expired');
  try {
    const tokenResponse = await fetcher(new URL('/propelauth/oauth/token',config.authOrigin),{
      method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:config.clientId,code:url.searchParams.get('code'),redirect_uri:config.callback,grant_type:'authorization_code',code_verifier:flow.verifier}),
    });
    if (!tokenResponse.ok) return fail('failed');
    const tokens = await tokenResponse.json();
    if (typeof tokens.access_token !== 'string' || !tokens.access_token) return fail('failed');
    const infoResponse = await fetcher(new URL('/propelauth/oauth/userinfo',config.authOrigin),{
      headers:{authorization:`Bearer ${tokens.access_token}`},
    });
    if (!infoResponse.ok) return fail('failed');
    const user = await infoResponse.json();
    if (!user || typeof user.user_id !== 'string' || !user.email_confirmed || user.enabled !== true || user.locked) return fail('unlinked');
    if (audience === 'operator') {
      // Only founder-approved addresses become operators; everyone else is refused.
      if (!isOperatorEmail(env,user.email)) return fail('not_operator');
      const session = await issueOperatorSession(env,{email:user.email,providerUserId:user.user_id});
      try {
        await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?, 'operator-sign-in', NULL, ?, ?)")
          .bind(String(user.email).toLowerCase(),JSON.stringify({via:'propelauth'}),new Date().toISOString()).run();
      } catch { /* audit is best effort; the session is already bound to an approved email */ }
      const headers = new Headers({location:new URL(safeDestination(flow.next,'operator'),new URL(config.callback).origin).toString(),'cache-control':'no-store'});
      headers.append('set-cookie',flowCookie('',0));
      headers.append('set-cookie',session.cookie);
      return new Response(null,{status:302,headers});
    }
    const rows = await env.DB.prepare(
      `SELECT p.client_id,p.provider_org_id,c.status
         FROM client_provider_identities p JOIN client_config c ON c.client=p.client_id
        WHERE p.provider='propelauth' AND p.provider_user_id=?`,
    ).bind(user.user_id).all();
    const eligible = (rows.results || []).filter(row => row.status !== 'archived' &&
      user.org_id_to_org_info && Object.prototype.hasOwnProperty.call(user.org_id_to_org_info,row.provider_org_id) &&
      (!flow.client || flow.client === row.client_id));
    if (eligible.length !== 1) return fail('unlinked');
    const session = await issueClientSession(env,eligible[0].client_id,{ttlSeconds:SESSION_SECONDS});
    const destination = new URL(safeDestination(flow.next,'client'),new URL(config.callback).origin);
    destination.searchParams.set('client',eligible[0].client_id);
    const headers = new Headers({location:destination.toString(),'cache-control':'no-store'});
    headers.append('set-cookie',flowCookie('',0));
    headers.append('set-cookie',session.cookie);
    return new Response(null,{status:302,headers});
  } catch { return fail('failed'); }
}
