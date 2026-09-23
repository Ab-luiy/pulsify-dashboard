// The bell, for both shells. A dropdown anchored under the bell button:
// unread badge, All / Unread tabs, rows grouped by day, each row expands in
// place with the full text and details, and "Open" lands on the exact origin
// (the thread in the tracker, the client, the payment), not just a section.
// Live through PulsifyRealtime when present, 30 s poll as the fallback.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function ago(iso) {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); if (h <= 24) return `${h} h ago`;
    return `${Math.floor(h / 24)} d ago`;
  }
  const stamp = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const dayOf = (iso) => { const d = new Date(iso), n = new Date(); const day = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; if (day(d) === day(n)) return "Today"; n.setDate(n.getDate() - 1); return day(d) === day(n) ? "Yesterday" : "Earlier"; };
  // Line icons (24 px grid, stroke) so both shells render the same without a sprite.
  const SVG = {
    message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    money: '<path d="M12 2v20M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9.2 9.5 12 10s5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3"/>',
    signed: '<path d="M4 20h16M6 16l9.5-9.5a2.1 2.1 0 0 1 3 3L9 19H6v-3Z"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    form: '<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 6h6m-6 4h6m-6 4h3"/>',
    calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4"/>',
    review: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="m9 10.5 2 2 4-4"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    alert: '<path d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[name] || SVG.bell}</svg>`;
  const KIND = {
    "lead.replied": { icon: "message", label: "Message", group: "dms" },
    "lead.seen": { icon: "eye", label: "Seen", group: "dms" },
    payment: { icon: "money", label: "Payment", group: "money" },
    client: { icon: "signed", label: "Client", group: "clients" },
    checklist: { icon: "check", label: "Launch step", group: "clients" },
    content: { icon: "review", label: "Content", group: "clients" },
    "content.review": { icon: "review", label: "Review", group: "clients" },
    application: { icon: "form", label: "Application", group: "funnel" },
    booking: { icon: "calendar", label: "Booked call", group: "funnel" },
    brief: { icon: "form", label: "Pre-call brief", group: "funnel" },
    digest: { icon: "list", label: "Today", group: "all" },
    system: { icon: "alert", label: "System", group: "all" },
  };
  const kindOf = (k) => KIND[k] || { icon: "bell", label: String(k || "Update"), group: "all" };
  const FILTERS = [["all", "All"], ["dms", "Messages"], ["money", "Money"], ["clients", "Clients"], ["funnel", "Funnel"]];
  const initials = (text) => String(text || "?").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  // Where a notification actually came from. Returns {view, handoff} so the
  // target view can open the exact record after navigation.
  function origin(item, operator) {
    const e = item.entity || {};
    if (e.conversation_id) return { view: operator ? "outreach" : "leads", handoff: ["pulsify:open-thread", e.conversation_id], label: e.handle ? `Open @${e.handle}` : "Open conversation" };
    if (item.kind === "payment") return { view: item.link || (operator ? "payments" : "revenue"), handoff: e.payment_id ? ["pulsify:open-payment", String(e.payment_id)] : null, label: "Open payment" };
    if (e.client && operator) return { view: "brain", handoff: ["pulsify:brain-client", String(e.client)], label: `Open ${e.name || e.client}` };
    if (item.kind === "system") return { view: "integrations", handoff: null, label: "Open integrations" };
    return item.link ? { view: !operator && ["crm", "outreach"].includes(item.link) ? "leads" : item.link, handoff: null, label: "Open" } : null;
  }

  function details(item) {
    const e = item.entity || {};
    const rows = [];
    if (e.handle) rows.push(["Handle", `@${e.handle}`]);
    if (e.name && e.name !== e.handle) rows.push(["Name", e.name]);
    if (e.client) rows.push(["Client", e.client_name || e.client]);
    if (e.amount_cents != null) rows.push(["Amount", new Intl.NumberFormat("en-US", { style: "currency", currency: e.currency || "USD" }).format(e.amount_cents / 100)]);
    if (e.origin) rows.push(["Thread", e.origin === "outbound" ? "You reached out first" : "They messaged you first"]);
    if (e.email) rows.push(["Email", e.email]);
    if (e.starts_at) rows.push(["Starts", stamp(e.starts_at)]);
    if (e.provider) rows.push(["Via", e.provider]);
    if (e.step) rows.push(["Step", String(e.step).replace(/-/g, " ")]);
    rows.push(["When", stamp(item.created_at)]);
    return rows;
  }

  function mount(ctx) {
    const button = (ctx.container || document).querySelector(".ps-notifications");
    if (!button) return;
    if (button._pulsifyBell) return button._pulsifyBell;
    button.dataset.bell = "1";
    const badge = document.createElement("span");
    badge.className = "ps-bell-badge"; badge.hidden = true;
    button.style.position = "relative"; button.append(badge);
    button.setAttribute("aria-haspopup", "true"); button.setAttribute("aria-expanded", "false");
    const headers = () => ({ "content-type": "application/json", ...(ctx.operator ? { "x-pulsify-operator": "1" } : {}), ...(ctx.headers ? ctx.headers() : {}) });
    const qs = (extra = "") => `?client=${encodeURIComponent(ctx.client || "")}${extra}`;
    let feed = { items: [], unread: 0 };
    let panel = null, tab = "all", filter = "all", expanded = null, limit = 50, mutes = new Set();
    const seen = new Set();
    let loading = null, destroyed = false, initialized = false, loadError = false;

    function load() {
      if (destroyed) return Promise.resolve();
      if (loading) return loading;
      loading = refresh().finally(() => { loading = null; });
      return loading;
    }
    async function refresh() {
      try {
        const r = await fetch(`/api/notifications${qs(`&limit=${limit}`)}`, { credentials: "same-origin", headers: headers() });
        if (!r.ok) throw Error("Could not load notifications.");
        const next = await r.json();
        if (destroyed) return;
        feed = { items: Array.isArray(next.items) ? next.items : [], unread: Number(next.unread) || 0 };
        if (Array.isArray(next.mutes)) mutes = new Set(next.mutes.map((h) => String(h).toLowerCase()));
        loadError = false;
        paintBadge();
        for (const item of feed.items) {
          if (!item.read_at && ["lead.replied", "payment", "application", "booking", "client"].includes(item.kind) && !seen.has(item.id) && initialized) toast(item);
          seen.add(item.id);
        }
        initialized = true;
        if (panel) drawList();
      } catch { loadError = true; if (panel) drawList(); }
    }
    function paintBadge() {
      badge.textContent = feed.unread > 99 ? "99+" : String(feed.unread);
      badge.hidden = !feed.unread;
      button.setAttribute("aria-label", feed.unread ? `Notifications, ${feed.unread} unread` : "Notifications");
      document.title = document.title.replace(/^\(\d+\+?\) /, "");
      if (feed.unread) document.title = `(${badge.textContent}) ${document.title}`;
    }

    function toast(item) {
      const t = document.createElement("div");
      t.className = "ps-toast";
      t.innerHTML = `${avatar(item)}<div><strong>${esc(item.title)}</strong>${item.body ? `<span>${esc(item.body.slice(0, 120))}</span>` : ""}</div>`;
      t.onclick = () => { go(item); t.remove(); };
      document.body.append(t);
      setTimeout(() => t.classList.add("show"), 20);
      setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 8000);
    }

    function go(item) {
      markRead([item.id]);
      const o = origin(item, Boolean(ctx.operator));
      close();
      if (!o) return;
      if (o.handoff) { try { sessionStorage.setItem(o.handoff[0], o.handoff[1]); } catch {} }
      if (ctx.go) ctx.go(o.view);
    }

    async function markRead(ids, all = false) {
      try {
        const response = await fetch(`/api/notifications`, { method: "POST", credentials: "same-origin", headers: headers(), body: JSON.stringify({ client: ctx.client || "", ids, all }) });
        if (!response.ok) throw Error("Could not mark notifications read.");
        const result = await response.json();
        for (const it of feed.items) if (all || ids.includes(it.id)) it.read_at = it.read_at || new Date().toISOString();
        feed.unread = all ? 0 : Math.max(0, feed.unread - (Number(result.marked) || 0));
        paintBadge();
        if (panel) drawList();
      } catch { if (panel) { let note = panel.querySelector("[data-bell-error]"); if (!note) { note = document.createElement("p"); note.dataset.bellError = ""; note.className = "ps-bell-empty"; panel.append(note); } note.textContent = "Could not save that change. Please retry."; } }
    }

    async function mute(handle, muted) {
      try {
        const response = await fetch(`/api/notifications`, { method: "POST", credentials: "same-origin", headers: headers(), body: JSON.stringify({ mute: { handle, muted } }) });
        if (!response.ok) throw Error("Could not update mute.");
        const result = await response.json();
        mutes = new Set((result.mutes || []).map((h) => String(h).toLowerCase()));
        if (panel) drawList();
      } catch { if (panel) { let note = panel.querySelector("[data-bell-error]"); if (!note) { note = document.createElement("p"); note.dataset.bellError = ""; note.className = "ps-bell-empty"; panel.append(note); } note.textContent = "Could not save that change. Please retry."; } }
    }

    // A person's picture when the notification is about an Instagram contact,
    // otherwise an icon tile for the kind.
    function avatar(i) {
      const e = i.entity || {};
      if (e.conversation_id) {
        const letters = esc(initials(e.name || e.handle));
        const img = ctx.operator && e.avatar ? `<img src="/api/spine/instagram-image?id=${encodeURIComponent("pfp:" + e.conversation_id)}" alt="" loading="lazy" onerror="this.remove()">` : "";
        return `<span class="ps-bell-avatar" aria-hidden="true"><span>${letters}</span>${img}<i class="ps-bell-kind">${svg(kindOf(i.kind).icon)}</i></span>`;
      }
      return `<span class="ps-bell-ico ico-${esc(kindOf(i.kind).group)}" aria-hidden="true">${svg(kindOf(i.kind).icon)}</span>`;
    }

    function row(i) {
      const isOpen = expanded === i.id;
      const o = origin(i, Boolean(ctx.operator));
      const e = i.entity || {};
      const dm = Boolean(e.conversation_id);
      const handle = e.handle ? String(e.handle).replace(/^@/, "") : "";
      const muted = Boolean(handle && mutes.has(handle.toLowerCase()));
      const tag = dm && e.origin ? `<em class="ps-bell-tag ${e.origin === "outbound" ? "out" : "in"}">${e.origin === "outbound" ? "Outreach reply" : "Inbound"}</em>` : `<em class="ps-bell-tag">${esc(kindOf(i.kind).label)}</em>`;
      const preview = i.body ? (dm ? `<span class="ps-bell-quote"><span>${esc(i.body)}</span></span>` : `<small>${esc(i.body)}</small>`) : "";
      const actions = [
        o ? `<button class="ps-control ps-bell-primary" data-open="${esc(i.id)}">${esc(o.label)}</button>` : "",
        i.read_at ? "" : `<button class="ps-control" data-read="${esc(i.id)}">Mark read</button>`,
        ctx.operator && dm && handle ? `<button class="ps-control ghost" data-mute="${esc(handle)}" data-muted="${muted ? "1" : ""}">${muted ? "Unmute" : "Mute"} @${esc(handle)}</button>` : "",
      ].join("");
      return `<li class="ps-bell-item ${i.read_at ? "" : "unread"} sev-${esc(i.severity)} ${isOpen ? "open" : ""}" data-id="${esc(i.id)}">
        <button class="ps-bell-row" data-toggle="${esc(i.id)}" aria-expanded="${isOpen}">
          ${avatar(i)}
          <span class="ps-bell-text"><strong>${esc(i.title)}</strong><span class="ps-bell-meta">${dm && handle ? `@${esc(handle)} ` : ""}${tag}</span>${preview}</span>
          <span class="ps-bell-side"><time datetime="${esc(i.created_at)}">${esc(ago(i.created_at))}</time>${i.read_at ? "" : '<i class="ps-bell-dot" aria-label="Unread"></i>'}</span>
        </button>
        ${isOpen ? `<div class="ps-bell-detail">${i.body ? `<p>${esc(i.body)}</p>` : ""}<dl>${details(i).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl><div class="ps-bell-actions">${actions}</div>${muted ? '<p class="ps-bell-note">Muted. New messages from this person stay in the inbox without a notification.</p>' : ""}</div>` : ""}
      </li>`;
    }

    function drawList() {
      if (!panel) return;
      const list = panel.querySelector(".ps-bell-list");
      const items = (tab === "unread" ? feed.items.filter((i) => !i.read_at) : feed.items).filter((i) => filter === "all" || kindOf(i.kind).group === filter);
      const groups = [["Today", []], ["Yesterday", []], ["Earlier", []]];
      for (const i of items) groups.find((g) => g[0] === dayOf(i.created_at))[1].push(i);
      list.innerHTML = items.length
        ? groups.filter((g) => g[1].length).map((g) => `<p class="ps-bell-day">${g[0]}</p><ul>${g[1].map(row).join("")}</ul>`).join("") + (feed.items.length >= limit ? `<button class="ps-control ps-bell-more" data-more>Show older</button>` : "")
        : loadError ? `<p class="ps-bell-empty">Could not load notifications. <button class="ps-control" data-retry>Retry</button></p>` : `<div class="ps-bell-empty"><span class="ps-bell-ico">${svg("bell")}</span><strong>${tab === "unread" ? "You are all caught up" : "Nothing here yet"}</strong><p>${ctx.operator ? "Replies to your outreach, messages from approved prospects, payments, signed contracts, applications and booked calls show up here." : "Payments, reviews and updates from Pulsify show up here."}</p></div>`;
      list.querySelector("[data-retry]")?.addEventListener("click", load);
      panel.querySelector("[data-all]").disabled = !feed.unread;
      panel.querySelectorAll("[data-tab]").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      panel.querySelectorAll("[data-filter]").forEach((f) => { f.classList.toggle("active", f.dataset.filter === filter); f.setAttribute("aria-pressed", String(f.dataset.filter === filter)); });
      panel.querySelector("[data-tab=unread] span").textContent = feed.unread ? feed.unread : "";
      list.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => { expanded = expanded === b.dataset.toggle ? null : b.dataset.toggle; drawList(); }));
      list.querySelectorAll("[data-open]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); go(feed.items.find((i) => i.id === b.dataset.open)); }));
      list.querySelectorAll("[data-read]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); markRead([b.dataset.read]); }));
      list.querySelectorAll("[data-mute]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); mute(b.dataset.mute, !b.dataset.muted); }));
      list.querySelector("[data-more]")?.addEventListener("click", () => { limit += 50; load(); });
    }

    function place() {
      if (!panel) return;
      const r = button.getBoundingClientRect();
      const width = Math.min(460, window.innerWidth - 16);
      panel.style.top = `${Math.round(r.bottom + 8)}px`;
      panel.style.left = `${Math.round(Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)))}px`;
      panel.style.width = `${width}px`;
    }
    function close() {
      if (!panel) return;
      const restoreFocus = panel.contains(document.activeElement);
      panel.remove(); panel = null; expanded = null;
      if (restoreFocus) button.focus();
      button.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", onOutside, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    }
    function onOutside(e) { if (panel && !panel.contains(e.target) && !button.contains(e.target)) close(); }
    function onKey(e) { if (e.key === "Escape") close(); }
    function openPanel() {
      if (panel || destroyed) return;
      panel = document.createElement("div");
      panel.className = "ps-bell";
      panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Notifications");
      panel.innerHTML = `<div class="ps-bell-head"><h2>Notifications</h2><div class="ps-bell-tabs ps-segments"><button data-tab="all" class="active">All</button><button data-tab="unread">Unread <span></span></button></div><button class="ps-control ghost" data-all>Mark all read</button></div>${ctx.operator ? `<div class="ps-bell-filters" role="group" aria-label="Filter notifications">${FILTERS.map(([id, label]) => `<button data-filter="${id}" class="${id === filter ? "active" : ""}" aria-pressed="${id === filter}">${label}</button>`).join("")}</div>` : ""}<div class="ps-bell-list"></div>`;
      document.body.append(panel);
      place();
      panel.querySelector("[data-all]").onclick = () => markRead([], true);
      panel.querySelectorAll("[data-tab]").forEach((t) => (t.onclick = () => { tab = t.dataset.tab; drawList(); }));
      panel.querySelectorAll("[data-filter]").forEach((f) => (f.onclick = () => { filter = f.dataset.filter; expanded = null; drawList(); }));
      document.addEventListener("mousedown", onOutside, true);
      document.addEventListener("keydown", onKey);
      window.addEventListener("resize", place);
      button.setAttribute("aria-expanded", "true");
      drawList();
      panel.querySelector("[data-tab].active")?.focus();
      const opened = panel;
      requestAnimationFrame(() => { if (panel === opened) opened.classList.add("show"); });
      load();
    }
    button.onclick = () => (panel ? close() : openPanel());

    load();
    const unsubscribe = window.PulsifyRealtime?.on("notification", () => load());
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, 120000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    const api = { load, open: openPanel, close, destroy() { destroyed = true; close(); clearInterval(timer); unsubscribe?.(); document.removeEventListener("visibilitychange", onVisible); button.onclick = null; badge.remove(); delete button._pulsifyBell; delete button.dataset.bell; } };
    button._pulsifyBell = api;
    return api;
  }

  window.PulsifyBell = { mount };
})();
