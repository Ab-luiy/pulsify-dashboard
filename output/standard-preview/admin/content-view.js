// Content: the production pipeline. Every video is an idea tagged with a
// pillar and a funnel layer, and it moves through seven stages until it is
// redistributed. Native port of the old dashboard Content tab. State lives on
// the operator state API (key content-pipeline) so it follows the founder
// across devices; the old localStorage copy is migrated once and never
// written again.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const STATE_KEY = "content-pipeline";
  const LEGACY_KEY = "pulsify_content_pipeline_v1";
  // Same stage list the old tab shipped with; ids are stored on every item.
  const STAGES = [
    { id: "ideated", label: "Ideated", note: "Idea captured, Discord #content-ideas" },
    { id: "scripted", label: "Scripted", note: "Script ready, editor and prep brief" },
    { id: "filmed", label: "Filmed", note: "Raw recording uploaded to the editing queue" },
    { id: "editing", label: "Editing", note: "Editor started, status update posted" },
    { id: "publishing", label: "Publishing", note: "Upload, title, thumbnail, description" },
    { id: "posted", label: "Posted", note: "Published link captured, redistribution task" },
    { id: "redistributed", label: "Redistributed", note: "Clips, stories, email, CRM proof bank" },
  ];
  const PILLARS = ["Concept breakdown", "Case study", "Belief breakdown"];
  const LAYERS = [["TOF", "TOF, attract"], ["MOF", "MOF, nurture"], ["BOF", "BOF, convert"]];
  // The one seed item the old dashboard embedded. Removals and stage changes
  // recorded against its id keep applying after the port.
  const BASE_ITEMS = [
    { id: "first-youtube-long-form", title: "First TOF: break the belief that YouTube does not work for coaches", type: "TOF · Belief breakdown", layer: "TOF", pillar: "Belief breakdown", stage: "ideated", owner: "AB", notes: "Wow not how. Open loop into the first MOF. Reference the unique mechanism." },
  ];
  const slugify = (text) => String(text || "video").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "video";
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const stageIndex = (id) => Math.max(0, STAGES.findIndex((s) => s.id === id));
  const normalize = (raw) => ({
    overrides: raw && typeof raw.overrides === "object" && raw.overrides ? { ...raw.overrides } : {},
    added: Array.isArray(raw?.added) ? raw.added.filter((a) => a && typeof a === "object") : [],
    removed: Array.isArray(raw?.removed) ? raw.removed.filter((r) => typeof r === "string") : [],
  });
  const clone = (state) => JSON.parse(JSON.stringify(state));
  const legacyState = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (!raw || typeof raw !== "object") return null;
      const s = normalize(raw);
      return Object.keys(s.overrides).length || s.added.length || s.removed.length ? s : null;
    } catch { return null; }
  };

  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1" }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
    return d;
  }
  // exists is true once any value was written, even an empty pipeline.
  const readState = async () => { const row = (await api("/api/spine/state?key=" + STATE_KEY)).state; return { exists: Boolean(row), value: normalize(row?.value) }; };
  const writeState = (value) => api("/api/spine/state", { method: "PUT", body: JSON.stringify({ key: STATE_KEY, value }) });

  function items(state) {
    return BASE_ITEMS.concat(state.added).map((item) => {
      const id = item.id || slugify(item.title);
      return Object.assign({ id, title: "Untitled video", type: "TOF · Concept breakdown", layer: "TOF", pillar: "Concept breakdown", stage: "ideated", owner: "AB", notes: "" }, item, state.overrides[id] || {}, { id });
    }).filter((item) => !state.removed.includes(item.id));
  }

  let warm = null; // last loaded state, so a return visit paints at once

  const kpiSkeleton = () => Array.from({ length: 4 }, () => '<div class="ps-kpi"><div class="skeleton" style="width:45%"></div><div class="skeleton" style="height:34px;margin:15px 0 8px;width:38%"></div><div class="skeleton" style="width:70%"></div></div>').join("");
  const cardSkeleton = () => '<div class="cv-card cv-sk"><div class="cv-card-top"><div class="skeleton" style="width:40%;min-height:20px"></div></div><div class="skeleton" style="width:90%"></div><div class="skeleton" style="width:65%;margin-top:6px"></div><div class="cv-card-foot"><div class="skeleton" style="height:36px;flex:1"></div><div class="skeleton" style="height:36px;width:76px"></div></div></div>';
  const boardSkeleton = () => STAGES.map((s, i) => `<section class="cv-stage cv-sk"><header class="cv-stage-head"><div><strong>${esc(s.label)}</strong><span class="skeleton cv-count-sk"></span></div><small>${esc(s.note)}</small></header><div class="cv-stage-list">${i < 2 ? cardSkeleton() : ""}${i === 0 ? cardSkeleton() : ""}</div></section>`).join("");

  function render(root) {
    let state = warm ? clone(warm) : null, disposed = false, seq = 0, chain = Promise.resolve();
    root.innerHTML = `
      <div class="ps-page-header cv-head">
        <div><h1>Content</h1><p class="ps-subtitle">Every video starts as an idea tagged with its pillar and funnel layer, then moves stage by stage until it is redistributed.</p></div>
        <div class="cv-head-actions"><button class="ps-control" id="cv-export">Export CSV</button><button class="ps-control" id="cv-refresh">Refresh</button></div>
      </div>
      <div class="ps-kpis cv-kpis" id="cv-kpis">${state ? "" : kpiSkeleton()}</div>
      <form class="cv-add" id="cv-add" novalidate>
        <label class="cv-field cv-wide"><span>Video idea or title</span><input class="ps-input" id="cv-title" name="title" placeholder="Why coaching content stopped converting" autocomplete="off"></label>
        <label class="cv-field"><span>Pillar</span><select class="ps-input" id="cv-pillar" name="pillar">${PILLARS.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label>
        <label class="cv-field"><span>Funnel layer</span><select class="ps-input" id="cv-layer" name="layer">${LAYERS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("")}</select></label>
        <label class="cv-field"><span>Start stage</span><select class="ps-input" id="cv-stage" name="stage">${STAGES.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</select></label>
        <div class="cv-field cv-submit"><span aria-hidden="true">&nbsp;</span><button type="submit" class="ps-button primary" id="cv-submit" ${state ? "" : "disabled"}>${PulsifyShell.icon("plus")}Add video</button></div>
        <div class="cv-add-feedback" id="cv-add-feedback"></div>
      </form>
      <div class="cv-board" id="cv-board">${state ? "" : boardSkeleton()}</div>
      <p class="cv-keys">Keys: with a video focused, Left and Right move it a stage, Delete removes it.</p>`;
    const $ = (sel) => root.querySelector(sel);
    const board = $("#cv-board"), kpis = $("#cv-kpis"), form = $("#cv-add");

    async function load() {
      const current = ++seq;
      try {
        const row = await readState();
        if (disposed || current !== seq || !root.isConnected) return;
        let next = row.value;
        if (!row.exists) {
          // Nothing on the server yet: carry the old browser copy over once.
          const legacy = legacyState();
          if (legacy) { await writeState(legacy); next = legacy; }
        }
        if (disposed || current !== seq) return;
        state = next; warm = clone(state); draw();
      } catch (e) {
        if (disposed || current !== seq) return;
        if (!state) { kpis.replaceChildren(); kpis.hidden = true; board.replaceChildren(); }
        PulsifyShell.inlineError(board, e, load);
      }
    }

    function draw() {
      if (!state) return;
      const list = items(state);
      $("#cv-submit").disabled = false; kpis.hidden = false;
      const active = list.filter((v) => !["posted", "redistributed"].includes(v.stage)).length;
      const filmed = list.filter((v) => stageIndex(v.stage) >= stageIndex("filmed")).length;
      const posted = list.filter((v) => ["posted", "redistributed"].includes(v.stage)).length;
      const redistributed = list.filter((v) => v.stage === "redistributed").length;
      kpis.innerHTML = [["Total videos", list.length, "In the pipeline"], ["In production", active, "Not yet posted"], ["Filmed or later", filmed, "Recording is done"], ["Redistributed", redistributed || posted, redistributed || !posted ? "Clips and stories out" : "Posted, not yet cut up"]]
        .map(([l, v, n]) => `<div class="ps-kpi"><small>${esc(l)}</small><b>${fmt(v)}</b><small>${esc(n)}</small></div>`).join("");
      if (!list.length) {
        board.replaceChildren(PulsifySurface.empty("film", "No videos in the pipeline", "Add the first idea above and move it forward as it ships.", "Add a video", () => $("#cv-title").focus()));
        return;
      }
      board.innerHTML = STAGES.map((stage, si) => {
        const rows = list.filter((v) => v.stage === stage.id);
        return `<section class="cv-stage ${rows.length ? "" : "is-empty"}" data-stage="${stage.id}" aria-label="${esc(stage.label)}">
          <header class="cv-stage-head"><div><strong>${esc(stage.label)}</strong><span class="cv-count">${fmt(rows.length)}</span></div><small>${esc(stage.note)}</small></header>
          <div class="cv-stage-list">${rows.length ? rows.map((item) => card(item, si)).join("") : '<p class="cv-stage-empty">No videos at this stage</p>'}</div>
        </section>`;
      }).join("");
      board.querySelectorAll("[data-select]").forEach((sel) => (sel.onchange = () => move(sel.dataset.select, sel.value, sel)));
      board.querySelectorAll("[data-dir]").forEach((b) => (b.onclick = () => step(b.dataset.dir === "back" ? -1 : 1, b.closest(".cv-card").dataset.id, b)));
      board.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = () => remove(b.dataset.remove, b)));
      board.querySelectorAll(".cv-card").forEach((el) => el.addEventListener("keydown", (e) => {
        if (e.target !== el) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); step(e.key === "ArrowLeft" ? -1 : 1, el.dataset.id, el); }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(el.dataset.id, el); }
      }));
    }
    function card(item, si) {
      return `<article class="cv-card" data-id="${esc(item.id)}" tabindex="0" aria-label="${esc(item.title)}">
        <div class="cv-card-top"><span class="int-pill">${esc(item.layer)}</span><span class="cv-pillar">${esc(item.pillar)}</span><button type="button" class="cv-remove" data-remove="${esc(item.id)}" aria-label="Remove ${esc(item.title)}" title="Remove video">${PulsifyShell.icon("x")}</button></div>
        <h3>${esc(item.title)}</h3>
        ${item.notes ? `<p class="cv-notes">${esc(item.notes)}</p>` : ""}
        <div class="cv-card-foot">
          <select class="ps-input compact" data-select="${esc(item.id)}" aria-label="Stage for ${esc(item.title)}">${STAGES.map((s) => `<option value="${s.id}"${s.id === item.stage ? " selected" : ""}>${esc(s.label)}</option>`).join("")}</select>
          <div class="cv-move"><button type="button" class="ps-control" data-dir="back" aria-label="Move back a stage" ${si === 0 ? "disabled" : ""}>${PulsifyShell.icon("chevron-left")}</button><button type="button" class="ps-control" data-dir="forward" aria-label="Move forward a stage" ${si === STAGES.length - 1 ? "disabled" : ""}>${PulsifyShell.icon("chevron-right")}</button></div>
        </div>
      </article>`;
    }

    // Every mutation applies at once, redraws, then writes the whole value.
    // A failed write puts the previous state back and offers a retry on the
    // control that caused it, so nothing typed is lost.
    function persist(control) {
      const snapshot = clone(state);
      PulsifyShell.pending(control);
      const run = chain.then(() => writeState(snapshot));
      chain = run.catch(() => {});
      return run.finally(() => { if (control?.isConnected) PulsifyShell.pending(control, false); });
    }
    function focusCard(id) { const el = board.querySelector(`.cv-card[data-id="${CSS.escape(id)}"]`); el?.focus({ preventScroll: true }); return el; }
    async function move(id, stage, control) {
      if (!state || !STAGES.some((s) => s.id === stage)) return;
      const before = clone(state);
      state.overrides[id] = { ...(state.overrides[id] || {}), stage };
      draw();
      const el = focusCard(id);
      try { await persist(el?.querySelector("[data-select]") || control); warm = clone(state); }
      catch (e) {
        if (disposed) return;
        state = before; draw();
        const back = focusCard(id);
        PulsifyShell.inlineError(back || board, e, () => move(id, stage, control));
      }
    }
    function step(dir, id, control) {
      const item = items(state).find((v) => v.id === id);
      if (!item) return;
      const next = STAGES[clamp(stageIndex(item.stage) + dir, 0, STAGES.length - 1)];
      if (next.id !== item.stage) move(id, next.id, control);
    }
    async function remove(id, control) {
      const item = items(state).find((v) => v.id === id);
      if (!item) return;
      const ok = await PulsifySurface.confirm("Remove this video?", `"${item.title}" leaves the pipeline. Add it again if you change your mind.`, "Remove");
      if (!ok || disposed) return;
      const before = clone(state);
      if (!state.removed.includes(id)) state.removed.push(id);
      state.added = state.added.filter((a) => (a.id || slugify(a.title)) !== id);
      draw();
      try { await persist($("#cv-refresh")); warm = clone(state); }
      catch (e) {
        if (disposed) return;
        state = before; draw();
        PulsifyShell.inlineError(focusCard(id) || board, e, () => remove(id, control));
      }
    }
    async function add(draft) {
      const title = draft.title.trim();
      const feedback = $("#cv-add-feedback");
      feedback.replaceChildren();
      if (!title) { $("#cv-title").focus(); return; }
      const before = clone(state);
      const layer = LAYERS.some(([v]) => v === draft.layer) ? draft.layer : "TOF";
      const pillar = PILLARS.includes(draft.pillar) ? draft.pillar : PILLARS[0];
      const stage = STAGES.some((s) => s.id === draft.stage) ? draft.stage : STAGES[0].id;
      const id = slugify(title) + "-" + Date.now().toString(36);
      state.added.push({ id, title, type: `${layer} · ${pillar}`, layer, pillar, stage, owner: "AB", notes: "" });
      $("#cv-title").value = "";
      draw();
      try { await persist($("#cv-submit")); warm = clone(state); if (!disposed) focusCard(id); }
      catch (e) {
        if (disposed) return;
        state = before; draw();
        $("#cv-title").value = draft.title; $("#cv-pillar").value = pillar; $("#cv-layer").value = layer; $("#cv-stage").value = stage;
        PulsifyShell.inlineError(feedback, e, () => add(draft));
      }
    }
    function exportCsv() {
      if (!state) return;
      const head = ["id", "title", "layer", "pillar", "type", "stage", "owner", "notes"];
      const csv = [head.join(",")].concat(items(state).map((item) => head.map((k) => `"${String(item[k] || "").replace(/"/g, '""')}"`).join(","))).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "pulsify-content-pipeline-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    form.onsubmit = (e) => { e.preventDefault(); if (!state) return; add({ title: $("#cv-title").value, pillar: $("#cv-pillar").value, layer: $("#cv-layer").value, stage: $("#cv-stage").value }); };
    $("#cv-export").onclick = exportCsv;
    $("#cv-refresh").onclick = () => { PulsifyShell.pending($("#cv-refresh")); load().finally(() => { if (root.isConnected) PulsifyShell.pending($("#cv-refresh"), false); }); };
    if (state) draw();
    load();
    return () => { disposed = true; seq++; };
  }
  window.PulsifyContentView = { render };
})();
