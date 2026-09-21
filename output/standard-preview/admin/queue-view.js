// Today: the daily outreach queue. One screen that answers "who do I message
// now". Follow-ups due (from the tracker) sit on top, then the openers queued
// for today with a ready draft each, then what can be added. Sending happens
// on the phone; this hands over the text and keeps the count.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TZ = "Europe/Istanbul";
  const today = () => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const initials = (t) => (t.name || t.handle || "?").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const avatar = (t) => t.pfp_url ? `<img class="qv-avatar" src="${esc(t.pfp_url)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'qv-avatar',textContent:'${esc(initials(t))}'}))">` : `<span class="qv-avatar">${esc(initials(t))}</span>`;
  const handle = (h) => String(h || "").replace(/^@/, "").trim();
  const igUrl = (h) => `https://instagram.com/${encodeURIComponent(handle(h))}`;
  const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;
  const WORD_MIN = 30, WORD_MAX = 45;
  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
    return d;
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    try {
      const ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch { return false; }
  }
  let warmThreads=null,warmQueue=null;
  const STAGE_CLASS = { replied: "qv-stage-replied", booked: "qv-stage-ok", closed: "qv-stage-ok", lost: "qv-stage-off", hibernating: "qv-stage-off" };

  function render(root) {
    let threads = warmThreads, queue = warmQueue, threadsError = null, queueError = null;
    const open = new Set();
    let focused = null; // id of the keyboard-focused row
    let addNote = ""; // last "added" confirmation, survives the re-render
    let disposed = false, seq = 0, timer = null, pending = null, unsubscribe, paint;

    root.innerHTML = `
      <div class="qv-head">
        <div><h1>Today</h1><p class="ps-subtitle">${esc(today())}. Recent conversations only (last two months). Replies and follow-ups first, then approved openers. Copy the text, send it from your phone, mark it sent.</p></div>
        <div class="qv-counters" id="qv-counters">${threads || queue ? "" : counterSkeleton()}</div>
      </div>
      <section class="qv-section" id="qv-followups"><h2>Replies and follow-ups <span></span><small>Reply to them, or follow up after 24 hours</small></h2><div class="qv-list">${threads ? "" : followSkeleton()}</div></section>
      <section class="qv-section" id="qv-openers"><h2>Openers <span></span><small>Ready drafts. Edit, copy, send, mark sent.</small></h2><div class="qv-list">${queue ? "" : openerSkeleton()}</div></section>
      <section class="qv-section" id="qv-add"><h2>Add to today<small>Pick from the candidates or add someone by hand</small></h2><div class="qv-list">${queue ? "" : candidateSkeleton()}</div></section>
      <p class="qv-keys" id="qv-keys">Keys: j and k move, Enter opens, c copies the draft, s marks it sent.</p>`;

    const $ = (sel) => root.querySelector(sel);

    // Loading. Each section paints as soon as its own request lands.
    async function load(what = "both") {
      if (disposed || !root.isConnected) return;
      const current = ++seq;
      const jobs = [];
      if (what !== "queue") jobs.push(api("/api/outreach?period=recent").then((d) => { if (disposed || current !== seq) return; threads = d.threads || []; warmThreads=threads;threadsError = null; }).catch((e) => { if (disposed || current !== seq) return; threadsError = e; }).then(() => { if (!disposed && current === seq) { drawFollowups(); drawCounters(); } }));
      if (what !== "threads") jobs.push(api("/api/outreach-queue?view=today").then((d) => { if (disposed || current !== seq) return; queue = d;warmQueue=queue;queueError = null; }).catch((e) => { if (disposed || current !== seq) return; queueError = e; }).then(() => { if (!disposed && current === seq) { drawOpeners(); drawAdd(); drawCounters(); } }));
      await Promise.all(jobs);
    }

    const due = () => (threads || []).filter((t) => (t.follow_up_due || t.awaiting_us) && !t.outcome && !t.hibernated_at && t.stage !== "hibernating").sort((a, b) => (b.hours_since_our_message || 0) - (a.hours_since_our_message || 0));
    const queued = () => (queue?.queued || []).filter((r) => r.status === "queued").sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const done = () => (queue?.queued || []).filter((r) => r.status !== "queued");

    function drawCounters() {
      if (!threads && !queue) return;
      const dueCount = threads ? due().length : null;
      const cap = queue?.cap ?? 25, sent = queue?.sent_today ?? 0, left = Math.max(0, cap - sent);
      $("#qv-counters").innerHTML = `
        <div class="qv-counter ${dueCount ? "warn" : ""}"><small>Actions due</small>${dueCount === null ? '<div class="skeleton qv-sk-num"></div>' : `<b>${dueCount}</b>`}<small>${dueCount === null ? "Loading" : dueCount === 1 ? "One person waiting on you" : dueCount ? "People waiting on you" : "Nobody waiting on you"}</small></div>
        <div class="qv-counter"><small>Openers left today</small>${queue ? `<b>${left}<em> of ${cap}</em></b>` : '<div class="skeleton qv-sk-num"></div>'}<small>${queue ? `${sent} sent so far` : "Loading"}</small></div>`;
    }

    // Section 1: follow-ups due.
    function drawFollowups() {
      const list = due();
      $("#qv-followups h2 span").textContent = list.length ? list.length : "";
      const box = $("#qv-followups .qv-list");
      if (threadsError) {if(!threads)box.replaceChildren();PulsifyShell.inlineError(box,threadsError,()=>load("threads"));return;}
      if (!list.length) {box.replaceChildren(PulsifySurface.empty("check","No follow-ups due","Review your conversations or start an opener below.","Review outreach",()=>window.PulsifyOperatorShell?.go("outreach")));return;}
      box.innerHTML = list.map((t) => `
        <article class="qv-row qv-follow ${focused === t.id ? "focus" : ""}" data-row="${esc(t.id)}" data-kind="follow" tabindex="-1">
          ${avatar(t)}
          <div class="qv-who"><strong>${esc(t.name || t.handle || "Lead")}</strong><small>${t.handle ? `@${esc(t.handle)}` : "handle syncing"}</small></div>
          <div class="qv-last"><span>${esc(t.last_text || "(attachment)")}</span><small>${t.hours_since_our_message != null ? `${esc(t.hours_since_our_message)} hours have passed` : "No reply yet"}</small></div>
          <span class="int-pill ${STAGE_CLASS[t.stage] || ""}">${esc(t.stage_label || t.stage || "")}</span>
          <div class="qv-actions">
            ${t.handle ? `<a class="ps-control" href="${igUrl(t.handle)}" target="_blank" rel="noopener">Open on Instagram</a>` : ""}
            <button class="ps-control" data-thread="${esc(t.id)}" data-act="outcome:booked">Booked</button>
            <button class="ps-control" data-thread="${esc(t.id)}" data-act="hibernate">Hibernate</button>
          </div>
        </article>`).join("");
      box.querySelectorAll("[data-thread]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); threadAct(b.dataset.thread, b.dataset.act, b); }));
      box.querySelectorAll("[data-row]").forEach((el) => (el.onclick = () => setFocus(el.dataset.row)));
    }

    async function threadAct(id, action, button) {
      PulsifyShell.pending(button);button.parentElement.querySelector(".ps-inline-error")?.remove();
      try {
        await api("/api/outreach", { method: "POST", body: JSON.stringify({ id, action }) });
        // Either way the thread leaves the due list, so drop it now and refresh behind.
        threads = (threads || []).filter((t) => t.id !== id);
        drawFollowups(); drawCounters();
        load("threads");
      } catch (e) {PulsifyShell.inlineError(button.parentElement,e,()=>threadAct(id,action,button));}finally{PulsifyShell.pending(button,false);}
    }

    // Section 2: openers.
    function drawOpeners() {
      const list = queued(), finished = done();
      $("#qv-openers h2 span").textContent = list.length ? list.length : "";
      const box = $("#qv-openers .qv-list");
      if (queueError) {if(!queue)box.replaceChildren();PulsifyShell.inlineError(box,queueError,()=>load("queue"));return;}
      if (!list.length && !finished.length) {box.replaceChildren(queueEmpty());return;}
      box.innerHTML = list.map(openerCard).join("") + (finished.length ? `<details class="qv-done"><summary>Done today <span>${finished.length}</span></summary>${finished.map(doneRow).join("")}</details>` : "") + "";
      if(!list.length)box.append(queueEmpty());
      wireOpeners(box);
    }

    function queueEmpty(){return PulsifySurface.empty("list-check","Nothing queued for today","Add a candidate or enter a handle below.","Add someone",()=>{$("#qv-manual input")?.focus();$("#qv-add").scrollIntoView({block:"start",behavior:"smooth"});});}

    function draftMeta(r) {
      const n = words(r.draft);
      if (!r.draft) return `<small class="qv-words">No draft yet</small>`;
      const off = n < WORD_MIN || n > WORD_MAX;
      return `<small class="qv-words ${off ? "off" : ""}">${n} word${n === 1 ? "" : "s"}${off ? `, aim for ${WORD_MIN} to ${WORD_MAX}` : ""}</small>`;
    }

    function openerCard(r) {
      const isOpen = open.has(r.id);
      const preview = r.needs_detail && !r.draft ? "Needs one specific detail before the draft is written." : (r.draft || "").split("\n")[0];
      return `<article class="qv-row qv-opener ${isOpen ? "open" : ""} ${focused === r.id ? "focus" : ""} ${r.needs_detail ? "needs" : ""}" data-row="${esc(r.id)}" data-kind="opener" tabindex="-1">
        <div class="qv-opener-row" data-toggle="${esc(r.id)}">
          ${avatar(r)}
          <div class="qv-who"><strong>${esc(r.name || r.handle)}</strong><small>@${esc(handle(r.handle))}${r.niche ? ` · ${esc(r.niche)}` : ""}</small></div>
          <div class="qv-last"><span>${esc(preview)}</span>${draftMeta(r)}</div>
          <div class="qv-meta">${r.needs_detail ? `<span class="int-pill int-pill-warn">Needs detail</span>` : `<span class="int-pill">Queued</span>`}</div>
          <span class="qv-chevron" aria-hidden="true">${isOpen ? "−" : "+"}</span>
        </div>
        <div class="qv-detail" ${isOpen ? "" : "hidden"}>
          ${r.needs_detail ? `<label class="qv-field"><span>One specific detail</span><input class="ps-input qv-input" data-detail="${esc(r.id)}" value="${esc(r.detail || "")}" placeholder="A video, a post, a line they said. The draft is built around it."><small>Saves when you leave the field, then the draft is written.</small></label>` : ""}
          <label class="qv-field"><span>Draft</span><textarea class="ps-input qv-input qv-draft" data-draft="${esc(r.id)}" rows="4" placeholder="${r.needs_detail ? "Add the detail above first." : "Write the opener here."}">${esc(r.draft || "")}</textarea><span class="qv-draft-foot">${draftMeta(r)}<small class="qv-saved" data-saved="${esc(r.id)}"></small></span></label>
          ${r.gap || r.link ? `<p class="qv-brief">${r.gap ? `<span>Gap: ${esc(r.gap)}</span>` : ""}${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.link.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : ""}</p>` : ""}
          <div class="qv-actions">
            <button class="ps-button primary qv-primary" data-id="${esc(r.id)}" data-act="copy" ${r.draft ? "" : "disabled"}>Copy draft</button>
            <button class="ps-control" data-id="${esc(r.id)}" data-act="draft">Regenerate</button>
            <a class="ps-control" href="${igUrl(r.handle)}" target="_blank" rel="noopener">Open on Instagram</a>
            <span style="flex:1"></span>
            <button class="ps-control" data-id="${esc(r.id)}" data-act="sent">Mark sent</button>
            <button class="ps-control qv-quiet" data-id="${esc(r.id)}" data-act="skip">Skip</button>
          </div>
        </div>
      </article>`;
    }

    function doneRow(r) {
      const label = { sent: "Sent", skipped: "Skipped", replied: "Replied" }[r.status] || r.status;
      return `<div class="qv-done-row"><span class="qv-avatar small">${esc(initials(r))}</span><strong>${esc(r.name || r.handle)}</strong><small>@${esc(handle(r.handle))}</small><span class="int-pill ${r.status === "replied" ? "int-pill-ok" : ""}">${esc(label)}</span><span style="flex:1"></span>${r.status !== "replied" ? `<button class="ps-control qv-quiet" data-id="${esc(r.id)}" data-act="requeue">Requeue</button>` : ""}</div>`;
    }

    function wireOpeners(box) {
      box.querySelectorAll("[data-toggle]").forEach((el) => (el.onclick = (e) => { if (e.target.closest("a,button,input,textarea")) return; setFocus(el.dataset.toggle); toggle(el.dataset.toggle); }));
      box.querySelectorAll("[data-act]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); queueAct(b.dataset.id, b.dataset.act, b); }));
      box.querySelectorAll("[data-draft]").forEach((ta) => {
        ta.addEventListener("input", () => { const meta = ta.parentElement.querySelector(".qv-words"); if (meta) meta.outerHTML = draftMeta({ draft: ta.value }); });
        ta.addEventListener("focus", () => setFocus(ta.dataset.draft));
        ta.addEventListener("blur", () => saveField(ta.dataset.draft, "draft", ta.value));
      });
      box.querySelectorAll("[data-detail]").forEach((inp) => {
        inp.addEventListener("focus", () => setFocus(inp.dataset.detail));
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } });
        inp.addEventListener("blur", () => saveDetail(inp.dataset.detail, inp.value));
      });
    }

    function row(id) { return (queue?.queued || []).find((r) => r.id === id); }
    function status(id, text, cls = "") { const el = root.querySelector(`[data-saved="${CSS.escape(id)}"]`); if (!el) return; el.textContent = text; el.className = `qv-saved ${cls}`; if (text) setTimeout(() => { if (el.textContent === text) el.textContent = ""; }, 1800); }

    async function saveField(id, field, value) {
      const r = row(id); if (!r || (r[field] || "") === value) return;
      const previous=r[field];r[field] = value;
      try { await api("/api/outreach-queue", { method: "POST", body: JSON.stringify({ action: "update", id, [field]: value }) }); status(id, "Saved"); }
      catch (e) {r[field]=previous;PulsifyShell.inlineError(root.querySelector(`[data-row="${CSS.escape(id)}"] .qv-detail`),e,()=>saveField(id,field,value));return;}
      const card = root.querySelector(`[data-row="${CSS.escape(id)}"] .qv-opener-row`);
      if (card && field === "draft") { card.querySelector(".qv-last span").textContent = value.split("\n")[0]; const w = card.querySelector(".qv-last .qv-words"); if (w) w.outerHTML = draftMeta(r); const copy = root.querySelector(`[data-row="${CSS.escape(id)}"] [data-act="copy"]`); if (copy) copy.disabled = !value.trim(); }
    }

    async function saveDetail(id, value) {
      const r = row(id); if (!r) return;
      value = value.trim();
      if ((r.detail || "") === value) return;
      const previous=r.detail; r.detail = value;
      try {
        await api("/api/outreach-queue", { method: "POST", body: JSON.stringify({ action: "update", id, detail: value }) });
        if (value) { status(id, "Writing the draft"); await api("/api/outreach-queue", { method: "POST", body: JSON.stringify({ action: "draft", id }) }); }
        await load("queue");
      } catch (e) {r.detail=previous;PulsifyShell.inlineError(root.querySelector(`[data-row="${CSS.escape(id)}"] .qv-detail`),e,()=>saveDetail(id,value));}
    }

    async function queueAct(id, action, button) {
      const r = row(id);
      if (action === "copy") {
        const ta = root.querySelector(`[data-draft="${CSS.escape(id)}"]`);
        const text = ta ? ta.value : r?.draft || "";
        if (!text.trim()) return;
        const ok = await copyText(text);
        const label = button.textContent;if(!ok){PulsifyShell.inlineError(button.parentElement,PulsifyShell.failure(400,"Could not copy. Select the draft and copy it manually."));return;} button.textContent = "Copied"; button.classList.add("done");
        setTimeout(() => { button.textContent = label; button.classList.remove("done"); }, 2000);
        return;
      }
      button.disabled = true;
      const busy = { draft: "Writing", sent: "Marking", skip: "Skipping", requeue: "Requeueing" }[action];
      if (busy) button.textContent = busy;
      try {
        await api("/api/outreach-queue", { method: "POST", body: JSON.stringify({ action, id }) });
        if (action === "sent" || action === "skip") { if (r) { r.status = action === "sent" ? "sent" : "skipped"; open.delete(id); if (queue && action === "sent") queue.sent_today = (queue.sent_today || 0) + 1; } moveFocusAfter(id); drawOpeners(); drawCounters(); }
        await load("queue");
      } catch (e) {PulsifyShell.inlineError(button.parentElement,e,()=>queueAct(id,action,button));}finally{PulsifyShell.pending(button,false);}
    }

    // Section 3: add to today.
    function drawAdd() {
      const box = $("#qv-add .qv-list");
      if(queueError && !queue){box.replaceChildren();PulsifyShell.inlineError(box,queueError,()=>load("queue"));return;}
      const cands = (queue?.candidates || []).filter((c) => !(queue?.queued || []).some((r) => handle(r.handle).toLowerCase() === handle(c.handle).toLowerCase()));
      const sourceLabel = { crm: "CRM", yt_leads: "YouTube", manual: "Manual" };
      box.innerHTML = `
        ${queueError ? "" : cands.length ? `<div class="qv-chips">${cands.map((c) => `<div class="qv-chip"><span class="qv-avatar small">${esc(initials(c))}</span><div class="qv-chip-text"><strong>${esc(c.name || c.handle)}</strong><small>@${esc(handle(c.handle))}${c.niche ? ` · ${esc(c.niche)}` : ""}</small></div>${c.tier ? `<span class="int-pill">Tier ${esc(c.tier)}</span>` : ""}<span class="qv-source">${esc(sourceLabel[c.source] || c.source || "")}</span><button class="ps-control" data-add-handle="${esc(c.handle)}" data-add-source="${esc(c.source || "")}" data-add-name="${esc(c.name || "")}" data-add-niche="${esc(c.niche || "")}">Add</button></div>`).join("")}</div>` : `<div data-candidates-empty></div>`}
        <form class="qv-manual" id="qv-manual">
          <label class="qv-field"><span>Handle</span><input class="ps-input qv-input" name="handle" required placeholder="@handle" autocomplete="off"></label>
          <label class="qv-field"><span>Name</span><input class="ps-input qv-input" name="name" placeholder="First name" autocomplete="off"></label>
          <label class="qv-field qv-wide"><span>One specific detail</span><input class="ps-input qv-input" name="detail" placeholder="A video, a post, a line they said" autocomplete="off"></label>
          <label class="qv-field"><span>Link</span><input class="ps-input qv-input" name="link" placeholder="https://" autocomplete="off"></label>
          <div class="qv-manual-foot"><button class="ps-button primary qv-primary" type="submit">Add to today</button><small class="qv-saved" id="qv-manual-status">${esc(addNote)}</small></div>
        </form>`;
      box.querySelectorAll("[data-add-handle]").forEach((b) => (b.onclick = () => add({ handle: b.dataset.addHandle, source: b.dataset.addSource, name: b.dataset.addName, niche: b.dataset.addNiche }, b)));
      box.querySelector("[data-candidates-empty]")?.append(PulsifySurface.empty("users","No candidates waiting","Add a contact by handle to write their first draft.","Add by handle",()=>$("#qv-manual input")?.focus()));
      const form = $("#qv-manual");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(form), payload = { handle: handle(f.get("handle")), source: "manual", name: String(f.get("name") || "").trim(), detail: String(f.get("detail") || "").trim(), link: String(f.get("link") || "").trim() };
        if (!payload.handle) return;
        await add(payload, form.querySelector("button"), $("#qv-manual-status"));
      });
    }

    async function add(payload, button, note) {
      PulsifyShell.pending(button);button.parentElement.querySelector(".ps-inline-error")?.remove();
      try {
        await api("/api/outreach-queue", { method: "POST", body: JSON.stringify({ action: "add", ...payload }) });
        addNote = `@${payload.handle} added to today`;
        await load("queue");
        setTimeout(() => { addNote = ""; const el = $("#qv-manual-status"); if (el) el.textContent = ""; }, 2500);
      } catch (e) {PulsifyShell.inlineError(button.parentElement,e,()=>add(payload,button,note));}finally{PulsifyShell.pending(button,false);}
    }

    // Expand and collapse.
    function toggle(id) {
      if (open.has(id)) open.delete(id); else open.add(id);
      const el = root.querySelector(`[data-row="${CSS.escape(id)}"]`);
      if (!el) return;
      el.classList.toggle("open", open.has(id));
      el.querySelector(".qv-detail").hidden = !open.has(id);
      el.querySelector(".qv-chevron").textContent = open.has(id) ? "−" : "+";
    }

    // Keyboard: j and k walk the rows, Enter opens, c copies, s marks sent.
    const rows = () => [...root.querySelectorAll("[data-row]")].map((el) => el.dataset.row);
    function setFocus(id) {
      focused = id;
      root.querySelectorAll("[data-row]").forEach((el) => el.classList.toggle("focus", el.dataset.row === id));
    }
    function moveFocusAfter(id) { const all = rows(), i = all.indexOf(id); focused = all[i + 1] || all[i - 1] || null; }
    function move(step) {
      const all = rows(); if (!all.length) return;
      const i = all.indexOf(focused), next = i < 0 ? (step > 0 ? 0 : all.length - 1) : Math.min(all.length - 1, Math.max(0, i + step));
      setFocus(all[next]);
      const el = root.querySelector(`[data-row="${CSS.escape(all[next])}"]`);
      el?.scrollIntoView({ block: "nearest" });
      el?.focus({ preventScroll: true });
    }
    function onKey(e) {
      if (!root.isConnected || disposed) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.closest("input,textarea,select,[contenteditable],dialog") || t.closest(".pp-root"))) return;
      const el = focused ? root.querySelector(`[data-row="${CSS.escape(focused)}"]`) : null;
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); move(1); return; }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); move(-1); return; }
      if (!el) return;
      const kind = el.dataset.kind;
      if (e.key === "Enter") { e.preventDefault(); if (kind === "opener") toggle(focused); else el.querySelector("a[href]")?.click(); return; }
      if (e.key === "c" && kind === "opener") { e.preventDefault(); const b = el.querySelector('[data-act="copy"]'); if (b && !b.disabled) b.click(); return; }
      if (e.key === "s" && kind === "opener") { e.preventDefault(); el.querySelector('[data-act="sent"]')?.click(); }
    }
    document.addEventListener("keydown", onKey);

    load();
    // Live push: when a sent DM reaches the tracker the queue reconciles
    // server side, so any tracker change reloads both lists. Poll as fallback.
    if (window.PulsifyRealtime) {
      unsubscribe = PulsifyRealtime.on("tracker.changed", () => { clearTimeout(pending); pending = setTimeout(() => load(), 400); });
    }
    // Actions taken elsewhere on the page (the command palette) reload the lists too.
    const onChanged = () => { clearTimeout(pending); pending = setTimeout(() => load(), 300); };
    window.addEventListener("pulsify:outreach-changed", onChanged);
    timer = setInterval(() => { if (!root.isConnected) { dispose(); return; } if (document.visibilityState === "visible") load(); }, 120000);
    function dispose() { disposed = true;seq++; clearInterval(timer); clearTimeout(pending); unsubscribe?.(); document.removeEventListener("keydown", onKey); window.removeEventListener("pulsify:outreach-changed", onChanged); }
    return dispose;
  }

  // Skeletons shaped like the rows they stand in for.
  function counterSkeleton() { return Array.from({ length: 2 }, () => `<div class="qv-counter"><div class="skeleton" style="width:40%;min-height:11px"></div><div class="skeleton qv-sk-num"></div><div class="skeleton" style="width:60%;min-height:11px"></div></div>`).join(""); }
  function followSkeleton() { return Array.from({ length: 2 }, () => `<div class="qv-row qv-follow sk"><span class="skeleton qv-avatar"></span><div class="qv-who"><div class="skeleton" style="width:110px;min-height:14px"></div><div class="skeleton" style="width:80px;min-height:11px;margin-top:6px"></div></div><div class="qv-last"><div class="skeleton" style="width:70%;min-height:13px"></div><div class="skeleton" style="width:120px;min-height:11px;margin-top:6px"></div></div><span class="skeleton qv-pill-sk" style="width:84px;min-height:22px;border-radius:999px"></span><div class="qv-actions"><span class="skeleton" style="width:126px;min-height:32px"></span><span class="skeleton" style="width:66px;min-height:32px"></span><span class="skeleton" style="width:82px;min-height:32px"></span></div></div>`).join(""); }
  function openerSkeleton() { return Array.from({ length: 4 }, (_, i) => `<div class="qv-row qv-opener sk"><div class="qv-opener-row"><span class="skeleton qv-avatar"></span><div class="qv-who"><div class="skeleton" style="width:${90 + (i % 3) * 20}px;min-height:14px"></div><div class="skeleton" style="width:130px;min-height:11px;margin-top:6px"></div></div><div class="qv-last"><div class="skeleton" style="width:${60 + (i % 2) * 20}%;min-height:13px"></div><div class="skeleton" style="width:60px;min-height:11px;margin-top:6px"></div></div><div class="qv-meta"><span class="skeleton" style="width:64px;min-height:22px;border-radius:999px"></span></div><span class="qv-chevron"></span></div></div>`).join(""); }
  function candidateSkeleton() { return `<div class="qv-chips">${Array.from({ length: 3 }, () => `<div class="qv-chip sk"><span class="skeleton qv-avatar small"></span><div class="qv-chip-text"><div class="skeleton" style="width:90px;min-height:13px"></div><div class="skeleton" style="width:120px;min-height:11px;margin-top:5px"></div></div><span class="skeleton" style="width:56px;min-height:22px;border-radius:999px"></span><span class="skeleton" style="width:52px;min-height:32px"></span></div>`).join("")}</div>`; }

  window.PulsifyQueueView = { render, words };
})();
