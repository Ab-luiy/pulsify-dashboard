// Command palette for both shells. Ctrl+K or Cmd+K opens it. Type to jump to a
// view, find a contact by name or handle, or run an action on one. Recent picks
// come back first. Mount once per page:
//   PulsifyPalette.mount({operator, client, nav, go, headers})
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");

  // Subsequence match. Returns {score, idx} or null. Consecutive hits and
  // word starts score higher so "out tr" finds "Outreach tracker" first.
  function fuzzy(query, text) {
    const q = query.toLowerCase(), t = String(text || "").toLowerCase();
    if (!q) return { score: 0, idx: [] };
    const idx = [];
    let ti = 0, score = 0, last = -2;
    for (let qi = 0; qi < q.length; qi += 1) {
      const c = q[qi];
      if (c === " ") { last = -2; continue; }
      const found = t.indexOf(c, ti);
      if (found < 0) return null;
      const wordStart = found === 0 || /[\s@._-]/.test(t[found - 1]);
      score += 10 + (found === last + 1 ? 8 : 0) + (wordStart ? 6 : 0) - Math.min(found - ti, 6);
      idx.push(found); last = found; ti = found + 1;
    }
    if (t.startsWith(q)) score += 20;
    return { score, idx };
  }
  function mark(text, idx) {
    if (!idx?.length) return esc(text);
    const set = new Set(idx);
    return [...String(text)].map((ch, i) => (set.has(i) ? `<mark>${esc(ch)}</mark>` : esc(ch))).join("");
  }

  function mount(options) {
    if (window.PulsifyPalette._mounted) return window.PulsifyPalette._mounted;
    const { operator = false, client = "", nav = [], go, headers = () => ({}) } = options || {};
    const recentKey = `pulsify:palette:recent:${operator ? "operator" : client || "client"}`;
    const views = nav.flatMap((g) => (g.items || []).map((i) => ({ kind: "view", id: i.id, label: i.label, sub: g.label || "View", href: i.href })));

    const root = document.createElement("div");
    root.className = "pp-root"; root.hidden = true;
    root.innerHTML = `<div class="pp-backdrop"></div><div class="pp-box" role="dialog" aria-modal="true" aria-label="Command palette"><div class="pp-input-row"><span class="pp-crumb" hidden></span><input class="pp-input" type="text" spellcheck="false" autocomplete="off" placeholder="Jump to a view or find a contact" aria-label="Search views and contacts"><kbd>Esc</kbd></div><div class="pp-list" role="listbox"></div><div class="pp-foot"><span>Up and down to move, Enter to pick, Esc to close</span><span class="pp-status"></span></div></div>`;
    document.body.append(root);
    const input = root.querySelector(".pp-input"), list = root.querySelector(".pp-list"), crumb = root.querySelector(".pp-crumb"), statusEl = root.querySelector(".pp-status");

    let openState = false, items = [], active = 0, mode = "search", contact = null, contacts = [], contactsPending = false, fetchSeq = 0, debounce = null, lastFocus = null;

    function recent() { return read(recentKey, []); }
    function remember(item) {
      const keep = recent().filter((r) => !(r.kind === item.kind && r.id === item.id));
      keep.unshift({ kind: item.kind, id: item.id, label: item.label, sub: item.sub, data: item.data || null });
      write(recentKey, keep.slice(0, 6));
    }

    function open() {
      if (openState) return;
      openState = true; lastFocus = document.activeElement;
      root.hidden = false; requestAnimationFrame(() => root.classList.add("show"));
      input.value = ""; mode = "search"; contact = null; contacts = []; crumb.hidden = true; statusEl.textContent = "";
      build(); input.focus();
    }
    function close() {
      if (!openState) return;
      openState = false; root.classList.remove("show");
      setTimeout(() => { if (!openState) root.hidden = true; }, 160);
      clearTimeout(debounce);
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }
    function toggle() { if (openState) close(); else open(); }

    // Item builders.
    function viewItem(v, match) { return { ...v, match, run() { remember(v); close(); if (v.href) window.open(v.href, "_blank", "noopener"); else go?.(v.id); } }; }
    function contactItem(c, match) {
      const data = c.data || c;
      const label = operator ? (data.name || data.handle || "Lead") : (data.contact_name || data.contact_email || "Contact");
      const sub = operator ? [data.handle ? `@${data.handle}` : "", data.stage_label || data.stage || ""].filter(Boolean).join(" · ") : [data.contact_email || "", data.stage || ""].filter(Boolean).join(" · ");
      const id = operator ? data.id : data.contact_email;
      return { kind: "contact", id, label, sub, data, match, run() { remember({ kind: "contact", id, label, sub, data }); enterContact({ id, label, sub, data }); } };
    }
    function actionsFor(c) {
      const d = c.data || {};
      const out = [];
      if (operator) {
        if (d.handle) out.push({ kind: "action", id: "ig", label: "Open on Instagram", sub: `@${d.handle}, new tab`, run() { window.open(`https://instagram.com/${encodeURIComponent(d.handle)}`, "_blank", "noopener"); close(); } });
        out.push({ kind: "action", id: "tracker", label: "Open in the tracker", sub: "Jump to this conversation", run() { try { sessionStorage.setItem("pulsify:open-thread", d.id); } catch {} close(); go?.("outreach"); } });
        out.push({ kind: "action", id: "booked", label: "Mark booked", sub: "Appointment booked", run: () => post(d.id, "outcome:booked", "Marked booked") });
        out.push({ kind: "action", id: "hibernate", label: "Hibernate", sub: "Park this thread", run: () => post(d.id, "hibernate", "Hibernating") });
      } else {
        out.push({ kind: "action", id: "leads", label: "Open in leads", sub: "See the full timeline", run() { close(); go?.("leads"); } });
        if (d.contact_email) out.push({ kind: "action", id: "email", label: "Copy email", sub: d.contact_email, run: async () => { try { await navigator.clipboard.writeText(d.contact_email); status("Copied"); setTimeout(close, 500); } catch { status("Could not copy"); } } });
      }
      return out;
    }
    async function post(id, action, doneText) {
      status("Working");
      try {
        const r = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json", "x-pulsify-operator": "1", ...headers() }, body: JSON.stringify({ id, action }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        status(doneText); setTimeout(close, 500);
        window.dispatchEvent(new CustomEvent("pulsify:outreach-changed", { detail: { id, action } }));
      } catch (e) { status(e.message.slice(0, 60), true); }
    }
    function status(text, err) { statusEl.textContent = text; statusEl.classList.toggle("err", !!err); }

    function enterContact(c) {
      mode = "contact"; contact = c; input.value = ""; input.placeholder = "Pick an action";
      crumb.hidden = false; crumb.textContent = c.label; build();
    }
    function leaveContact() { mode = "search"; contact = null; crumb.hidden = true; input.placeholder = "Jump to a view or find a contact"; build(); }

    // Build the list for the current query.
    function build() {
      const q = input.value.trim();
      let groups = [];
      if (mode === "contact") {
        const acts = actionsFor(contact).map((a) => ({ ...a, match: q ? fuzzy(q, a.label) : { idx: [] } })).filter((a) => a.match);
        groups = [["Actions", acts]];
      } else if (!q) {
        const rec = recent().map((r) => (r.kind === "view" ? views.find((v) => v.id === r.id) && viewItem(views.find((v) => v.id === r.id)) : contactItem(r))).filter(Boolean);
        groups = [["Recent", rec], ["Views", views.map((v) => viewItem(v))]];
      } else {
        const vs = views.map((v) => { const m = fuzzy(q, v.label); return m && viewItem(v, m); }).filter(Boolean).sort((a, b) => b.match.score - a.match.score).slice(0, 6);
        const cs = contacts.map((c) => { const it = contactItem(c); return { ...it, match: fuzzy(q, it.label) || { idx: [] } }; }).slice(0, 8);
        groups = [["Views", vs], ["Contacts", cs]];
      }
      items = groups.flatMap(([, g]) => g);
      active = 0;
      list.innerHTML = groups.filter(([, g]) => g.length).map(([label, g]) => `<div class="pp-group">${esc(label)}</div>${g.map((it) => `<button class="pp-item" role="option" data-i="${items.indexOf(it)}"><span class="pp-ico">${esc((it.label || "?")[0].toUpperCase())}</span><span class="pp-text"><strong>${mark(it.label, it.match?.idx)}</strong>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span>${it.kind === "contact" ? '<kbd class="pp-hint">Enter</kbd>' : ""}</button>`).join("")}`).join("")
        || `<p class="pp-empty">${mode === "contact" ? "No action matches." : q ? (contactsPending ? "Searching" : "Nothing matches. Try a name, a handle or a view.") : "Nothing recent yet."}</p>`;
      list.querySelectorAll(".pp-item").forEach((b) => { b.onclick = () => items[Number(b.dataset.i)]?.run(); b.onmousemove = () => setActive(Number(b.dataset.i)); });
      setActive(0);
    }
    function setActive(i) {
      if (!items.length) return;
      active = Math.max(0, Math.min(items.length - 1, i));
      list.querySelectorAll(".pp-item").forEach((b) => b.classList.toggle("active", Number(b.dataset.i) === active));
      list.querySelector(".pp-item.active")?.scrollIntoView({ block: "nearest" });
    }

    // Contact search, debounced 150 ms, stale responses dropped.
    function searchContacts(q) {
      clearTimeout(debounce);
      if (!q) { contacts = []; contactsPending = false; return; }
      contactsPending = true;
      debounce = setTimeout(async () => {
        const seqNo = ++fetchSeq;
        const url = operator ? `/api/outreach?q=${encodeURIComponent(q)}` : `/api/pipeline?client=${encodeURIComponent(client)}&q=${encodeURIComponent(q)}`;
        try {
          const r = await fetch(url, { headers: { ...(operator ? { "x-pulsify-operator": "1" } : {}), ...headers() } });
          const d = await r.json().catch(() => ({}));
          if (seqNo !== fetchSeq || !openState) return;
          contacts = r.ok ? (operator ? d.threads || [] : d.contacts || []) : [];
        } catch { if (seqNo === fetchSeq) contacts = []; }
        if (seqNo !== fetchSeq) return;
        contactsPending = false;
        if (input.value.trim() === q) build();
      }, 150);
    }

    input.addEventListener("input", () => { if (mode === "search") searchContacts(input.value.trim()); build(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") { e.preventDefault(); items[active]?.run(); }
      else if (e.key === "Escape") { e.preventDefault(); if (mode === "contact") leaveContact(); else close(); }
      else if (e.key === "Backspace" && mode === "contact" && !input.value) { e.preventDefault(); leaveContact(); }
      else if (e.key === "Tab") e.preventDefault();
      e.stopPropagation();
    });
    root.querySelector(".pp-backdrop").onclick = close;
    root.addEventListener("keydown", (e) => e.stopPropagation());

    // Capture phase on window so nothing else on the page sees Ctrl+K.
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); e.stopPropagation(); toggle(); return; }
      if (e.key === "Escape" && openState) { e.preventDefault(); e.stopPropagation(); if (mode === "contact") leaveContact(); else close(); }
    }, true);

    const api = { open, close, toggle, isOpen: () => openState, fuzzy, shortcut: isMac ? "Cmd K" : "Ctrl K" };
    window.PulsifyPalette._mounted = api;
    return api;
  }

  window.PulsifyPalette = { mount, fuzzy };
})();
