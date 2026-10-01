import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequestPost } from "../functions/api/operator-auth.js";
import { resolveOperatorSession } from "../functions/_shared/operator-session.js";

// Team sign-in on our own form: a link sets the password, a new device needs an emailed code,
// a trusted device does not, and nothing says who is on the team.
const sql = new DatabaseSync(":memory:");
for (const name of ["0011_client_dashboard_auth.sql", "0015_operator_events.sql", "0038_operator_sessions.sql", "0048_operator_users.sql", "0049_login_throttle.sql", "0051_operator_password_login.sql"]) {
  sql.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8").replace(/ALTER TABLE access_requests[^;]*;/g, ""));
}
sql.exec("CREATE TABLE api_key_usage(key_id TEXT,bucket TEXT,count INTEGER,PRIMARY KEY(key_id,bucket))");
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
const env = { DB, OPERATOR_EMAILS: "founder@example.com", RESEND_API_KEY: "key", EMAIL_FROM: "Pulsify <hello@example.test>" };

const mail = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => { mail.push(JSON.parse(options.body)); return new Response("{}", { status: 200 }); };

const call = async (body, headers = {}) => onRequestPost({ request: new Request("https://pulsify-ai.com/api/operator-auth", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), env });
const cookieOf = (response, name) => (response.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).find((c) => c.startsWith(name + "="));
const GOOD = "a-long-team-passphrase";

try {
  // ---- the link: same answer for everyone, only a team address gets mail
  let r = await call({ action: "link", email: "stranger@example.com" });
  const strangerAnswer = await r.json();
  assert.equal(mail.length, 0);
  r = await call({ action: "link", email: "founder@example.com" });
  assert.deepEqual(await r.json(), strangerAnswer, "team and non-team addresses are indistinguishable");
  assert.equal(mail.length, 1);
  assert.deepEqual(mail[0].to, ["founder@example.com"]);
  const token = mail[0].text.match(/setup=([A-Za-z0-9_-]+)/)[1];
  assert.equal((await call({ action: "link", email: "not-an-email" })).status, 422);
  assert.equal((await call({ action: "link", email: "founder@example.com" }, { origin: "https://evil.test" })).status, 403);

  // ---- setting the password signs in, with a trusted device
  assert.equal((await call({ action: "setup", setup_token: "wrong", password: GOOD })).status, 401);
  r = await call({ action: "setup", setup_token: token, password: "short" });
  assert.equal(r.status, 422);
  assert.match((await r.json()).error, /at least 12/);
  r = await call({ action: "setup", setup_token: token, password: "founder-example-1234" });
  assert.equal(r.status, 422, "a password built from the email name is refused");
  r = await call({ action: "setup", setup_token: token, password: GOOD });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).redirect, "/app/");
  const session = cookieOf(r, "__Host-pulsify_operator");
  const device = cookieOf(r, "__Host-pulsify_device");
  assert.ok(session && device, "session and trusted-device cookies are set");
  assert.match(r.headers.getSetCookie().find((c) => c.startsWith("__Host-pulsify_operator")), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await resolveOperatorSession(new Request("https://pulsify-ai.com/app", { headers: { cookie: session } }), env))?.email, "founder@example.com");
  assert.equal((await call({ action: "setup", setup_token: token, password: GOOD })).status, 401, "a link works once");

  // ---- password step
  mail.length = 0;
  r = await call({ action: "login", email: "founder@example.com", password: "wrong-password-xx" });
  assert.equal(r.status, 401);
  const wrongTeam = await r.json();
  r = await call({ action: "login", email: "stranger@example.com", password: "wrong-password-xx" });
  assert.deepEqual(await r.json(), { ...wrongTeam, attempts_left: wrongTeam.attempts_left }, "a stranger gets the same message as a team member");
  r = await call({ action: "login", email: "stranger@example.com", password: GOOD });
  assert.equal(r.status, 401, "knowing the team password is not enough without being on the team");
  assert.equal(mail.length, 0, "no code goes out for a wrong password");

  // New device: a code is emailed and the session waits for it
  r = await call({ action: "login", email: "Founder@Example.com", password: GOOD, trust: true, next: "/app/clients" });
  assert.equal(r.status, 200);
  const step = await r.json();
  assert.equal(step.step, "code");
  assert.equal(cookieOf(r, "__Host-pulsify_operator"), undefined, "no session before the code");
  const code = mail.at(-1).text.match(/code is (\d{6})/)[1];
  assert.equal((await call({ action: "verify", challenge: step.challenge, code: "12" })).status, 422);
  r = await call({ action: "verify", challenge: step.challenge, code: code === "000000" ? "111111" : "000000" });
  assert.equal(r.status, 401);
  assert.match((await r.json()).error, /4 attempts left/);
  r = await call({ action: "verify", challenge: step.challenge, code });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).redirect, "/app/clients");
  const trustedCookie = cookieOf(r, "__Host-pulsify_device");
  assert.ok(cookieOf(r, "__Host-pulsify_operator") && trustedCookie, "trusted device cookie when asked for");
  assert.equal((await call({ action: "verify", challenge: step.challenge, code })).status, 401, "a code works once");

  // Trusted device: straight in, no mail
  mail.length = 0;
  r = await call({ action: "login", email: "founder@example.com", password: GOOD, next: "https://evil.test" }, { cookie: trustedCookie });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).redirect, "/app/", "no open redirect");
  assert.equal(mail.length, 0);
  assert.ok(cookieOf(r, "__Host-pulsify_operator"));
  // Someone else's device cookie does not help
  r = await call({ action: "login", email: "friend@example.com", password: GOOD }, { cookie: trustedCookie });
  assert.equal(r.status, 401);

  // Wrong code five times kills the challenge
  r = await call({ action: "login", email: "founder@example.com", password: GOOD });
  const second = await r.json();
  for (let i = 0; i < 5; i++) await call({ action: "verify", challenge: second.challenge, code: "999999" });
  r = await call({ action: "verify", challenge: second.challenge, code: mail.at(-1).text.match(/code is (\d{6})/)[1] });
  assert.equal(r.status, 401, "the right code no longer works after five misses");
  assert.equal((await r.json()).expired, true);

  // Expired challenge
  r = await call({ action: "login", email: "founder@example.com", password: GOOD });
  const third = await r.json();
  sql.prepare("UPDATE operator_challenges SET expires_at='2000-01-01T00:00:00.000Z'").run();
  r = await call({ action: "verify", challenge: third.challenge, code: mail.at(-1).text.match(/code is (\d{6})/)[1] });
  assert.equal(r.status, 401);

  // Throttle: five misses from one address pause the login
  sql.exec("DELETE FROM client_login_attempts");
  for (let i = 0; i < 4; i++) assert.equal((await call({ action: "login", email: "founder@example.com", password: "nope-nope-nope-" + i }, { "cf-connecting-ip": "198.51.100.9" })).status, 401);
  assert.equal((await call({ action: "login", email: "founder@example.com", password: "nope-nope-nope-9" }, { "cf-connecting-ip": "198.51.100.9" })).status, 429);
  assert.equal((await call({ action: "login", email: "founder@example.com", password: GOOD }, { "cf-connecting-ip": "198.51.100.9", cookie: trustedCookie })).status, 429, "paused even with the right password");
  assert.equal((await call({ action: "login", email: "founder@example.com", password: GOOD }, { "cf-connecting-ip": "203.0.113.4", cookie: trustedCookie })).status, 200, "the owner on another address is not locked out");

  // A new password ends other sessions and trusted devices
  mail.length = 0;
  await call({ action: "link", email: "founder@example.com" });
  const reset = mail[0].text.match(/setup=([A-Za-z0-9_-]+)/)[1];
  r = await call({ action: "setup", setup_token: reset, password: "a-different-team-passphrase" });
  assert.equal(r.status, 200);
  assert.equal(await resolveOperatorSession(new Request("https://pulsify-ai.com/app", { headers: { cookie: session } }), env), null, "the old session is gone");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM operator_devices WHERE email='founder@example.com'").get().n, 1, "only the device from this reset is trusted");

  // Someone removed from the team cannot sign in even with the right password
  sql.prepare("INSERT INTO operator_users(email,name,added_by,created_at) VALUES('friend@example.com','F','founder@example.com','2026-10-01')").run();
  sql.prepare("INSERT INTO operator_auth(email,pass_hash,pass_salt,iterations,created_at,updated_at) SELECT 'friend@example.com',pass_hash,pass_salt,iterations,created_at,updated_at FROM operator_auth WHERE email='founder@example.com'").run();
  sql.exec("DELETE FROM client_login_attempts");
  sql.prepare("UPDATE operator_users SET removed_at='2026-10-02' WHERE email='friend@example.com'").run();
  r = await call({ action: "login", email: "friend@example.com", password: "a-different-team-passphrase" });
  assert.equal(r.status, 401);
  console.log("operator-auth: ok");
} finally {
  globalThis.fetch = realFetch;
}
