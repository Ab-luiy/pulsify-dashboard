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

test("middleware leaves the client portal and shared build assets to their own checks", async () => {
  assert.equal((await viaMiddleware("https://pulsify-ai.com/app/portal")).status, 200);
  assert.equal((await viaMiddleware("https://pulsify-ai.com/app/portal/instagram")).status, 200);
  assert.equal((await viaMiddleware("https://pulsify-ai.com/app/_next/static/chunks/a.js")).status, 200);
});

test("middleware still keeps the operator app behind Access", async () => {
  for (const path of ["/app", "/app/", "/app/crm", "/app/clients/setup", "/app/portalx", "/app/__next._tree.txt"]) {
    const response = await viaMiddleware("https://pulsify-ai.com" + path);
    assert.equal(response.status, 302, path);
    assert.equal(response.headers.get("location"), "https://pulsify-ai.com/admin", path);
  }
});

test("anonymous portal documents go to the client login, payloads 404", async () => {
  const env = envWith({ signedIn: false });
  const page = await portal({ request: new Request("https://pulsify-ai.com/app/portal?client=demo-rio"), env });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get("location"), "https://pulsify-ai.com/portal/login?client=demo-rio");
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
  assert.match(response.headers.get("location"), /\/portal\/login\?client=kai-trades$/);
});
