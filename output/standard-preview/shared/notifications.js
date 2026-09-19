// The bell, for both shells. Badge with the unread count, a popover feed,
// mark read on open or one by one, click-through to the screen that matters.
// Polls every 30 s while the tab is visible; the page never needs a reload.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function ago(iso) {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); if (h <= 24) return `${h} h ago`;
    return `${Math.floor(h / 24)} d ago`;
  }
  const ICONS = { "lead.replied": "R", "lead.seen": "S", "lead.created": "L", "lead.stage": "L", payment: "$", client: "C", checklist: "✓", content: "P", system: "!" };

  function mount(ctx) {
    const button = document.querySelector(".ps-notifications");
    if (!button || button.dataset.bell === "1") return;
    button.dataset.bell = "1";
    const badge = document.createElement("span");
    badge.className = "ps-bell-badge"; badge.hidden = true;
    button.style.position = "relative"; button.append(badge);
    const headers = () => ({ "content-type": "application/json", ...(ctx.operator ? { "x-pulsify-operator": "1" } : {}), ...(ctx.headers ? ctx.headers() : {}) });
    const qs = ctx.client ? `?client=${encodeURIComponent(ctx.client)}` : "";
    let feed = { items: [], unread: 0 };
    let dialog = null;
    const seen = new Set();

    async function load() {
      try {
        const r = await fetch(`/api/notifications${qs}`, { credentials: "same-origin", headers: headers() });
        if (!r.ok) return;
        feed = await r.json();
        badge.textContent = feed.unread > 99 ? "99+" : String(feed.unread);
        badge.hidden = !feed.unread;
        button.setAttribute("aria-label", feed.unread ? `Notifications, ${feed.unread} unread` : "Notifications");
        document.title = document.title.replace(/^\(\d+\+?\) /, "");
        if (feed.unread) document.title = `(${badge.textContent}) ${document.title}`;
        // A brand-new lead reply gets a toast, once.
        for (const item of feed.items) {
          if (!item.read_at && item.kind === "lead.replied" && !seen.has(item.id) && seen.size) toast(item);
          seen.add(item.id);
        }
        if (dialog) drawList();
      } catch { /* offline, try next tick */ }
    }

    function toast(item) {
      const t = document.createElement("div");
      t.className = "ps-toast";
      t.innerHTML = `<strong>${esc(item.title)}</strong>${item.body ? `<span>${esc(item.body.slice(0, 120))}</span>` : ""}`;
      t.onclick = () => { open(item); t.remove(); };
      document.body.append(t);
      setTimeout(() => t.classList.add("show"), 20);
      setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 8000);
    }

    function open(item) {
      markRead([item.id]);
      if (dialog) dialog.close();
      if (item.link && ctx.go) ctx.go(item.link);
    }

    async function markRead(ids, all = false) {
      try {
        await fetch(`/api/notifications`, { method: "POST", credentials: "same-origin", headers: headers(), body: JSON.stringify({ client: ctx.client || "", ids, all }) });
        for (const it of feed.items) if (all || ids.includes(it.id)) it.read_at = it.read_at || new Date().toISOString();
        feed.unread = feed.items.filter((i) => !i.read_at).length;
        badge.textContent = String(feed.unread); badge.hidden = !feed.unread;
        if (dialog) drawList();
      } catch { /* keep local state */ }
    }

    function drawList() {
      const list = dialog.querySelector(".ps-bell-list");
      list.innerHTML = feed.items.length ? feed.items.map((i) => `<button class="ps-bell-item ${i.read_at ? "" : "unread"} sev-${esc(i.severity)}" data-id="${esc(i.id)}"><span class="ps-bell-ico">${esc(ICONS[i.kind] || "•")}</span><span class="ps-bell-text"><strong>${esc(i.title)}</strong>${i.body ? `<small>${esc(i.body)}</small>` : ""}<time>${esc(ago(i.created_at))}</time></span></button>`).join("") : '<p class="ps-bell-empty">Nothing yet. Replies, payments, new clients and finished steps show up here.</p>';
      list.querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => open(feed.items.find((i) => i.id === b.dataset.id))));
      dialog.querySelector("[data-all]").disabled = !feed.unread;
    }

    button.onclick = () => {
      if (dialog) { dialog.close(); return; }
      dialog = document.createElement("dialog");
      dialog.className = "ps-popover ps-bell";
      dialog.innerHTML = `<div class="ps-bell-head"><h2>Notifications</h2><button class="ps-control" data-all>Mark all read</button></div><div class="ps-bell-list"></div>`;
      document.body.append(dialog);
      dialog.querySelector("[data-all]").onclick = () => markRead([], true);
      dialog.addEventListener("close", () => { dialog.remove(); dialog = null; });
      dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
      dialog.showModal();
      drawList();
      load();
    };

    load();
    setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });
    return { load };
  }

  window.PulsifyBell = { mount };
})();
