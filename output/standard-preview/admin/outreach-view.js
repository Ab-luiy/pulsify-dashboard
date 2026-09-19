// Outreach tracker: a contact book for Instagram DMs, separate from the CRM.
// Follow-ups due sit on top. Outbound (we opened) and Inbound (they opened)
// are separate sections. Each contact expands into the full chat history.
// Sending happens on the phone; this only tracks.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let TZ = "Europe/Istanbul";
  // The founder's spec: minutes 1-59, then hours 1-24, then days.
  function ago(iso, now = Date.now()) {
    if (!iso) return "";
    const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
    const h = Math.floor(m / 60);
    if (h <= 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  const stamp = (iso) => (iso ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "");
  const initials = (t) => (t.name || t.handle || "?").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const avatar = (t) => t.pfp_url ? `<img class="ot-avatar" src="${esc(t.pfp_url)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ot-avatar',textContent:'${esc(initials(t))}'}))">` : `<span class="ot-avatar">${esc(initials(t))}</span>`;
  const pct = (v) => (v === null || v === undefined ? "n/a" : `${v}%`);
  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }
  const STAGE_CLASS = { replied: "ot-stage-replied", booked: "ot-stage-ok", closed: "ot-stage-ok", lost: "ot-stage-off", hibernating: "ot-stage-off" };

  function render(root) {
    let data = null, section = "outbound", q = "", open = new Set(), timer = null;
    root.innerHTML = `
      <div class="ot-head"><div><h1>Outreach tracker</h1><p class="ps-subtitle">Every Instagram conversation as a contact. Follow-ups due sit on top. Send from your phone; this keeps the score.</p></div>
      <div class="ot-head-actions"><input id="ot-q" class="leads-search" placeholder="Search name or handle" autocomplete="off"><button class="ps-control" id="ot-refresh">Refresh</button></div></div>
      <div id="ot-stats" class="ot-stats"><div class="skeleton" style="min-height:120px;grid-column:1/-1"></div></div>
      <div class="int-tabs ot-tabs"><button data-section="outbound" class="active">Outbound <span id="ot-n-out"></span></button><button data-section="inbound">Inbound <span id="ot-n-in"></span></button><button data-section="hibernating">Hibernating <span id="ot-n-hib"></span></button><button data-section="won">Booked and closed <span id="ot-n-won"></span></button><span style="flex:1"></span><small id="ot-updated" class="int-note"></small></div>
      <div id="ot-activity" class="ot-activity" hidden></div>
      <div id="ot-list" class="ot-list"><div class="skeleton" style="min-height:240px"></div></div>`;

    let disposed = false, sequence = 0;
    async function load() {
      if (disposed || !root.isConnected) return;
      const current = ++sequence;
      try {
        const fresh = await api(`/api/outreach${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        if (disposed || current !== sequence) return;
        data = fresh;
        TZ = data.timezone || TZ;
        drawStats(); drawList(); drawActivity();
        const handoff = sessionStorage.getItem("pulsify:open-thread");
        if (handoff) { sessionStorage.removeItem("pulsify:open-thread"); const t = data.threads.find((x) => x.id === handoff); if (t) { section = bucket(t); root.querySelectorAll("[data-section]").forEach((x) => x.classList.toggle("active", x.dataset.section === section)); drawStats(); drawList(); if (!open.has(handoff)) toggle(handoff); root.querySelector(`#ot-${CSS.escape(handoff)}`)?.scrollIntoView({ block: "center" }); } }
        root.querySelector("#ot-updated").textContent = `${window.PulsifyRealtime?.status() === "live" ? "Live · " : ""}Updated ${stamp(data.generated_at)} (${TZ.split("/")[1]})`;
      } catch (e) {
        if (disposed || current !== sequence) return;
        root.querySelector("#ot-list").innerHTML = `<p class="int-empty">${esc(e.message)}</p>`;
      }
    }

    function drawStats() {
      const s = data.stats, o = s.outbound, i = s.inbound, p = s.pipeline;
      const cell = (label, value, note, cls = "") => `<div class="ot-stat ${cls}"><small>${esc(label)}</small><b>${esc(String(value))}</b>${note ? `<small>${esc(note)}</small>` : ""}</div>`;
      root.querySelector("#ot-stats").innerHTML = section === "inbound"
        ? cell("Inbound conversations", i.conversations, "They messaged first") + cell("Waiting on you", i.awaiting_us, "Their last message is unanswered", i.awaiting_us ? "ot-stat-warn" : "") + cell("Answered", i.answered, "You replied at least once") + cell("Positive", i.positive, "Marked by you") + cell("Negative", i.negative, "Marked by you") + cell("Appointments booked", p.appointments_booked, "All sections") + cell("Closed", p.closed, "All sections") + cell("Close rate", pct(p.close_rate), "Closed / booked")
        : cell("DMs sent", o.dms_sent, `${o.messages_sent} messages across them`) + cell("Follow-ups due", o.follow_ups_due, "24 h passed, no reply", o.follow_ups_due ? "ot-stat-warn" : "") + cell("Replies", o.replies, `${pct(o.reply_rate)} reply rate`) + cell("Positive / negative", `${o.positive} / ${o.negative}`, "Marked by you") + cell("Ghosted", o.ghosted, `${pct(o.ghost_rate)} ghost rate · 4 touches, silence`) + cell("Appointments booked", p.appointments_booked, "All sections") + cell("Close rate", pct(p.close_rate), "Closed / booked") + cell("Open rate", o.seen_available ? pct(o.open_rate) : "n/a", o.seen_available ? `${o.left_on_read} left on read` : "Needs Meta read receipts. Not available yet.", "ot-stat-muted");
    }

    function bucket(t) {
      if (t.outcome === "booked" || t.outcome === "closed") return "won";
      if (t.stage === "hibernating" || t.outcome === "lost") return "hibernating";
      return t.origin;
    }

    function drawList() {
      const all = data.threads;
      const counts = { outbound: 0, inbound: 0, hibernating: 0, won: 0 };
      for (const t of all) counts[bucket(t)] += 1;
      root.querySelector("#ot-n-out").textContent = counts.outbound; root.querySelector("#ot-n-in").textContent = counts.inbound; root.querySelector("#ot-n-hib").textContent = counts.hibernating; root.querySelector("#ot-n-won").textContent = counts.won;
      const list = all.filter((t) => bucket(t) === section);
      const due = list.filter((t) => t.follow_up_due), waiting = list.filter((t) => !t.follow_up_due && t.awaiting_us), rest = list.filter((t) => !t.follow_up_due && !t.awaiting_us);
      const group = (title, items, note) => items.length ? `<div class="ot-group"><h2>${esc(title)} <span>${items.length}</span>${note ? `<small>${esc(note)}</small>` : ""}</h2>${items.map(card).join("")}</div>` : "";
      const empty = { outbound: "No outbound conversations yet. Open a DM from your phone and it shows up here within a minute.", inbound: "Nobody has messaged you first yet.", hibernating: "Nobody is hibernating. Four touches with no reply, or a manual move, puts them here.", won: "No appointments or closes marked yet. Use the buttons on a contact." }[section];
      root.querySelector("#ot-list").innerHTML = list.length
        ? group("Follow ups", due, "24 hours have passed since your last message") + group("Waiting on you", waiting, "They spoke last") + group(section === "outbound" ? "Everyone else" : section === "inbound" ? "Answered" : section === "won" ? "Booked and closed" : "Hibernating", rest)
        : `<p class="int-empty">${esc(empty)}</p>`;
      root.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => toggle(b.dataset.toggle)));
      root.querySelectorAll("[data-act]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); act(b.dataset.id, b.dataset.act, b); }));
      root.querySelectorAll("[data-note]").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); act(f.dataset.note, "note", f.querySelector("button"), { text: f.querySelector("textarea").value }); }));
      for (const id of open) fillThread(id);
    }

    function card(t) {
      const stageCls = STAGE_CLASS[t.stage] || "";
      const timerLine = t.awaiting_us
        ? `They replied ${ago(t.last_their_message_at)}`
        : t.last_our_message_at
          ? `Your last message ${ago(t.last_our_message_at)}${t.follow_up_due ? ` · ${t.hours_since_our_message} hours have passed` : ""}`
          : "";
      return `<article class="ot-card ${t.follow_up_due ? "due" : ""} ${open.has(t.id) ? "open" : ""}" id="ot-${esc(t.id)}">
        <div class="ot-row" data-toggle="${esc(t.id)}">
          ${avatar(t)}
          <div class="ot-who"><strong>${esc(t.name)}</strong><small>${t.handle ? `@${esc(t.handle)}` : "handle syncing"} · ${t.origin === "outbound" ? "you opened" : "they opened"} ${ago(t.first_message_at)}</small></div>
          <div class="ot-last"><span>${esc(t.last_text || "(attachment)")}</span><small>${esc(timerLine)}</small></div>
          <div class="ot-meta"><span class="int-pill ${stageCls}">${esc(t.stage_label)}</span>${t.sentiment ? `<span class="int-pill ${t.sentiment === "positive" ? "int-pill-ok" : "int-pill-warn"}">${t.sentiment}</span>` : ""}${t.seen_at ? `<span class="int-pill">seen ${esc(ago(t.seen_at))}</span>` : ""}<small>${t.our_messages} sent · ${t.their_messages} received</small></div>
          <span class="ot-chevron">${open.has(t.id) ? "−" : "+"}</span>
        </div>
        <div class="ot-detail" ${open.has(t.id) ? "" : "hidden"}>
          <div class="ot-actions">
            <span class="ot-actions-label">Reply</span>
            <button class="ps-control ${t.sentiment === "positive" ? "active" : ""}" data-id="${esc(t.id)}" data-act="sentiment:${t.sentiment === "positive" ? "clear" : "positive"}">Positive</button>
            <button class="ps-control ${t.sentiment === "negative" ? "active" : ""}" data-id="${esc(t.id)}" data-act="sentiment:${t.sentiment === "negative" ? "clear" : "negative"}">Negative</button>
            <span class="ot-actions-label">Outcome</span>
            <button class="ps-control ${t.outcome === "booked" ? "active" : ""}" data-id="${esc(t.id)}" data-act="outcome:${t.outcome === "booked" ? "clear" : "booked"}">Booked</button>
            <button class="ps-control ${t.outcome === "closed" ? "active" : ""}" data-id="${esc(t.id)}" data-act="outcome:${t.outcome === "closed" ? "clear" : "closed"}">Closed</button>
            <button class="ps-control ${t.outcome === "lost" ? "active" : ""}" data-id="${esc(t.id)}" data-act="outcome:${t.outcome === "lost" ? "clear" : "lost"}">Lost</button>
            <span style="flex:1"></span>
            ${t.hibernated_at ? `<button class="ps-control" data-id="${esc(t.id)}" data-act="wake">Wake up</button>` : `<button class="ps-control" data-id="${esc(t.id)}" data-act="hibernate">Hibernate</button>`}
            ${t.handle ? `<a class="ps-control" href="https://instagram.com/${encodeURIComponent(t.handle)}" target="_blank" rel="noopener">Open on Instagram</a>` : ""}
          </div>
          <div class="ot-thread" data-thread="${esc(t.id)}"><div class="skeleton" style="min-height:80px"></div></div>
          <form class="ot-note" data-note="${esc(t.id)}"><textarea rows="2" placeholder="Note for yourself: what they do, what they said, next angle">${esc(t.notes)}</textarea><button class="ps-control" type="submit">Save note</button></form>
        </div>
      </article>`;
    }

    async function fillThread(id) {
      const box = root.querySelector(`[data-thread="${id}"]`);
      if (!box) return;
      try {
        const { messages } = await api(`/api/outreach?id=${encodeURIComponent(id)}`);
        box.innerHTML = `<div class="ot-messages">${messages.map((m) => `<div class="ot-msg ${m.direction}"><p>${esc(m.text || "(attachment)")}</p><small>${m.direction === "outbound" ? "You" : "Them"} · ${esc(ago(m.sent_at))} · ${esc(stamp(m.sent_at))}</small></div>`).join("") || '<p class="int-empty">No messages stored.</p>'}</div>`;
        box.querySelector(".ot-messages").scrollTop = 1e9;
      } catch (e) { box.innerHTML = `<p class="int-empty">${esc(e.message)}</p>`; }
    }

    function toggle(id) {
      if (open.has(id)) open.delete(id); else open.add(id);
      const el = root.querySelector(`#ot-${CSS.escape(id)}`);
      if (!el) return;
      el.classList.toggle("open", open.has(id));
      el.querySelector(".ot-detail").hidden = !open.has(id);
      el.querySelector(".ot-chevron").textContent = open.has(id) ? "−" : "+";
      if (open.has(id)) fillThread(id);
    }

    async function act(id, action, button, extra = {}) {
      button.disabled = true;
      try {
        const { thread } = await api("/api/outreach", { method: "POST", body: JSON.stringify({ id, action, ...extra }) });
        const idx = data.threads.findIndex((t) => t.id === id);
        if (idx >= 0) data.threads[idx] = thread;
        data.stats = null;
        data = await api(`/api/outreach${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        drawStats(); drawList();
      } catch (e) { button.disabled = false; button.textContent = e.message.slice(0, 30); }
    }

    function drawActivity() {
      const box = root.querySelector("#ot-activity");
      const events = data.events || [];
      box.hidden = !events.length;
      if (!events.length) return;
      const kindLabel = { reply: "replied", seen: "seen, no reply after 5 min", booked: "booked", closed: "closed", hibernated: "hibernating" };
      box.innerHTML = `<strong>Recent</strong>${events.slice(0, 8).map((e) => `<span class="ot-event"><b>${esc(e.name || e.handle || "Lead")}${e.handle ? `, @${esc(e.handle)}` : ""}</b> ${esc(kindLabel[e.kind] || e.kind)}${e.text ? `: ${esc(e.text.slice(0, 60))}` : ""} <small>${esc(ago(e.created_at))}</small></span>`).join("")}`;
    }

    root.querySelectorAll("[data-section]").forEach((b) => (b.onclick = () => { root.querySelectorAll("[data-section]").forEach((x) => x.classList.toggle("active", x === b)); section = b.dataset.section; drawStats(); drawList(); }));
    let debounce;
    root.querySelector("#ot-q").addEventListener("input", (e) => { clearTimeout(debounce); debounce = setTimeout(() => { q = e.target.value.trim(); load(); }, 150); });
    root.querySelector("#ot-refresh").onclick = load;
    load();
    // Live push: any change to a thread reloads the list within a second; the
    // 60 s poll below stays as the fallback when the socket is down.
    let pending = null, unsubscribe, paint;
    if (window.PulsifyRealtime) {
      const live = root.querySelector("#ot-updated");
      paint = () => { const s = PulsifyRealtime.status(); live.dataset.live = s; live.title = s === "live" ? "Live updates on" : s === "error" ? "Live updates unavailable, polling" : "Connecting live updates"; };
      document.addEventListener("pulsify:realtime", paint);
      unsubscribe = PulsifyRealtime.on("tracker.changed", () => { clearTimeout(pending); pending = setTimeout(load, 400); });
      paint();
    }
    // Timers tick without a network call; data refreshes each minute while the view is on screen.
    timer = setInterval(() => { if (!root.isConnected) { dispose(); return; } if (document.visibilityState === "visible") load(); }, 300000);
    function dispose() { disposed = true; clearInterval(timer); clearTimeout(debounce); clearTimeout(pending); unsubscribe?.(); if (paint) document.removeEventListener("pulsify:realtime", paint); }
    return dispose;
  }

  window.PulsifyOutreachView = { render, ago };
})();
