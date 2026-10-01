// "Continue with Google" for both sides of the sign-in page, straight to Google (OpenID Connect).
//   GET /api/google/start?as=client|operator&next=...   -> Google's account picker
//   GET /api/google/callback                            -> session, or back to sign-in with a reason
//   GET /api/google/config                              -> {enabled}, so the button only shows when set up
//
// Who gets in is decided here by the Google-verified email, the same lists the password forms use:
//   Team:   the email is an owner (OPERATOR_EMAILS) or an operator added from the console.
//   Client: the email is the login email of an approved workspace (client_auth), not archived.
//   Anyone else on the client side files an access request with their Google name and email,
//   so asking for an account is one click; nothing is created until an operator approves it.
//
// Set up (founder): a Google Cloud OAuth client (Web), redirect URI
// https://pulsify-ai.com/api/google/callback, then the GOOGLE_CLIENT_ID var and the
// GOOGLE_CLIENT_SECRET secret on the Pages project. Without both, the button stays hidden.
import { constantTimeEqual, generateOpaqueToken, normalizeEmail, sha256Hex, str } from './common.js';
import { issueClientSession, parseCookies } from './client-auth.js';
import { isOperatorEmailDb, issueOperatorSession } from './operator-session.js';
import { safeDestination } from './propelauth.js';
import { createRequest } from './access-requests.js';

const FLOW_COOKIE = '__Host-pulsify_google_flow';
const FLOW_SECONDS = 600;
const AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const DEFAULT_CALLBACK = 'https://pulsify-ai.com/api/google/callback';

export function googleConfig(env) {
  const clientId = str(env?.GOOGLE_CLIENT_ID).trim();
  const clientSecret = str(env?.GOOGLE_CLIENT_SECRET).trim();
  if (!clientId || !clientSecret) return null;
  try {
    const callback = new URL(str(env.GOOGLE_CALLBACK_URL).trim() || DEFAULT_CALLBACK);
    if (callback.protocol !== 'https:' || callback.pathname !== '/api/google/callback' || callback.search || callback.hash) return null;
    return { clientId, clientSecret, callback: callback.toString() };
  } catch { return null; }
}

const flowCookie = (value, maxAge = FLOW_SECONDS) => `${FLOW_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const loginPage = (audience) => (audience === 'operator' ? '/login/operator' : '/login/client');

function backToSignIn(audience, key, value) {
  const to = new URL(loginPage(audience), 'https://pulsify-ai.com');
  to.searchParams.set(key, value);
  return new Response(null, { status: 302, headers: { location: to.pathname + to.search, 'set-cookie': flowCookie('', 0), 'cache-control': 'no-store' } });
}

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function decodeIdToken(token) {
  const part = str(token).split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))));
  } catch { return null; }
}

export async function startGoogle({ request, env }) {
  const config = googleConfig(env);
  if (!config || new URL(request.url).origin !== new URL(config.callback).origin) {
    return new Response('Google sign-in is not set up', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  const url = new URL(request.url);
  const audience = url.searchParams.get('as') === 'operator' ? 'operator' : 'client';
  const state = generateOpaqueToken(24);
  const nonce = generateOpaqueToken(24);
  const verifier = generateOpaqueToken(48);
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  const flow = encodeURIComponent(JSON.stringify({ state, nonce, verifier, as: audience, next: safeDestination(url.searchParams.get('next'), audience), at: Date.now() }));
  const go = new URL(AUTHORIZE);
  go.searchParams.set('client_id', config.clientId);
  go.searchParams.set('redirect_uri', config.callback);
  go.searchParams.set('response_type', 'code');
  go.searchParams.set('scope', 'openid email profile');
  go.searchParams.set('state', state);
  go.searchParams.set('nonce', nonce);
  go.searchParams.set('code_challenge', challenge);
  go.searchParams.set('code_challenge_method', 'S256');
  go.searchParams.set('prompt', 'select_account');
  return new Response(null, { status: 302, headers: { location: go.toString(), 'set-cookie': flowCookie(flow), 'cache-control': 'no-store' } });
}

export async function finishGoogle({ request, env }, { fetcher = fetch } = {}) {
  const config = googleConfig(env);
  if (!config || new URL(request.url).origin !== new URL(config.callback).origin) return backToSignIn('client', 'auth_error', 'unavailable');
  const url = new URL(request.url);
  let flow;
  try { flow = JSON.parse(decodeURIComponent(parseCookies(request.headers.get('cookie')).get(FLOW_COOKIE) || '')); } catch { flow = null; }
  const audience = flow?.as === 'operator' ? 'operator' : 'client';
  const fail = (kind) => backToSignIn(audience, 'auth_error', kind);
  // The person closed Google's window or said no.
  if (url.searchParams.get('error')) return fail('cancelled');
  if (!flow || !constantTimeEqual(str(flow.state), url.searchParams.get('state') || '') ||
      !/^[A-Za-z0-9_-]{40,100}$/.test(flow.verifier || '') || !Number.isFinite(flow.at) ||
      Date.now() - flow.at > FLOW_SECONDS * 1000 || flow.at > Date.now() + 30000 || !url.searchParams.get('code')) return fail('expired');

  let claims;
  try {
    const response = await fetcher(TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: url.searchParams.get('code'), client_id: config.clientId, client_secret: config.clientSecret,
        redirect_uri: config.callback, grant_type: 'authorization_code', code_verifier: flow.verifier,
      }),
    });
    if (!response.ok) return fail('failed');
    // The ID token comes straight from Google's token endpoint over TLS in exchange for our
    // secret, so its claims are checked here rather than its signature (Google's OIDC guidance).
    claims = decodeIdToken((await response.json())?.id_token);
  } catch { return fail('failed'); }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!claims || !ISSUERS.has(claims.iss) || claims.aud !== config.clientId || !Number.isFinite(claims.exp) || claims.exp < nowSeconds ||
      !constantTimeEqual(str(claims.nonce), str(flow.nonce)) || !claims.sub) return fail('failed');
  const email = normalizeEmail(claims.email);
  if (!email || claims.email_verified !== true) return fail('unverified');
  if (!env.DB) return fail('unavailable');

  const finish = (location, cookie) => {
    const headers = new Headers({ location, 'cache-control': 'no-store' });
    headers.append('set-cookie', flowCookie('', 0));
    headers.append('set-cookie', cookie);
    return new Response(null, { status: 302, headers });
  };
  const audit = (action, detail) => env.DB.prepare('INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(email, action, detail.client || null, JSON.stringify({ via: 'google' }), new Date().toISOString()).run().catch(() => null);

  try {
    if (audience === 'operator') {
      if (!(await isOperatorEmailDb(env, email))) return fail('not_operator');
      const session = await issueOperatorSession(env, { email, providerUserId: `google:${claims.sub}` });
      await audit('operator-sign-in', {});
      return finish(safeDestination(flow.next, 'operator'), session.cookie);
    }

    const login = await env.DB.prepare('SELECT client_id FROM client_auth WHERE email=?').bind(email).first();
    if (login) {
      const workspace = await env.DB.prepare('SELECT status FROM client_config WHERE client=?').bind(login.client_id).first().catch(() => null);
      if (workspace?.status === 'archived') return fail('archived');
      const session = await issueClientSession(env, login.client_id);
      await audit('client-sign-in', { client: login.client_id });
      const to = new URL(safeDestination(flow.next, 'client'), 'https://pulsify-ai.com');
      to.searchParams.set('client', login.client_id);
      return finish(to.pathname + to.search, session.cookie);
    }
    // A team address on the client side: point them at the team sign-in instead of filing a request.
    if (await isOperatorEmailDb(env, email)) return fail('team_account');
    const name = str(claims.name).trim() || email.split('@')[0];
    const ip = request.headers.get('cf-connecting-ip') || '';
    await createRequest(env, {
      value: { name: name.slice(0, 120), email, link: null, note: 'Asked through Continue with Google.' },
      ipKey: ip ? (await sha256Hex(ip)).slice(0, 24) : '', origin: new URL(config.callback).origin, fetcher,
    });
    return backToSignIn('client', 'auth_notice', 'requested');
  } catch { return fail('failed'); }
}
