// Client brain: one client's structured context, section by section, the way
// /api/client-brain returns it. The client's onboarding answers arrive with
// their source (form, voice note, transcript); the operator fills the rest
// inline and saves a section at a time. Native port of the old console
// "brain" panel: same GET, same one-field-per-POST upsert, same export.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v) => Number(v || 0).toLocaleString();
  const when = (iso) => { if (!iso) return ""; const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); };
  const SOURCE_LABELS = { "client-form": "Client form", "voice-note": "Voice note", transcript: "Transcript", operator: "Operator", research: "Research" };
  // Which fields the client's onboarding fills, and from where. Mirrors
  // CLIENT_FIELDS in functions/api/client-brain.js; everything else is operator
  // or research. Used only for the copy under an empty field.
  const CLIENT_FIELDS = {
    "identity.name": "client-form", "identity.handles": "client-form", "identity.business_explainer": "client-form",
    "offer.voice_note_url": "voice-note", "offer.direction": "client-form",
    "icp.client_guess": "client-form",
    "story.input_type": "client-form", "story.voice_note_url": "voice-note", "story.transcript": "transcript", "story.narrative": "client-form",
    "voice.tone": "client-form", "voice.curse_slang": "client-form", "voice.positioning_attitude": "client-form", "voice.sample_links": "client-form",
    "proof.has_proof": "client-form", "proof.items": "client-form",
  };
  const SECTION_NOTES = {
    identity: "The full business explanation plus the operator-distilled positioning and mechanism name.",
    offer: "What they want to sell and the operator-refined offer structure.",
    icp: "The client's guess stays visible beside the real operator-conducted avatar research.",
    story: "Voice note, transcript, or written journey, followed by the usable narrative bank.",
    voice: "Tone, language habits, positioning attitude, and real voice samples.",
    proof: "Student results only. Lifestyle imagery is not proof currency.",
    funnel: "Operator-only trigger words, routes, links, lead magnets, and cadence facts.",
    donot: "Claims, topics, names, numbers, and compliance lines the work cannot cross.",
  };
  // What fills a section that is still empty end to end.
  const SECTION_EMPTY = {
    identity: "Filled by the client's onboarding form. Positioning and the mechanism name are yours to add.",
    offer: "Filled by the client's offer voice note and form answer during onboarding. The offer stack, mechanism, guarantees and rails are yours to build.",
    icp: "The client's own guess comes from the onboarding form. Every other field here is research you run.",
    story: "Filled by the client's story voice note, transcript or written journey during onboarding. The narrative bank is yours to distil from it.",
    voice: "Filled by the client's onboarding form. Sentence habits and banned words are yours to add.",
    proof: "Filled by the client's proof answers during onboarding. Add links here if they send proof later.",
    funnel: "Operator only. Nothing in this section comes from the client form.",
    donot: "Operator only. Write the lines the work cannot cross before the first piece ships.",
  };
  const safeUrl = (v) => { const t = String(v || "").trim(); return /^https?:\/\//i.test(t) || /^\/(?!\/)/.test(t) ? t : ""; };
  const labelFromKey = (v) => String(v || "").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const isGap = (v) => v == null || (typeof v === "string" ? !v.trim() : Array.isArray(v) ? !v.length : typeof v === "object" ? !Object.keys(v).length : false);

  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
    return d;
  }

  // Same editor grammar the old panel used, so stored values round-trip.
  function parseEditor(text, type) {
    const t = String(text || "").trim();
    if (type === "boolean") return t === "" ? "" : t === "true";
    if (type === "list") return t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (type === "proof-list") return t.split(/\r?\n/).map((line) => {
      const [kind, url, claim, permission] = line.split("|").map((p) => p.trim());
      return { kind: ["image-link", "video-link", "screenshot-link"].includes(kind) ? kind : "screenshot-link", url: url || kind, claim: claim || "", permission: ["unknown", "granted", "denied"].includes(permission) ? permission : "unknown" };
    }).filter((item) => item.url);
    return t;
  }
  function editorValue(value, type) {
    if (value == null) return "";
    if (type === "proof-list" && Array.isArray(value)) return value.map((i) => `${i.kind || "screenshot-link"} | ${i.url || ""} | ${i.claim || ""} | ${i.permission || "unknown"}`).join("\n");
    if (Array.isArray(value)) return value.map((i) => typeof i === "string" ? i : Object.values(i).join(" | ")).join("\n");
    if (typeof value === "object") return Object.entries(value).map(([k, v]) => `${labelFromKey(k)}: ${v}`).join("\n");
    return String(value);
  }
  function expectedSource(section, key) {
    const s = CLIENT_FIELDS[`${section}.${key}`];
    if (s === "client-form") return "Comes from the client's onboarding form.";
    if (s === "voice-note") return "Comes from the client's voice note during onboarding.";
    if (s === "transcript") return "Comes from the transcript the client submits during onboarding.";
    return section === "icp" && key !== "client_guess" ? "Research fills this." : "Yours to fill.";
  }
  function renderValue(field) {
    const value = field.value;
    if (field.gap) return `<p class="bv-gap"><b>No answer yet</b><span>${esc(expectedSource(field._section, field.key))}</span></p>`;
    if (typeof value === "boolean") return `<p>${value ? "Yes" : "No"}</p>`;
    if (Array.isArray(value)) return `<ul>${value.map((item) => {
      if (item && typeof item === "object") {
        const url = safeUrl(item.url);
        const link = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(item.url)}</a>` : esc(item.url || "Proof item");
        return `<li><strong>${esc(labelFromKey(item.kind || "proof"))}</strong> ${link}${item.claim ? `<span>${esc(item.claim)}</span>` : ""}${item.permission ? `<span>Permission: ${esc(item.permission)}</span>` : ""}</li>`;
      }
      const url = safeUrl(item);
      return `<li>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(item)}</a>` : esc(item)}</li>`;
    }).join("")}</ul>`;
    if (value && typeof value === "object") return `<dl>${Object.entries(value).map(([k, v]) => `<div><dt>${esc(labelFromKey(k))}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
    const url = safeUrl(value);
    return url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(value)}</a></p>` : `<p>${esc(value).replace(/\n/g, "<br>")}</p>`;
  }
  function renderInput(field) {
    if (field.type === "boolean") {
      const v = field.gap ? "" : String(Boolean(field.value));
      return `<select class="ps-input" data-input aria-label="${esc(field.label)}"><option value=""${v === "" ? " selected" : ""}>Not set</option><option value="true"${v === "true" ? " selected" : ""}>Yes</option><option value="false"${v === "false" ? " selected" : ""}>No</option></select>`;
    }
    const rows = field.type === "textarea" || field.type === "proof-list" ? 6 : 3;
    return `<textarea class="ps-input" data-input rows="${rows}" aria-label="${esc(field.label)}">${esc(editorValue(field.value, field.type))}</textarea>`;
  }
  function editorHint(type) {
    if (type === "list") return "One entry per line. Saving an empty answer clears the field.";
    if (type === "proof-list") return "One per line as kind | url | claim | permission. Kinds: image-link, video-link, screenshot-link. Saving an empty answer clears the field.";
    return "Saving an empty answer clears this field and returns it to gap status.";
  }
  function renderField(section, field) {
    field._section = section;
    const defaultSource = section === "icp" && field.key !== "client_guess" ? "research" : "operator";
    const selected = ["operator", "research"].includes(field.source) ? field.source : defaultSource;
    return `<article class="bv-field${field.gap ? " is-gap" : ""}" data-field="${esc(field.key)}" data-type="${esc(field.type || "textarea")}">
      <div class="bv-field-head">
        <div class="bv-field-title"><strong>${esc(field.label)}</strong>
          <div class="bv-meta"><span class="bv-chip ${field.source ? "src-" + esc(field.source) : "missing"}">${esc(field.source ? SOURCE_LABELS[field.source] || labelFromKey(field.source) : "No source")}</span>${field.updated_at ? `<span>Updated ${esc(when(field.updated_at))}</span>` : ""}${field.operator_only ? '<span class="bv-chip">Operator field</span>' : ""}</div>
        </div>
        <button type="button" class="ps-button ghost" data-edit>Edit</button>
      </div>
      <div class="bv-answer">${renderValue(field)}</div>
      <div class="bv-editor" hidden>${renderInput(field)}
        <div class="bv-editor-row"><label class="set-field"><span>Save as</span><select class="ps-input" data-source><option value="operator"${selected === "operator" ? " selected" : ""}>Operator</option><option value="research"${selected === "research" ? " selected" : ""}>Research</option></select></label><button type="button" class="ps-button ghost" data-cancel>Cancel</button></div>
        <small>${esc(editorHint(field.type))}</small>
      </div>
    </article>`;
  }
  function renderProof(items) {
    return `<div class="bv-proof"><h3>Proof index</h3><p class="int-note">Uploaded images render here. Video testimonials stay linked to their source.</p>${items.length ? `<div class="bv-proof-grid">${items.map((item) => {
      const url = safeUrl(item.url);
      const image = item.kind === "image" && url ? `<a class="bv-proof-image" href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(item.claim || "Uploaded proof image")}" loading="lazy"></a>` : "";
      return `<article>${image}<span class="bv-chip">${esc(labelFromKey(item.kind))}</span><strong>${esc(item.claim || "No claim added")}</strong>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${item.kind === "image" ? "Open image" : "Open proof"}</a>` : ""}<small>Permission: ${esc(item.permission || "unknown")} · ${esc(when(item.created_at))}</small></article>`;
    }).join("")}</div>` : '<p class="bv-section-empty">No proof stored. The client chose no proof, or the proof section has not been submitted yet.</p>'}</div>`;
  }
  function renderSection(section, proofItems) {
    const allGaps = section.fields.length && section.fields.every((f) => f.gap);
    return `<div class="set-head bv-head"><div><h2>${esc(section.label)}</h2><p>${esc(SECTION_NOTES[section.key] || "Structured client context.")}</p></div><span class="int-pill ${section.gaps ? "int-pill-warn" : "int-pill-ok"}">${num(section.gaps)} ${section.gaps === 1 ? "gap" : "gaps"}</span></div>
      ${allGaps ? `<p class="bv-section-empty">${esc(SECTION_EMPTY[section.key] || "Nothing stored yet.")}</p>` : ""}
      <div class="bv-fields">${section.fields.map((f) => renderField(section.key, f)).join("")}</div>
      ${section.key === "proof" ? renderProof(proofItems || []) : ""}
      <div class="set-actions bv-actions"><button type="button" class="ps-button primary" data-save disabled>Save section</button><span class="set-status" role="status"></span></div>`;
  }
  const SECTION_ORDER = ["identity", "offer", "icp", "story", "voice", "proof", "funnel", "donot"];
  const SKELETON_LABELS = { identity: "Identity", offer: "Offer", icp: "ICP", story: "Story", voice: "Voice", proof: "Proof vault", funnel: "Funnel facts", donot: "Do-not list" };
  const kpiSkeleton = () => Array.from({ length: 4 }, () => '<div class="ps-kpi"><div class="skeleton" style="width:45%"></div><div class="skeleton" style="height:34px;margin:15px 0 8px;width:55%"></div><div class="skeleton" style="width:70%"></div></div>').join("");
  const sectionSkeleton = () => SECTION_ORDER.map((k) => `<section class="set-section set-loading bv-section bv-sk" aria-label="Loading ${esc(SKELETON_LABELS[k])}"><div class="set-head"><div class="skeleton"></div><div class="skeleton"></div></div>${Array.from({ length: 3 }, () => '<div class="bv-field bv-field-sk"><div class="skeleton" style="width:38%;min-height:14px"></div><div class="skeleton" style="width:26%;min-height:12px;margin-top:8px"></div><div class="skeleton" style="width:88%;min-height:14px;margin-top:12px"></div></div>').join("")}</section>`).join("");

  const warm = new Map(); // client -> last payload, so a return visit paints at once
  let lastClient = "";

  function render(root, ctx = {}) {
    let client = ctx.client || lastClient || "", clients = Array.isArray(ctx.clients) && ctx.clients.length ? ctx.clients.slice() : null;
    let data = null, disposed = false, seq = 0;
    root.innerHTML = `
      <div class="ps-page-header bv-page-head">
        <div><h1>Client brain</h1><p class="ps-subtitle">The client's onboarding answers by section, with the operator research that closes each gap. Export it as the context package every piece of work starts from.</p></div>
        <div class="bv-head-actions"><select class="ps-input bv-client" id="bv-client" aria-label="Client"><option value="">Loading clients</option></select><button type="button" class="ps-control" id="bv-export">${PulsifyShell.icon("arrow-up-right")}Export context</button><button type="button" class="ps-control" id="bv-refresh">Refresh</button></div>
      </div>
      <div class="bv-feedback" id="bv-feedback"></div>
      <div class="ps-kpis bv-kpis" id="bv-kpis">${kpiSkeleton()}</div>
      <div class="set-layout bv-layout" id="bv-layout"><nav class="set-nav" id="bv-nav">${SECTION_ORDER.map((k) => `<span class="set-nav-item">${esc(SKELETON_LABELS[k])}</span>`).join("")}</nav><div class="set-body" id="bv-body">${sectionSkeleton()}</div></div>`;
    const $ = (s) => root.querySelector(s);
    const select = $("#bv-client"), kpis = $("#bv-kpis"), body = $("#bv-body"), nav = $("#bv-nav"), feedback = $("#bv-feedback"), layout = $("#bv-layout");

    function drawClients() {
      const list = clients || [];
      const options = list.slice();
      if (client && !options.some((c) => c.client === client)) options.unshift({ client, client_name: client });
      select.innerHTML = options.length ? options.map((c) => `<option value="${esc(c.client)}">${esc(c.client_name || c.client)}</option>`).join("") : '<option value="">No clients configured</option>';
      select.value = client;
      select.disabled = !options.length;
    }
    function drawEmpty() {
      kpis.hidden = true; layout.hidden = true;
      feedback.replaceChildren(PulsifySurface.empty("brain", "No clients yet", "Add a client and their brain fills in section by section as they finish onboarding.", "Add a client", () => window.PulsifyOperatorShell?.go("home")));
      $("#bv-export").disabled = true;
    }
    function recount() {
      let total = 0, filled = 0, latest = null;
      for (const s of data.sections) {
        s.gaps = 0;
        for (const f of s.fields) { total += 1; if (f.gap) s.gaps += 1; else filled += 1; if (f.updated_at && (!latest || f.updated_at > latest)) latest = f.updated_at; }
      }
      data.summary = { total_fields: total, filled_fields: filled, gaps: total - filled, updated_at: latest };
    }
    function drawSummary() {
      const s = data.summary || {};
      kpis.hidden = false;
      kpis.innerHTML = [["Client", data.client_name || data.client, data.client], ["Fields filled", `${num(s.filled_fields)} / ${num(s.total_fields)}`, "Answers and operator facts"], ["Gaps", num(s.gaps), Number(s.gaps || 0) ? "Fields still empty" : "Every field has an answer"], ["Last updated", s.updated_at ? when(s.updated_at) : "No answers", "Newest field"]]
        .map(([l, v, n]) => `<div class="ps-kpi"><small>${esc(l)}</small><b>${esc(v)}</b><small>${esc(n)}</small></div>`).join("");
    }
    function drawSectionInto(el, section) {
      el.innerHTML = renderSection(section, data.proof_items);
      bindSection(el, section);
    }
    function draw() {
      if (!data) return;
      $("#bv-export").disabled = false;
      drawSummary();
      layout.hidden = false;
      nav.innerHTML = data.sections.map((s, i) => `<button type="button" class="set-nav-item${i === 0 ? " active" : ""}" data-jump="${esc(s.key)}">${esc(s.label)}${s.gaps ? ` <span class="bv-nav-gaps">${num(s.gaps)}</span>` : ""}</button>`).join("");
      nav.querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => { nav.querySelectorAll("[data-jump]").forEach((x) => x.classList.toggle("active", x === b)); root.querySelector(`#brain-${CSS.escape(b.dataset.jump)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
      body.innerHTML = data.sections.map((s) => `<section class="set-section bv-section" id="brain-${esc(s.key)}" data-section="${esc(s.key)}"></section>`).join("");
      data.sections.forEach((s) => drawSectionInto(body.querySelector(`[data-section="${CSS.escape(s.key)}"]`), s));
      spy();
    }
    // The section nav follows the page: the topmost section in view is active.
    let observer = null;
    function spy() {
      observer?.disconnect();
      if (!("IntersectionObserver" in window)) return;
      const visible = new Map();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((e) => visible.set(e.target.dataset.section, e.isIntersecting ? e.boundingClientRect.top : Infinity));
        let best = null;
        for (const [key, top] of visible) if (top !== Infinity && (best === null || top < visible.get(best))) best = key;
        if (best) nav.querySelectorAll("[data-jump]").forEach((b) => b.classList.toggle("active", b.dataset.jump === best));
      }, { rootMargin: "-80px 0px -60% 0px", threshold: 0 });
      body.querySelectorAll(".bv-section").forEach((s) => observer.observe(s));
    }
    function bindSection(el, section) {
      const save = el.querySelector("[data-save]");
      const status = el.querySelector(".set-status");
      const syncSave = () => { save.disabled = !el.querySelector(".bv-field.is-editing"); };
      // Cancel repaints the field from the model, so a half-typed edit is gone
      // and the stored answer is back exactly as it was.
      function bindCard(card) {
        card.querySelector("[data-edit]").onclick = () => { card.classList.add("is-editing"); card.querySelector(".bv-answer").hidden = true; card.querySelector(".bv-editor").hidden = false; card.querySelector("[data-edit]").hidden = true; status.textContent = ""; status.className = "set-status"; syncSave(); card.querySelector("[data-input]")?.focus(); };
        card.querySelector("[data-cancel]").onclick = () => { const field = section.fields.find((f) => f.key === card.dataset.field); const fresh = document.createElement("div"); fresh.innerHTML = renderField(section.key, field); const next = fresh.firstElementChild; card.replaceWith(next); bindCard(next); syncSave(); };
      }
      el.querySelectorAll(".bv-field").forEach(bindCard);
      save.onclick = () => saveSection(el, section, save, status, syncSave, bindCard);
    }
    // One POST per edited field, the payload the old panel sent. Each success
    // closes and repaints that field at once; a failure leaves the rest open
    // with their text and offers a retry for what is left.
    async function saveSection(el, section, button, status, syncSave, bindCard) {
      const cards = [...el.querySelectorAll(".bv-field.is-editing")];
      if (!cards.length) return;
      el.querySelector(".bv-actions .ps-inline-error")?.remove();
      PulsifyShell.pending(button); status.textContent = "Saving…"; status.className = "set-status";
      let cleared = 0, saved = 0;
      try {
        for (const card of cards) {
          const field = section.fields.find((f) => f.key === card.dataset.field);
          const type = card.dataset.type || "textarea";
          const value = parseEditor(card.querySelector("[data-input]").value, type);
          const source = card.querySelector("[data-source]").value;
          const d = await api("/api/client-brain", { method: "POST", body: JSON.stringify({ client, section: section.key, field: field.key, value, source }) });
          if (disposed) return;
          if (d.cleared) { field.value = null; field.source = null; field.updated_at = null; field.gap = true; cleared += 1; }
          else { field.value = value; field.source = d.source || source; field.updated_at = d.updated_at || new Date().toISOString(); field.gap = isGap(value); saved += 1; }
          const fresh = document.createElement("div"); fresh.innerHTML = renderField(section.key, field);
          const next = fresh.firstElementChild; card.replaceWith(next); bindCard(next);
        }
        recount();
        warm.set(client, data);
        if (section.key === "proof") { await load({ quiet: true }); return; }
        drawSummary();
        el.querySelector(".bv-head .int-pill").outerHTML = `<span class="int-pill ${section.gaps ? "int-pill-warn" : "int-pill-ok"}">${num(section.gaps)} ${section.gaps === 1 ? "gap" : "gaps"}</span>`;
        el.querySelector(":scope > .bv-section-empty")?.remove();
        if (section.fields.every((f) => f.gap)) el.querySelector(".bv-fields").insertAdjacentHTML("beforebegin", `<p class="bv-section-empty">${esc(SECTION_EMPTY[section.key] || "Nothing stored yet.")}</p>`);
        const navItem = nav.querySelector(`[data-jump="${CSS.escape(section.key)}"]`);
        if (navItem) navItem.innerHTML = `${esc(section.label)}${section.gaps ? ` <span class="bv-nav-gaps">${num(section.gaps)}</span>` : ""}`;
        status.textContent = cleared && !saved ? (cleared === 1 ? "Field cleared." : `${cleared} fields cleared.`) : cleared ? `Saved. ${cleared} cleared.` : "Saved.";
        status.className = "set-status ok";
      } catch (e) {
        if (disposed) return;
        status.textContent = ""; status.className = "set-status";
        PulsifyShell.inlineError(el.querySelector(".bv-actions"), e, () => saveSection(el, section, button, status, syncSave, bindCard));
      } finally {
        if (!disposed && button.isConnected) { PulsifyShell.pending(button, false); syncSave(); }
      }
    }
    async function load({ quiet = false } = {}) {
      const current = ++seq;
      feedback.replaceChildren();
      if (!client) { drawEmpty(); return; }
      const cached = warm.get(client);
      if (cached && !data) { data = cached; draw(); }
      if (!data && !quiet) { kpis.hidden = false; kpis.innerHTML = kpiSkeleton(); layout.hidden = false; nav.innerHTML = SECTION_ORDER.map((k) => `<span class="set-nav-item">${esc(SKELETON_LABELS[k])}</span>`).join(""); body.innerHTML = sectionSkeleton(); }
      try {
        const d = await api(`/api/client-brain?client=${encodeURIComponent(client)}`);
        if (disposed || current !== seq || !root.isConnected) return;
        data = d; warm.set(client, d); draw();
      } catch (e) {
        if (disposed || current !== seq) return;
        if (!data) { kpis.hidden = true; layout.hidden = true; }
        PulsifyShell.inlineError(feedback, e, () => load());
      }
    }
    async function exportBrain() {
      if (!client) return;
      const button = $("#bv-export");
      feedback.replaceChildren();
      PulsifyShell.pending(button);
      try {
        const r = await fetch(`/api/client-brain-export?client=${encodeURIComponent(client)}`, { headers: { "x-pulsify-operator": "1" } });
        if (!r.ok) throw PulsifyShell.failure(r.status);
        const blob = await r.blob();
        const filename = (r.headers.get("content-disposition") || "").match(/filename="([^"]+)"/i)?.[1] || `${client}-pulsify-context.md`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        if (!disposed) { const note = document.createElement("p"); note.className = "bv-note"; note.setAttribute("role", "status"); note.textContent = "Context package downloaded."; feedback.replaceChildren(note); }
      } catch (e) {
        if (!disposed) PulsifyShell.inlineError(feedback, e, exportBrain);
      } finally {
        if (!disposed && button.isConnected) PulsifyShell.pending(button, false);
      }
    }
    async function start() {
      if (!clients) {
        try { clients = (await api("/api/clients")).clients || []; }
        catch (e) { if (disposed || !root.isConnected) return; select.innerHTML = '<option value="">Clients unavailable</option>'; kpis.hidden = true; layout.hidden = true; PulsifyShell.inlineError(feedback, e, () => { clients = null; start(); }); return; }
        if (disposed || !root.isConnected) return;
      }
      // A handed-off client (bell, Leads) opens even if the cached list has not
      // caught up; anything else must be a client we know.
      const handedOff = Boolean(ctx.client) && client === ctx.client;
      if (!client || (!handedOff && !clients.some((c) => c.client === client))) client = clients[0]?.client || "";
      lastClient = client;
      drawClients();
      load();
    }

    select.onchange = () => { client = select.value; lastClient = client; data = null; seq++; load(); };
    $("#bv-refresh").onclick = () => { const b = $("#bv-refresh"); PulsifyShell.pending(b); load({ quiet: true }).finally(() => { if (b.isConnected) PulsifyShell.pending(b, false); }); };
    $("#bv-export").onclick = exportBrain;
    $("#bv-export").disabled = true;
    start();
    return () => { disposed = true; seq++; observer?.disconnect(); };
  }
  window.PulsifyBrainView = { render };
})();
