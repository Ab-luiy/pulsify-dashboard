// Native Integrations view for the operator shell (Phase 3, task 3.4).
// Kendo layout: hero card that swaps with an icon strip, categorized grid,
// status pill per connector, connect dialog per connection kind, coming-soon
// states, plus Push API keys, outbound webhooks, and payment matching.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (cents, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format((cents || 0) / 100);
  const when = (iso) => (iso ? new Date(iso).toLocaleString() : "never");

  // Catalog. kind drives the connect dialog. Deferred = coming soon.
  const CATALOG = [
    { group: "Payments and revenue", items: [
      { id: "stripe", name: "Stripe", kind: "webhook_in", blurb: "Match Stripe payments to the lead that closed them.", features: ["Restricted read-only key", "Signed webhooks", "Refunds reverse cash collected", "Ranked lead matching"], fields: [["api_key", "Restricted read-only key", true], ["webhook_secret", "Webhook signing secret", true], ["path_secret", "Endpoint path secret", true]] },
      { id: "whop", name: "Whop", kind: "webhook_in", blurb: "Match Whop payments to the lead that closed them.", features: ["Company API key", "Signed payment and refund events", "Ranked lead matching"], fields: [["api_key", "Company API key", true], ["webhook_secret", "Webhook signing secret", true], ["path_secret", "Endpoint path secret", true]] },
    ] },
    { group: "Email", items: [
      { id: "kit", name: "Kit", kind: "api_key_team", blurb: "Tag buyers and start sequences after opt-in and payment.", features: ["Subscriber creation", "Tagging", "Onboarding broadcast"], fields: [["api_key", "Kit v4 API key", true], ["tag_id", "Tag id", false]] },
    ] },
    { group: "Booking and applications", items: [
      { id: "calcom", name: "Cal.com", kind: "webhook_in", blurb: "Booked calls flow into the pipeline.", features: ["Booking created and cancelled", "Email attribution"], fields: [["path_secret", "Endpoint path secret", true]] },
      { id: "calendly", name: "Calendly", kind: "webhook_in", blurb: "Booked calls flow into the pipeline.", features: ["Booking created and cancelled", "Email attribution"], fields: [["path_secret", "Endpoint path secret", true]] },
    ] },
    { group: "Notifications", items: [
      { id: "discord", name: "Discord", kind: "api_key_team", blurb: "Operator alerts for payments, failures and sync errors.", features: ["Channel alerts", "Sync failure alerts"], fields: [["webhook_url", "Discord webhook URL", true]] },
    ] },
    { group: "Automation", items: [
      { id: "zapier", name: "Zapier", kind: "push", blurb: "Trigger Zaps from Pulsify events and push anything in.", features: ["Outbound signed webhooks", "Push API input", "Thousands of app actions"] },
      { id: "make", name: "Make", kind: "push", blurb: "Trigger scenarios from Pulsify events.", features: ["Outbound signed webhooks", "Push API input"] },
      { id: "n8n", name: "n8n", kind: "push", blurb: "Self-hosted workflows on Pulsify events.", features: ["Outbound signed webhooks", "Push API input"] },
    ] },
    { group: "Social", items: [
      { id: "zernio", name: "Instagram inbox (Zernio)", kind: "zernio", blurb: "Log into Instagram once through Zernio's approved Meta app. DMs, read receipts, profile pictures and follower context flow into the outreach tracker in real time.", features: ["One-click Instagram login, no Meta review", "Read receipts: seen and left-on-read become real", "Profile pictures and follower count per contact", "Replies arrive by webhook within seconds"] },
      { id: "instagram", name: "Instagram insights", kind: "deferred", blurb: "Reels, posts and story metrics through the tester path today. Native OAuth after Meta verification.", features: ["Reels, posts and story metrics", "Native OAuth: coming soon"] },
      { id: "youtube", name: "YouTube", kind: "deferred", blurb: "Public channel stats today. Analytics OAuth after Google verification.", features: ["Channel and latest-video stats every 6 hours", "Analytics OAuth: coming soon"] },
    ] },
  ];
  const ALL = CATALOG.flatMap((g) => g.items);
  const CLIENT_ONLY = new Set(["stripe", "whop", "calcom", "calendly"]);
  const OPERATOR_ONLY = new Set(["discord", "zernio"]);

  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1", ...(init?.headers || {}) }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }

  function pill(state) {
    const map = { connected: ["Connected", "ok"], attention: ["Needs attention", "warn"], disconnected: ["Not connected", "off"], soon: ["Coming soon", "off"] };
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

  async function render(root, ctx) {
    root.innerHTML = `<h1>Integrations</h1><p class="ps-subtitle">Connect the tools you already run on. Payments, bookings and automations flow into Pulsify automatically.</p><div class="int-hero skeleton" style="height:220px"></div><div class="ps-grid" style="margin-top:24px">${Array.from({ length: 6 }, () => '<div class="ps-card skeleton"></div>').join("")}</div>`;
    const client = ctx.client || "";
    const clients = Array.isArray(ctx.clients) ? ctx.clients : [];
    const scope = client ? "client" : "operator";
    const qs = client ? `?scope=client&client=${encodeURIComponent(client)}` : "?scope=operator";
    let integrations = [];
    try { integrations = (await api(`/api/integrations${qs}`)).integrations || []; } catch { integrations = []; }
    const status = new Map(integrations.map((i) => [i.provider, i]));
    const allowed = (item) => client ? !OPERATOR_ONLY.has(item.id) : !CLIENT_ONLY.has(item.id);
    let zernio = null;
    if (!client) { try { zernio = await api("/api/zernio"); } catch { zernio = null; } }
    const zernioNotice = new URLSearchParams(location.search).get("zernio");
    const stateOf = (item) => !allowed(item) ? "disconnected" : item.kind === "deferred" ? "soon" : item.kind === "push" ? "connected" : item.kind === "zernio" ? (zernio?.connected ? "connected" : zernio?.configured ? "disconnected" : "attention") : status.get(item.id)?.connected ? "connected" : status.get(item.id) ? "attention" : "disconnected";

    let active = client ? ALL[0] : ALL.find((item) => allowed(item));
    const draw = () => {
      const s = stateOf(active);
      root.innerHTML = `
        <h1>Integrations</h1><p class="ps-subtitle">Connect the tools you already run on. Payments, bookings and automations flow into Pulsify automatically.</p>
        ${clients.length ? `<label class="int-scope">Workspace<select data-workspace><option value="">Pulsify operator</option>${clients.map((row) => `<option value="${esc(row.client)}" ${row.client === client ? "selected" : ""}>${esc(row.client_name || row.client)}</option>`).join("")}</select></label>` : ""}
        <section class="int-hero">
          <div class="int-hero-main">
            <span class="int-eyebrow">${esc(CATALOG.find((g) => g.items.includes(active)).group)}</span>
            <div class="int-hero-title"><span class="int-icon">${esc(active.name.slice(0, 2))}</span><h2>${esc(active.name)}</h2>${pill(s)}</div>
            <p>${esc(active.blurb)}</p>
            <div class="int-hero-actions">${heroAction(active, s)}</div>
          </div>
          <div class="int-hero-side"><ul>${active.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>
        </section>
        <div class="int-strip">${ALL.map((i) => `<button class="int-chip ${i === active ? "active" : ""}" data-pick="${i.id}"><span class="int-dot int-dot-${stateOf(i)}"></span>${esc(i.name)}</button>`).join("")}</div>
        ${CATALOG.map((g) => `<h2>${esc(g.group)}</h2><div class="ps-grid">${g.items.map((i) => `<button class="ps-card int-card" data-pick="${i.id}"><span class="int-icon">${esc(i.name.slice(0, 2))}</span><strong>${esc(i.name)}</strong><small>${esc(i.blurb)}</small>${pill(stateOf(i))}</button>`).join("")}</div>`).join("")}
        <h2>Push API keys</h2><p class="ps-subtitle">Send leads, messages, metrics and payments into Pulsify from Zapier, Make, n8n or your own code. <a href="/docs/push-api" target="_blank" rel="noopener">Read the docs</a>.</p>
        <div id="int-keys" class="int-table skeleton" style="min-height:64px"></div>
        <h2>Outbound webhooks</h2><p class="ps-subtitle">Signed events delivered to any HTTPS URL. Three attempts with backoff. Verify <code>X-Pulsify-Signature</code>.</p>
        <div id="int-hooks" class="int-table skeleton" style="min-height:64px"></div>
        ${client ? `<h2>Payment matching</h2><p class="ps-subtitle">Confirm which lead each payment belongs to. Only confirmed matches count toward cash collected.</p><div id="int-matches" class="int-table skeleton" style="min-height:64px"></div>` : ""}`;
      root.querySelectorAll("[data-pick]").forEach((b) => (b.onclick = () => { active = ALL.find((i) => i.id === b.dataset.pick); draw(); }));
      root.querySelector("[data-workspace]")?.addEventListener("change", (event) => render(root, { ...ctx, client: event.target.value }));
      root.querySelector("[data-connect]")?.addEventListener("click", () => connect(active));
      root.querySelector("[data-zernio-webhook]")?.addEventListener("click", async (e) => { e.target.disabled = true; try { await api("/api/zernio", { method: "POST", body: JSON.stringify({ action: "register-webhook" }) }); } catch (err) { e.target.textContent = err.message.slice(0, 40); return; } await render(root, ctx); });
      root.querySelector("[data-zernio-disconnect]")?.addEventListener("click", async () => { await api("/api/zernio", { method: "POST", body: JSON.stringify({ action: "disconnect" }) }); await render(root, ctx); });
      root.querySelector("[data-disconnect]")?.addEventListener("click", async () => { await api("/api/integrations", { method: "DELETE", body: JSON.stringify({ scope, client, provider: active.id }) }); await render(root, ctx); });
      drawKeys(); drawHooks(); if (client) drawMatches();
    };

    const heroAction = (item, s) => {
      if (ctx.readOnly) return `<span class="int-note">Operator preview is read only. Sign in as the client to change connections.</span>`;
      if (!allowed(item)) return `<span class="int-note">${client ? "This connector belongs to the operator workspace." : "Choose a client workspace above to configure this connector."}</span>`;
      if (item.kind === "deferred") return `<span class="int-note">Available after platform review. The current path already works through the sync Worker.</span>`;
      if (item.kind === "zernio") {
        if (!zernio?.configured) return `<span class="int-note">Add <code>ZERNIO_API_KEY</code> to the Pages project and the sync Worker, then reload.</span>`;
        const notice = zernioNotice === "connected" ? `<span class="int-note">Connected. History is replaying in the background; the tracker fills in over the next few minutes.</span>` : zernioNotice === "error" ? `<span class="int-note">Connection failed: ${esc(new URLSearchParams(location.search).get("detail") || "unknown")}</span>` : "";
        if (zernio.connected) return `${notice}<span class="int-note">@${esc(zernio.account?.username || "")} connected ${esc(zernio.account?.connected_at ? new Date(zernio.account.connected_at).toLocaleDateString() : "")}. Webhook ${zernio.webhook?.registered ? "registered" : zernio.webhook?.secret_set ? "not registered yet" : "needs ZERNIO_WEBHOOK_SECRET on Pages"}.</span>${zernio.webhook?.registered ? "" : `<button class="ps-control" data-zernio-webhook>Register webhook</button>`}<a class="ps-control" href="/api/zernio?action=connect">Reconnect</a><button class="ps-control" data-zernio-disconnect>Disconnect</button>`;
        return `${notice}<a class="ps-control int-primary" href="/api/zernio?action=connect">Log in with Instagram</a><span class="int-note">Opens Zernio's Instagram login. First 2 accounts are free on Zernio.</span>`;
      }
      if (item.kind === "push") return `<a class="ps-control int-primary" href="#int-keys">Create an API key</a><a class="ps-control" href="/docs/push-api" target="_blank" rel="noopener">Docs</a>`;
      return s === "connected" ? `<button class="ps-control" data-connect>Update</button><button class="ps-control" data-disconnect>Disconnect</button>` : `<button class="ps-control int-primary" data-connect>Connect ${esc(item.name)}</button>`;
    };

    const connect = (item) => {
      const fields = (item.fields || []).map(([k, label, secret]) => `<label>${esc(label)}<input name="${k}" type="${secret ? "password" : "text"}" autocomplete="off" ${secret ? "" : ""}></label>`).join("");
      const hint = item.kind === "webhook_in" ? `<p class="int-note">Webhook URL for ${esc(item.name)}: <code>${esc(location.origin)}/api/hooks/${item.id}/{path secret}</code>. Paste the same path secret below.</p>` : "";
      dialog(`Connect ${item.name}`, hint + fields, async (fd, d) => {
        const config = {}; const secrets = {};
        for (const [k, , secret] of item.fields || []) { const v = String(fd.get(k) || "").trim(); if (!v) continue; (secret ? secrets : config)[k] = v; }
        await api(`/api/integrations${qs}`, { method: "POST", body: JSON.stringify({ scope, client, provider: item.id, config, secrets }) });
        d.close(); await render(root, ctx);
      });
    };

    const drawKeys = async () => {
      const box = root.querySelector("#int-keys"); if (!box) return;
      const { keys = [] } = await api(`/api/api-keys${qs}`).catch(() => ({ keys: [] }));
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
      const { endpoints = [], events = [] } = await api(`/api/webhooks${qs}`).catch(() => ({}));
      box.classList.remove("skeleton");
      box.innerHTML = `<table><thead><tr><th>URL</th><th>Events</th><th>Status</th><th></th></tr></thead><tbody>${endpoints.length ? endpoints.map((e) => `<tr><td><code>${esc(e.url)}</code></td><td>${e.events.length} events</td><td>${e.active ? pill("connected") : pill("disconnected")}</td><td class="int-row-actions"><button class="ps-control" data-test="${esc(e.id)}">Send test</button><button class="ps-control" data-log="${esc(e.id)}">History</button><button class="ps-control" data-del="${esc(e.id)}">Delete</button></td></tr>`).join("") : `<tr><td colspan="4" class="int-empty">No endpoints yet. Add one to receive signed events.</td></tr>`}</tbody></table><div class="int-actions"><button class="ps-control int-primary" data-newhook>Add endpoint</button></div>`;
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
      const [sug, unl, conf] = await Promise.all(["suggested", "unlinked", "confirmed"].map((s) => api(`/api/payment-matches?client=${encodeURIComponent(client)}&status=${s}`).catch(() => ({}))));
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
