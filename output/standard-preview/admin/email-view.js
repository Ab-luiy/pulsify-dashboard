// Email: write on behalf of a client, keep the draft here, or send it to one
// Kit tag. Native port of the old console "email" panel: same tag lookup,
// same draft list, same draft/send POST to /api/email-compose. A send always
// asks first, and a rejected send stays in the list for copy and paste.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const when = (iso) => { if (!iso) return "-"; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); };
  // The API answers with a body on failure too (status "failed" plus the stored
  // draft), so calls return the response instead of throwing on a non-2xx.
  async function call(path, init) {
    let r;
    try { r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init }); }
    catch { throw PulsifyShell.failure(0); }
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) throw PulsifyShell.failure(r.status);
    return { ok: r.ok, status: r.status, data };
  }
  async function api(path, init) {
    const { ok, status, data } = await call(path, init);
    if (!ok || data.ok === false) throw PulsifyShell.failure(status);
    return data;
  }
  // Same paragraph rule the API applies before Kit gets the HTML.
  const textToHtml = (value) => String(value || "").split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  async function copyText(text) {
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* fallback below */ }
    try { const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.append(area); area.select(); const ok = document.execCommand("copy"); area.remove(); return ok; } catch { return false; }
  }

  let warm = null; // {tags, kit, drafts} from the last visit, so a return paints at once
  const draftsSkeleton = () => '<div class="int-table ev-table"><table><thead><tr><th>Client</th><th>Subject</th><th>Tag</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>' + Array.from({ length: 3 }, () => '<tr><td><div class="skeleton" style="width:70%"></div></td><td><div class="skeleton" style="width:85%"></div><div class="skeleton" style="width:55%;margin-top:6px;min-height:10px"></div></td><td><div class="skeleton" style="width:60%"></div></td><td><div class="skeleton" style="width:48px"></div></td><td><div class="skeleton" style="width:80%"></div></td><td><div class="skeleton" style="width:110px;margin-left:auto"></div></td></tr>').join("") + "</tbody></table></div>";

  function render(root, ctx = {}) {
    let clients = Array.isArray(ctx.clients) && ctx.clients.length ? ctx.clients.slice() : null;
    let client = ctx.client || "", disposed = false, seq = 0, busy = false, mode = "write";
    let kit = warm?.kit || { checked: false, configured: false, heading: "Checking Kit", hint: "The composer is checking the operator integration.", status: "Checking", tagHint: "Tags load from the connected operator Kit account." };
    let tags = warm?.tags || [], drafts = warm?.drafts || null;
    root.innerHTML = `
      <div class="ps-page-header ev-page-head">
        <div><h1>Email</h1><p class="ps-subtitle">Write on behalf of a client, keep the draft here, or send it to one Kit tag.</p></div>
        <div class="ev-head-actions"><button type="button" class="ps-control" id="ev-refresh">Refresh</button></div>
      </div>
      <div class="ev-layout">
        <section class="set-section ev-kit" id="ev-kit" aria-live="polite">
          <div class="set-head"><p class="ev-kicker">Kit connection</p><h2 id="ev-kit-heading"></h2><p id="ev-kit-hint"></p></div>
          <div class="ev-kit-side"><span class="int-pill" id="ev-kit-status"></span><button type="button" class="ps-control" id="ev-open-int">Open Integrations</button></div>
        </section>
        <section class="set-section" id="ev-composer">
          <div class="set-head"><p class="ev-kicker">Composer</p><h2 id="ev-client-label">No active client</h2><p>Send uses the selected Kit tag. If Kit rejects the request, the complete email stays in the list below.</p></div>
          <form class="ev-form" id="ev-form" novalidate>
            <div class="set-grid">
              <label class="set-field"><span>Client</span><select class="ps-input" id="ev-client" aria-label="Client"><option value="">Loading clients</option></select></label>
              <label class="set-field"><span>Kit tag <em class="ev-required">Required to send</em></span><select class="ps-input" id="ev-tag"><option value="">Checking Kit tags</option></select><small id="ev-tag-hint"></small></label>
            </div>
            <label class="set-field"><span>Subject <em class="ev-required">Required</em></span><input class="ps-input" id="ev-subject" maxlength="240" placeholder="Write the inbox subject" autocomplete="off"><small>Use the approved subject for this client.</small></label>
            <div class="set-field ev-body-field">
              <div class="ev-body-head"><span>Body <em class="ev-required">Required</em></span><div class="ps-segments" role="tablist"><button type="button" class="ps-control" data-mode="write" aria-pressed="true">Write</button><button type="button" class="ps-control" data-mode="preview" aria-pressed="false">Preview</button></div></div>
              <textarea class="ps-input ev-body" id="ev-body" rows="12" placeholder="Write the email body"></textarea>
              <div class="ev-preview" id="ev-preview" hidden></div>
              <small>Plain text is converted to email-safe HTML when Kit sends it. The exact text is stored in the draft record.</small>
            </div>
            <div class="set-actions ev-actions"><button type="button" class="ps-button" id="ev-save">Save draft</button><button type="button" class="ps-button primary" id="ev-send" disabled>Send through Kit</button><span class="set-status" id="ev-status" role="status"></span></div>
            <div id="ev-feedback"></div>
          </form>
        </section>
        <section class="set-section" id="ev-drafts">
          <div class="set-head ev-drafts-head"><div><p class="ev-kicker">Stored email</p><h2>Recent drafts and sends</h2><p>Draft means no Kit send occurred. Sent means Kit returned a real broadcast id. Failed means Kit rejected or could not receive the request.</p></div><span class="int-pill" id="ev-updated">Not loaded</span></div>
          <div id="ev-drafts-body">${drafts ? "" : draftsSkeleton()}</div>
        </section>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const clientSelect = $("#ev-client"), tagSelect = $("#ev-tag"), subject = $("#ev-subject"), body = $("#ev-body"), preview = $("#ev-preview"), status = $("#ev-status"), feedback = $("#ev-feedback"), draftsBody = $("#ev-drafts-body");

    function say(text, cls = "") { status.textContent = text; status.className = "set-status" + (cls ? " " + cls : ""); }
    function drawKit() {
      $("#ev-kit-heading").textContent = kit.heading;
      $("#ev-kit-hint").textContent = kit.hint;
      const pill = $("#ev-kit-status");
      pill.textContent = kit.status;
      pill.className = "int-pill" + (kit.status === "Connected" ? " int-pill-ok" : kit.status === "Not connected" ? " int-pill-warn" : "");
      $("#ev-tag-hint").textContent = kit.tagHint;
    }
    function drawTags() {
      const previous = tagSelect.value;
      if (!kit.checked) { tagSelect.innerHTML = `<option value="">${kit.unreachable ? "Tags unavailable" : "Checking Kit tags"}</option>`; tagSelect.disabled = true; return; }
      if (!kit.configured) { tagSelect.innerHTML = '<option value="">Connect Kit to load tags</option>'; tagSelect.disabled = true; return; }
      if (kit.tagsFailed) { tagSelect.innerHTML = '<option value="">Tags unavailable</option>'; tagSelect.disabled = true; return; }
      if (!tags.length) { tagSelect.innerHTML = '<option value="">No Kit tags found</option>'; tagSelect.disabled = true; return; }
      tagSelect.innerHTML = ['<option value="">Select a Kit tag</option>', ...tags.map((t) => `<option value="${esc(t.id)}">${esc(t.name)} (${esc(t.id)})</option>`)].join("");
      if (tags.some((t) => String(t.id) === previous)) tagSelect.value = previous;
      tagSelect.disabled = false;
    }
    function drawClients() {
      const list = clients || [];
      clientSelect.innerHTML = list.length ? list.map((c) => `<option value="${esc(c.client)}">${esc(c.client_name || c.client)}</option>`).join("") : '<option value="">No clients configured</option>';
      clientSelect.value = client;
      clientSelect.disabled = !list.length;
      const active = list.find((c) => c.client === client);
      $("#ev-client-label").textContent = active ? `${active.client_name || active.client} email` : "No active client";
      $("#ev-composer").classList.toggle("ev-no-client", !client);
    }
    function syncButtons() {
      const hasClient = Boolean(client), hasTag = Boolean(tagSelect.value);
      $("#ev-save").disabled = busy || !hasClient;
      $("#ev-send").disabled = busy || !hasClient || !kit.configured || !hasTag;
    }
    function drawPreview() {
      const text = body.value.trim();
      preview.innerHTML = text ? textToHtml(text) : '<p class="ev-preview-empty">Nothing to preview yet. Write the body first.</p>';
    }
    function setMode(next) {
      mode = next;
      root.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
      body.hidden = mode === "preview"; preview.hidden = mode !== "preview";
      if (mode === "preview") drawPreview(); else body.focus({ preventScroll: true });
    }
    function drawDrafts() {
      if (!drafts) return;
      if (!drafts.length) { draftsBody.replaceChildren(PulsifySurface.empty("mail", "No stored email yet", "Save a draft or send the first email from the composer above.", "Write an email", () => subject.focus())); return; }
      draftsBody.innerHTML = `<div class="int-table ev-table"><table><thead><tr><th>Client</th><th>Subject</th><th>Tag</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>${drafts.map((d) => {
        const tag = tags.find((t) => String(t.id) === String(d.tag_id));
        const cls = d.status === "sent" ? "int-pill-ok" : d.status === "failed" ? "ev-pill-failed" : "";
        return `<tr><td><strong>${esc(d.client || "operator")}</strong></td><td class="ev-subject"><strong>${esc(d.subject)}</strong><small>${esc(String(d.body || "").slice(0, 90))}</small></td><td>${esc(tag?.name || d.tag_id || "Not selected")}</td><td><span class="int-pill ${cls}">${esc(d.status || "draft")}</span></td><td>${esc(when(d.sent_at || d.created_at))}</td><td><div class="int-row-actions"><button type="button" class="ps-control" data-load="${esc(d.id)}">Load</button><button type="button" class="ps-control" data-copy="${esc(d.id)}">Copy</button></div></td></tr>`;
      }).join("")}</tbody></table></div>`;
      draftsBody.querySelectorAll("[data-load]").forEach((b) => (b.onclick = () => loadDraft(b.dataset.load)));
      draftsBody.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => copyDraft(b.dataset.copy, b)));
    }

    async function loadTags() {
      const { ok, data } = await call("/api/email-compose?action=tags");
      kit = { checked: true, configured: Boolean(data.api_key_set), tagsFailed: false };
      tags = Array.isArray(data.tags) ? data.tags : [];
      if (!kit.configured) {
        Object.assign(kit, { heading: "Kit is not connected", status: "Not connected", hint: data.message || "Connect the operator Kit account in Integrations. Draft saving still works.", tagHint: "Connect Kit to load the account tags. Send stays unavailable until then." });
      } else if (!ok || data.ok === false) {
        Object.assign(kit, { tagsFailed: true, heading: "Kit is connected", status: "Connected", hint: data.error || "The API key is set, but Kit tags could not be loaded.", tagHint: "Refresh after the Kit connection can return tags." });
      } else if (!tags.length) {
        Object.assign(kit, { heading: "Kit is connected", status: "Connected", hint: "The saved operator API key is active. Send creates a real Kit broadcast for one selected tag.", tagHint: "The connected Kit account returned no tags. Create a tag in Kit, then refresh." });
      } else {
        Object.assign(kit, { heading: "Kit is connected", status: "Connected", hint: "The saved operator API key is active. Send creates a real Kit broadcast for one selected tag.", tagHint: "Choose the exact Kit audience tag for this broadcast." });
      }
    }
    async function loadDrafts() {
      const data = await api("/api/email-compose?action=drafts");
      drafts = Array.isArray(data.drafts) ? data.drafts : [];
      const pill = $("#ev-updated"); pill.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`; pill.className = "int-pill int-pill-ok";
    }
    async function load() {
      const current = ++seq;
      feedback.replaceChildren();
      if (!drafts) draftsBody.innerHTML = draftsSkeleton();
      try {
        await Promise.all([loadTags(), loadDrafts()]);
        if (disposed || current !== seq || !root.isConnected) return;
        warm = { kit, tags, drafts };
        drawKit(); drawTags(); drawDrafts(); syncButtons();
      } catch (e) {
        if (disposed || current !== seq) return;
        if (!kit.checked) kit = { checked: false, unreachable: true, configured: false, heading: "Kit could not be checked", status: "Unknown", hint: "The integration check did not come back. Refresh to try again; drafts still save.", tagHint: "Tags load once the Kit check succeeds." };
        drawKit(); drawTags(); syncButtons();
        if (!drafts) draftsBody.replaceChildren();
        PulsifyShell.inlineError(drafts ? feedback : draftsBody, e, load);
      }
    }
    async function submit(action) {
      const subj = subject.value.trim(), text = body.value.trim(), tagId = tagSelect.value;
      feedback.replaceChildren(); say("");
      if (!client) { say("Select a client before saving or sending email.", "err"); clientSelect.focus(); return; }
      if (!subj || !text) { say("Subject and body are required.", "err"); (subj ? body : subject).focus(); return; }
      if (action === "send" && !tagId) { say("Select the Kit tag before sending.", "err"); tagSelect.focus(); return; }
      if (action === "send") {
        const tag = tags.find((t) => String(t.id) === tagId);
        const ok = await PulsifySurface.confirm("Send through Kit?", `"${subj}" goes to every subscriber tagged ${tag ? tag.name : tagId}, scheduled one minute from now. This cannot be pulled back once Kit accepts it.`, "Send");
        if (!ok || disposed) return;
      }
      busy = true; syncButtons();
      const button = $(action === "send" ? "#ev-send" : "#ev-save");
      PulsifyShell.pending(button); say(action === "send" ? "Sending…" : "Saving…");
      try {
        // Same payload the old panel sent.
        const { ok, status: code, data } = await call(`/api/email-compose?action=${encodeURIComponent(action)}`, { method: "POST", body: JSON.stringify({ client, subject: subj, body_text: text, tag_id: tagId || null }) });
        if (disposed) return;
        try { await loadDrafts(); drawDrafts(); warm = { kit, tags, drafts }; } catch { /* the composer result matters more; the list refreshes on the next load */ }
        if (data.status === "sent" && data.sent) { say(`Sent through Kit. Broadcast ${data.broadcast_id}.`, "ok"); return; }
        if (data.status === "draft") { say(data.message || "Draft saved. No email was sent.", "ok"); return; }
        if (data.status === "failed") { say(data.error || "Kit failed. The complete email is stored for copy and paste.", "err"); return; }
        if (!ok || data.ok === false) throw PulsifyShell.failure(code);
        say("Draft saved. No email was sent.", "ok");
      } catch (e) {
        if (disposed) return;
        say("");
        PulsifyShell.inlineError(feedback, e, () => submit(action));
      } finally {
        busy = false;
        if (!disposed && button.isConnected) { PulsifyShell.pending(button, false); syncButtons(); }
      }
    }
    function loadDraft(id) {
      const d = (drafts || []).find((x) => String(x.id) === String(id));
      if (!d) return;
      subject.value = d.subject || ""; body.value = d.body || "";
      if (d.tag_id && ![...tagSelect.options].some((o) => o.value === String(d.tag_id))) { tagSelect.add(new Option(`Stored tag ${d.tag_id}`, String(d.tag_id))); tagSelect.disabled = false; }
      tagSelect.value = d.tag_id || "";
      if (d.client && clients?.some((c) => c.client === d.client)) { client = d.client; drawClients(); }
      setMode("write"); syncButtons();
      feedback.replaceChildren();
      say(`Loaded ${d.status} email. No email was sent by this action.`, "ok");
      $("#ev-composer").scrollIntoView({ behavior: "smooth", block: "start" });
      subject.focus({ preventScroll: true });
    }
    async function copyDraft(id, button) {
      const d = (drafts || []).find((x) => String(x.id) === String(id));
      if (!d) return;
      const copied = await copyText(`Subject: ${d.subject}\n\n${d.body}`);
      if (disposed) return;
      const label = button.textContent;
      button.textContent = copied ? "Copied" : "Blocked";
      setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1500);
      say(copied ? "Email copied." : "The browser blocked copying. Load the email and copy it manually.", copied ? "ok" : "err");
    }
    async function start() {
      if (!clients) {
        try { clients = (await api("/api/clients")).clients || []; }
        catch (e) { if (disposed || !root.isConnected) return; clientSelect.innerHTML = '<option value="">Clients unavailable</option>'; PulsifyShell.inlineError(feedback, e, () => { clients = null; start(); }); return; }
        if (disposed || !root.isConnected) return;
      }
      if (!client || !clients.some((c) => c.client === client)) client = clients[0]?.client || "";
      drawClients(); syncButtons();
    }

    drawKit(); drawTags(); if (drafts) drawDrafts();
    clientSelect.onchange = () => { client = clientSelect.value; drawClients(); syncButtons(); };
    tagSelect.onchange = syncButtons;
    body.oninput = () => { if (mode === "preview") drawPreview(); };
    root.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
    $("#ev-save").onclick = () => submit("draft");
    $("#ev-send").onclick = () => submit("send");
    $("#ev-open-int").onclick = () => window.PulsifyOperatorShell?.go("integrations");
    $("#ev-refresh").onclick = () => { const b = $("#ev-refresh"); PulsifyShell.pending(b); load().finally(() => { if (b.isConnected) PulsifyShell.pending(b, false); }); };
    $("#ev-form").onsubmit = (e) => e.preventDefault();
    start(); load();
    return () => { disposed = true; seq++; };
  }
  window.PulsifyEmailView = { render };
})();
