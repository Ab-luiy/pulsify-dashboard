// Client work: the native replacement for the console's delivery panel. One
// client at a time, three kinds of client-facing records (content items, call
// notes, assets), an add-or-edit form per kind and the table under it. Data
// and payloads are exactly what console.js sent to /api/client-data.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const formatDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-");
  const STAGES = { production: "In production", scheduled: "Scheduled", published: "Published" };
  const KINDS = { script: "Script", hook: "Hook", swipe: "Swipe file", doc: "Doc", other: "Other" };
  const TYPES = [["content", "Content items", "content"], ["call", "Call notes", "calls"], ["asset", "Assets", "assets"]];
  const SPECS = {
    content: {
      head: ["Title", "Stage", "Platform", "Scheduled", "Notes"],
      row: (i) => [`<strong>${esc(i.title || "")}</strong>${i.url ? `<small><a href="${esc(i.url)}" target="_blank" rel="noopener">Open link</a></small>` : ""}`, `<span class="int-pill ${i.stage === "published" ? "int-pill-ok" : i.stage === "scheduled" ? "int-pill-warn" : ""}">${esc(STAGES[i.stage] || i.stage || "")}</span>`, esc(i.platform || "-"), i.scheduled_for ? formatDate(i.scheduled_for) : "-", esc(i.notes || "-")],
      empty: ["film", "No content items yet", "Add the first video or script the client should see in their portal.", "Add a content item"],
    },
    call: {
      head: ["Date", "Title", "Summary", "Recording"],
      row: (i) => [i.call_date ? formatDate(i.call_date) : "-", `<strong>${esc(i.title || "-")}</strong>`, esc((i.summary || "").slice(0, 80) || "-"), i.recording_url ? `<a href="${esc(i.recording_url)}" target="_blank" rel="noopener">Open recording</a>` : "-"],
      empty: ["message-circle", "No call notes yet", "Log the first call so the client sees the decisions and next actions.", "Add a call note"],
    },
    asset: {
      head: ["Label", "Kind", "URL", "Notes"],
      row: (i) => [`<strong>${esc(i.label || "")}</strong>`, esc(KINDS[i.kind] || i.kind || "Other"), i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">Open asset</a>` : "-", esc(i.notes || "-")],
      empty: ["clipboard", "No assets yet", "Share the first script, hook file or doc with the client.", "Add an asset"],
    },
  };
  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
    return d;
  }
  const field = (label, inner, hint, cls = "") => `<label class="set-field ${cls}"><span>${esc(label)}</span>${inner}${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
  const input = (name, attrs = "") => `<input class="set-input" name="${name}" ${attrs}>`;
  const area = (name, rows, attrs = "") => `<textarea class="set-input" name="${name}" rows="${rows}" ${attrs}></textarea>`;
  const forms = {
    content: `<div class="set-grid dv-grid-3">${field("Title", input("title", 'placeholder="Enter the content title" required'), "The video or script name from the approved plan.")}${field("Stage", `<select class="set-input" name="stage">${Object.entries(STAGES).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>`, "Where the item sits in production.")}${field("Platform", input("platform", 'placeholder="Enter the publishing platform"'), "Where the item will publish. Blank leaves it unlabelled.")}${field("Scheduled for", input("scheduled_for", 'type="date"'), "The planned publish date. Blank means none is committed.")}${field("URL", input("url", 'type="url" placeholder="Paste the working or published link"'), "The draft, review or live link.")}${field("Notes", area("notes", 3, 'placeholder="Add short context for the client"'), "Only the context the client needs to understand this item.", "dv-span")}</div>`,
    call: `<div class="set-grid">${field("Call date", input("call_date", 'type="date" required'), "The date the client call happened.")}${field("Title", input("title", 'placeholder="Name the call" required'), "A plain label such as onboarding or strategy call.")}${field("Recording URL", input("recording_url", 'type="url" placeholder="Paste the call recording link"'), "The replay link from the call platform.", "dv-span")}${field("Summary", area("summary", 3, 'placeholder="Summarize the call in three lines"'), "The short outcome summary written after the call.", "dv-span")}${field("Decisions", area("decisions", 3, 'placeholder="Put one decision on each line"'), "The choices agreed on during the call, one per line.", "dv-span")}${field("Action items", area("actions", 3, 'placeholder="Put one action on each line"'), "The next actions agreed on during the call, one per line.", "dv-span")}</div>`,
    asset: `<div class="set-grid">${field("Label", input("label", 'placeholder="Name the asset" required'), "The client-facing name of the script, hook file, doc or other deliverable.")}${field("Kind", `<select class="set-input" name="kind">${Object.entries(KINDS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select>`, "The asset category used to organize the portal.")}${field("URL", input("url", 'type="url" placeholder="Paste the asset link"'), "The share link from Drive, Docs or the delivery tool.", "dv-span")}${field("Notes", area("notes", 3, 'placeholder="Add short usage notes"'), "Any instruction the client needs to use the asset.", "dv-span")}</div>`,
  };
  const tableSkeleton = (type) => `<div class="int-table dv-skeleton" aria-label="Loading"><table><thead><tr>${SPECS[type].head.map((h) => `<th>${esc(h)}</th>`).join("")}<th></th></tr></thead><tbody>${Array.from({ length: 4 }, () => `<tr>${SPECS[type].head.map((_, i) => `<td><div class="skeleton" style="width:${i === 0 ? 70 : 45}%"></div></td>`).join("")}<td><div class="skeleton" style="width:72px;margin-left:auto"></div></td></tr>`).join("")}</tbody></table></div>`;
  let warm = new Map(); // client -> {content,call,asset}

  function render(root, ctx = {}) {
    let clients = Array.isArray(ctx.clients) && ctx.clients.length ? ctx.clients : null;
    let client = String(ctx.client || PulsifyShell.read("pulsify:delivery-client", "") || "");
    let type = "content", editingId = null, disposed = false, sequence = 0;
    let all = null;
    root.innerHTML = `<div class="ps-page-header dv-head"><div><h1>Client work</h1><p class="ps-subtitle">The content, call notes and assets a client sees in their portal. Add, edit and keep them current.</p></div><div class="dv-head-actions"><label class="dv-client"><span>Client</span><select class="ps-input compact" id="dv-client" aria-label="Client" disabled><option>Loading clients</option></select></label><button type="button" class="ps-control" id="dv-refresh">Refresh</button></div></div>
      <div id="dv-body"></div>`;
    const body = root.querySelector("#dv-body"), select = root.querySelector("#dv-client");
    select.onchange = () => { client = select.value; PulsifyShell.write("pulsify:delivery-client", client); editingId = null; all = warm.get(client) || null; draw(); load(); };
    root.querySelector("#dv-refresh").onclick = () => load();

    async function loadClients() {
      if (clients) { fillClients(); return; }
      try { const d = await api("/api/clients"); if (disposed) return; clients = d.clients || []; fillClients(); }
      catch (e) { if (disposed) return; body.replaceChildren(); PulsifyShell.inlineError(body, e, () => { loadClients(); }); }
    }
    function fillClients() {
      if (!clients.length) { select.innerHTML = '<option value="">No clients configured</option>'; select.disabled = true; client = ""; draw(); return; }
      if (!clients.some((c) => c.client === client)) client = clients[0].client;
      select.innerHTML = clients.map((c) => `<option value="${esc(c.client)}">${esc(c.client_name || c.client)}</option>`).join("");
      select.value = client; select.disabled = false;
      all = warm.get(client) || null; draw(); load();
    }
    async function load() {
      if (!client) return;
      const current = ++sequence;
      if (!all) body.querySelector("#dv-table") && (body.querySelector("#dv-table").innerHTML = tableSkeleton(type));
      try {
        const d = await api(`/api/client-data?client=${encodeURIComponent(client)}`);
        if (disposed || current !== sequence || !root.isConnected) return;
        all = { content: d.content || [], call: d.calls || [], asset: d.assets || [] }; warm.set(client, all); drawTable();
      } catch (e) { if (disposed || current !== sequence) return; const t = body.querySelector("#dv-table"); if (t) { if (!all) t.replaceChildren(); PulsifyShell.inlineError(t, e, load); } }
    }
    function draw() {
      if (!clients && !client) { body.innerHTML = `<div class="ps-tabs dv-tabs" aria-hidden="true">${TYPES.map(([, label]) => `<button type="button" disabled>${label}</button>`).join("")}</div>${tableSkeleton(type)}`; return; }
      if (!client) { body.replaceChildren(PulsifySurface.empty("users", "No active client", "Create a client in Client setup before adding delivery work.", "Open Clients", () => window.PulsifyOperatorShell?.go("home"))); return; }
      body.innerHTML = `<div class="ps-tabs dv-tabs" role="tablist">${TYPES.map(([id, label]) => `<button type="button" role="tab" data-type="${id}" class="${id === type ? "active" : ""}" aria-selected="${id === type}">${label}<span data-count="${id}"></span></button>`).join("")}</div>
        <form class="set-section dv-form" id="dv-form" novalidate><div class="set-head"><h2 data-form-title>Add ${TYPES.find((t) => t[0] === type)[1].toLowerCase().replace(/s$/, "")}</h2><p>Only the client-facing fields. Blank optional fields simply do not show.</p></div>${forms[type]}<div class="set-actions"><button type="submit" class="ps-button primary" id="dv-submit">Add item</button><button type="button" class="ps-control" id="dv-cancel" hidden>Cancel edit</button><span class="set-status" role="status"></span></div></form>
        <div id="dv-table">${all ? "" : tableSkeleton(type)}</div>`;
      body.querySelectorAll("[data-type]").forEach((b) => (b.onclick = () => { if (b.dataset.type === type) return; type = b.dataset.type; editingId = null; draw(); }));
      const form = body.querySelector("#dv-form");
      form.addEventListener("submit", (e) => { e.preventDefault(); save(form); });
      body.querySelector("#dv-cancel").onclick = () => resetForm();
      if (all) drawTable();
    }
    function drawTable() {
      const table = body.querySelector("#dv-table"); if (!table || !all) return;
      TYPES.forEach(([id]) => { const c = body.querySelector(`[data-count="${id}"]`); if (c) c.textContent = all[id].length ? all[id].length : ""; });
      const spec = SPECS[type], rows = all[type];
      if (!rows.length) { table.replaceChildren(PulsifySurface.empty(spec.empty[0], spec.empty[1], spec.empty[2], spec.empty[3], () => body.querySelector("#dv-form input, #dv-form select")?.focus())); return; }
      table.innerHTML = `<div class="int-table"><table><thead><tr>${spec.head.map((h) => `<th>${esc(h)}</th>`).join("")}<th aria-label="Actions"></th></tr></thead><tbody>${rows.map((item) => `<tr class="${String(item.id) === String(editingId) ? "dv-editing" : ""}">${spec.row(item).map((cell) => `<td>${cell}</td>`).join("")}<td><div class="int-row-actions"><button type="button" class="ps-control" data-edit="${esc(item.id)}">Edit</button><button type="button" class="ps-control" data-delete="${esc(item.id)}">Delete</button></div></td></tr>`).join("")}</tbody></table></div>`;
      table.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => edit(b.dataset.edit)));
      table.querySelectorAll("[data-delete]").forEach((b) => (b.onclick = () => remove(b.dataset.delete, b)));
    }
    function collect(form) {
      const v = (n) => form.elements[n]?.value ?? "";
      if (type === "content") return { title: v("title").trim(), stage: v("stage"), platform: v("platform").trim(), scheduled_for: v("scheduled_for"), url: v("url").trim(), notes: v("notes").trim() };
      if (type === "call") return { call_date: v("call_date"), title: v("title").trim(), recording_url: v("recording_url").trim(), summary: v("summary").trim(), decisions: v("decisions").trim(), actions: v("actions").trim() };
      return { label: v("label").trim(), kind: v("kind"), url: v("url").trim(), notes: v("notes").trim() };
    }
    function fill(form, item) {
      const set = (n, val) => { if (form.elements[n]) form.elements[n].value = val; };
      if (type === "content") { set("title", item.title || ""); set("stage", item.stage || "production"); set("platform", item.platform || ""); set("scheduled_for", (item.scheduled_for || "").slice(0, 10)); set("url", item.url || ""); set("notes", item.notes || ""); }
      else if (type === "call") { set("call_date", (item.call_date || "").slice(0, 10)); set("title", item.title || ""); set("recording_url", item.recording_url || ""); set("summary", item.summary || ""); set("decisions", item.decisions || ""); set("actions", item.actions || ""); }
      else { set("label", item.label || ""); set("kind", item.kind || "other"); set("url", item.url || ""); set("notes", item.notes || ""); }
    }
    function resetForm() {
      const form = body.querySelector("#dv-form"); if (!form) return;
      editingId = null; form.reset(); form.querySelector(":scope > .ps-inline-error")?.remove();
      body.querySelector("#dv-submit").textContent = "Add item"; body.querySelector("#dv-cancel").hidden = true;
      form.querySelector("[data-form-title]").textContent = `Add ${TYPES.find((t) => t[0] === type)[1].toLowerCase().replace(/s$/, "")}`;
      form.querySelector(".set-status").textContent = ""; drawTable();
    }
    function edit(id) {
      const item = (all?.[type] || []).find((r) => String(r.id) === String(id)); if (!item) return;
      const form = body.querySelector("#dv-form"); editingId = item.id; fill(form, item);
      body.querySelector("#dv-submit").textContent = "Save changes"; body.querySelector("#dv-cancel").hidden = false;
      form.querySelector("[data-form-title]").textContent = `Edit ${TYPES.find((t) => t[0] === type)[1].toLowerCase().replace(/s$/, "")}`;
      form.querySelector(".set-status").textContent = ""; drawTable();
      form.scrollIntoView({ behavior: "smooth", block: "nearest" }); form.querySelector("input, select, textarea")?.focus({ preventScroll: true });
    }
    async function save(form) {
      const button = body.querySelector("#dv-submit"), status = form.querySelector(".set-status");
      form.querySelector(":scope > .ps-inline-error")?.remove();
      const item = collect(form); if (editingId) item.id = editingId;
      const required = type === "content" ? item.title : type === "call" ? item.call_date && item.title : item.label;
      if (!required) { status.textContent = type === "call" ? "Call date and title are required." : type === "content" ? "Title is required." : "Label is required."; status.className = "set-status err"; return; }
      PulsifyShell.pending(button); status.textContent = "Saving…"; status.className = "set-status";
      const wasEditing = Boolean(editingId), snapshot = all;
      try {
        await api("/api/client-data", { method: "POST", body: JSON.stringify({ client, type, item }) });
        if (disposed) return;
        resetForm(); status.textContent = wasEditing ? "Changes saved." : "Item added."; status.className = "set-status ok";
        await load();
      } catch (e) { if (disposed) return; all = snapshot; status.textContent = ""; PulsifyShell.inlineError(form, e); }
      finally { PulsifyShell.pending(button, false); }
    }
    async function remove(id, button) {
      const item = (all?.[type] || []).find((r) => String(r.id) === String(id));
      if (!(await PulsifySurface.confirm("Delete this item?", `"${item?.title || item?.label || "This item"}" disappears from the client's portal. This cannot be undone.`, "Delete"))) return;
      const row = button.closest("tr"); PulsifyShell.pending(button); row.querySelector(".ps-inline-error")?.remove();
      const snapshot = all; all = { ...all, [type]: all[type].filter((r) => String(r.id) !== String(id)) }; drawTable();
      try {
        await api("/api/client-data", { method: "DELETE", body: JSON.stringify({ client, type, id }) });
        if (disposed) return;
        warm.set(client, all); if (String(editingId) === String(id)) resetForm();
      } catch (e) { if (disposed) return; all = snapshot; drawTable(); const t = body.querySelector("#dv-table"); PulsifyShell.inlineError(t, e); }
    }

    draw();
    loadClients();
    return () => { disposed = true; sequence++; };
  }
  window.PulsifyDeliveryView = { render };
})();
