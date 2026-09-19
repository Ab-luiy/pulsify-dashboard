// Operator Leads view: people, not pipeline. Two sources on one page:
// the Instagram inbox (every thread, handle, who spoke last, in CRM or not)
// and funnel contacts across every client (applied, opted in, booked, paid).
// CRM stays the outbound working list; this is where inbound lands first.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (cents, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);
  const ago = (iso) => {
    if (!iso) return "";
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 14) return `${Math.floor(s / 86400)} d ago`;
    return new Date(iso).toLocaleDateString();
  };
  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1", ...(init?.headers || {}) }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }
  const pill = (label, cls) => `<span class="int-pill ${cls || ""}">${esc(label)}</span>`;

  function render(root, ctx = {}) {
    let tab = ctx.section === "funnel" ? "funnel" : "inbox";
    let q = "";
    let filter = "all"; // all | awaiting | new
    root.innerHTML = `
      <h1>Leads</h1>
      <p class="ps-subtitle">Everyone who has reached you. Instagram conversations first, funnel contacts across every client below. The CRM is where you work them; this is where they arrive.</p>
      <div class="int-table" id="leads-box">
        <div class="int-tabs">
          <button data-tab="inbox" class="active">Instagram inbox <span id="leads-n-inbox"></span></button>
          <button data-tab="funnel">Funnel contacts <span id="leads-n-funnel"></span></button>
          <span style="flex:1"></span>
          <input id="leads-q" placeholder="Search handle, name or email" class="leads-search" autocomplete="off">
          <button class="ps-control" id="leads-refresh">Refresh</button>
        </div>
        <div id="leads-filters" class="leads-filters">
          <button class="leads-chip active" data-filter="all">All</button>
          <button class="leads-chip" data-filter="awaiting">Waiting on you</button>
          <button class="leads-chip" data-filter="new">Not in CRM</button>
        </div>
        <div id="leads-body"><div class="skeleton" style="min-height:220px;border-radius:0"></div></div>
      </div>`;
    const body = root.querySelector("#leads-body");
    let cache = { inbox: null, funnel: null };

    async function load(force) {
      if (force) cache = { inbox: null, funnel: null };
      body.innerHTML = '<div class="skeleton" style="min-height:220px;border-radius:0"></div>';
      try {
        if (tab === "inbox") {
          if (!cache.inbox) cache.inbox = (await api("/api/spine/conversations")).conversations || [];
          drawInbox(cache.inbox);
        } else {
          if (!cache.funnel) cache.funnel = (await api("/api/pipeline")).contacts || [];
          drawFunnel(cache.funnel);
        }
        root.querySelector("#leads-n-inbox").textContent = cache.inbox ? cache.inbox.length : "";
        root.querySelector("#leads-n-funnel").textContent = cache.funnel ? cache.funnel.length : "";
      } catch (e) {
        body.innerHTML = `<p class="int-empty">${esc(e.message)}</p>`;
      }
    }

    function matches(text) { return !q || String(text || "").toLowerCase().includes(q); }

    function drawInbox(rows) {
      let list = rows.filter((c) => matches(`${c.participant_username} ${c.participant_name} ${c.last_text}`));
      if (filter === "awaiting") list = list.filter((c) => c.last_direction === "inbound");
      if (filter === "new") list = list.filter((c) => !c.in_crm);
      root.querySelector("#leads-filters").hidden = false;
      body.innerHTML = `<table><thead><tr><th>Person</th><th>Last message</th><th>Who spoke last</th><th>Status</th><th>When</th><th></th></tr></thead><tbody>${list.length ? list.map((c) => {
        const handle = c.participant_username ? `@${c.participant_username}` : (c.participant_name || "Unknown");
        const missing = !c.participant_username && !c.participant_id;
        return `<tr data-thread="${esc(c.id)}">
          <td><strong>${esc(handle)}</strong>${c.participant_name && c.participant_username ? `<small>${esc(c.participant_name)}</small>` : ""}${missing ? '<small class="int-note">Handle not synced yet</small>' : ""}</td>
          <td class="leads-text">${esc(c.last_text || "")}<small>${c.message_count} message${c.message_count === 1 ? "" : "s"}</small></td>
          <td>${c.last_direction === "inbound" ? pill("Them", "int-pill-warn") : pill("You", "")}</td>
          <td>${c.in_crm ? pill("In CRM", "int-pill-ok") : pill("Not in CRM", "")}</td>
          <td><small>${esc(ago(c.last_message_at))}</small></td>
          <td class="int-row-actions"><button class="ps-control" data-open="${esc(c.id)}">Open</button>${c.in_crm || missing ? "" : `<button class="ps-control int-primary" data-add="${esc(c.id)}">Add to CRM</button>`}</td>
        </tr>`;
      }).join("") : `<tr><td colspan="6" class="int-empty">${rows.length ? "Nothing matches." : "No conversations synced yet. The inbox job runs every minute once Instagram is connected."}</td></tr>`}</tbody></table>`;
      body.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openThread(b.dataset.open)));
      body.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => addToCrm(rows.find((c) => c.id === b.dataset.add), b)));
    }

    function drawFunnel(rows) {
      const list = rows.filter((c) => matches(`${c.contact_email} ${c.contact_name} ${c.client_name}`));
      root.querySelector("#leads-filters").hidden = true;
      body.innerHTML = `<table><thead><tr><th>Contact</th><th>Client</th><th>Stage</th><th>Touches</th><th>Paid</th><th>Last seen</th></tr></thead><tbody>${list.length ? list.map((c) => `<tr>
          <td><strong>${esc(c.contact_name || c.contact_email)}</strong>${c.contact_name ? `<small>${esc(c.contact_email)}</small>` : ""}</td>
          <td>${esc(c.client_name || c.client_id)}</td>
          <td>${pill(c.stage, c.stage === "Paid" ? "int-pill-ok" : c.stage === "Booked" ? "int-pill-warn" : "")}</td>
          <td><small>${[["applied", c.applications], ["opted in", c.optins], ["booked", c.bookings], ["paid", c.payments]].filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(" · ")}</small></td>
          <td>${c.paid_cents ? money(c.paid_cents) : ""}</td>
          <td><small>${esc(ago(c.last_seen))}</small></td>
        </tr>`).join("") : `<tr><td colspan="6" class="int-empty">${rows.length ? "Nothing matches." : "No funnel contacts yet. Applications, opt-ins, bookings and payments land here as clients connect their funnels."}</td></tr>`}</tbody></table>`;
    }

    async function openThread(id) {
      const d = document.createElement("dialog");
      d.className = "ps-popover int-dialog leads-thread";
      d.innerHTML = '<div class="skeleton" style="min-height:200px"></div>';
      document.body.append(d);
      d.addEventListener("close", () => d.remove());
      d.showModal();
      try {
        const { conversation: c, messages } = await api(`/api/spine/conversations?id=${encodeURIComponent(id)}`);
        const handle = c.participant_username ? `@${c.participant_username}` : (c.participant_name || "Unknown");
        d.innerHTML = `<div class="leads-thread-head"><div><h2>${esc(handle)}</h2><small class="int-note">${messages.length} messages · first ${esc(ago(c.first_message_at))} · last ${esc(ago(c.last_message_at))}</small></div><div class="int-row-actions">${c.participant_username ? `<a class="ps-control" href="https://instagram.com/${encodeURIComponent(c.participant_username)}" target="_blank" rel="noopener">Open on Instagram</a>` : ""}<button class="ps-control" data-close>Close</button></div></div>
          <div class="leads-messages">${messages.map((m) => `<div class="leads-msg ${m.direction}"><p>${esc(m.text || "(attachment)")}</p><small>${m.direction === "outbound" ? "You" : esc(handle)} · ${esc(new Date(m.sent_at).toLocaleString())}</small></div>`).join("")}</div>
          <p class="int-note">Replying from here is not on yet. Open the thread on Instagram to answer.</p>`;
        d.querySelector("[data-close]").onclick = () => d.close();
        d.querySelector(".leads-messages").scrollTop = 1e9;
      } catch (e) {
        d.innerHTML = `<p class="int-empty">${esc(e.message)}</p><div class="int-actions"><button class="ps-control" data-close>Close</button></div>`;
        d.querySelector("[data-close]").onclick = () => d.close();
      }
    }

    async function addToCrm(c, button) {
      if (!c) return;
      button.disabled = true;
      const name = c.participant_username || c.participant_id;
      const ts = Date.now();
      try {
        // Same record shape the inbox job writes for outreach threads.
        await api("/api/crm-sync", { method: "POST", body: JSON.stringify({ added: { [name]: { n: c.participant_name || name, h: c.participant_username || name, niche: "", dms: c.message_count || 0, stage: "new-lead", src: "instagram", igConversationId: c.id, _ts: ts } } }) });
        c.in_crm = true;
        drawInbox(cache.inbox);
      } catch (e) {
        button.disabled = false;
        button.textContent = e.message.slice(0, 40);
      }
    }

    root.querySelectorAll("[data-tab]").forEach((t) => (t.onclick = () => { root.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === t)); tab = t.dataset.tab; load(); }));
    root.querySelectorAll("[data-filter]").forEach((f) => (f.onclick = () => { root.querySelectorAll("[data-filter]").forEach((x) => x.classList.toggle("active", x === f)); filter = f.dataset.filter; load(); }));
    let debounce;
    root.querySelector("#leads-q").addEventListener("input", (e) => { clearTimeout(debounce); debounce = setTimeout(() => { q = e.target.value.trim().toLowerCase(); load(); }, 120); });
    root.querySelector("#leads-refresh").onclick = () => load(true);
    load();
  }

  window.PulsifyLeadsView = { render };
})();
