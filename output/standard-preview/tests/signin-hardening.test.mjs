import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { addressHash, passwordProblem, sameOrigin } from "../functions/_shared/auth-guard.js";
import { createPasswordSalt, hashPassword, issueClientSession, PBKDF2_ITERATIONS } from "../functions/_shared/client-auth.js";
import { onRequestPost as login } from "../functions/api/client-login.js";
import { onRequestPost as lookup } from "../functions/api/login-lookup.js";
import { onRequest as loginRoute } from "../functions/login/[[path]].js";
import { issueOperatorSession } from "../functions/_shared/operator-session.js";
import { authCleanup } from "../functions/_shared/auth-cleanup.js";

// Sign-in hardening: throttle per address and email, same-origin only, password rules, and the one
// sign-in page served at every login address.
const sql = new DatabaseSync(":memory:");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT)");
for (const name of ["0011_client_dashboard_auth.sql", "0038_operator_sessions.sql", "0049_login_throttle.sql", "0050_setup_link_emailed.sql"]) {
  sql.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8").replace(/ALTER TABLE client_config ADD COLUMN [^;]*;/g, ""));
}
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
const DB = {
  prepare(query) {
    let args = [];
    const p = {
      bind(...a) { args = a; return p; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes } }; },
    };
    return p;
  },
};
const served = [];
const env = { DB, OPERATOR_EMAILS: "founder@example.com", ASSETS: { async fetch(url) { served.push(String(url.pathname || url)); return new Response("<html>sign in</html>", { headers: { "content-type": "text/html" } }); } } };

const salt = createPasswordSalt();
sql.prepare("INSERT INTO client_config(client,client_name,status) VALUES('ada','Ada','active')").run();
sql.prepare("INSERT INTO client_auth(client_id,email,pass_hash,pass_salt,iterations,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
  .run("ada", "ada@example.com", await hashPassword("correct horse battery", salt), salt, PBKDF2_ITERATIONS, "2026-10-01", "2026-10-01");

const post = (path, body, headers = {}) => new Request("https://pulsify-ai.com" + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const attempt = (email, password, ip, extra = {}) => login({ request: post("/api/client-login", { email, password }, { "cf-connecting-ip": ip, ...extra }), env });

// ---- helpers
assert.equal(sameOrigin(new Request("https://pulsify-ai.com/x", { method: "POST", headers: { origin: "https://pulsify-ai.com" } })), true);
assert.equal(sameOrigin(new Request("https://pulsify-ai.com/x", { method: "POST", headers: { origin: "https://evil.test" } })), false);
assert.equal(sameOrigin(new Request("https://pulsify-ai.com/x", { method: "POST", headers: { "sec-fetch-site": "cross-site" } })), false);
assert.equal(sameOrigin(new Request("https://pulsify-ai.com/x", { method: "POST" })), true, "tools that send no origin are fine");
assert.notEqual(await addressHash(new Request("https://x.test", { headers: { "cf-connecting-ip": "203.0.113.5" } })), "203.0.113.5");
assert.equal(await addressHash(new Request("https://x.test")), "");

assert.match(passwordProblem("short"), /at least 10/);
assert.match(passwordProblem("x".repeat(201)), /at most 200/);
assert.match(passwordProblem("aaaaaaaaaaaa"), /too easy/);
assert.match(passwordProblem("Password12345"), /too easy/);
assert.match(passwordProblem("1234567890ab"), /too easy/);
assert.match(passwordProblem("adamsmith-2026-xyz", "adamsmith@example.com"), /email name/);
assert.equal(passwordProblem("correct horse battery", "ada@example.com"), "");

// ---- sign in
let r = await attempt("ada@example.com", "correct horse battery", "198.51.100.1", { origin: "https://evil.test" });
assert.equal(r.status, 403, "another site cannot post a sign-in");
r = await attempt("ada@example.com", "x".repeat(300), "198.51.100.1");
assert.equal(r.status, 401, "huge passwords are refused without hashing");
assert.equal(sql.prepare("SELECT COUNT(*) n FROM client_login_attempts").get().n, 0);

// Five misses from one address lock that address on that email, not the owner on another address
for (let i = 0; i < 4; i++) assert.equal((await attempt("ada@example.com", "wrong-password-" + i, "198.51.100.1")).status, 401);
assert.equal((await attempt("ada@example.com", "wrong-password-4", "198.51.100.1")).status, 429);
assert.equal((await attempt("ada@example.com", "correct horse battery", "198.51.100.1")).status, 429, "locked address stays locked even with the right password");
r = await attempt("ada@example.com", "correct horse battery", "203.0.113.7");
assert.equal(r.status, 200, "the owner on another address still gets in");
const ok = await r.json();
assert.equal(ok.redirect, "/app/portal?client=ada");
assert.match(r.headers.get("set-cookie"), /pulsify_client_session=.*HttpOnly.*Secure.*SameSite=Lax/);
assert.equal(r.headers.get("cache-control"), "no-store");

// Twenty misses from many addresses lock the email for everyone
sql.exec("DELETE FROM client_login_attempts");
for (let i = 0; i < 20; i++) await attempt("ada@example.com", "nope-" + i, `192.0.2.${i + 1}`);
assert.equal((await attempt("ada@example.com", "correct horse battery", "203.0.113.9")).status, 429, "spread-out guessing locks the email");

// Forty misses from one address across emails lock that address
sql.exec("DELETE FROM client_login_attempts");
for (let i = 0; i < 40; i++) sql.prepare("INSERT INTO client_login_attempts(email,attempted_at,ip_hash) VALUES(?,?,?)").run(`x${i}@example.com`, new Date().toISOString(), await addressHash(new Request("https://x.test", { headers: { "cf-connecting-ip": "198.51.100.50" } })));
assert.equal((await attempt("ada@example.com", "correct horse battery", "198.51.100.50")).status, 429, "one address cannot spray many emails");
assert.equal((await attempt("ada@example.com", "correct horse battery", "198.51.100.51")).status, 200);

// ---- the password-link endpoint refuses other sites
assert.equal((await lookup({ request: post("/api/login-lookup", { email: "ada@example.com", action: "link" }, { origin: "https://evil.test" }), env })).status, 403);

// ---- the one sign-in page
const get = (path, headers = {}) => new Request("https://pulsify-ai.com" + path, { headers });
const route = (path, params, headers) => loginRoute({ request: get(path, headers), env, params: { path: params }, next: async () => new Response("next", { status: 404 }) });

for (const [path, param] of [["/login", undefined], ["/login/client", ["client"]], ["/login/operator", ["operator"]]]) {
  const res = await route(path, param);
  assert.equal(res.status, 200, path);
  assert.equal(await res.text(), "<html>sign in</html>");
  assert.match(res.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(res.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
}
assert.equal((await route("/login/other", ["other"])).status, 404, "unknown addresses fall through");
assert.equal((await loginRoute({ request: new Request("https://pulsify-ai.com/login/client", { method: "POST" }), env, params: { path: ["client"] }, next: async () => new Response("x") })).status, 405);

// A signed-in client is sent to their portal, but a setup link or a sign-in error still shows the page
const { token } = await issueClientSession(env, "ada");
const cookie = `pulsify_client_session=${token}`;
let res = await route("/login/client", ["client"], { cookie });
assert.equal(res.status, 302);
assert.equal(res.headers.get("location"), "https://pulsify-ai.com/app/portal?client=ada");
res = await route("/login/client?next=%2Fapp%2Fportal%2Fleads", ["client"], { cookie });
assert.equal(res.headers.get("location"), "https://pulsify-ai.com/app/portal/leads?client=ada");
res = await route("/login/client?next=https%3A%2F%2Fevil.test", ["client"], { cookie });
assert.equal(res.headers.get("location"), "https://pulsify-ai.com/app/portal?client=ada", "no open redirect");
assert.equal((await route("/login/client?setup=abc", ["client"], { cookie })).status, 200);
assert.equal((await route("/login/client?auth_error=failed", ["client"], { cookie })).status, 200);

// A signed-in operator on the team page goes to the console; a client session does not
const op = await issueOperatorSession(env, { email: "founder@example.com", providerUserId: "u1" });
const opCookie = op.cookie.split(";")[0];
res = await route("/login/operator", ["operator"], { cookie: opCookie });
assert.equal(res.status, 302);
assert.equal(res.headers.get("location"), "https://pulsify-ai.com/app/");
res = await route("/login/operator?next=%2Fapp%2Fportal%2Fx", ["operator"], { cookie: opCookie });
assert.equal(res.headers.get("location"), "https://pulsify-ai.com/app/", "operators never land in a client portal");
assert.equal((await route("/login/operator", ["operator"], { cookie })).status, 200);
assert.equal((await route("/login/operator?signed_out=1", ["operator"], { cookie: opCookie })).status, 200, "the signed-out screen is not bounced");

// ---- nightly cleanup removes only what is dead
sql.exec('CREATE TABLE client_email_codes(client_id TEXT,email TEXT,purpose TEXT,code_hash TEXT,expires_at TEXT,attempts INTEGER,created_at TEXT)');
sql.exec('CREATE TABLE api_key_usage(key_id TEXT,bucket TEXT,count INTEGER)');
sql.exec("DELETE FROM client_sessions; DELETE FROM client_login_attempts; DELETE FROM client_setup_tokens");
const old = '2000-01-01T00:00:00.000Z', future = '2999-01-01T00:00:00.000Z', fresh = new Date().toISOString();
sql.prepare('INSERT INTO client_sessions(token_hash,client_id,expires_at,created_at) VALUES(?,?,?,?)').run('dead', 'ada', old, old);
sql.prepare('INSERT INTO client_sessions(token_hash,client_id,expires_at,created_at) VALUES(?,?,?,?)').run('live', 'ada', future, fresh);
sql.prepare('INSERT INTO client_login_attempts(email,attempted_at,ip_hash) VALUES(?,?,?)').run('a@b.co', old, 'h');
sql.prepare('INSERT INTO client_login_attempts(email,attempted_at,ip_hash) VALUES(?,?,?)').run('a@b.co', fresh, 'h');
sql.prepare('INSERT INTO client_setup_tokens(token_hash,client_id,email,expires_at,created_at) VALUES(?,?,?,?,?)').run('t-old', 'ada', 'ada@example.com', old, old);
sql.prepare('INSERT INTO client_setup_tokens(token_hash,client_id,email,expires_at,created_at) VALUES(?,?,?,?,?)').run('t-live', 'ada', 'ada@example.com', future, fresh);
sql.prepare('INSERT INTO api_key_usage(key_id,bucket,count) VALUES(?,?,?)').run('login-link:a@b.co', '2000-01-01T00', 3);
sql.prepare('INSERT INTO api_key_usage(key_id,bucket,count) VALUES(?,?,?)').run('some-api-key', '2000-01-01T00', 3);
const removed = await authCleanup(env);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM client_sessions').get().n, 1);
assert.equal(sql.prepare("SELECT token_hash FROM client_sessions").get().token_hash, 'live');
assert.equal(sql.prepare('SELECT COUNT(*) n FROM client_login_attempts').get().n, 1);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM client_setup_tokens').get().n, 1);
assert.equal(sql.prepare('SELECT COUNT(*) n FROM api_key_usage').get().n, 1, 'only sign-in rate buckets are swept, never API key usage');
assert.equal(removed['client sessions'], 1);
assert.equal(removed['preview sessions'], 0);

// ---- a link the system emailed skips the extra code; one shared by hand keeps it
{
  const { onRequestPost: emailCode } = await import("../functions/api/client-email-code.js");
  const { onRequestPost: setPassword } = await import("../functions/api/client-set-password.js");
  const { sha256Hex } = await import("../functions/_shared/common.js");
  const fut = "2999-01-01T00:00:00.000Z";
  const put = async (token, emailedAt) => sql.prepare("INSERT INTO client_setup_tokens(token_hash,client_id,email,expires_at,created_at,emailed_at) VALUES(?,?,?,?,?,?)").run(await sha256Hex(token), "ada", "ada@example.com", fut, fut, emailedAt);
  const mailEnv = { ...env, RESEND_API_KEY: "key", EMAIL_FROM: "Pulsify <hello@example.test>" };
  await put("emailed-link", "2026-10-01T00:00:00.000Z");
  let answer = await (await emailCode({ request: post("/api/client-email-code", { setup_token: "emailed-link" }), env: mailEnv })).json();
  assert.equal(answer.requires_code, false, "no second code for a link we emailed");
  assert.equal(answer.email, "ada@example.com");
  r = await setPassword({ request: post("/api/client-set-password", { setup_token: "emailed-link", password: "a-brand-new-passphrase" }), env: mailEnv });
  assert.equal(r.status, 200, "an emailed link sets the password with no code");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM client_setup_tokens WHERE client_id='ada'").get().n, 0, "the link is used up");

  await put("shared-link", null);
  r = await setPassword({ request: post("/api/client-set-password", { setup_token: "shared-link", password: "another-new-passphrase" }), env: mailEnv });
  assert.equal(r.status, 422, "a link shared by hand still needs the emailed code");
  assert.match((await r.json()).error, /verification code is required/);
}

console.log('signin-hardening: ok');
