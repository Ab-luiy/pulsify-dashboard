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
  const ICONS = { "lead.replied": "R", "lead.seen": "S", "lead.created": "L", "lead.stage": "L", payment: "$", client: "C", checklist: "✓", content: "P", system: "!" };
  const KIND_LABEL = { "lead.replied": "Reply", "lead.seen": "Seen", "lead.created": "New lead", "lead.stage": "Stage", payment: "Payment", client: "Client", checklist: "Launch step", content: "Content", system: "System" };

  // Where a notification actually came from. Returns {view, handoff} so the
  // target view can open the exact record after navigation.
  function origin(item, operator) {
    const e = item.entity || {};
    if (e.conversation_id) return { view: "outreach", handoff: ["pulsify:open-thread", e.conversation_id], label: e.handle ? `Open @${e.handle}` : "Open conversation" };
    if (item.kind === "payment") return { view: item.link || (operator ? "payments" : "revenue"), handoff: e.payment_id ? ["pulsify:open-payment", String(e.payment_id)] : null, label: "Open payment" };
    if (e.client && operator) return { view: item.kind === "checklist" ? "brain" : "clients", handoff: ["pulsify:brain-client", String(e.client)], label: `Open ${e.name || e.client}` };
    if (item.kind === "system") return { view: "integrations", handoff: null, label: "Open integrations" };
    return item.link ? { view: item.link, handoff: null, label: "Open" } : null;
  }

  function details(item) {
    const e = item.entity || {};
    const rows = [];
    if (e.handle) rows.push(["Handle", `@${e.handle}`]);
    if (e.name && e.name !== e.handle) rows.push(["Name", e.name]);
    if (e.client) rows.push(["Client", e.client_name || e.client]);
    if (e.amount_cents != null) rows.push(["Amount", new Intl.NumberFormat("en-US", { style: "currency", currency: e.currency || "USD" }).format(e.amount_cents / 100)]);
    if (e.provider) rows.push(["Via", e.provider]);
    if (e.source) rows.push(["Source", e.source]);
    if (e.step) rows.push(["Step", String(e.step).replace(/-/g, " ")]);
    if (e.event) rows.push(["Event", e.event]);
    rows.push(["When", stamp(item.created_at)]);
    return rows;
  }

  function mount(ctx) {
    const button = document.querySelector(".ps-notifications");
    if (!button || button.dataset.bell === "1") return;
    button.dataset.bell = "1";
    const badge = document.createElement("span");
    badge.className = "ps-bell-badge"; badge.hidden = true;
    button.style.position = "relative"; button.append(badge);
    button.setAttribute("aria-haspopup", "true"); button.setAttribute("aria-expanded", "false");
    const headers = () => ({ "content-type": "application/json", ...(ctx.operator ? { "x-pulsify-operator": "1" } : {}), ...(ctx.headers ? ctx.headers() : {}) });
    const qs = (extra = "") => `?client=${encodeURIComponent(ctx.client || "")}${extra}`;
    let feed = { items: [], unread: 0 };
    let panel = null, tab = "all", expanded = null, limit = 50;
    const seen = new Set();

    async function load() {
      try {
        const r = await fetch(`/api/notifications${qs(`&limit=${limit}`)}`, { credentials: "same-origin", headers: headers() });
        if (!r.ok) return;
        feed = await r.json();
        paintBadge();
        for (const item of feed.items) {
          if (!item.read_at && item.kind === "lead.replied" && !seen.has(item.id) && seen.size) toast(item);
          seen.add(item.id);
        }
        if (panel) drawList();
      } catch { /* offline, try next tick */ }
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
      t.innerHTML = `<strong>${esc(item.title)}</strong>${item.body ? `<span>${esc(item.body.slice(0, 120))}</span>` : ""}`;
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
        await fetch(`/api/notifications`, { method: "POST", credentials: "same-origin", headers: headers(), body: JSON.stringify({ client: ctx.client || "", ids, all }) });
        for (const it of feed.items) if (all || ids.includes(it.id)) it.read_at = it.read_at || new Date().toISOString();
        feed.unread = feed.items.filter((i) => !i.read_at).length;
        paintBadge();
        if (panel) drawList();
      } catch { /* keep local state */ }
    }

    function row(i) {
      const isOpen = expanded === i.id;
      const o = origin(i, Boolean(ctx.operator));
      return `<li class="ps-bell-item ${i.read_at ? "" : "unread"} sev-${esc(i.severity)} ${isOpen ? "open" : ""}" data-id="${esc(i.id)}">
        <button class="ps-bell-row" data-toggle="${esc(i.id)}" aria-expanded="${isOpen}">
          <span class="ps-bell-ico" title="${esc(KIND_LABEL[i.kind] || i.kind)}">${esc(ICONS[i.kind] || "•")}</span>
          <span class="ps-bell-text"><strong>${esc(i.title)}</strong>${i.body ? `<small>${esc(i.body)}</small>` : ""}<time>${esc(KIND_LABEL[i.kind] || i.kind)} · ${esc(ago(i.created_at))}</time></span>
          <span class="ps-bell-chev" aria-hidden="true">${isOpen ? "−" : "+"}</span>
        </button>
        ${isOpen ? `<div class="ps-bell-detail">${i.body ? `<p>${esc(i.body)}</p>` : ""}<dl>${details(i).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl><div class="ps-bell-actions">${o ? `<button class="ps-control ps-bell-primary" data-open="${esc(i.id)}">${esc(o.label)}</button>` : ""}${i.read_at ? "" : `<button class="ps-control" data-read="${esc(i.id)}">Mark read</button>`}</div></div>` : ""}
      </li>`;
    }

    function drawList() {
      const list = panel.querySelector(".ps-bell-list");
      const items = tab === "unread" ? feed.items.filter((i) => !i.read_at) : feed.items;
      const groups = [["Today", []], ["Yesterday", []], ["Earlier", []]];
      for (const i of items) groups.find((g) => g[0] === dayOf(i.created_at))[1].push(i);
      list.innerHTML = items.length
        ? groups.filter((g) => g[1].length).map((g) => `<p class="ps-bell-day">${g[0]}</p><ul>${g[1].map(row).join("")}</ul>`).join("") + (feed.items.length >= limit ? `<button class="ps-control ps-bell-more" data-more>Show older</button>` : "")
        : `<p class="ps-bell-empty">${tab === "unread" ? "Nothing unread." : "Nothing yet. Replies, payments, new clients and finished steps show up here."}</p>`;
      panel.querySelector("[data-all]").disabled = !feed.unread;
      panel.querySelectorAll("[data-tab]").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
      panel.querySelector("[data-tab=unread] span").textContent = feed.unread ? feed.unread : "";
      list.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => { expanded = expanded === b.dataset.toggle ? null : b.dataset.toggle; drawList(); }));
      list.querySelectorAll("[data-open]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); go(feed.items.find((i) => i.id === b.dataset.open)); }));
      list.querySelectorAll("[data-read]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); markRead([b.dataset.read]); }));
      list.querySelector("[data-more]")?.addEventListener("click", () => { limit += 50; load(); });
    }

    function place() {
      if (!panel) return;
      const r = button.getBoundingClientRect();
      const width = Math.min(440, window.innerWidth - 16);
      panel.style.top = `${Math.round(r.bottom + 8)}px`;
      panel.style.left = `${Math.round(Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)))}px`;
      panel.style.width = `${width}px`;
    }
    function close() {
      if (!panel) return;
      panel.remove(); panel = null; expanded = null;
      button.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", onOutside, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    }
    function onOutside(e) { if (panel && !panel.contains(e.target) && !button.contains(e.target)) close(); }
    function onKey(e) { if (e.key === "Escape") close(); }
    function openPanel() {
      panel = document.createElement("div");
      panel.className = "ps-bell";
      panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Notifications");
      panel.innerHTML = `<div class="ps-bell-head"><h2>Notifications</h2><div class="ps-bell-tabs"><button data-tab="all" class="active">All</button><button data-tab="unread">Unread <span></span></button></div><button class="ps-control" data-all>Mark all read</button></div><div class="ps-bell-list"></div>`;
      document.body.append(panel);
      place();
      panel.querySelector("[data-all]").onclick = () => markRead([], true);
      panel.querySelectorAll("[data-tab]").forEach((t) => (t.onclick = () => { tab = t.dataset.tab; drawList(); }));
      document.addEventListener("mousedown", onOutside, true);
      document.addEventListener("keydown", onKey);
      window.addEventListener("resize", place);
      button.setAttribute("aria-expanded", "true");
      drawList();
      requestAnimationFrame(() => panel.classList.add("show"));
      load();
    }
    button.onclick = () => (panel ? close() : openPanel());

    load();
    if (window.PulsifyRealtime?.on) window.PulsifyRealtime.on("notification", () => load());
    setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });
    return { load, open: openPanel, close };
  }

  window.PulsifyBell = { mount };
})();
