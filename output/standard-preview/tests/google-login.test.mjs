import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startGoogle, finishGoogle, googleConfig } from '../functions/_shared/google-auth.js';

const callback = 'https://pulsify-ai.com/api/google/callback';
const base = { GOOGLE_CLIENT_ID: 'gid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'g-secret', OPERATOR_EMAILS: 'owner@pulsify.test' };

// A D1 stand-in that answers by query and records writes.
function fakeDB({ logins = {}, archived = [], operators = [] } = {}) {
  const writes = [];
  const db = { writes, prepare(sql) { return { bind(...args) { return {
    async first() {
      if (/FROM client_auth WHERE email/.test(sql)) return logins[args[0]] ? { client_id: logins[args[0]] } : null;
      if (/FROM client_config WHERE client/.test(sql)) return { status: archived.includes(args[0]) ? 'archived' : 'active' };
      if (/FROM operator_users/.test(sql)) return operators.includes(args[0]) ? { ok: 1 } : null;
      if (/FROM access_requests WHERE email=\? AND status='pending'/.test(sql)) return null;
      if (/SELECT count FROM api_key_usage/.test(sql)) return { count: 1 };
      return null;
    },
    async run() { writes.push({ sql, args }); return { success: true }; },
    async all() { return { results: [] }; },
  }; } }; } };
  return db;
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function googleFetch(claims) {
  return async (url, options) => {
    assert.equal(String(url), 'https://oauth2.googleapis.com/token');
    assert.equal(options.body.get('client_secret'), 'g-secret');
    assert.equal(options.body.get('redirect_uri'), callback);
    assert.ok(options.body.get('code_verifier'));
    return Response.json({ id_token: `${b64({ alg: 'RS256' })}.${b64(claims)}.sig` });
  };
}

async function begin(search = '') {
  const response = await startGoogle({ request: new Request('https://pulsify-ai.com/api/google/start' + search), env: base });
  const go = new URL(response.headers.get('location'));
  const cookie = response.headers.get('set-cookie').split(';')[0];
  return { response, go, cookie };
}

async function complete(search, claims, db, extraEnv = {}) {
  const { go, cookie } = await begin(search);
  const full = { iss: 'https://accounts.google.com', aud: base.GOOGLE_CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 300, sub: 'g-123', nonce: go.searchParams.get('nonce'), email_verified: true, ...claims };
  const request = new Request(`${callback}?state=${encodeURIComponent(go.searchParams.get('state'))}&code=abc`, { headers: { cookie } });
  return finishGoogle({ request, env: { ...base, ...extraEnv, DB: db } }, { fetcher: googleFetch(full) });
}

test('hidden and refused until both Google values are set', async () => {
  assert.equal(googleConfig({ GOOGLE_CLIENT_ID: 'x' }), null);
  const response = await startGoogle({ request: new Request('https://pulsify-ai.com/api/google/start'), env: {} });
  assert.equal(response.status, 503);
});

test('start sends a PKCE, state and nonce request to Google and keeps next on-site', async () => {
  const { response, go, cookie } = await begin('?as=operator&next=https%3A%2F%2Fevil.test');
  assert.equal(response.status, 302);
  assert.equal(go.origin + go.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(go.searchParams.get('scope'), 'openid email profile');
  assert.equal(go.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(go.searchParams.get('nonce') && go.searchParams.get('state'));
  assert.match(response.headers.get('set-cookie'), /^__Host-pulsify_google_flow=.*HttpOnly; Secure; SameSite=Lax/);
  const flow = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
  assert.equal(flow.as, 'operator');
  assert.equal(flow.next, '/app/');
});

test('a wrong state never reaches Google', async () => {
  const { cookie } = await begin();
  const request = new Request(`${callback}?state=nope&code=abc`, { headers: { cookie } });
  const response = await finishGoogle({ request, env: { ...base, DB: fakeDB() } }, { fetcher: () => { throw Error('must not call Google'); } });
  assert.match(response.headers.get('location'), /auth_error=expired/);
});

test('an approved client signs straight into their own workspace', async () => {
  const db = fakeDB({ logins: { 'coach@example.test': 'coach-a' } });
  const response = await complete('', { email: 'Coach@Example.test', name: 'Coach A' }, db);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/app/portal?client=coach-a');
  assert.match(response.headers.get('set-cookie'), /pulsify_google_flow=; .*Max-Age=0/);
  assert.ok(db.writes.some((w) => /INSERT INTO client_sessions/.test(w.sql) && w.args[1] === 'coach-a'));
});

test('an archived workspace is refused', async () => {
  const db = fakeDB({ logins: { 'coach@example.test': 'coach-a' }, archived: ['coach-a'] });
  const response = await complete('', { email: 'coach@example.test' }, db);
  assert.match(response.headers.get('location'), /auth_error=archived/);
  assert.ok(!db.writes.some((w) => /client_sessions/.test(w.sql)));
});

test('a new Google address on the client side files an access request and gets no session', async () => {
  const db = fakeDB();
  const response = await complete('', { email: 'new@example.test', name: 'New Person' }, db);
  assert.equal(response.headers.get('location'), '/login/client?auth_notice=requested');
  const insert = db.writes.find((w) => /INSERT INTO access_requests/.test(w.sql));
  assert.ok(insert);
  assert.equal(insert.args[1], 'new@example.test');
  assert.equal(insert.args[2], 'New Person');
  assert.ok(!db.writes.some((w) => /client_sessions|operator_sessions/.test(w.sql)));
});

test('an unverified Google email gets nothing', async () => {
  const db = fakeDB({ logins: { 'coach@example.test': 'coach-a' } });
  const response = await complete('', { email: 'coach@example.test', email_verified: false }, db);
  assert.match(response.headers.get('location'), /auth_error=unverified/);
  assert.equal(db.writes.length, 0);
});

test('a token for another app or an old nonce is rejected', async () => {
  const db = fakeDB({ logins: { 'coach@example.test': 'coach-a' } });
  assert.match((await complete('', { email: 'coach@example.test', aud: 'other-app' }, db)).headers.get('location'), /auth_error=failed/);
  assert.match((await complete('', { email: 'coach@example.test', nonce: 'stale' }, db)).headers.get('location'), /auth_error=failed/);
  assert.equal(db.writes.length, 0);
});

test('team: owners and console-added operators get in, everyone else is refused', async () => {
  const owner = await complete('?as=operator', { email: 'owner@pulsify.test' }, fakeDB());
  assert.equal(owner.headers.get('location'), '/app/');
  assert.match(owner.headers.getSetCookie().join('\n'), /__Host-pulsify_operator=/);
  const added = await complete('?as=operator', { email: 'va@pulsify.test' }, fakeDB({ operators: ['va@pulsify.test'] }));
  assert.equal(added.headers.get('location'), '/app/');
  const stranger = await complete('?as=operator', { email: 'coach@example.test' }, fakeDB({ logins: { 'coach@example.test': 'coach-a' } }));
  assert.equal(stranger.headers.get('location'), '/login/operator?auth_error=not_operator');
});

test('a team address on the client side is pointed at team sign-in, not filed as a request', async () => {
  const db = fakeDB();
  const response = await complete('', { email: 'owner@pulsify.test' }, db);
  assert.match(response.headers.get('location'), /auth_error=team_account/);
  assert.ok(!db.writes.some((w) => /access_requests/.test(w.sql)));
});

test('cancelling on Google returns quietly to the right side', async () => {
  const { go, cookie } = await begin('?as=operator');
  const request = new Request(`${callback}?error=access_denied&state=${go.searchParams.get('state')}`, { headers: { cookie } });
  const response = await finishGoogle({ request, env: { ...base, DB: fakeDB() } });
  assert.equal(response.headers.get('location'), '/login/operator?auth_error=cancelled');
});
