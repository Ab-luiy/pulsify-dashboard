// Semantic search across DMs and client brains. Ask in plain words
// ("who mentioned prop firm payouts", "clients selling to day traders"); the
// answer is the messages and brain fields that mean that, not just contain it.
// Ctrl+K anywhere in the console opens this view with the box focused.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = (iso) => { if (!iso) return ""; const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000); if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} d ago`; };
  async function api(path) {
    const r = await fetch(path, { headers: { "x-pulsify-operator": "1" } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }
  const EXAMPLES = ["who mentioned blowing an account", "anyone asking about pricing", "clients who sell to dropshippers", "people who said they would think about it", "offers built around a signal service"];

  function render(root, ctx = {}) {
    root.innerHTML = `
      <h1>Search</h1><p class="ps-subtitle">Ask in plain words. This finds what people meant across every DM and every client brain, not just the exact words.</p>
      <form class="sr-form" id="sr-form"><input id="sr-q" class="sr-input" placeholder="who mentioned prop firm payouts" autocomplete="off" autofocus><button class="ps-control int-primary" type="submit">Search</button></form>
      <div class="sr-filters"><label class="leads-chip active"><input type="checkbox" name="kind" value="dm" checked hidden>DMs</label><label class="leads-chip active"><input type="checkbox" name="kind" value="brain" checked hidden>Client brains</label><small id="sr-status" class="int-note"></small></div>
      <div class="sr-examples" id="sr-examples">${EXAMPLES.map((e) => `<button class="ps-control" data-example="${esc(e)}">${esc(e)}</button>`).join("")}</div>
      <div id="sr-results" class="sr-results"></div>`;
    const q = root.querySelector("#sr-q"), results = root.querySelector("#sr-results"), status = root.querySelector("#sr-status");
    root.querySelectorAll(".sr-filters label").forEach((l) => l.addEventListener("click", (e) => { e.preventDefault(); const c = l.querySelector("input"); c.checked = !c.checked; l.classList.toggle("active", c.checked); if (q.value.trim()) run(); }));
    root.querySelectorAll("[data-example]").forEach((b) => (b.onclick = () => { q.value = b.dataset.example; run(); }));
    root.querySelector("#sr-form").addEventListener("submit", (e) => { e.preventDefault(); run(); });
    api("/api/search?status=1").then((s) => {
      const dm = s.indexed?.dm?.count || 0, br = s.indexed?.brain?.count || 0;
      status.textContent = s.ready ? `${dm} of ${s.totals?.dms || 0} messages and ${br} of ${s.totals?.brain || 0} brain fields indexed${dm < (s.totals?.dms || 0) ? ", filling in" : ""}` : "Search index is not bound yet.";
    }).catch(() => {});
    if (ctx.q) { q.value = ctx.q; run(); }
    q.focus();

    let sequence = 0;
    async function run() {
      const current = ++sequence;
      const text = q.value.trim();
      if (text.length < 2) return;
      const kinds = [...root.querySelectorAll('input[name="kind"]:checked')].map((c) => c.value);
      results.innerHTML = '<div class="skeleton" style="min-height:160px;border-radius:12px"></div>';
      root.querySelector("#sr-examples").hidden = true;
      try {
        const d = await api(`/api/search?q=${encodeURIComponent(text)}&kinds=${kinds.join(",")}&limit=20`);
        if (current !== sequence || !root.isConnected) return;
        const dms = d.hits.filter((h) => h.kind === "dm"), brains = d.hits.filter((h) => h.kind === "brain");
        const group = (title, items, row) => items.length ? `<section class="sr-group"><h2>${esc(title)} <span>${items.length}</span></h2>${items.map(row).join("")}</section>` : "";
        results.innerHTML = d.hits.length
          ? group("Conversations", dms, (h) => `<button class="sr-hit" data-thread="${esc(h.conversation_id)}"><span class="ot-avatar">${esc((h.name || h.handle || "?").slice(0, 2).toUpperCase())}</span><div><strong>@${esc(h.handle || h.name)}</strong> <small>${h.direction === "outbound" ? "you wrote" : "they wrote"} · ${esc(ago(h.sent_at))} · match ${Math.round(h.score * 100)}%</small><p>${esc(h.snippet)}</p></div></button>`)
            + group("Client brains", brains, (h) => `<button class="sr-hit" data-brain="${esc(h.client_id)}"><span class="ot-avatar">${esc((h.client_name || "?").slice(0, 2).toUpperCase())}</span><div><strong>${esc(h.client_name)}</strong> <small>${esc(h.section)} · ${esc(String(h.field).replace(/_/g, " "))} · match ${Math.round(h.score * 100)}%</small><p>${esc(h.snippet)}</p></div></button>`)
            + `<p class="int-note">${d.hits.length} results in ${d.took_ms} ms</p>`
          : `<p class="int-empty">Nothing close to that yet. If the index is still filling in, try again in a minute.</p>`;
        results.querySelectorAll("[data-thread]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("pulsify:open-thread", b.dataset.thread); window.PulsifyOperatorShell?.go("outreach"); }));
        results.querySelectorAll("[data-brain]").forEach((b) => (b.onclick = () => { sessionStorage.setItem("pulsify:brain-client", b.dataset.brain); window.PulsifyOperatorShell?.go("brain"); }));
      } catch (e) { if (current !== sequence || !root.isConnected) return; results.innerHTML = `<p class="int-empty">${esc(e.message)}</p>`; }
    }
  }

  // Ctrl+K / Cmd+K from anywhere in the console.
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); window.PulsifyOperatorShell?.go("search"); setTimeout(() => document.getElementById("sr-q")?.focus(), 150); }
  });

  window.PulsifySearchView = { render };
})();
