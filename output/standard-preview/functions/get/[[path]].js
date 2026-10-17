// The lead magnet's public pages (ticket #79). No sign-in: these are for the people who comment a keyword.
//   GET  /get/<slug>             a small page: name, email, phone
//   POST /get/<slug>             {name, email, phone, visitor_id, session_id}: starts the delivery run
//   GET  /get/<slug>/guide?t=    the guide, for the token in the emailed link (PDF upload or redirect to the client's link)
//   GET  /get/capture.js         the page's script (the page allows no inline code)
// The page sets the same visitor id the funnel pages use (pulsify_visitor_id), so tracking continues across the DM click.
import { escapeHtml, generateOpaqueToken, json, normalizeEmail, nowIso, str } from "../_shared/common.js";
import { takeAllowance } from "../_shared/usage.js";
import "../_shared/recipes/index.js";
import { loadRecipe, startRun } from "../_shared/workflows.js";
import { KIND } from "../_shared/recipes/lead-magnet.js";

const CSP = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
const page = (body, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": CSP, "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" } });

const SCRIPT = `(function(){
  var form=document.getElementById('f'),note=document.getElementById('n'),button=document.getElementById('b');
  function id(key,storage){try{var v=storage.getItem(key);if(!v){v=window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);storage.setItem(key,v);}return v;}catch(e){return '';}}
  var visitor=id('pulsify_visitor_id',window.localStorage),session=id('pulsify_session_id',window.sessionStorage);
  form.addEventListener('submit',function(e){
    e.preventDefault();note.textContent='';button.disabled=true;button.textContent='Sending...';
    var data=new FormData(form);
    fetch(location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:data.get('name'),email:data.get('email'),phone:data.get('phone'),website:data.get('website'),visitor_id:visitor,session_id:session})})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(x){
        if(x.ok&&x.j.ok){form.hidden=true;document.getElementById('done').hidden=false;return;}
        note.textContent=(x.j&&x.j.error)||'Something went wrong. Try again.';button.disabled=false;button.textContent='Send me the guide';
      })
      .catch(function(){note.textContent='Could not reach the page. Check your connection and try again.';button.disabled=false;button.textContent='Send me the guide';});
  });
})();`;

function formPage({ clientName, guideName }) {
  const c = escapeHtml(clientName), g = escapeHtml(guideName);
  return page(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${g}</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#000;color:#f4f4f2;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;padding:24px 16px}
main{width:100%;max-width:400px}h1{font-size:28px;line-height:1.15;font-weight:500;letter-spacing:-.03em;margin:0 0 8px}p{margin:0 0 24px;color:#a8a8a4}
label{display:block;font-size:13px;font-weight:500;margin:0 0 6px}input{width:100%;height:44px;border-radius:10px;border:1px solid #2a2a28;background:#0d0c0b;color:inherit;padding:0 12px;font:inherit;margin:0 0 16px}
input:focus-visible,button:focus-visible{outline:2px solid #f4f4f2;outline-offset:2px}button{width:100%;height:46px;border-radius:10px;border:0;background:#f4f4f2;color:#0d0c0b;font:inherit;font-weight:500;cursor:pointer}button:disabled{opacity:.6;cursor:default}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}#n{color:#ff8a80;font-size:14px;min-height:20px;margin:12px 0 0}small{display:block;margin-top:20px;color:#6f6f6b;font-size:12px}
</style></head><body><main>
<form id="f" novalidate><h1>${g}</h1><p>Tell ${c} where to send it.</p>
<label for="name">Your name</label><input id="name" name="name" autocomplete="name" required maxlength="100">
<label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="200">
<label for="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autocomplete="tel" maxlength="40">
<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
<button id="b" type="submit">Send me the guide</button><div id="n" role="alert"></div><small>We use your details to send the guide and to follow up about it.</small></form>
<div id="done" hidden><h1>Check your email</h1><p>The guide is on its way to you. If it does not arrive in a few minutes, look in your spam folder.</p></div>
<script src="/get/capture.js"></script></main></body></html>`);
}

const closedPage = () => page(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Not available</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#000;color:#f4f4f2;font:16px/1.5 system-ui,sans-serif;padding:24px}p{color:#a8a8a4}</style></head><body><main><h1 style="font-weight:500">This page is not available</h1><p>The link may have expired or been switched off.</p></main></body></html>`, 404);

async function recipeBySlug(env, slug) {
  if (!/^[a-z0-9]{4,24}$/.test(slug)) return null;
  const row = await env.DB.prepare("SELECT client_id, enabled FROM workflow_recipes WHERE public_slug=? AND kind=?").bind(slug, KIND).first();
  if (!row) return null;
  const saved = await loadRecipe(env, row.client_id, KIND);
  return { client: row.client_id, enabled: Boolean(row.enabled), saved };
}

async function clientLabel(env, client) {
  const row = await env.DB.prepare("SELECT client_name FROM client_config WHERE client=?").bind(client).first().catch(() => null);
  return str(row?.client_name) || "us";
}

export async function onRequestGet({ request, env, params }) {
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  if (parts.length === 1 && parts[0] === "capture.js") {
    return new Response(SCRIPT, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
  }
  if (!env.DB) return closedPage();
  const found = await recipeBySlug(env, parts[0] || "");
  if (!found) return closedPage();

  if (parts[1] === "guide" && parts.length === 2) {
    const token = str(new URL(request.url).searchParams.get("t"));
    const cap = token ? await env.DB.prepare("SELECT id, client_id, download_expires FROM lead_magnet_captures WHERE download_token=? AND slug=?").bind(token, parts[0]).first() : null;
    if (!cap || cap.download_expires < nowIso()) return closedPage();
    const guide = found.saved.config.guide || {};
    await env.DB.prepare("UPDATE lead_magnet_captures SET downloaded_at=COALESCE(downloaded_at,?) WHERE id=?").bind(nowIso(), cap.id).run();
    if (guide.kind === "link" && /^https:\/\//i.test(guide.url || "")) return Response.redirect(guide.url, 302);
    if (guide.kind === "upload" && env.MEDIA && guide.key?.startsWith(`guides/${found.client}/`)) {
      const object = await env.MEDIA.get(guide.key);
      if (object) {
        const filename = (str(guide.name).replace(/[^\w .-]+/g, "").trim() || "guide") + ".pdf";
        return new Response(object.body, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
      }
    }
    return closedPage();
  }

  if (parts.length !== 1 || !found.enabled) return closedPage();
  return formPage({ clientName: await clientLabel(env, found.client), guideName: found.saved.config.guide?.name || "Your guide" });
}

export async function onRequestPost({ request, env, params }) {
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  if (!env.DB || parts.length !== 1) return json({ ok: false, error: "This page is not available." }, 404);
  const found = await recipeBySlug(env, parts[0]);
  if (!found || !found.enabled) return json({ ok: false, error: "This page is not available." }, 404);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Something went wrong. Try again." }, 400); }
  // A hidden field only a script fills in: say thanks and do nothing.
  if (str(body.website)) return json({ ok: true });
  const name = str(body.name).slice(0, 100);
  const email = normalizeEmail(body.email);
  const phone = str(body.phone).replace(/[^\d+()\-\s.]/g, "").slice(0, 30);
  if (!name) return json({ ok: false, error: "Add your name." }, 422);
  if (!email) return json({ ok: false, error: "Add a valid email address." }, 422);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (!(await takeAllowance(env, `lm-ip:${ip}`.slice(0, 80), "lead-capture", 20).catch(() => true))) {
    return json({ ok: false, error: "Too many tries from this connection. Try again tomorrow." }, 429);
  }
  const id = `lmc_${generateOpaqueToken(10)}`;
  const visitor = str(body.visitor_id).replace(/[^\w-]/g, "").slice(0, 64) || null;
  const now = nowIso();
  await env.DB.prepare("INSERT INTO lead_magnet_captures (id,client_id,slug,name,email,phone,visitor_id,download_token,download_expires,is_test,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,?)")
    .bind(id, found.client, parts[0], name, email, phone || null, visitor, generateOpaqueToken(24), new Date(Date.now() + 30 * 86400000).toISOString(), now).run();
  const { run } = await startRun(env, { client: found.client, kind: KIND, flow: "deliver", ref: id, data: { capture_id: id }, deps: { origin: new URL(request.url).origin } });
  await env.DB.prepare("UPDATE lead_magnet_captures SET run_id=? WHERE id=?").bind(run.id, id).run();
  // They get the same answer whether or not the email step worked; a failed run shows in the client's run history to retry.
  return json({ ok: true });
}
