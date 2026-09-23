// Native Integrations view for the operator shell (Phase 3, task 3.4).
// Kendo layout: hero card that swaps with an icon strip, categorized grid,
// status pill per connector, connect dialog per connection kind, coming-soon
// states, plus Push API keys, outbound webhooks, and payment matching.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (cents, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format((cents || 0) / 100);
  const when = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never");

  // Catalog. kind drives the action:
  //   zernio / zernio_youtube  one sign-in through Zernio's approved apps
  //   onekey                   paste one key; Pulsify registers its own webhook
  //   api_key_team             paste a key or webhook URL
  //   push / team_social       informational rows
  const CATALOG = [
    { group: "Social", note: "Sign in once. Messages, read receipts and analytics sync on their own.", items: [
      { id: "zernio", name: "Instagram", color: "#e1306c", kind: "zernio", blurb: "DMs, read receipts, profile pictures and account insights in one sign-in." },
      { id: "youtube", name: "YouTube", color: "#ff0033", kind: "zernio_youtube", blurb: "Channel analytics, daily views and audience through one Google sign-in." },
    ] },
    { group: "Payments", note: "Paste one key. Pulsify registers its own webhook and imports the last 90 days.", items: [
      { id: "stripe", name: "Stripe", color: "#635bff", kind: "onekey", blurb: "Payments and refunds, matched to the lead that closed them.", keyLabel: "Restricted key (rk_live_...)", link: "https://dashboard.stripe.com/apikeys", guide: ["In Stripe, open Developers, API keys, then Create restricted key.", "Set Webhook Endpoints to Write. Set Charges, Payment Intents, Checkout Sessions, Invoices and Refunds to Read.", "Copy the key that starts with rk_live_ and paste it here."] },
      { id: "whop", name: "Whop", color: "#ff6243", kind: "onekey", blurb: "Payments and refunds, matched to the lead that closed them.", keyLabel: "Company API key", guide: ["In your Whop company dashboard, open the developer settings and create a company API key.", "Give it permission to manage webhooks and read payments.", "Paste the key here."] },
    ] },
    { group: "Bookings", note: "Booked and cancelled calls land in the pipeline and the bell.", items: [
      { id: "calendly", name: "Calendly", color: "#006bff", kind: "onekey", blurb: "Booked and cancelled calls, attributed to the lead.", keyLabel: "Personal access token", guide: ["In Calendly, open Integrations, then API and webhooks.", "Generate a personal access token and paste it here.", "Webhooks need a paid Calendly plan (Standard or above)."] },
      { id: "calcom", name: "Cal.com", color: "#111827", kind: "onekey", blurb: "Booked, rescheduled and cancelled calls, attributed to the lead.", keyLabel: "API key (cal_live_...)", guide: ["In Cal.com, open Settings, Developer, API keys.", "Create a key with no expiry and paste it here."] },
    ] },
    { group: "Email and alerts", note: "", items: [
      { id: "kit", name: "Kit", color: "#fb6970", kind: "api_key_team", blurb: "Tag buyers and start sequences after opt-in and payment.", fields: [["api_key", "Kit v4 API key", true], ["tag_id", "Tag id (optional)", false]] },
      { id: "discord", name: "Discord", color: "#5865f2", kind: "api_key_team", blurb: "A Discord ping when a prospect replies. Everything else stays in the bell.", fields: [["webhook_url", "Discord channel webhook URL", true]] },
    ] },
    { group: "Automations", note: "", items: [
      { id: "automations", name: "Zapier, Make and n8n", color: "#ff4f00", kind: "push", blurb: "Trigger workflows from Pulsify events and push anything in, with the tools below." },
    ] },
  ];
  const ALL = CATALOG.flatMap((g) => g.items);
  const CLIENT_ONLY = new Set(["stripe", "whop", "calcom", "calendly"]);
  const OPERATOR_ONLY = new Set(["discord", "zernio", "youtube"]);
  const initials = (name) => name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  async function request(path, init = {}, ctx = {}) {
    const r = await fetch(path, { credentials: "same-origin", ...init, headers: { "content-type": "application/json", ...(ctx.operator === false ? {} : { "x-pulsify-operator": "1" }), ...(ctx.headers?.() || {}), ...(init.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw (window.PulsifyShell?.failure ? PulsifyShell.failure(r.status, d.error) : new Error(d.error || "Could not complete that request. Please retry."));
    return d;
  }

  // Loading state shaped like the table that replaces it: one header row, three body rows.
  function tableSkeleton(cols = 4, rows = 3) {
    const cell = (w) => `<td><span class="skeleton int-skel" style="width:${w}%"></span></td>`;
    const widths = [58, 34, 22, 40, 30];
    return `<table class="int-table-skeleton" aria-hidden="true"><thead><tr>${Array.from({ length: cols }, (_, i) => `<th><span class="skeleton int-skel" style="width:${[36, 28, 22, 30, 24][i % 5]}%"></span></th>`).join("")}</tr></thead><tbody>${Array.from({ length: rows }, () => `<tr>${Array.from({ length: cols }, (_, i) => cell(widths[i % 5])).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function pill(state) {
    const map = { connected: ["Connected", "ok"], attention: ["Needs attention", "warn"], disconnected: ["Not connected", "off"], soon: ["Coming soon", "off"], available: ["Available", "off"], team: ["Set up by Pulsify", "off"] };
    const [label, cls] = map[state] || map.disconnected;
    return `<span class="int-pill int-pill-${cls}">${label}</span>`;
  }

  function dialog(title, bodyHtml, onSubmit) {
    const d = document.createElement("dialog");
    d.className = "ps-popover int-dialog";
    d.innerHTML = `<form method="dialog" class="int-form"><h2>${esc(title)}</h2>${bodyHtml}<div class="int-actions"><button type="button" class="ps-control" data-cancel>Cancel</button><button type="submit" class="ps-control int-primary">Save</button></div><p class="int-msg" hidden></p></form>`;
    document.body.append(d);
    d.querySelector("[data-cancel]").onclick = () => d.close();
    d.addEventListener("close", () => d.remove());
    d.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = d.querySelector(".int-msg");
      try { await onSubmit(new FormData(e.target), d); } catch (err) { msg.hidden = false; msg.textContent = err.message; }
    });
    d.showModal();
    return d;
  }

  function secretReveal(d, label, value) {
    d.querySelector("form").innerHTML = `<h2>${esc(label)}</h2><p>Copy this now. It is not shown again.</p><code class="int-secret">${esc(value)}</code><div class="int-actions"><button type="button" class="ps-control" data-copy>Copy</button><button type="button" class="ps-control int-primary" data-done>Done</button></div>`;
    d.querySelector("[data-copy]").onclick = () => navigator.clipboard?.writeText(value);
    d.querySelector("[data-done]").onclick = () => d.close();
  }

  const renders = new WeakMap();
  async function render(root, ctx = {}) {
    const version = {}; renders.set(root, version);
    const current = () => renders.get(root) === version && root.isConnected;
    const api = (path, init) => request(path, init, ctx);
    const errorIn = (box, retry) => { box.classList.remove("skeleton"); box.innerHTML = `<p class="int-empty">Could not load this section. <button class="ps-control" data-retry>Retry</button></p>`; box.querySelector("[data-retry]").onclick = retry; };
    root.innerHTML = `<h1>Integrations</h1><p class="ps-subtitle">Sign in once per service. Payments, bookings and conversations then flow into Pulsify on their own.</p><div class="int-list">${Array.from({ length: 5 }, () => '<div class="int-row skeleton" style="height:72px;margin-bottom:8px"></div>').join("")}</div>`;
    const client = ctx.client || "";
    let clients = Array.isArray(ctx.clients) ? ctx.clients : [];
    if (ctx.operator !== false && !clients.length) {
      try { clients = (await api("/api/clients")).clients || []; } catch { errorIn(root, () => render(root, ctx)); return; }
      ctx = { ...ctx, clients };
    }
    const scope = client ? "client" : "operator";
    const qs = client ? `?scope=client&client=${encodeURIComponent(client)}` : "?scope=operator";
    let integrations = [];
    try { integrations = (await api(`/api/integrations${qs}`)).integrations || []; } catch { if (current()) errorIn(root, () => render(root, ctx)); return; }
    if (!current()) return;
    const status = new Map(integrations.map((i) => [i.provider, i]));
    const allowed = (item) => client ? !OPERATOR_ONLY.has(item.id) : !CLIENT_ONLY.has(item.id);
    let zernio = null;
    if (!client) { try { zernio = await api("/api/zernio"); } catch { zernio = null; } }

    const notice = (() => {
      const q = new URLSearchParams(location.search);
      const z = q.get("zernio");
      if (z === "connected") return "Instagram connected. History is replaying in the background; the tracker fills in over the next few minutes.";
      if (z === "youtube-connected") return "YouTube connected. Channel analytics appear on the YouTube page within a few minutes.";
      if (z === "error") return `Connection failed: ${q.get("detail") || "unknown error"}`;
      return "";
    })();
    const youtubeConnected = Boolean(status.get("zernio")?.config?.youtube_account_id);
    const stateFor = (item) => {
      if (!allowed(item)) return client ? "team" : "disconnected";
      if (item.kind === "push") return "available";
      if (item.kind === "zernio") return zernio?.connected ? "connected" : zernio?.configured ? "disconnected" : "attention";
      if (item.kind === "zernio_youtube") return youtubeConnected ? "connected" : "disconnected";
      const record = status.get(item.id);
      return record?.connected ? "connected" : record ? "attention" : "disconnected";
    };
    const detailFor = (item, state) => {
      const record = status.get(item.id);
      if (item.kind === "zernio" && zernio?.connected) return `Connected as @${zernio.account?.username || ""}${zernio.webhook?.registered ? "" : ". Live updates are not registered yet"}`;
      if (item.kind === "zernio" && zernio && !zernio.configured) return "Zernio key missing on the server";
      if (item.kind === "zernio_youtube" && youtubeConnected) return `Connected${status.get("zernio")?.config?.youtube_channel ? ` as ${status.get("zernio").config.youtube_channel}` : ""}`;
      if (state === "team") return client ? "Your Pulsify team manages this connection" : "";
      if (!record) return "";
      if (state === "connected") return record.config?.connected_via === "one-key" ? `Connected ${record.config.connected_at ? new Date(record.config.connected_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}${record.last_event_ts ? `, last event ${new Date(record.last_event_ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ", waiting for the first event"}` : "Connected";
      return "Saved but incomplete. Reconnect to finish setup.";
    };
    const actionFor = (item, state) => {
      if (ctx.readOnly) return `<span class="int-note">Read only</span>`;
      if (!allowed(item)) return client ? "" : `<span class="int-note">Pick a client above</span>`;
      if (item.kind === "push") return `<a class="ps-control" href="#int-dev">Open developer tools</a>`;
      if (item.kind === "zernio") {
        if (!zernio?.configured) return "";
        if (zernio.connected) return `${zernio.webhook?.registered ? "" : `<button class="ps-control" data-zernio-webhook>Turn on live updates</button>`}<a class="ps-control ghost" href="/api/zernio?action=connect">Reconnect</a><button class="ps-control ghost" data-zernio-disconnect>Disconnect</button>`;
        return `<a class="ps-control int-primary" href="/api/zernio?action=connect">Connect Instagram</a>`;
      }
      if (item.kind === "zernio_youtube") return youtubeConnected ? `<a class="ps-control ghost" href="/api/zernio?action=connect&platform=youtube">Reconnect</a>` : zernio?.configured ? `<a class="ps-control int-primary" href="/api/zernio?action=connect&platform=youtube">Connect with Google</a>` : "";
      return state === "connected"
        ? `<button class="ps-control ghost" data-connect="${item.id}">Update</button><button class="ps-control ghost" data-disconnect="${item.id}">Disconnect</button>`
        : `<button class="ps-control int-primary" data-connect="${item.id}">${state === "attention" ? "Finish setup" : "Connect"}</button>`;
    };
    const rowFor = (item) => {
      const state = stateFor(item);
      const detail = detailFor(item, state);
      return `<li class="int-row" data-item="${item.id}">
        <span class="int-logo" style="--brand:${item.color}">${esc(initials(item.name))}</span>
        <div class="int-row-text"><strong>${esc(item.name)}</strong><small>${esc(item.blurb)}</small></div>
        <div class="int-row-state">${pill(state)}${detail ? `<small>${esc(detail)}</small>` : ""}</div>
        <div class="int-row-cta">${actionFor(item, state)}</div>
      </li>`;
    };

    const draw = () => {
      if (!current()) return;
      const connectedCount = ALL.filter((i) => allowed(i) && stateFor(i) === "connected").length;
      const usable = ALL.filter((i) => allowed(i) && i.kind !== "push").length;
      root.innerHTML = `
        <div class="int-head"><div><h1>Integrations</h1><p class="ps-subtitle">${client ? "The tools this workspace runs on." : "Sign in once per service. Payments, bookings and conversations then flow into Pulsify on their own."}</p></div>
        ${clients.length ? `<label class="int-scope"><span>Workspace</span><select class="ps-control" data-workspace><option value="">Pulsify (you)</option>${clients.map((row) => `<option value="${esc(row.client)}" ${row.client === client ? "selected" : ""}>${esc(row.client_name || row.client)}</option>`).join("")}</select></label>` : ""}</div>
        <p class="int-summary"><b>${connectedCount}</b> of ${usable} connected${client ? "" : " for your workspace"}</p>
        ${notice ? `<p class="int-notice">${esc(notice)}</p>` : ""}
        <div class="int-list">${CATALOG.map((g) => {
          const items = g.items.filter((i) => allowed(i) || (!client && CLIENT_ONLY.has(i.id)) || (client && ["zernio", "youtube"].includes(i.id)));
          return items.length ? `<section class="int-group"><h2>${esc(g.group)}</h2>${g.note ? `<p class="int-group-note">${esc(g.note)}</p>` : ""}<ul>${items.map(rowFor).join("")}</ul></section>` : "";
        }).join("")}</div>
        ${client && ctx.operator !== false ? `<h2>Payment matching</h2><p class="ps-subtitle">Confirm which lead each payment belongs to. Only confirmed matches count toward cash collected.</p><div id="int-matches" class="int-table">${tableSkeleton(5)}</div>` : ""}
        <section id="int-dev" class="int-dev">
          <h2>Developer tools</h2><p class="ps-subtitle">For Zapier, Make, n8n or your own code. <a href="/docs/push-api" target="_blank" rel="noopener">Read the docs</a>.</p>
          <h3>Push API keys</h3><p class="int-group-note">Send leads, messages, metrics and payments into Pulsify.</p>
          <div id="int-keys" class="int-table">${tableSkeleton(4)}</div>
          <h3>Outbound webhooks</h3><p class="int-group-note">Signed events delivered to any HTTPS URL. Three attempts with backoff. Verify <code>X-Pulsify-Signature</code>.</p>
          <div id="int-hooks" class="int-table">${tableSkeleton(4)}</div>
        </section>`;
      root.querySelector("[data-workspace]")?.addEventListener("change", (event) => render(root, { ...ctx, client: event.target.value }));
      root.querySelectorAll("[data-connect]").forEach((b) => b.addEventListener("click", () => connect(ALL.find((i) => i.id === b.dataset.connect))));
      root.querySelector("[data-zernio-webhook]")?.addEventListener("click", async (e) => { e.target.disabled = true; try { await api("/api/zernio", { method: "POST", body: JSON.stringify({ action: "register-webhook" }) }); } catch (err) { e.target.textContent = err.message.slice(0, 40); return; } await render(root, ctx); });
      root.querySelector("[data-zernio-disconnect]")?.addEventListener("click", async (event) => { if (!confirm("Disconnect Instagram? The inbox stops syncing until you connect again.")) return; try { await api("/api/zernio", { method: "POST", body: JSON.stringify({ action: "disconnect" }) }); await render(root, ctx); } catch { event.target.textContent = "Retry disconnect"; } });
      root.querySelectorAll("[data-disconnect]").forEach((b) => b.addEventListener("click", async (event) => { const item = ALL.find((i) => i.id === b.dataset.disconnect); if (!confirm(`Disconnect ${item.name}? New events stop arriving until you connect again.`)) return; try { await api("/api/integrations", { method: "DELETE", body: JSON.stringify({ scope, client, provider: item.id }) }); await render(root, ctx); } catch { event.target.textContent = "Retry disconnect"; } }));
      drawKeys(); drawHooks(); if (client && ctx.operator !== false) drawMatches();
    };

    const connect = (item) => {
      if (item.kind === "onekey") {
        const steps = `<ol class="int-steps">${item.guide.map((g) => `<li>${esc(g)}</li>`).join("")}</ol>${item.link ? `<p class="int-note"><a href="${esc(item.link)}" target="_blank" rel="noopener">Open ${esc(item.name)} in a new tab</a></p>` : ""}`;
        const d = dialog(`Connect ${item.name}`, `${steps}<label>${esc(item.keyLabel)}<input name="api_key" type="password" autocomplete="off" required spellcheck="false"></label><p class="int-note">Pulsify checks the key, registers its own webhook in ${esc(item.name)} and stores the signing secret. Nothing else to copy.</p>`, async (fd, dlg) => {
          const button = dlg.querySelector("button[type=submit]");
          button.disabled = true; button.textContent = "Connecting...";
          try {
            const r = await api(`/api/integrations${qs}`, { method: "POST", body: JSON.stringify({ scope, client, provider: item.id, action: "autoconnect", api_key: String(fd.get("api_key") || "").trim() }) });
            dlg.querySelector("form").innerHTML = `<h2>${esc(item.name)} connected</h2><p>${r.account ? `${esc(r.account)}. ` : ""}Webhook registered. New ${item.id === "calendly" || item.id === "calcom" ? "bookings" : "payments"} arrive within seconds${item.id === "stripe" || item.id === "whop" ? ", and the last 90 days import on the next sync" : ""}.</p><div class="int-actions"><button type="button" class="ps-control int-primary" data-done>Done</button></div>`;
            dlg.querySelector("[data-done]").onclick = () => dlg.close();
            dlg.addEventListener("close", () => render(root, ctx), { once: true });
          } catch (err) { button.disabled = false; button.textContent = "Connect"; throw err; }
        });
        d.querySelector("button[type=submit]").textContent = "Connect";
        return;
      }
      const fields = (item.fields || []).map(([k, label, secret]) => `<label>${esc(label)}<input name="${k}" type="${secret ? "password" : "text"}" autocomplete="off"></label>`).join("");
      dialog(`Connect ${item.name}`, fields, async (fd, d) => {
        const config = {}; const secrets = {};
        for (const [k, , secret] of item.fields || []) { const v = String(fd.get(k) || "").trim(); if (!v) continue; (secret ? secrets : config)[k] = v; }
        await api(`/api/integrations${qs}`, { method: "POST", body: JSON.stringify({ scope, client, provider: item.id, config, secrets }) });
        d.close(); await render(root, ctx);
      });
    };

    const drawKeys = async () => {
      const box = root.querySelector("#int-keys"); if (!box) return;
      const { keys = [] } = await api(`/api/api-keys${qs}`).catch(() => { errorIn(box, drawKeys); return { keys: null }; });
      if (!keys || !current()) return;
      box.classList.remove("skeleton");
      box.innerHTML = `<table><thead><tr><th>Key</th><th>Label</th><th>Created</th><th>Last used</th><th></th></tr></thead><tbody>${keys.length ? keys.map((k) => `<tr class="${k.revoked_at ? "int-muted" : ""}"><td><code>${esc(k.key_prefix)}…</code></td><td>${esc(k.label || "")}</td><td>${when(k.created_at)}</td><td>${when(k.last_used_at)}</td><td>${k.revoked_at ? "Revoked" : ctx.readOnly ? "Read only" : `<button class="ps-control" data-revoke="${esc(k.id)}">Revoke</button>`}</td></tr>`).join("") : `<tr><td colspan="5" class="int-empty">No keys yet. Create one to start pushing data in.</td></tr>`}</tbody></table>${ctx.readOnly ? "" : `<div class="int-actions"><button class="ps-control int-primary" data-newkey>Create API key</button></div>`}`;
      box.querySelector("[data-newkey]")?.addEventListener("click", () => dialog("Create API key", `<label>Label<input name="label" placeholder="zapier"></label>`, async (fd, d) => {
        const r = await api(`/api/api-keys${qs}`, { method: "POST", body: JSON.stringify({ scope, client, label: fd.get("label") }) });
        secretReveal(d, "Your API key", r.secret); d.addEventListener("close", drawKeys, { once: true });
      }));
      box.querySelectorAll("[data-revoke]").forEach((b) => (b.onclick = async () => { await api(`/api/api-keys${qs}&id=${encodeURIComponent(b.dataset.revoke)}`, { method: "DELETE" }); drawKeys(); }));
    };

    const drawHooks = async () => {
      const box = root.querySelector("#int-hooks"); if (!box) return;
      const { endpoints = [], events = [] } = await api(`/api/webhooks${qs}`).catch(() => { errorIn(box, drawHooks); return { endpoints: null }; });
      if (!endpoints || !current()) return;
      box.classList.remove("skeleton");
      box.innerHTML = `<table><thead><tr><th>URL</th><th>Events</th><th>Status</th><th></th></tr></thead><tbody>${endpoints.length ? endpoints.map((e) => `<tr><td><code>${esc(e.url)}</code></td><td>${e.events.length} events</td><td>${e.active ? pill("connected") : pill("disconnected")}</td><td class="int-row-actions"><button class="ps-control" data-test="${esc(e.id)}">Send test</button><button class="ps-control" data-log="${esc(e.id)}">History</button><button class="ps-control" data-del="${esc(e.id)}">Delete</button></td></tr>`).join("") : `<tr><td colspan="4" class="int-empty">No endpoints yet. Add one to receive signed events.</td></tr>`}</tbody></table><div class="int-actions"><button class="ps-control int-primary" data-newhook>Add endpoint</button></div>`;
      if (ctx.readOnly) box.querySelectorAll("[data-newhook],[data-test],[data-del]").forEach(b => b.disabled = true);
      box.querySelector("[data-newhook]").onclick = () => dialog("Add webhook endpoint", `<label>HTTPS URL<input name="url" type="url" placeholder="https://hooks.zapier.com/..." required></label><label>Description<input name="description"></label><fieldset class="int-events"><legend>Events</legend>${events.map((ev) => `<label class="int-check"><input type="checkbox" name="events" value="${esc(ev)}" checked> ${esc(ev)}</label>`).join("")}</fieldset>`, async (fd, d) => {
        const r = await api(`/api/webhooks${qs}`, { method: "POST", body: JSON.stringify({ scope, client, url: fd.get("url"), description: fd.get("description"), events: fd.getAll("events") }) });
        secretReveal(d, "Signing secret", r.secret); d.addEventListener("close", drawHooks, { once: true });
      });
      box.querySelectorAll("[data-test]").forEach((b) => (b.onclick = async () => { await api(`/api/webhooks${qs}&id=${encodeURIComponent(b.dataset.test)}&action=test`, { method: "POST", body: "{}" }); b.textContent = "Queued"; setTimeout(() => (b.textContent = "Send test"), 2000); }));
      box.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => { await api(`/api/webhooks${qs}&id=${encodeURIComponent(b.dataset.del)}`, { method: "DELETE" }); drawHooks(); }));
      box.querySelectorAll("[data-log]").forEach((b) => (b.onclick = async () => {
        const { deliveries = [] } = await api(`/api/webhooks${qs}&id=${encodeURIComponent(b.dataset.log)}&view=deliveries`);
        dialog("Delivery history", `<table class="int-mini"><thead><tr><th>Event</th><th>Attempt</th><th>Status</th><th>Code</th><th>Sent</th></tr></thead><tbody>${deliveries.length ? deliveries.map((x) => `<tr><td>${esc(x.event || "")}</td><td>${x.attempt}</td><td>${esc(x.status)}</td><td>${x.status_code ?? ""}</td><td>${when(x.sent_at)}</td></tr>`).join("") : '<tr><td colspan="5" class="int-empty">Nothing delivered yet.</td></tr>'}</tbody></table>`, async (_, d) => d.close());
      }));
    };

    const drawMatches = async () => {
      const box = root.querySelector("#int-matches"); if (!box) return;
      const results = await Promise.all(["suggested", "unlinked", "confirmed"].map((s) => api(`/api/payment-matches?client=${encodeURIComponent(client)}&status=${s}`))).catch(() => null);
      if (!current()) return;
      if (!results) { errorIn(box, drawMatches); return; }
      const [sug, unl, conf] = results;
      box.classList.remove("skeleton");
      const row = (m, actions) => `<tr><td>${money(m.amount_cents, m.currency)}${m.refunded_cents ? ` <small>(${money(m.refunded_cents, m.currency)} refunded)</small>` : ""}</td><td>${esc(m.customer_name || m.customer_email || m.reference)}</td><td>${when(m.occurred_at)}</td><td>${esc(m.target_label || "")}${m.confidence != null ? ` <small>${Math.round(m.confidence * 100)}% · ${esc((m.reasons || []).join(", "))}</small>` : ""}</td><td class="int-row-actions">${actions}</td></tr>`;
      box.innerHTML = `<div class="int-tabs"><button class="active" data-tab="suggested">Suggested <span>${(sug.matches || []).length}</span></button><button data-tab="unlinked">Unlinked <span>${(unl.payments || []).length}</span></button><button data-tab="confirmed">Matched <span>${(conf.matches || []).length}</span></button></div>
        <div data-pane="suggested"><table><thead><tr><th>Amount</th><th>Customer</th><th>Date</th><th>Suggested lead</th><th></th></tr></thead><tbody>${(sug.matches || []).length ? sug.matches.map((m) => row(m, `<button class="ps-control int-primary" data-confirm="${m.id}">Confirm</button><button class="ps-control" data-reject="${m.id}">Not this</button>`)).join("") : '<tr><td colspan="5" class="int-empty">No suggestions. Payments with an exact email match are confirmed automatically.</td></tr>'}</tbody></table></div>
        <div data-pane="unlinked" hidden><table><thead><tr><th>Amount</th><th>Customer</th><th>Date</th><th></th><th></th></tr></thead><tbody>${(unl.payments || []).length ? unl.payments.map((p) => row(p, `<button class="ps-control" data-rematch="${p.id}">Find matches</button><button class="ps-control int-primary" data-attach="${p.id}">Link manually</button>`)).join("") : '<tr><td colspan="5" class="int-empty">Every payment is linked.</td></tr>'}</tbody></table></div>
        <div data-pane="confirmed" hidden><table><thead><tr><th>Amount</th><th>Customer</th><th>Date</th><th>Lead</th><th></th></tr></thead><tbody>${(conf.matches || []).length ? conf.matches.map((m) => row(m, `<button class="ps-control" data-unlink="${m.id}">Unlink</button>`)).join("") : '<tr><td colspan="5" class="int-empty">Nothing confirmed yet.</td></tr>'}</tbody></table></div>`;
      box.querySelectorAll("[data-tab]").forEach((t) => (t.onclick = () => { box.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === t)); box.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== t.dataset.tab)); }));
      const act = (action, extra) => api("/api/payment-matches", { method: "POST", body: JSON.stringify({ client, action, ...extra }) }).then(drawMatches);
      const manualAttach = (paymentId) => dialog("Link payment to a lead", `<label>Search leads<input name="q" placeholder="Name, email or Instagram handle" required></label><div data-candidates class="int-mini"></div>`, async (fd, d) => {
        const result = await api(`/api/payment-matches?client=${encodeURIComponent(client)}&view=candidates&payment_id=${paymentId}&q=${encodeURIComponent(fd.get("q"))}`);
        const target = d.querySelector("[data-candidates]");
        target.innerHTML = result.candidates?.length ? result.candidates.map((candidate, index) => `<button type="button" class="ps-control" data-candidate="${index}">${esc(candidate.label || candidate.email || candidate.id)}${candidate.email ? ` · ${esc(candidate.email)}` : ""}</button>`).join("") : '<p class="int-empty">No matching leads.</p>';
        target.querySelectorAll("[data-candidate]").forEach((button) => button.onclick = async () => { const candidate = result.candidates[Number(button.dataset.candidate)]; await act("attach", { payment_id: paymentId, target: { kind: candidate.kind, id: candidate.id, label: candidate.label || candidate.email || candidate.id } }); d.close(); });
      });
      box.querySelectorAll("[data-confirm]").forEach((b) => (b.onclick = () => act("confirm", { match_id: Number(b.dataset.confirm) })));
      box.querySelectorAll("[data-reject]").forEach((b) => (b.onclick = () => act("unlink", { match_id: Number(b.dataset.reject) })));
      box.querySelectorAll("[data-unlink]").forEach((b) => (b.onclick = () => act("unlink", { match_id: Number(b.dataset.unlink) })));
      box.querySelectorAll("[data-rematch]").forEach((b) => (b.onclick = () => act("rematch", { payment_id: Number(b.dataset.rematch) })));
      box.querySelectorAll("[data-attach]").forEach((b) => (b.onclick = () => manualAttach(Number(b.dataset.attach))));
    };

    draw();
    if (ctx.section === "payments") requestAnimationFrame(() => root.querySelector("#int-matches")?.scrollIntoView({ block: "start" }));
  }

  window.PulsifyIntegrationsView = { render };
})();
