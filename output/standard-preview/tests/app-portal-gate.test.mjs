// The new client portal under /app/portal: clients only, session injected by
// the server, operator console under /app stays behind Cloudflare Access.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pulsifyMiddleware as middleware } from "../functions/_middleware.js";
import { onRequest as portal } from "../functions/app/portal/[[path]].js";

const html = "<!doctype html><html><head><title>Portal</title></head><body>portal</body></html>";

// D1 stub: a session cookie "good" resolves to client demo-rio; anything else resolves to nothing.
function envWith({ signedIn }) {
  return {
    ACCESS_AUD: "console",
    DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              first: async () =>
                signedIn && /FROM client_sessions/.test(sql)
                  ? { client_id: "demo-rio", client_name: "Demo Rio", expires_at: "2999-01-01T00:00:00.000Z" }
                  : null,
              run: async () => ({}),
              all: async () => ({ results: [] }),
            };
          },
          run: async () => ({}),
          first: async () => null,
          all: async () => ({ results: [] }),
        };
      },
    },
    ASSETS: {
      fetch: async (request) => {
        const path = new URL(request.url).pathname;
        if (path.endsWith(".txt")) return new Response("payload", { headers: { "content-type": "text/plain" } });
        return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
      },
    },
  };
}

async function viaMiddleware(url) {
  const request = new Request(url);
  return middleware({ request, env: envWith({ signedIn: false }), data: {}, next: async () => new Response("passed", { status: 200 }) });
}

test("middleware leaves the client portal pages to their own check", async () => {
  assert.equal((await viaMiddleware("https://pulsify-ai.com/app/portal")).status, 200);
  assert.equal((await viaMiddleware("https://pulsify-ai.com/app/portal/instagram")).status, 200);
});

test("app code is only downloadable by a signed-in client or operator", async () => {
  const asset = "https://pulsify-ai.com/app/_next/static/chunks/a.js";
  assert.equal((await viaMiddleware(asset)).status, 404);
  const signedIn = await middleware({
    request: new Request(asset, { headers: { cookie: "pulsify_client_session=good" } }),
    env: envWith({ signedIn: true }), data: {}, next: async () => new Response("code"),
  });
  assert.equal(signedIn.status, 200);
  for (const path of ["/portal/legacy.js", "/portal/workspace-shell.js", "/shared/shell.js", "/onboard/phase4.js", "/js/provision-prompt.js"]) {
    assert.equal((await viaMiddleware("https://pulsify-ai.com" + path)).status, 404, path);
  }
  for (const path of ["/portal/login/auth.css", "/shared/theme.js", "/css/entry.css", "/assets/brand/variations/05-lockup-white.svg"]) {
    assert.equal((await viaMiddleware("https://pulsify-ai.com" + path)).status, 200, path);
  }
  // A client session does not unlock operator-only console scripts.
  const clientOnConsole = await middleware({
    request: new Request("https://pulsify-ai.com/js/provision-prompt.js", { headers: { cookie: "pulsify_client_session=good" } }),
    env: envWith({ signedIn: true }), data: {}, next: async () => new Response("code"),
  });
  assert.equal(clientOnConsole.status, 404);
});

test("signed-out operators are sent to the branded operator sign-in", async () => {
  for (const [path, next] of [["/app", null], ["/app/", null], ["/app/crm", "/app/crm"], ["/app/clients/setup", "/app/clients/setup"], ["/app/portalx", "/app/portalx"]]) {
    const response = await viaMiddleware("https://pulsify-ai.com" + path);
    assert.equal(response.status, 302, path);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.origin + location.pathname, "https://pulsify-ai.com/login/operator", path);
    assert.equal(location.searchParams.get("next"), next, path);
  }
  const legacy = await viaMiddleware("https://pulsify-ai.com/admin?view=crm");
  assert.equal(legacy.headers.get("location"), "https://pulsify-ai.com/login/operator?next=%2Fapp%2Fcrm");
});

test("anonymous portal documents go to the client login, payloads 404", async () => {
  const env = envWith({ signedIn: false });
  const page = await portal({ request: new Request("https://pulsify-ai.com/app/portal?client=demo-rio"), env });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get("location"), "https://pulsify-ai.com/login/client?client=demo-rio");
  const payload = await portal({ request: new Request("https://pulsify-ai.com/app/portal/__next._tree.txt"), env });
  assert.equal(payload.status, 404);
});

test("a signed-in client gets the page with the server's session injected", async () => {
  const env = envWith({ signedIn: true });
  const request = new Request("https://pulsify-ai.com/app/portal?client=demo-rio", { headers: { cookie: "pulsify_client_session=good" } });
  const response = await portal({ request, env });
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /window\.PulsifySession=\{"client":"demo-rio","client_name":"Demo Rio","impersonated":false\}/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await portal({ request: new Request("https://pulsify-ai.com/app/portal/__next._tree.txt", { headers: { cookie: "pulsify_client_session=good" } }), env });
  assert.equal(await payload.text(), "payload");
});

test("a client cannot open another client's portal by changing ?client=", async () => {
  const env = envWith({ signedIn: true });
  const request = new Request("https://pulsify-ai.com/app/portal?client=kai-trades", { headers: { cookie: "pulsify_client_session=good" } });
  const response = await portal({ request, env });
  assert.equal(response.status, 302);
  assert.match(response.headers.get("location"), /\/login\/client\?client=kai-trades$/);
});
