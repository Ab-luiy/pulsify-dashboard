// Client setup: the native replacement for the console's Clients panel and
// its 8-step add-client wizard. One page, sectioned like Settings. Every
// section saves on its own with the same partial /api/settings POST the wizard
// used (the backend keeps whatever keys are absent), so nothing here overwrites
// a field the operator did not touch. A new client is the same page with an
// empty record and a Create client primary that posts {client, client_name}
// exactly as wizard step 1 did.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MAX_MEDIA_BYTES = 900 * 1024;
  // Same 29 template tokens console.js CONTENT_FIELDS exposes, same order.
  const CONTENT_FIELDS = [
    { key: "BRAND_MARK", label: "Brand mark", meaning: "The name shown at the top of the page." },
    { key: "AUDIENCE_PILL", label: "Audience line", meaning: "The qualifier line above the headline." },
    { key: "HEADLINE_LINE_ONE", label: "Headline, first line", meaning: "The opening line of the main promise." },
    { key: "HEADLINE_EMPHASIS", label: "Headline, highlighted line", meaning: "The accent-colored line that completes the main promise." },
    { key: "HERO_SUBHEAD", label: "Subheadline", meaning: "The short explanation under the headline.", area: true },
    { key: "HERO_CTA", label: "Hero button text", meaning: "The action text on the first button." },
    { key: "VIDEO_NOTE_PRIMARY", label: "Video caption, left", meaning: "The first short note under the VSL." },
    { key: "VIDEO_NOTE_SECONDARY", label: "Video caption, right", meaning: "The second short note under the VSL." },
    { key: "VIDEO_LABEL", label: "Video overlay label", meaning: "The short label inside the hero video frame." },
    { key: "APPLY_STEP_LABEL", label: "Application step label", meaning: "The small step marker above the application." },
    { key: "APPLY_HEADING", label: "Application heading", meaning: "The headline that introduces the application form." },
    { key: "APPLY_INTRO", label: "Application intro", meaning: "The short explanation before the application form.", area: true },
    { key: "PROOF_KICKER", label: "Proof section kicker", meaning: "The small label above the proof block." },
    { key: "PROOF_HEADING", label: "Proof section heading", meaning: "The main heading above the student-proof section." },
    { key: "PROOF_INTRO", label: "Proof section intro", meaning: "The short introduction above the proof wall.", area: true },
    { key: "CASE_STUDY_LABEL", label: "Case-study label", meaning: "The small label above each video case-study card." },
    { key: "CASE_STUDY_CARD_ONE", label: "Case-study card one", meaning: "The first video case-study headline.", area: true },
    { key: "CASE_STUDY_CARD_TWO", label: "Case-study card two", meaning: "The second video case-study headline.", area: true },
    { key: "CASE_STUDY_CARD_THREE", label: "Case-study card three", meaning: "The third video case-study headline.", area: true },
    { key: "CLOSING_CTA", label: "Closing button text", meaning: "The action text on the final page button." },
    { key: "CLOSING_NOTE", label: "Closing note", meaning: "The small note under the final CTA.", area: true },
    { key: "PAGE_TITLE", label: "Browser tab title", meaning: "The title shown in the browser tab and link previews." },
    { key: "META_DESCRIPTION", label: "Search and share description", meaning: "The description used by search engines and shared links.", area: true },
    { key: "FOOTER_LABEL", label: "Footer name", meaning: "The name shown in the page footer." },
    { key: "FOOTER_DISCLAIMER", label: "Footer disclaimer", meaning: "The factual disclaimer shown at the bottom of the page.", area: true },
    { key: "BRAND_NOTE", label: "Brand note", meaning: "The small note beside the brand mark in variant 2." },
    { key: "MICRO_NOTE", label: "Hero micro-note", meaning: "The small line below the hero button in variant 2." },
    { key: "FORM_FRAME_LABEL", label: "Form frame label", meaning: "The small label around the form in variant 2." },
    { key: "FORM_FRAME_NOTE", label: "Form frame note", meaning: "The supporting note around the form in variant 2." },
  ];
  const SEQUENCE_TYPES = ["value-driven", "credibility", "q&a", "day-in-the-life", "breakdown", "lifestyle", "cta", "start-here", "story launch"];
  const DELETE_TABLES = ["client_config", "content_items", "call_notes", "client_assets", "client_brain", "proof_items", "payments", "integrations", "integration_events", "delivery_failures", "email_drafts", "studio_carousels", "page_events", "media"];
  const SECTIONS = [["identity", "Identity"], ["funnel", "Funnel connections"], ["proof", "Proof wall"], ["copy", "Landing page"], ["login", "Dashboard login"], ["dashboard", "Client dashboard"], ["performance", "Performance"], ["access", "Client access links"], ["contract", "Contract"], ["prospect", "Prospect page"], ["danger", "Delete client"]];

  // Same request shape console.js api() sends: operator header, JSON, and the
  // server's {ok:false,error} is never painted, only the authored fallback.
  async function api(url, init) {
    const r = await fetch(url, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
    return d;
  }
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const slugify = (value) => String(value || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  const sanitizeSlug = (value) => { const slug = String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); return /^[a-z0-9][a-z0-9_-]{1,63}$/.test(slug) ? slug : ""; };
  const proofValues = (images) => (!images || typeof images !== "object") ? [] : Object.values(images).map((u) => String(u || "").trim()).filter(Boolean);
  const proofPayload = (urls) => Object.fromEntries(urls.map((u) => u.trim()).filter(Boolean).map((u, i) => [String(i + 1), u]));
  const formatJson = (value) => (value == null ? "" : JSON.stringify(value, null, 2));
  const parseJsonEditor = (value, label) => { const text = String(value || "").trim(); if (!text) return null; try { return JSON.parse(text); } catch { throw new Error(`${label} JSON is not valid. Fix the JSON or leave the box blank.`); } };
  const parseCommaIntegers = (value) => String(value || "").split(",").map((v) => v.trim()).filter(Boolean).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n >= 0).map((n) => Math.round(n));
  const number = (v) => Number(v || 0).toLocaleString("en-US");
  const stripCodeFences = (text) => { let value = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim(); const s = value.indexOf("{"), e = value.lastIndexOf("}"); if (s !== -1 && e > s) value = value.slice(s, e + 1); return value; };
  async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

  const field = (label, inner, hint, cls = "") => `<label class="set-field ${cls}"><span>${esc(label)}</span>${inner}${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
  const input = (id, attrs = "", value = "") => `<input class="set-input" id="${id}" data-key="${id}" value="${esc(value)}" ${attrs}>`;
  const area = (id, rows, value = "", attrs = "") => `<textarea class="set-input" id="${id}" data-key="${id}" rows="${rows}" ${attrs}>${esc(value)}</textarea>`;
  const actions = (label, extra = "") => `<div class="set-actions"><button type="submit" class="ps-button primary" ${extra}>${esc(label)}</button><span class="set-status" role="status"></span></div>`;
  const savedState = (isSet, label) => `<span class="cs-saved ${isSet ? "set" : ""}">${isSet ? `Saved ${label} is set. Leave the field blank to keep it.` : `No saved ${label} reported.`}</span>`;
  const section = (id, title, blurb, html) => `<section class="set-section" id="cs-${id}" data-section="${id}"><div class="set-head"><h2>${esc(title)}</h2><p>${esc(blurb)}</p></div>${html}</section>`;
  const skeleton = () => SECTIONS.slice(0, 6).map(([, t]) => `<section class="set-section set-loading" aria-label="Loading ${esc(t)}"><div class="set-head"><div class="skeleton"></div><div class="skeleton"></div></div>${'<div class="set-row"><div class="skeleton"></div><div class="skeleton"></div></div>'.repeat(3)}</section>`).join("");

  function render(root, ctx = {}) {
    let client = String(ctx.client || "").trim();
    let data = null, config = null, created = Boolean(client), disposed = false, sequence = 0;
    let clients = Array.isArray(ctx.clients) ? ctx.clients : [];
    let performance = { rows: [], weekSummary: null, weeklyReport: null, latest: null, prior: null, editingId: null };
    let preview = { open: false, timer: null };
    const dirty = new Set();
    root.innerHTML = `<div class="ps-page-header cs-head"><div><button type="button" class="ps-button ghost cs-back" data-back>${PulsifyShell.icon("chevron-left")}Clients</button><h1>${created ? "Client setup" : "Add a client"}</h1><p class="ps-subtitle">${created ? "Landing page, funnel tools, login and portal links for one workspace." : "The name and permanent ID create the client. Everything else can be added after."}</p></div><div class="cs-head-actions"><button type="button" class="ps-control" data-preview-toggle ${created ? "" : "hidden"}>Preview draft</button><button type="button" class="ps-control" data-refresh ${created ? "" : "hidden"}>Refresh</button></div></div><div class="cs-layout"><div class="set-layout"><nav class="set-nav" aria-label="Setup sections"></nav><div class="set-body"></div></div><aside class="cs-preview" hidden aria-label="Live landing-page preview"><header><div><strong>Live draft</strong><small>Updates after you pause typing. Draft changes are not saved.</small></div><button type="button" class="ps-control ghost" data-preview-close>Close</button></header><div class="cs-preview-frame"><iframe title="Live draft landing-page preview"></iframe></div></aside></div>`;
    const $ = (sel) => root.querySelector(sel);
    const body = $(".set-body"), nav = $(".set-nav"), previewPane = $(".cs-preview"), frame = previewPane.querySelector("iframe");
    const visibleSections = () => (created ? SECTIONS : SECTIONS.filter(([id]) => ["identity", "prospect"].includes(id)));
    nav.innerHTML = visibleSections().map(([id, t]) => `<span class="set-nav-item">${esc(t)}</span>`).join("");
    body.innerHTML = created ? skeleton() : "";
    $("[data-back]").onclick = () => leave(() => ctx.onBack?.());
    $("[data-refresh]").onclick = () => leave(load);
    $("[data-preview-toggle]").onclick = () => togglePreview();
    $("[data-preview-close]").onclick = () => togglePreview(false);
    const onMessage = (event) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow || !event.data) return;
      if (event.data.type === "pulsify-focus-token" && event.data.token) return jump(root.querySelector(`[data-content-key="${CSS.escape(event.data.token)}"]`));
      if (event.data.type === "pulsify-focus-field") jump({ wistia_media_id: $("#wistia_media_id"), typeform_url: $("#typeform_url"), proof_images: root.querySelector(".cs-proof-input") }[event.data.field]);
    };
    const onBeforeUnload = (e) => { if (dirty.size) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("message", onMessage);
    window.addEventListener("beforeunload", onBeforeUnload);
    frame.addEventListener("load", () => { postDraft(0); setTimeout(() => postDraft(0), 500); });

    function become(slug) {
      client = slug; created = true; data = null; config = null; dirty.clear(); preview.open = false; previewPane.hidden = true; frame.removeAttribute("src"); root.querySelector(".cs-layout").classList.remove("has-preview");
      $("h1").textContent = "Client setup"; $(".ps-subtitle").textContent = "Landing page, funnel tools, login and portal links for one workspace.";
      $("[data-preview-toggle]").hidden = false; $("[data-preview-toggle]").textContent = "Preview draft"; $("[data-refresh]").hidden = false;
      nav.innerHTML = visibleSections().map(([, t]) => `<span class="set-nav-item">${esc(t)}</span>`).join("");
      load();
    }
    async function leave(next) {
      if (!dirty.size) return next();
      if (await PulsifySurface.confirm("Discard unsaved changes?", "One or more sections have edits that are not saved. Leaving drops them.", "Discard")) { dirty.clear(); next(); }
    }
    function jump(el) { if (!el) return; el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); }

    async function load() {
      if (!created) { draw(); if (!clients.length) api("/api/clients").then((d) => { if (disposed || created) return; clients = d.clients || []; if ($("#client")) validateIdentity(); }).catch(() => {}); return; }
      const current = ++sequence;
      body.innerHTML = skeleton();
      try {
        const [settings, list] = await Promise.all([api(`/api/settings?client=${encodeURIComponent(client)}`), clients.length ? Promise.resolve({ clients }) : api("/api/clients").catch(() => ({ clients: [] }))]);
        if (disposed || current !== sequence || !root.isConnected) return;
        data = settings; config = settings.config ? { ...settings.config, client: settings.config.client || client } : null; clients = list.clients || clients;
        dirty.clear(); draw();
        loadPerformance();
      } catch (e) { if (!disposed && current === sequence) { body.replaceChildren(); PulsifyShell.inlineError(body, e, load); } }
    }

    function checklist() {
      const c = config || {};
      const proofCount = proofValues(c.proof_images).length;
      return [
        { section: "identity", label: "Client name", set: Boolean(c.client_name || c.client) },
        { section: "funnel", label: "VSL video", set: Boolean(c.wistia_media_id) },
        { section: "funnel", label: "Application form", set: Boolean(c.typeform_url) },
        { section: "funnel", label: "Email automation", set: Boolean(c.kit_tag_id && c.kit_api_key_set) },
        { section: "proof", label: "Proof wall", set: proofCount > 0 },
      ];
    }

    function draw() {
      const c = config || {}, auth = data?.dashboard_auth || null, content = data?.dashboard_content || {};
      const emailReady = Boolean(auth?.email_delivery_available);
      const pending = created ? checklist().filter((i) => !i.set) : [];
      const previewLinks = created ? `<div class="cs-links"><span>Preview this client</span><a class="ps-button ghost" href="/?client=${encodeURIComponent(client)}&preview=canonical&operator_preview=1" target="_blank" rel="noopener">Standard design</a><a class="ps-button ghost" href="/?client=${encodeURIComponent(client)}&preview=variant-02&operator_preview=1" target="_blank" rel="noopener">Variant 2</a></div>` : "";
      const parts = [];
      if (pending.length) parts.push(`<div class="cs-checklist"><div><strong>Finish this client setup</strong><small>${pending.length} of ${checklist().length} steps still to add.</small></div><div class="cs-checklist-items">${pending.map((i) => `<button type="button" class="ps-control" data-jump="${i.section}">${esc(i.label)}</button>`).join("")}</div></div>`);
      if (created && !config) parts.push(`<p class="set-readonly">No landing page saved for <code>${esc(client)}</code> yet. Save the identity section to create its configuration.</p>`);
      parts.push(section("identity", "Identity", created ? "The public name and the design their page renders with." : "Their name creates the client immediately. You can add every other setting later.", `
        <form class="set-form" data-save="identity"><div class="set-grid">
          ${field("Client name", input("client_name", 'maxlength="120" autocomplete="off" placeholder="Enter the public display name" required', c.client_name || ""), "The name shown on the landing page and portal. Blank falls back to the client ID.")}
          ${field("Client ID", input("client", `autocomplete="off" spellcheck="false" placeholder="Enter a permanent client slug" ${created ? "disabled" : "required"}`, client), created ? "Locked. It is used in URLs and the database and never changes." : "Lowercase letters, numbers and dashes. It becomes permanent when the client is created.")}
          ${created ? field("Landing page design", `<select class="set-input" id="template_variant" data-key="template_variant"><option value="canonical" ${c.template_variant !== "variant-02" ? "selected" : ""}>Standard design</option><option value="variant-02" ${c.template_variant === "variant-02" ? "selected" : ""}>Variant 2</option></select>`, "Which approved page design renders this client's copy.") : ""}
        </div><p class="cs-slug-status" role="status" data-slug-status></p>${previewLinks}${actions(created ? "Save identity" : "Create client")}</form>`));
      if (created) {
        parts.push(section("funnel", "Funnel connections", "Video, form, email and event origin.", `
          <form class="set-form" data-save="funnel"><div class="set-grid">
            ${field("Wistia media ID", input("wistia_media_id", 'placeholder="Paste the Wistia video code"', c.wistia_media_id || ""), "The short code in the VSL's Wistia URL. Blank makes the page show its video placeholder.")}
            ${field("Typeform link", input("typeform_url", 'type="url" placeholder="Paste the application form URL"', c.typeform_url || ""), "The public share URL from Typeform. Blank means no embedded application form.")}
            ${field("Kit tag ID", input("kit_tag_id", 'inputmode="numeric" placeholder="Paste the Kit tag number"', c.kit_tag_id || ""), "The number in the Kit tag's URL. Leads receive this tag to start automation.")}
            ${field("Kit v4 API key", input("kit_api_key", 'type="password" autocomplete="new-password" placeholder="Paste a new key or leave blank"'), "Create it in Kit under Settings, then Developer. Blank keeps the saved key.")}
          </div>${savedState(Boolean(c.kit_api_key_set), "API key")}
          <details class="cs-advanced"><summary>Advanced</summary><p class="set-muted">Security values are normally configured once. Leave write-only fields blank to keep their saved values.</p><div class="set-grid">
            ${field("Typeform webhook secret", input("typeform_webhook_secret", 'type="password" autocomplete="new-password" placeholder="Paste a new secret or leave blank"'), "The password configured on the Typeform webhook. Blank keeps the saved secret.")}
            ${field("Landing-page origin", input("allowed_origin", 'type="url" placeholder="Paste the exact allowed web address"', c.allowed_origin || ""), "The exact domain permitted to send visitor events. Blank uses the backend default.")}
          </div>${savedState(Boolean(c.typeform_webhook_secret_set), "webhook secret")}</details>
          ${actions("Save connections")}</form>`));
        parts.push(section("proof", "Proof wall", "Upload screenshots or paste hosted image URLs. They show in this order.", `
          <form class="set-form" data-save="proof">
            <div class="cs-drop"><input id="cs-proof-file" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden><label for="cs-proof-file" class="cs-drop-zone"><strong>Drop proof screenshots here</strong><span>or choose files. Images resize to 1600px and must compress below 900KB.</span></label><div class="cs-upload-queue" aria-live="polite"></div></div>
            <p class="cs-divider"><span>Or paste hosted image URLs</span></p>
            <div class="cs-proof-list"></div>
            <div class="set-actions"><button type="button" class="ps-control" data-proof-add>Add URL row</button><button type="submit" class="ps-button primary">Save proof wall</button><span class="set-status" role="status"></span></div>
          </form>`));
        parts.push(section("copy", "Landing page", "The live page words and whether the page is on. Blank fields use the template's generic default.", `
          <div class="set-row"><div><strong>Page active</strong><small>Off hides the landing page and its tracked link. Saved the moment you flip it.</small></div><label class="set-toggle cs-toggle"><input type="checkbox" data-page-active ${c.page_active !== false ? "checked" : ""}><span></span></label></div>
          <form class="set-form" data-save="copy"><div class="set-grid">${CONTENT_FIELDS.map((f) => field(f.label, f.area ? `<textarea class="set-input" data-content-key="${f.key}" rows="3" placeholder="Leave blank for the template default">${esc((c.page_content || {})[f.key] || "")}</textarea>` : `<input class="set-input" data-content-key="${f.key}" value="${esc((c.page_content || {})[f.key] || "")}" placeholder="Leave blank for the template default">`, f.meaning, f.area ? "cs-span" : "")).join("")}</div>${actions("Save page copy")}</form>`));
        parts.push(section("login", "Dashboard login", "Set the login email, then copy or email the one-time set-password link.", `
          <form class="set-form" data-save="login"><div class="set-grid">
            ${field("Login email", input("dashboard_email", 'type="email" placeholder="Paste the client login email"', auth?.email || ""), "The inbox this client signs in with. The setup link writes it to the dashboard auth record.")}
            <div class="set-field"><span>Set-password link</span><small>${esc(auth?.email_delivery_hint || "Setup-link emails are off until RESEND_API_KEY is set.")} A new link turns off the previous one.</small></div>
          </div>${savedState(Boolean(auth?.has_password), "dashboard password")}
          <div class="set-actions cs-wrap"><button type="submit" class="ps-button primary" data-setup-link>Copy dashboard setup link</button><button type="button" class="ps-control" data-setup-email ${emailReady ? "" : "disabled"}>Email setup link</button><button type="button" class="ps-control" data-provision title="Runs the same signed-to-live flow DocuSign and payments trigger: workspace, setup link, welcome email, launch checklist. Safe to press twice.">Provision now</button><span class="set-status" role="status"></span></div><div class="cs-result" data-login-result hidden></div></form>`));
        parts.push(section("dashboard", "Client dashboard", "Four sections feed the client dashboard shell. Valid JSON, or blank to keep that section empty.", `
          <form class="set-form" data-save="dashboard"><div class="set-grid">
            ${field("Plans JSON", area("plans", 6, formatJson(content.plans), 'placeholder=\'[{"title":"Phase 1","status":"In progress","detail":"Landing page live"}]\''), "Array or object. Plain factual roadmap data only.")}
            ${field("To-dos JSON", area("todos", 6, formatJson(content.todos), 'placeholder=\'[{"label":"Upload three screenshots","owner":"Client","deadline":"2026-07-18","done":false}]\''), "Array or object with an items array. Each item has a label and can include owner, deadline and done.")}
            ${field("Team JSON", area("team", 6, formatJson(content.team), 'placeholder=\'[{"name":"Abdullah","role":"Strategy","note":"Handles offer and weekly direction"}]\''), "Array or object. Names, roles and short notes.")}
            ${field("Momentum JSON", area("momentum", 6, formatJson(content.momentum), 'placeholder=\'{"headline":"First system week complete","shipped":["Landing page built"],"next":["Record VSL"]}\''), "Array or object. Shipped, shipping, deltas, or a short headline.")}
          </div>${actions("Save dashboard sections")}</form>`));
        parts.push(section("performance", "Performance", "Log story-sequence performance and weekly follower snapshots for the client.", `
          <div class="cs-perf-summary" data-perf-summary></div>
          <form class="set-form" data-save="sequence"><h3>Sequence log</h3><div class="set-grid">
            ${field("Sequence date", input("seq_date", 'type="date"', todayIso()))}
            ${field("Sequence type", `<select class="set-input" id="seq_type" data-key="seq_type">${SEQUENCE_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select>`)}
            ${field("Topic", input("seq_topic", 'placeholder="What was this sequence about?"'), "", "cs-span")}
            ${field("Slide count", input("seq_slides", 'type="number" min="1" max="30"', "8"))}
            ${field("Per-slide views", input("seq_views", 'placeholder="1000, 400, 380, 370"'))}
            ${field("DMs", input("seq_dms", 'type="number" min="0" placeholder="Optional"'))}
            ${field("Profile visits", input("seq_visits", 'type="number" min="0" placeholder="Optional"'))}
            ${field("Notes", area("seq_notes", 3, "", 'placeholder="What mattered here?"'), "", "cs-span")}
          </div><div class="set-actions"><button type="submit" class="ps-button primary" data-seq-save>Save sequence log</button><button type="button" class="ps-control" data-seq-clear>Clear</button><span class="set-status" role="status"></span></div></form>
          <form class="set-form" data-save="snapshot"><h3>Weekly snapshot</h3><div class="set-grid">
            ${field("Snapshot date", input("snap_date", 'type="date"', todayIso()))}
            ${field("Followers", input("snap_followers", 'type="number" min="0" placeholder="Required" required'))}
            ${field("ICP leads", input("snap_icp", 'type="number" min="0" placeholder="Optional"'))}
            ${field("Average views", input("snap_views", 'type="number" min="0" placeholder="Optional"'))}
            ${field("Notes", area("snap_notes", 3, "", 'placeholder="What changed this week?"'), "", "cs-span")}
          </div>${actions("Save snapshot")}</form>
          <div class="cs-perf-list" data-perf-list></div>`));
        parts.push(section("access", "Client access links", "Generate the private portal and onboarding URLs together. A new token turns off both previous links.", `
          <div class="set-actions"><button type="button" class="ps-button primary" data-portal>Generate client access links</button><span class="set-status" role="status"></span></div><div class="cs-result" data-portal-result hidden></div>`));
        parts.push(section("contract", "Contract", "Signed contract to workspace. A verified completed DocuSign contract creates the workspace and sends the registration link.", `
          <div class="set-actions"><button type="button" class="ps-control" data-contract>Check onboarding connection</button><span class="set-status" role="status"></span></div><div class="cs-result" data-contract-result hidden></div>`));
      }
      parts.push(section("prospect", "Prospect page from a brief", "Paste a quote-rich creator brief, generate the page JSON, then create the page. It saves its own client ID from the JSON.", `
        <form class="set-form" data-save="prospect">
          ${field("Creator brief", area("brief", 7, "", 'placeholder="Paste the quote-rich creator brief"'), "The niche, mechanism, proof and voice notes from Lead Studio or your research. Blank means there is nothing to give the generator.")}
          <div class="set-actions cs-wrap"><button type="button" class="ps-control" data-copy-prompt>Copy landing-page prompt</button><button type="button" class="ps-control" data-generate>Generate with API</button><span class="set-status" role="status" data-brief-status></span></div>
          ${field("Generated page JSON", area("page_json", 7, "", 'placeholder="Paste the JSON returned by your LLM"'), "The structured result from the copied prompt or the Generate button. Review the copy before saving it.")}
          ${actions("Create page")}
          <div class="cs-result" data-prospect-result hidden></div>
        </form>`));
      if (created) parts.push(section("danger", "Delete this client", `Permanently remove ${c.client_name || client} (${client}) and every record tied to them. This cannot be undone.`, `<div class="set-actions"><button type="button" class="ps-button cs-danger" data-delete>Delete client</button></div>`));
      body.innerHTML = parts.join("");
      nav.innerHTML = visibleSections().map(([id, t], i) => `<button type="button" class="set-nav-item ${i === 0 ? "active" : ""}" data-jump="${id}">${esc(t)}</button>`).join("");
      root.querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => { nav.querySelectorAll(".set-nav-item").forEach((x) => x.classList.toggle("active", x.dataset.jump === b.dataset.jump)); $(`#cs-${b.dataset.jump}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
      bind();
      if (created) { renderProof(proofValues(c.proof_images)); renderPerformance(); }
      if (created && preview.open) reloadPreview();
    }

    // Dirty tracking: any input inside a data-save form marks that form.
    function bind() {
      body.querySelectorAll("form[data-save]").forEach((form) => {
        form.addEventListener("input", () => { if (!["sequence", "snapshot", "prospect", "login"].includes(form.dataset.save)) dirty.add(form.dataset.save); if (["funnel", "proof", "copy", "identity"].includes(form.dataset.save)) scheduleDraft(); });
        form.addEventListener("submit", (e) => { e.preventDefault(); submit(form); });
      });
      if (!created) {
        const name = $("#client_name"), slug = $("#client"); let slugEdited = false;
        name.addEventListener("input", () => { if (!slugEdited) slug.value = slugify(name.value); validateIdentity(); });
        slug.addEventListener("input", () => { slugEdited = true; validateIdentity(); });
        slug.addEventListener("blur", () => { slug.value = slug.value.trim(); validateIdentity(); });
        validateIdentity();
      }
      body.querySelector("[data-page-active]")?.addEventListener("change", (e) => togglePageActive(e.target));
      body.querySelector("[data-proof-add]")?.addEventListener("click", () => { renderProof([...proofList(), ""]); body.querySelectorAll(".cs-proof-input")[body.querySelectorAll(".cs-proof-input").length - 1]?.focus(); dirty.add("proof"); });
      body.querySelector(".cs-proof-list")?.addEventListener("click", (e) => { const b = e.target.closest("[data-proof-action]"); if (!b) return; const rows = [...body.querySelectorAll("[data-proof-row]")], i = rows.indexOf(b.closest("[data-proof-row]")), v = proofList(); const a = b.dataset.proofAction; if (a === "remove") v.splice(i, 1); if (a === "up" && i > 0) [v[i - 1], v[i]] = [v[i], v[i - 1]]; if (a === "down" && i < v.length - 1) [v[i + 1], v[i]] = [v[i], v[i + 1]]; renderProof(v); body.querySelectorAll(".cs-proof-input")[a === "up" ? i - 1 : a === "down" ? i + 1 : Math.min(i, Math.max(0, v.length - 1))]?.focus(); dirty.add("proof"); scheduleDraft(); });
      const fileInput = body.querySelector("#cs-proof-file"), drop = body.querySelector(".cs-drop-zone");
      if (fileInput) {
        fileInput.addEventListener("change", () => { uploadProof(fileInput.files); fileInput.value = ""; });
        ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("dragging"); }));
        ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("dragging"); }));
        drop.addEventListener("drop", (e) => uploadProof(e.dataTransfer?.files));
      }
      body.querySelector("[data-setup-email]")?.addEventListener("click", (e) => setupLink(true, e.currentTarget));
      body.querySelector("[data-provision]")?.addEventListener("click", (e) => provision(e.currentTarget));
      body.querySelector("[data-portal]")?.addEventListener("click", (e) => portalLinks(e.currentTarget));
      body.querySelector("[data-contract]")?.addEventListener("click", (e) => contractStatus(e.currentTarget));
      body.querySelector("[data-seq-clear]")?.addEventListener("click", () => clearSequenceForm());
      body.querySelector("[data-copy-prompt]")?.addEventListener("click", copyPrompt);
      body.querySelector("[data-generate]")?.addEventListener("click", (e) => generate(e.currentTarget));
      body.querySelector("[data-delete]")?.addEventListener("click", deleteClient);
    }

    function validateIdentity() {
      const name = $("#client_name").value.trim(), slug = $("#client").value.trim(), status = $("[data-slug-status]");
      const taken = clients.some((x) => x.client === slug);
      status.className = "cs-slug-status";
      if (!slug) { status.textContent = "Use lowercase letters, numbers, and dashes."; return { valid: false, name, slug, taken: false }; }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) { status.textContent = "Use lowercase letters, numbers, and single dashes only."; status.classList.add("invalid"); return { valid: false, name, slug, taken: false }; }
      if (taken) { status.innerHTML = `This client ID already exists. <button type="button" class="cs-link" data-open-existing>Open this client instead</button>`; status.classList.add("taken"); status.querySelector("[data-open-existing]").onclick = () => become(slug); return { valid: false, name, slug, taken: true }; }
      status.textContent = name ? "Available. This ID becomes permanent when the client is created." : "The client name is still required.";
      status.classList.add(name ? "valid" : "invalid");
      return { valid: Boolean(name), name, slug, taken: false };
    }

    const proofList = () => [...body.querySelectorAll(".cs-proof-input")].map((i) => i.value);
    function renderProof(urls) {
      const rows = urls.length ? urls : [""];
      body.querySelector(".cs-proof-list").innerHTML = rows.map((url, i) => `<div class="cs-proof-row" data-proof-row><label class="set-field"><span>Screenshot URL ${i + 1}</span><input class="set-input cs-proof-input" type="url" value="${esc(url)}" placeholder="Paste a direct hosted image URL"></label><div class="cs-proof-actions" aria-label="Reorder screenshot URL ${i + 1}"><button type="button" class="ps-control" data-proof-action="up" ${i === 0 ? "disabled" : ""} aria-label="Move up">${PulsifyShell.icon("chevron-down")}</button><button type="button" class="ps-control" data-proof-action="down" ${i === rows.length - 1 ? "disabled" : ""} aria-label="Move down">${PulsifyShell.icon("chevron-down")}</button><button type="button" class="ps-control" data-proof-action="remove" aria-label="Remove">${PulsifyShell.icon("x")}</button></div></div>`).join("");
    }

    // Same compress-then-POST /api/media flow console.js runs, including the
    // 1600px resize and the 900KB ceiling. XHR keeps the upload progress bar.
    async function uploadProof(fileList) {
      const files = Array.from(fileList || []), queue = body.querySelector(".cs-upload-queue");
      if (!files.length) return;
      const row = (name) => { const r = document.createElement("div"); r.className = "cs-upload-row"; r.innerHTML = `<span class="cs-upload-name">${esc(name)}</span><span class="cs-upload-status">Queued</span><progress max="100" value="0"></progress>`; queue.append(r); return r; };
      const update = (r, status, progress, result = "") => { r.className = `cs-upload-row ${result}`; r.querySelector(".cs-upload-status").textContent = status; r.querySelector("progress").value = Math.max(0, Math.min(100, progress)); };
      for (const file of files) {
        const r = row(file.name);
        try {
          if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use a PNG, JPEG, or WebP image.");
          update(r, "Compressing", 8);
          const compressed = await compressImage(file);
          if (compressed.blob.size > MAX_MEDIA_BYTES) throw new Error(`Still ${Math.round(compressed.blob.size / 1024)}KB after compression. Crop the image or export it smaller, then try again. The upload limit is 900KB.`);
          update(r, `Uploading ${Math.round(compressed.blob.size / 1024)}KB`, 18);
          const dataBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "").split(",")[1] || ""); reader.onerror = () => reject(new Error("The compressed image could not be prepared.")); reader.readAsDataURL(compressed.blob); });
          const result = await new Promise((resolve, reject) => {
            const x = new XMLHttpRequest(); x.open("POST", "/api/media"); x.setRequestHeader("content-type", "application/json"); x.setRequestHeader("x-pulsify-operator", "1");
            x.upload.addEventListener("progress", (e) => { if (e.lengthComputable) update(r, "Uploading", 18 + Math.round((e.loaded / e.total) * 80)); });
            x.addEventListener("load", () => { let d = {}; try { d = JSON.parse(x.responseText || "{}"); } catch { d = {}; } if (x.status < 200 || x.status >= 300 || !d.ok || !d.url) reject(PulsifyShell.failure(x.status, "The upload did not go through. Retry.")); else resolve(d); });
            x.addEventListener("error", () => reject(PulsifyShell.failure(0)));
            x.send(JSON.stringify({ client, filename: String(file.name || "proof").replace(/\.[^.]+$/, "") + "." + compressed.extension, content_type: compressed.blob.type, data_base64: dataBase64 }));
          });
          const v = proofList(), empty = v.findIndex((u) => !String(u).trim()); if (empty >= 0) v[empty] = result.url; else v.push(result.url);
          renderProof(v); dirty.add("proof"); scheduleDraft(0);
          update(r, "Added to proof list", 100, "success");
        } catch (e) { update(r, e.message || "Upload failed.", 100, "error"); }
      }
    }
    async function compressImage(file) {
      const image = await new Promise((resolve, reject) => { const url = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The image could not be read.")); }; img.src = url; });
      const sw = image.naturalWidth || image.width, sh = image.naturalHeight || image.height;
      if (!sw || !sh) throw new Error("The image could not be read.");
      const width = Math.min(1600, sw), height = Math.max(1, Math.round(sh * (width / sw)));
      const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
      const jc = document.createElement("canvas"); jc.width = width; jc.height = height; const jx = jc.getContext("2d"); jx.fillStyle = "#ffffff"; jx.fillRect(0, 0, width, height); jx.drawImage(image, 0, 0, width, height);
      const jpeg = await toBlob(jc, "image/jpeg", 0.85); if (!jpeg) throw new Error("The browser could not compress this image.");
      if (file.type === "image/png") { const pc = document.createElement("canvas"); pc.width = width; pc.height = height; pc.getContext("2d").drawImage(image, 0, 0, width, height); const png = await toBlob(pc, "image/png"); if (png && png.size < jpeg.size) return { blob: png, extension: "png" }; }
      return { blob: jpeg, extension: "jpg" };
    }

    // Every section posts the same partial payload the wizard step or the
    // settings form posted for those keys; nothing else rides along.
    function payloadFor(form) {
      const v = (id) => form.querySelector(`#${id}`)?.value ?? "";
      switch (form.dataset.save) {
        case "identity": return created ? { client, client_name: v("client_name"), template_variant: v("template_variant") } : { client: v("client").trim(), client_name: v("client_name").trim() };
        case "funnel": return { client, wistia_media_id: v("wistia_media_id"), typeform_url: v("typeform_url"), kit_tag_id: v("kit_tag_id"), kit_api_key: v("kit_api_key"), typeform_webhook_secret: v("typeform_webhook_secret"), allowed_origin: v("allowed_origin") };
        case "proof": return { client, proof_images: proofPayload(proofList()) };
        case "copy": return { client, page_content: Object.fromEntries([...form.querySelectorAll("[data-content-key]")].map((i) => [i.dataset.contentKey, i.value.trim()])) };
        case "dashboard": return { client, dashboard_content: { plans: parseJsonEditor(v("plans"), "Plans"), todos: parseJsonEditor(v("todos"), "To-dos"), team: parseJsonEditor(v("team"), "Team"), momentum: parseJsonEditor(v("momentum"), "Momentum") } };
        default: return null;
      }
    }
    async function submit(form) {
      const kind = form.dataset.save, button = form.querySelector("button[type=submit]"), status = form.querySelector(".set-status");
      form.querySelector(":scope > .ps-inline-error")?.remove();
      const note = (text, cls = "") => { status.textContent = text; status.className = "set-status " + cls; };
      if (kind === "sequence") return saveSequence(form, button, note);
      if (kind === "snapshot") return saveSnapshot(form, button, note);
      if (kind === "prospect") return createProspect(form, button, note);
      if (kind === "login") return setupLink(false, button);
      let payload;
      try { payload = payloadFor(form); } catch (e) { note(e.message, "err"); return; }
      if (kind === "identity" && !created) { const id = validateIdentity(); if (!id.valid) { note(id.taken ? "That client ID already exists." : "Enter a client name and a valid permanent client ID.", "err"); return; } }
      PulsifyShell.pending(button); note("Saving…");
      try {
        const d = await api("/api/settings", { method: "POST", body: JSON.stringify(payload) });
        if (disposed) return;
        dirty.delete(kind);
        if (kind === "identity" && !created) {
          clients = [...clients, { client: payload.client, client_name: payload.client_name }];
          ctx.refresh?.(); ctx.onCreated?.(payload.client);
          become(payload.client);
          return;
        }
        if (kind === "funnel") { form.querySelector("#kit_api_key").value = ""; form.querySelector("#typeform_webhook_secret").value = ""; }
        note(kind === "identity" ? "Saved." : kind === "copy" ? `Saved. Typeform webhook: ${d.webhook_url || ""}` : "Saved.", "ok");
        // Refresh the record silently so saved-state hints and the checklist match the server.
        const fresh = await api(`/api/settings?client=${encodeURIComponent(client)}`).catch(() => null);
        if (disposed || !fresh) return;
        data = fresh; config = fresh.config ? { ...fresh.config, client: fresh.config.client || client } : null;
        if (kind === "identity") ctx.refresh?.();
        if (kind === "funnel") form.querySelectorAll(".cs-saved").forEach((el, i) => { const set = i === 0 ? Boolean(config?.kit_api_key_set) : Boolean(config?.typeform_webhook_secret_set); el.className = "cs-saved " + (set ? "set" : ""); el.textContent = set ? `Saved ${i === 0 ? "API key" : "webhook secret"} is set. Leave the field blank to keep it.` : `No saved ${i === 0 ? "API key" : "webhook secret"} reported.`; });
        const list = root.querySelector(".cs-checklist"); const pending = checklist().filter((i) => !i.set);
        if (list) { if (!pending.length) list.remove(); else { list.querySelector("small").textContent = `${pending.length} of ${checklist().length} steps still to add.`; list.querySelector(".cs-checklist-items").innerHTML = pending.map((i) => `<button type="button" class="ps-control" data-jump="${i.section}">${esc(i.label)}</button>`).join(""); list.querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => $(`#cs-${b.dataset.jump}`)?.scrollIntoView({ behavior: "smooth", block: "start" }))); } }
      } catch (e) { note("", ""); PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }

    async function togglePageActive(toggle) {
      const status = toggle.closest(".set-row"); status.querySelector(".ps-inline-error")?.remove(); toggle.disabled = true;
      try { await api("/api/settings", { method: "POST", body: JSON.stringify({ client, page_active: toggle.checked }) }); if (config) config.page_active = toggle.checked; ctx.refresh?.(); }
      catch (e) { toggle.checked = !toggle.checked; PulsifyShell.inlineError(status, e); }
      finally { toggle.disabled = false; }
    }

    async function setupLink(sendEmail, button) {
      const form = body.querySelector('[data-save="login"]'), email = form.querySelector("#dashboard_email").value.trim(), status = form.querySelector(".set-status"), result = form.querySelector("[data-login-result]");
      form.querySelector(":scope > .ps-inline-error")?.remove(); result.hidden = true;
      if (!email) { status.textContent = "Login email is required before generating a dashboard setup link."; status.className = "set-status err"; return; }
      const buttons = [form.querySelector("[data-setup-link]"), form.querySelector("[data-setup-email]")];
      buttons.forEach((b) => PulsifyShell.pending(b)); status.textContent = sendEmail ? "Sending…" : "Generating…"; status.className = "set-status";
      try {
        const d = await api("/api/client-setup-link", { method: "POST", body: JSON.stringify({ client, email, send_email: sendEmail }) });
        if (disposed) return;
        result.hidden = false;
        result.innerHTML = sendEmail ? `Setup link emailed to ${esc(email)}.<br><a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a>` : `<a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a>${d.note ? `<br>${esc(d.note)}` : ""}`;
        if (d.warning) result.innerHTML += `<br>${esc(d.warning)}`;
        if (!sendEmail) { const copied = await copyText(d.link); status.textContent = copied ? "Setup link copied." : "Setup link ready. Copy it below."; } else status.textContent = "Sent.";
        status.className = "set-status ok";
      } catch (e) { status.textContent = ""; PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(buttons[0], false); PulsifyShell.pending(buttons[1], false); buttons[1].disabled = !data?.dashboard_auth?.email_delivery_available; }
    }
    async function provision(button) {
      const form = body.querySelector('[data-save="login"]'), email = form.querySelector("#dashboard_email").value.trim(), name = ($("#client_name")?.value || "").trim(), status = form.querySelector(".set-status"), result = form.querySelector("[data-login-result]");
      form.querySelector(":scope > .ps-inline-error")?.remove();
      if (!email) { status.textContent = "Client and login email are required before provisioning."; status.className = "set-status err"; return; }
      PulsifyShell.pending(button); status.textContent = "Provisioning…"; status.className = "set-status";
      try {
        const d = await api("/api/provision", { method: "POST", body: JSON.stringify({ client, email, name }) });
        if (disposed) return;
        const welcome = d.welcome?.state || d.welcome_state || "";
        result.hidden = false; result.textContent = d.duplicate ? `Already provisioned as ${d.client || client}. Nothing was re-sent.` : `Provisioned ${d.client || client}. Welcome email: ${welcome || "not attempted"}. Setup link is live for 48 hours.`;
        status.textContent = d.duplicate ? "Already provisioned." : "Provisioned."; status.className = "set-status " + (d.duplicate ? "" : "ok");
      } catch (e) { status.textContent = ""; PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }
    async function portalLinks(button) {
      const sec = $("#cs-access"), status = sec.querySelector(".set-status"), result = sec.querySelector("[data-portal-result]");
      sec.querySelector(".ps-inline-error")?.remove(); PulsifyShell.pending(button); status.textContent = "Generating…"; status.className = "set-status";
      try {
        const d = await api(`/api/portal-token?client=${encodeURIComponent(client)}`, { method: "POST" });
        if (disposed) return;
        const onboarding = `${location.origin}/onboard/?client=${encodeURIComponent(client)}&t=${encodeURIComponent(d.token || "")}`;
        result.hidden = false; result.innerHTML = `<strong>Client portal</strong><br><a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a><br><br><strong>Client onboarding</strong><br><a href="${esc(onboarding)}" target="_blank" rel="noopener">${esc(onboarding)}</a>${d.note ? `<br><br>${esc(d.note)}` : ""}`;
        status.textContent = "Links generated. Previous links are off."; status.className = "set-status ok";
      } catch (e) { status.textContent = ""; PulsifyShell.inlineError(sec, e); }
      finally { PulsifyShell.pending(button, false); }
    }
    async function contractStatus(button) {
      const sec = $("#cs-contract"), status = sec.querySelector(".set-status"), result = sec.querySelector("[data-contract-result]");
      sec.querySelector(".ps-inline-error")?.remove(); PulsifyShell.pending(button); status.textContent = "Checking contract onboarding…"; status.className = "set-status";
      try {
        const d = await api("/api/contract-status");
        if (disposed) return;
        result.hidden = false; result.replaceChildren();
        const line = document.createElement("p"); line.textContent = d.configured ? "Configuration present. Test a completed contract before using this with clients." : "Setup required: " + (d.missing || []).join(", "); result.append(line);
        const steps = document.createElement("p"); steps.textContent = `In DocuSign Connect, use JSON SIM with HMAC, recipients and custom fields. URL: ${d.webhook}. Use the ${d.role} signer role and envelope custom field pulsify_portal=true.`; result.append(steps);
        const mine = (d.rows || []).filter((r) => r.client_id === client), rows = mine.length ? mine : (d.rows || []);
        if (rows.length) { const table = document.createElement("div"); table.className = "int-table cs-contract-rows"; table.innerHTML = `<table><thead><tr><th>Client</th><th>State</th><th>Created</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.client_id)}</td><td><span class="int-pill ${r.state === "delivered" || r.state === "live" ? "int-pill-ok" : ""}">${esc(r.state)}</span></td><td>${esc(r.created_at)}</td></tr>`).join("")}</tbody></table>`; result.append(table); }
        else result.append(PulsifySurface.empty("clipboard", "No contracts recorded", "Completed DocuSign contracts land here once Connect is pointed at the webhook above.", "Copy webhook URL", () => copyText(d.webhook)));
        status.textContent = d.configured ? "Connected." : "Setup required."; status.className = "set-status " + (d.configured ? "ok" : "err");
      } catch (e) { status.textContent = ""; PulsifyShell.inlineError(sec, e); }
      finally { PulsifyShell.pending(button, false); }
    }

    // Performance: same two metrics endpoints and the same payloads.
    async function loadPerformance() {
      const current = sequence;
      try {
        const [seq, weekly] = await Promise.all([api(`/api/metrics-sequences?client=${encodeURIComponent(client)}`), api(`/api/metrics-weekly?client=${encodeURIComponent(client)}`)]);
        if (disposed || current !== sequence) return;
        performance = { rows: Array.isArray(seq.rows) ? seq.rows : [], weekSummary: seq.week_summary || null, weeklyReport: weekly.report || null, latest: weekly.latest || null, prior: weekly.prior || null, editingId: null };
        renderPerformance();
      } catch (e) { if (disposed || current !== sequence) return; performance = { rows: [], weekSummary: null, weeklyReport: null, latest: null, prior: null, editingId: null }; renderPerformance(); const list = body.querySelector("[data-perf-list]"); if (list) PulsifyShell.inlineError(list, e, loadPerformance); }
    }
    function renderPerformance() {
      const summary = body.querySelector("[data-perf-summary]"), list = body.querySelector("[data-perf-list]");
      if (!summary) return;
      const s = performance.weekSummary || {}, r = performance.weeklyReport || {};
      const metric = (label, value, note) => `<div class="ps-kpi"><small>${esc(label)}</small><b>${esc(value)}</b><small>${esc(note)}</small></div>`;
      const wv = (m) => (m?.value == null ? "-" : Number(m.value).toLocaleString(undefined, { maximumFractionDigits: 2 })), wd = (m) => (m?.value == null ? (m?.hint || "Not logged yet.") : m?.delta == null ? (m?.hint || "Need another weekly snapshot.") : `${Number(m.delta) > 0 ? "+" : ""}${Number(m.delta).toLocaleString(undefined, { maximumFractionDigits: 2 })} vs prior week`);
      const mix = (m) => { const e = Object.entries(m || {}); return e.length ? e.map(([k, v]) => `${k}: ${v}`).join(", ") : "no logged sequences yet"; };
      summary.innerHTML = `<div class="ps-kpis cs-kpis">${metric("This week", number(s.sequences_this_week || 0), `${number(s.cadence_floor || 3)} minimum, ${number(s.cadence_target_min || 5)} to ${number(s.cadence_target_max || 7)} target`)}${metric("Last week", number(s.sequences_last_week || 0), s.cadence_status || "week status")}${metric("Followers", wv(r.followers), wd(r.followers))}${metric("ICP leads", wv(r.icp_leads), wd(r.icp_leads))}${metric("Follower to view", wv(r.follower_to_view_ratio), wd(r.follower_to_view_ratio))}${metric("Dollars per follower", wv(r.dollars_per_follower), wd(r.dollars_per_follower))}</div><p class="set-muted">This week type mix: ${esc(mix(s.type_mix_current_week))}. Last week: ${esc(mix(s.type_mix_prior_week))}. Latest snapshot: ${performance.latest ? `${esc(performance.latest.taken_on)}, ${number(performance.latest.followers)} followers` : "not logged yet"}. Prior: ${performance.prior ? `${esc(performance.prior.taken_on)}, ${number(performance.prior.followers)} followers` : "need one more weekly snapshot"}.</p>`;
      if (!performance.rows.length) { list.replaceChildren(PulsifySurface.empty("bar-chart", "No sequence metrics yet", "Log the first tracked sequence to turn on the diagnostics.", "Log a sequence", () => jump($("#seq_topic")))); return; }
      list.innerHTML = `<div class="int-table"><table><thead><tr><th>Sequence</th><th>Posted</th><th>Diagnostic</th><th>Completion</th><th>Drop-off</th><th>DMs</th><th></th></tr></thead><tbody>${performance.rows.map((row) => `<tr class="${performance.editingId === row.id ? "cs-editing" : ""}"><td><strong>${esc(row.topic || row.type || "Sequence")}</strong><small>${esc(row.type || "sequence")}, ${(row.slide_views || []).length} slides${row.biggest_drop_slide ? `, biggest drop at slide ${row.biggest_drop_slide}` : ""}</small></td><td>${esc(row.posted_on || "")}</td><td><span class="int-pill ${row.diagnostic === "healthy" ? "int-pill-ok" : "int-pill-warn"}">${esc(row.diagnostic || "monitor")}</span></td><td>${row.completion_pct == null ? "-" : row.completion_pct + "%"}</td><td>${row.dropoff_pct == null ? "-" : row.dropoff_pct + "%"}</td><td>${row.dms == null ? "-" : number(row.dms)}</td><td><div class="int-row-actions"><button type="button" class="ps-control" data-perf-edit="${row.id}">Edit</button></div></td></tr>`).join("")}</tbody></table></div>`;
      list.querySelectorAll("[data-perf-edit]").forEach((b) => (b.onclick = () => editSequence(Number(b.dataset.perfEdit))));
    }
    function editSequence(id) {
      const row = performance.rows.find((x) => x.id === id); if (!row) return;
      performance.editingId = id;
      const set = (k, v) => { const el = $(`#${k}`); if (el) el.value = v; };
      set("seq_date", row.posted_on || todayIso()); set("seq_type", row.type || SEQUENCE_TYPES[0]); set("seq_topic", row.topic || ""); set("seq_slides", row.slide_count || (row.slide_views || []).length || 8); set("seq_views", Array.isArray(row.slide_views) ? row.slide_views.join(", ") : ""); set("seq_dms", row.dms == null ? "" : row.dms); set("seq_visits", row.profile_visits == null ? "" : row.profile_visits); set("seq_notes", row.notes || "");
      const form = body.querySelector('[data-save="sequence"]'); form.querySelector("[data-seq-save]").textContent = "Save changes"; const st = form.querySelector(".set-status"); st.textContent = "Editing a logged sequence."; st.className = "set-status";
      renderPerformance(); jump($("#seq_topic"));
    }
    function clearSequenceForm() {
      performance.editingId = null;
      const form = body.querySelector('[data-save="sequence"]'); if (!form) return;
      form.reset(); $("#seq_date").value = todayIso(); $("#seq_slides").value = 8; form.querySelector("[data-seq-save]").textContent = "Save sequence log"; form.querySelector(".set-status").textContent = "";
      renderPerformance();
    }
    async function saveSequence(form, button, note) {
      PulsifyShell.pending(button); note("Saving…");
      try {
        const d = await api("/api/metrics-sequences", { method: "POST", body: JSON.stringify({ client, id: performance.editingId || undefined, posted_on: $("#seq_date").value, type: $("#seq_type").value, topic: $("#seq_topic").value.trim(), slide_count: Number($("#seq_slides").value || 0), slide_views: parseCommaIntegers($("#seq_views").value), dms: $("#seq_dms").value.trim(), profile_visits: $("#seq_visits").value.trim(), notes: $("#seq_notes").value.trim() }) });
        if (disposed) return;
        clearSequenceForm(); note(d.updated ? "Sequence log updated." : "Sequence log saved.", "ok"); loadPerformance();
      } catch (e) { note(""); PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }
    async function saveSnapshot(form, button, note) {
      PulsifyShell.pending(button); note("Saving…");
      try {
        await api("/api/metrics-weekly", { method: "POST", body: JSON.stringify({ client, taken_on: $("#snap_date").value, followers: $("#snap_followers").value.trim(), icp_leads: $("#snap_icp").value.trim(), avg_views: $("#snap_views").value.trim(), notes: $("#snap_notes").value.trim() }) });
        if (disposed) return;
        form.reset(); $("#snap_date").value = todayIso(); note("Snapshot saved.", "ok"); loadPerformance();
      } catch (e) { note(""); PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }

    // Prospect page: the New prospect panel. Copy prompt is local, Generate
    // posts {brief} to /api/generate, Create posts the parsed JSON to /api/settings.
    function briefNote(text, cls = "") { const s = body.querySelector("[data-brief-status]"); s.textContent = text; s.className = "set-status " + cls; }
    async function copyPrompt() {
      const builder = window.PulsifyProvisionPrompt;
      if (!builder) { briefNote("The prompt builder did not load. Reload the page and try again.", "err"); return; }
      briefNote((await copyText(builder.buildPrompt($("#brief").value))) ? "Landing-page prompt copied." : "The browser blocked copying. Select the generated prompt manually.", "ok");
    }
    async function generate(button) {
      const brief = $("#brief").value.trim(); const form = body.querySelector('[data-save="prospect"]'); form.querySelector(":scope > .ps-inline-error")?.remove();
      if (!brief) { briefNote("Paste a creator brief first.", "err"); return; }
      PulsifyShell.pending(button); briefNote("Generating…");
      try {
        const r = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, body: JSON.stringify({ brief }) });
        const d = await r.json().catch(() => ({}));
        if (r.status === 501) throw Object.assign(new Error("No server LLM key is configured. Use the copy-prompt path."), { pulsify: true, status: 501 });
        if (!r.ok || !d.ok || !d.result) throw PulsifyShell.failure(r.status, "Generation failed. Use the copy-prompt path.");
        if (disposed) return;
        $("#page_json").value = JSON.stringify(d.result, null, 2); briefNote("Generated. Review the JSON, then create the page.", "ok");
      } catch (e) { briefNote(""); PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }
    async function createProspect(form, button, note) {
      const result = form.querySelector("[data-prospect-result]"); result.hidden = true;
      let parsed; try { parsed = JSON.parse(stripCodeFences($("#page_json").value)); } catch { note("The result is not valid JSON. Remove any text outside the JSON object.", "err"); return; }
      const slug = sanitizeSlug(parsed.client_slug || parsed.client_name || "");
      if (!slug) { note("The JSON needs a usable client_slug made from lowercase letters, numbers, or hyphens.", "err"); return; }
      const known = window.PulsifyProvisionPrompt?.knownTokenKeys?.() || CONTENT_FIELDS.map((f) => f.key);
      const pageContent = {};
      if (parsed.page_content && typeof parsed.page_content === "object") for (const [k, v] of Object.entries(parsed.page_content)) if (known.includes(k) && v != null && String(v).trim()) pageContent[k] = String(v).trim();
      const templateVariant = parsed.template_variant === "variant-02" ? "variant-02" : "canonical", clientName = String(parsed.client_name || "").trim() || slug;
      PulsifyShell.pending(button); note("Checking…");
      try {
        const check = await fetch(`/api/settings?client=${encodeURIComponent(slug)}`, { headers: { "x-pulsify-operator": "1" } });
        const existing = check.ok ? (await check.json().catch(() => ({}))).config : null;
        if (existing && !(await PulsifySurface.confirm(`Overwrite "${slug}"?`, "This client already has a saved page. Creating again replaces its name, design and copy.", "Overwrite"))) { note(""); return; }
        note("Creating…");
        const d = await api("/api/settings", { method: "POST", body: JSON.stringify({ client: slug, client_name: clientName, template_variant: templateVariant, page_content: pageContent }) });
        if (disposed) return;
        const link = d.share_url || `${location.origin}/${encodeURIComponent(slug)}`;
        result.hidden = false; result.innerHTML = `<strong>Page created</strong><br><a href="${location.origin}/${encodeURIComponent(slug)}?operator_preview=1" target="_blank" rel="noopener">${esc(link)}</a><div class="cs-wrap cs-result-actions"><button type="button" class="ps-control" data-copy-link>Copy link</button><a class="ps-control" href="/?client=${encodeURIComponent(slug)}&preview=canonical&operator_preview=1" target="_blank" rel="noopener">Preview standard</a><a class="ps-control" href="/?client=${encodeURIComponent(slug)}&preview=variant-02&operator_preview=1" target="_blank" rel="noopener">Preview variant 2</a><button type="button" class="ps-control" data-open-page>Load in editor</button></div>`;
        result.querySelector("[data-copy-link]").onclick = () => copyText(link);
        result.querySelector("[data-open-page]").onclick = () => leave(() => { clients = []; become(slug); });
        note("Page saved.", "ok"); ctx.refresh?.(); ctx.onCreated?.(slug);
      } catch (e) { note(""); PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }

    // Delete: typed confirmation, DELETE /api/settings?client=, counts on success.
    function deleteClient() {
      const d = PulsifySurface.dialog(`Delete ${config?.client_name || client}?`, "This permanently deletes the client's landing page configuration and copy, delivery items, call notes and assets, brain, proof, payments, integrations, email drafts, page events and media. It cannot be undone.", `<label class="set-field"><span>Type the client ID to confirm</span><input class="set-input" data-confirm-input autocomplete="off" spellcheck="false" placeholder="${esc(client)}"></label><p class="cs-slug-status" data-confirm-status></p><div class="ps-dialog-actions"><button type="button" class="ps-button" data-cancel>Cancel</button><button type="button" class="ps-button cs-danger" data-confirm disabled>Delete client permanently</button></div>`);
      const inputEl = d.querySelector("[data-confirm-input]"), confirmBtn = d.querySelector("[data-confirm]"), st = d.querySelector("[data-confirm-status]");
      inputEl.oninput = () => { const armed = inputEl.value === client; confirmBtn.disabled = !armed; st.textContent = !inputEl.value ? "" : armed ? "Client ID matches. Permanent deletion is armed." : "The client ID does not match."; st.className = "cs-slug-status " + (armed ? "valid" : "invalid"); };
      inputEl.onkeydown = (e) => { if (e.key === "Enter" && !confirmBtn.disabled) confirmBtn.click(); };
      d.querySelector("[data-cancel]").onclick = () => d.close();
      confirmBtn.onclick = async () => {
        PulsifyShell.pending(confirmBtn); d.querySelector(".ps-inline-error")?.remove();
        try {
          const r = await api(`/api/settings?client=${encodeURIComponent(client)}`, { method: "DELETE" });
          d.close(); dirty.clear(); ctx.refresh?.();
          const counts = DELETE_TABLES.map((t) => `${t} ${number((r.deleted || {})[t] || 0)}`).join(", ");
          ctx.onDeleted?.(client, r.deleted || {});
          if (!ctx.onDeleted) { root.innerHTML = ""; root.append(PulsifySurface.empty("x", `${client} deleted`, `Rows removed: ${counts}.`, "Back to clients", () => ctx.onBack?.())); }
        } catch (e) { PulsifyShell.pending(confirmBtn, false); PulsifyShell.inlineError(d.querySelector(".ps-dialog-body"), e); }
      };
      setTimeout(() => inputEl.focus(), 50);
    }

    // Live draft preview: the landing page itself in a frame, fed the unsaved
    // draft over postMessage exactly as the console did.
    function draftPayload() {
      return { type: "pulsify-draft", page_content: Object.fromEntries([...body.querySelectorAll("[data-content-key]")].map((i) => [i.dataset.contentKey, i.value])), proof_images: proofPayload(proofList()), wistia_media_id: $("#wistia_media_id")?.value.trim() || "", typeform_url: $("#typeform_url")?.value.trim() || "", template_variant: $("#template_variant")?.value || "canonical" };
    }
    function postDraft(delay = 300) { clearTimeout(preview.timer); preview.timer = setTimeout(() => { if (frame.contentWindow && frame.getAttribute("src")) frame.contentWindow.postMessage(draftPayload(), location.origin); }, delay); }
    function scheduleDraft(delay) { if (preview.open) postDraft(delay); }
    function reloadPreview() { const variant = $("#template_variant")?.value === "variant-02" ? "variant-02" : "canonical"; frame.src = `/?client=${encodeURIComponent(client)}&preview=${variant}&tokens=1&draft=1`; }
    function togglePreview(force) {
      preview.open = force ?? !preview.open;
      previewPane.hidden = !preview.open; root.querySelector(".cs-layout").classList.toggle("has-preview", preview.open);
      $("[data-preview-toggle]").textContent = preview.open ? "Hide preview" : "Preview draft"; $("[data-preview-toggle]").setAttribute("aria-expanded", String(preview.open));
      if (preview.open) { if (!frame.getAttribute("src")) reloadPreview(); else postDraft(0); }
    }
    body.addEventListener("change", (e) => { if (e.target.id === "template_variant" && preview.open) reloadPreview(); });

    load();
    const dispose = () => { disposed = true; sequence++; clearTimeout(preview.timer); window.removeEventListener("message", onMessage); window.removeEventListener("beforeunload", onBeforeUnload); };
    dispose.dirty = () => dirty.size > 0;
    dispose.discard = () => dirty.clear();
    return dispose;
  }
  window.PulsifyClientSetupView = { render, CONTENT_FIELDS };
})();
