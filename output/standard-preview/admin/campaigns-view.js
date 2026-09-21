// Acquisition pages: every personalized prospect page across clients, who is
// engaging with each one, and the tracked links that record off-page opens.
// Native port of the old console "campaigns" panel. The page list, the
// follow-up queue, the visitor activity drill-down and tracked links live
// here. Page setup (name, slug, video, page content) stays in the console
// client setup, which owns the landing-page standard; this view hands off to
// it and never writes page content itself.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const number = (v) => Number(v || 0).toLocaleString();
  const percent = (v) => Math.min(100, Math.max(0, Math.round(Number(v || 0))));
  const relativeTime = (value) => {
    if (!value) return "-";
    const stamp = new Date(value).getTime();
    if (Number.isNaN(stamp)) return "-";
    const gap = Math.abs(Date.now() - stamp);
    if (gap < 60000) return "just now";
    if (gap < 3600000) return `${Math.round(gap / 60000)}m ago`;
    if (gap < 86400000) return `${Math.round(gap / 3600000)}h ago`;
    return `${Math.round(gap / 86400000)}d ago`;
  };
  const duration = (value) => {
    const seconds = Math.max(0, Math.round(Number(value || 0)));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  const initials = (name) => String(name || "?").split(/[\s._-]+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
  const previewPath = (client) => `/${encodeURIComponent(client)}?operator_preview=1`;

  // Same request shape the console sends: operator header on every call,
  // JSON body on writes. Server errors are mapped to shell copy by status.
  async function api(path, init = {}) {
    const headers = { "x-pulsify-operator": "1", ...(init.headers || {}) };
    const r = await fetch(path, { ...init, headers });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status, typeof d.error === "string" && r.status < 500 ? d.error : undefined);
    return d;
  }
  const post = (path, body) => api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  async function copyText(text) {
    try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
    try {
      const area = document.createElement("textarea");
      area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    } catch { return false; }
  }
  // Copy feedback lives on the button itself: label flips for a beat, no toast.
  async function copyFromButton(button, text) {
    if (!text) return;
    const label = button.textContent;
    const copied = await copyText(text);
    button.textContent = copied ? "Copied" : "Copy failed";
    button.classList.toggle("cp-copied", copied);
    setTimeout(() => { if (button.isConnected) { button.textContent = label; button.classList.remove("cp-copied"); } }, 1600);
  }

  const pill = (label, tone = "") => `<span class="int-pill ${tone}">${esc(label)}</span>`;
  const signalPill = (signal) => {
    if (signal === "applied") return pill("Applied", "int-pill-ok");
    if (signal === "hot") return pill("Hot", "int-pill-warn");
    if (signal === "warm") return pill("Warm", "int-pill-warn");
    if (signal === "visited") return pill("Visited");
    if (signal === "cool") return pill("Cool");
    return pill("No activity");
  };
  const statePill = (active) => (active ? pill("Active", "int-pill-ok") : pill("Inactive"));
  const signalRank = (signal) => ({ applied: 3, hot: 2, visited: 1 }[signal] || 0);
  const time = (v) => (Number.isFinite(Date.parse(v)) ? Date.parse(v) : 0);

  const TABS = [["pages", "Pages"], ["queue", "Follow-up queue"], ["links", "Tracked links"]];
  const SORTS = [["signal", "Signal"], ["activity", "Last activity"], ["views", "Views"], ["watch", "Watch depth"], ["applications", "Applications"], ["name", "Name"]];
  const FILTERS = [["all", "All pages"], ["active", "Active"], ["inactive", "Inactive"], ["engaged", "With activity"]];

  let warm = null; // last loaded payloads, so a return visit paints at once
  const activityCache = new Map();

  const kpiSkeleton = () => Array.from({ length: 4 }, () => '<div class="ps-kpi"><div class="skeleton" style="width:45%"></div><div class="skeleton" style="height:34px;margin:15px 0 8px;width:38%"></div><div class="skeleton" style="width:70%"></div></div>').join("");
  const rowSkeleton = (count = 6) => `<div class="cp-list cp-loading" role="status" aria-label="Loading pages">${Array.from({ length: count }, () => '<div class="cp-row cp-row-skeleton" aria-hidden="true"><span class="cp-avatar skeleton"></span><span class="cp-page"><i class="skeleton"></i><i class="skeleton"></i></span><span class="cp-pills"><i class="skeleton"></i></span><span class="cp-metric"><i class="skeleton"></i><i class="skeleton"></i></span><span class="cp-metric"><i class="skeleton"></i><i class="skeleton"></i></span><span class="cp-metric"><i class="skeleton"></i><i class="skeleton"></i></span><span class="cp-when"><i class="skeleton"></i></span></div>').join("")}</div>`;
  const tableSkeleton = (columns, rows = 3) => `<div class="int-table int-table-skeleton" role="status" aria-label="Loading"><table><thead><tr>${columns.map((w) => `<th><span class="int-skel skeleton" style="width:${w}px"></span></th>`).join("")}</tr></thead><tbody>${Array.from({ length: rows }, () => `<tr>${columns.map((w) => `<td><span class="int-skel skeleton" style="width:${Math.round(w * 1.6)}px"></span></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

  function render(root, ctx = {}) {
    let tab = "pages", filter = "all", order = "signal", hideApplied = true, hideBooked = true;
    let disposed = false, sequence = 0;
    let data = warm;
    let clients = Array.isArray(ctx.clients) ? ctx.clients : [];
    root.innerHTML = `<div class="cp-main">
      <div class="ps-page-header cp-head">
        <div><h1>Acquisition pages</h1><p class="ps-subtitle">Every personalized prospect page, who is watching it, and the tracked links you send alongside it.</p></div>
        <div class="cp-head-actions"><button class="ps-control" id="cp-refresh">Refresh</button><button class="ps-button primary" id="cp-create">${PulsifyShell.icon("plus")}Create page</button></div>
      </div>
      <div class="ps-kpis cp-kpis" id="cp-kpis">${data ? "" : kpiSkeleton()}</div>
      <div class="ps-tabs cp-tabs" role="tablist" id="cp-tabs">${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === tab}" class="${id === tab ? "active" : ""}">${label}<span data-count="${id}"></span></button>`).join("")}</div>
      <div id="cp-feedback"></div>
      <section id="cp-body" class="cp-body"></section></div>`;
    const $ = (sel) => root.querySelector(sel);
    const main = $(".cp-main");
    const body = $("#cp-body"), kpis = $("#cp-kpis"), feedback = $("#cp-feedback");

    async function load() {
      const current = ++sequence;
      feedback.replaceChildren();
      const refresh = $("#cp-refresh");
      PulsifyShell.pending(refresh);
      if (!data) { kpis.innerHTML = kpiSkeleton(); drawSkeleton(); }
      try {
        const campaigns = await api("/api/campaigns");
        if (disposed || current !== sequence || !root.isConnected) return;
        // The queue and the links load after the board, the way the console did;
        // either one failing must not blank the page list.
        const [followups, assets] = await Promise.all([
          api("/api/followups").catch((e) => ({ error: e })),
          api("/api/assets").catch((e) => ({ error: e })),
        ]);
        if (disposed || current !== sequence || !root.isConnected) return;
        data = {
          campaigns: campaigns.campaigns || [],
          summary: campaigns.summary || {},
          followups: followups.error ? [] : (followups.followups || []),
          followupSummary: followups.error ? null : (followups.summary || {}),
          followupError: followups.error || null,
          assets: assets.error ? [] : (assets.assets || []),
          assetError: assets.error || null,
        };
        warm = data;
        draw();
      } catch (e) {
        if (disposed || current !== sequence) return;
        if (!data) { kpis.replaceChildren(); kpis.hidden = true; body.replaceChildren(); }
        PulsifyShell.inlineError(feedback, e, load);
      } finally {
        if (refresh.isConnected) PulsifyShell.pending(refresh, false);
      }
    }

    function drawSkeleton() {
      if (tab === "pages") body.innerHTML = `<div class="cp-toolbar"><div class="leads-filters cp-filters">${FILTERS.map(([key, label]) => `<button class="leads-chip" disabled>${label}</button>`).join("")}</div></div>${rowSkeleton(6)}`;
      else if (tab === "queue") body.innerHTML = tableSkeleton([120, 90, 70, 80, 70, 50, 50, 90]);
      else body.innerHTML = tableSkeleton([140, 200, 40, 60, 70, 90]);
    }

    function draw() {
      if (!data) return;
      kpis.hidden = false;
      const s = data.summary;
      kpis.innerHTML = [
        ["Total pages", number(s.total_pages), "Clients configured with a page"],
        ["Active pages", number(s.active_pages), "Available to prospects right now"],
        ["Pages viewed", number(s.pages_with_activity), "With real tracked activity"],
        ["Applications", number(s.total_applications), "Across every page"],
      ].map(([l, v, n]) => `<div class="ps-kpi"><small>${esc(l)}</small><b>${v}</b><small>${esc(n)}</small></div>`).join("");
      const counts = { pages: data.campaigns.length, queue: data.followups.filter((f) => !f.outcomes?.applied && !f.outcomes?.booked).length, links: data.assets.length };
      root.querySelectorAll("[data-count]").forEach((el) => { el.textContent = number(counts[el.dataset.count]); });
      if (tab === "pages") drawPages();
      else if (tab === "queue") drawQueue();
      else drawLinks();
    }

    function sortedPages() {
      const rows = data.campaigns.filter((c) => filter === "all" || (filter === "active" && c.page_active) || (filter === "inactive" && !c.page_active) || (filter === "engaged" && c.signal !== "no activity"));
      const value = (c) => order === "views" ? Number(c.visits?.page_views || 0)
        : order === "watch" ? Number(c.video?.max_watch_percent || 0)
        : order === "applications" ? Number(c.applications?.count || 0)
        : order === "activity" ? time(c.last_activity_at)
        : signalRank(c.signal);
      return rows.sort((a, b) => {
        if (order === "name") return String(a.client_name || a.client).localeCompare(String(b.client_name || b.client));
        return value(b) - value(a) || time(b.last_activity_at) - time(a.last_activity_at) || String(a.client_name || a.client).localeCompare(String(b.client_name || b.client));
      });
    }

    function drawPages() {
      const rows = sortedPages();
      body.innerHTML = `
        <div class="cp-toolbar">
          <div class="leads-filters cp-filters">${FILTERS.map(([key, label]) => `<button type="button" class="leads-chip ${filter === key ? "active" : ""}" data-filter="${key}">${label}</button>`).join("")}</div>
          <label class="contact-sort" for="cp-sort">Sort by <select class="ps-control" id="cp-sort">${SORTS.map(([key, label]) => `<option value="${key}" ${order === key ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        </div>
        <div class="cp-list" id="cp-pages">${rows.map(pageRow).join("")}</div>`;
      if (!rows.length) {
        const filtered = filter !== "all";
        $("#cp-pages").replaceChildren(PulsifySurface.empty("layout", filtered ? "No pages match this filter" : "No acquisition pages yet", filtered ? "Every page is listed under All pages." : "Create the first page. Its tracked share link and activity will appear here.", filtered ? "Show all pages" : "Create page", () => { if (filtered) { filter = "all"; drawPages(); } else setup(""); }));
      }
      body.querySelectorAll("[data-filter]").forEach((b) => { b.onclick = () => { filter = b.dataset.filter; drawPages(); }; });
      $("#cp-sort").onchange = (e) => { order = e.target.value; drawPages(); };
      body.querySelectorAll("[data-activity]").forEach((b) => { b.onclick = () => openActivity(b.dataset.activity); });
      body.querySelectorAll("[data-copy-page]").forEach((b) => { b.onclick = () => copyPageLink(b.dataset.copyPage, b); });
      body.querySelectorAll("[data-edit]").forEach((b) => { b.onclick = () => setup(b.dataset.edit); });
      body.querySelectorAll("[data-toggle]").forEach((b) => { b.onclick = () => togglePage(b.dataset.toggle, b); });
    }

    function pageRow(c) {
      const title = c.client_name || c.client;
      const watch = percent(c.video?.max_watch_percent);
      return `<div class="cp-row ${c.page_active ? "" : "is-inactive"}" data-page="${esc(c.client)}">
        <span class="cp-avatar" aria-hidden="true">${esc(initials(title))}</span>
        <span class="cp-page"><strong>${esc(title)}</strong><small>/${esc(c.client)}${c.prospect_email ? ` · ${esc(c.prospect_email)}` : ""}</small></span>
        <span class="cp-pills">${statePill(c.page_active)}${signalPill(c.signal)}</span>
        <span class="cp-metric"><b>${number(c.visits?.page_views)}</b><small>${number(c.visits?.visitors)} unique · ${number(c.visits?.attributed_visitors)} attributed</small></span>
        <span class="cp-metric"><b>${watch}%</b><small>${number(c.video?.plays)} plays</small><span class="cp-track" aria-hidden="true"><i style="width:${watch}%"></i></span></span>
        <span class="cp-metric"><b>${number(c.applications?.count)}</b><small>${c.applications?.count ? "applications" : "no applications"}${c.failures_7d ? ` · ${number(c.failures_7d)} failed sends` : ""}</small></span>
        <span class="cp-when"><time datetime="${esc(c.last_activity_at || "")}">${esc(relativeTime(c.last_activity_at))}</time><small>last activity</small></span>
        <span class="cp-actions int-row-actions">
          <button type="button" class="ps-control" data-activity="${esc(c.client)}">Activity</button>
          <button type="button" class="ps-control" data-copy-page="${esc(c.client)}">Copy link</button>
          <a class="ps-control ghost" href="${esc(previewPath(c.client))}" target="_blank" rel="noopener">Open</a>
          <button type="button" class="ps-control ghost" data-edit="${esc(c.client)}">Edit</button>
          <button type="button" class="ps-control ghost" data-toggle="${esc(c.client)}">${c.page_active ? "Deactivate" : "Activate"}</button>
        </span>
      </div>`;
    }

    function drawQueue() {
      const rows = data.followups.filter((f) => !(hideApplied && f.outcomes?.applied) && !(hideBooked && f.outcomes?.booked));
      body.innerHTML = `
        <div class="cp-toolbar">
          <div class="cp-toggles">
            <label class="cp-toggle"><input type="checkbox" id="cp-hide-applied" ${hideApplied ? "checked" : ""}> Hide applied</label>
            <label class="cp-toggle"><input type="checkbox" id="cp-hide-booked" ${hideBooked ? "checked" : ""}> Hide booked</label>
          </div>
          <span class="int-note">${number(rows.length)} of ${number(data.followups.length)} engaged${data.followupSummary ? ` · ${number(data.followupSummary.needing_followup)} need follow-up` : ""}</span>
        </div>
        <div id="cp-queue-feedback"></div>
        <div class="int-table cp-table"><table>
          <thead><tr><th>Prospect</th><th>Page</th><th>Signal</th><th>Watch</th><th>Last viewed</th><th>Applied</th><th>Booked</th><th></th></tr></thead>
          <tbody>${rows.map((f) => {
            const watch = percent(f.engagement?.max_watch_percent);
            return `<tr>
              <td><strong>${esc(f.client_name || f.client)}</strong><small>${number(f.engagement?.page_views)} page views</small></td>
              <td><a class="cp-link" href="${esc(previewPath(f.client))}" target="_blank" rel="noopener">/${esc(f.client)}</a></td>
              <td>${signalPill(f.signal)}<small>${number(f.score)} points</small></td>
              <td><div class="cp-watch"><span>${watch}%</span><small>${number(f.engagement?.plays)} plays</small><span class="cp-track" aria-hidden="true"><i style="width:${watch}%"></i></span></div></td>
              <td>${esc(relativeTime(f.engagement?.last_viewed_at))}</td>
              <td>${f.outcomes?.applied ? pill("Applied", "int-pill-ok") : '<span class="int-note">No</span>'}</td>
              <td>${f.outcomes?.booked ? pill("Booked", "int-pill-ok") : '<span class="int-note">No</span>'}</td>
              <td><div class="int-row-actions"><button type="button" class="ps-control" data-activity="${esc(f.client)}">Activity</button></div></td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>`;
      if (data.followupError) PulsifyShell.inlineError($("#cp-queue-feedback"), data.followupError, load);
      if (!rows.length) {
        const filtered = (hideApplied || hideBooked) && data.followups.length > 0;
        body.querySelector(".cp-table").replaceChildren(PulsifySurface.empty("users", filtered ? "Everyone here already applied or booked" : "No engaged prospects yet", filtered ? "Show the completed outcomes to see them." : "Once a sent page records a view it lands in this queue, ranked by watch depth and recency.", filtered ? "Show everyone" : "Copy a page link", () => { if (filtered) { hideApplied = false; hideBooked = false; drawQueue(); } else { tab = "pages"; syncTabs(); draw(); } }));
      }
      $("#cp-hide-applied").onchange = (e) => { hideApplied = e.target.checked; drawQueue(); };
      $("#cp-hide-booked").onchange = (e) => { hideBooked = e.target.checked; drawQueue(); };
      body.querySelectorAll("[data-activity]").forEach((b) => { b.onclick = () => openActivity(b.dataset.activity); });
    }

    function clientOptions(selected) {
      const seen = new Map();
      for (const c of clients) seen.set(c.client, c.client_name || c.client);
      for (const c of data.campaigns) if (!seen.has(c.client)) seen.set(c.client, c.client_name || c.client);
      return `<option value="">Not client-specific</option>${[...seen].map(([id, name]) => `<option value="${esc(id)}" ${id === selected ? "selected" : ""}>${esc(name)}</option>`).join("")}`;
    }

    function drawLinks() {
      body.innerHTML = `
        <form class="cp-form" id="cp-asset-form" novalidate>
          <div class="cp-form-head"><strong>New tracked link</strong><small>Turn any document or page into a short link that records each open.</small></div>
          <label class="cp-field cp-wide"><span>Label</span><input class="ps-input" name="label" placeholder="Name the document or asset" required autocomplete="off"></label>
          <label class="cp-field cp-wide"><span>Destination URL</span><input class="ps-input" name="target_url" type="url" placeholder="https://" required autocomplete="off"></label>
          <label class="cp-field"><span>Client</span><select class="ps-input" name="client">${clientOptions("")}</select></label>
          <label class="cp-field"><span>Lead email</span><input class="ps-input" name="lead_email" type="email" placeholder="Optional, when this link belongs to one lead" autocomplete="off"></label>
          <div class="cp-field cp-submit"><span aria-hidden="true">&nbsp;</span><button type="submit" class="ps-button primary" id="cp-asset-submit">Create tracked link</button></div>
          <div class="cp-form-feedback" id="cp-asset-feedback"></div>
        </form>
        <div id="cp-links-feedback"></div>
        <div id="cp-links"></div>`;
      $("#cp-asset-form").onsubmit = createAsset;
      drawLinksTable();
    }

    function drawLinksTable() {
      const holder = $("#cp-links"), note = $("#cp-links-feedback");
      if (!holder) return;
      note.replaceChildren();
      holder.innerHTML = `<div class="int-table cp-table"><table>
          <thead><tr><th>Asset</th><th>Destination</th><th>Opens</th><th>Unique IPs</th><th>Last open</th><th></th></tr></thead>
          <tbody>${data.assets.map((a) => `<tr>
            <td><strong>${esc(a.label || "Tracked asset")}</strong><small>${esc(a.lead_email || a.client || "Unassigned")}</small></td>
            <td><a class="cp-link cp-destination" href="${esc(a.target_url)}" title="${esc(a.target_url)}" target="_blank" rel="noopener">${esc(a.target_url)}</a></td>
            <td>${number(a.opens)}</td>
            <td>${number(a.unique_ips)}</td>
            <td>${esc(relativeTime(a.last_open_at))}</td>
            <td><div class="int-row-actions"><button type="button" class="ps-control" data-copy-asset="${esc(a.url)}">Copy link</button><button type="button" class="ps-control ghost" data-archive="${esc(a.token)}">Archive</button></div></td>
          </tr>`).join("")}</tbody>
        </table></div>`;
      if (data.assetError) PulsifyShell.inlineError(note, data.assetError, load);
      if (!data.assets.length) holder.replaceChildren(PulsifySurface.empty("arrow-up-right", "No tracked links yet", "Create the first link above. Opens will appear here as prospects click it.", "Focus the form", () => $("#cp-asset-form [name=label]").focus()));
      holder.querySelectorAll("[data-copy-asset]").forEach((b) => { b.onclick = () => copyFromButton(b, b.dataset.copyAsset); });
      holder.querySelectorAll("[data-archive]").forEach((b) => { b.onclick = () => archiveAsset(b.dataset.archive, b); });
    }

    async function createAsset(event) {
      event.preventDefault();
      const form = event.currentTarget, button = $("#cp-asset-submit"), note = $("#cp-asset-feedback");
      note.replaceChildren();
      const label = form.label.value.trim(), target = form.target_url.value.trim();
      if (!label || !target) { note.innerHTML = '<p class="int-note">Add a label and the destination URL.</p>'; (label ? form.target_url : form.label).focus(); return; }
      PulsifyShell.pending(button);
      try {
        const created = await post("/api/assets", { label, target_url: target, client: form.client.value || null, lead_email: form.lead_email.value.trim() || null });
        if (disposed) return;
        note.innerHTML = `<div class="cp-result"><strong>Tracked link ready</strong><div class="cp-result-row"><input class="ps-input" readonly value="${esc(created.url)}" aria-label="Generated tracked link"><button type="button" class="ps-control" data-copy-new>Copy link</button></div></div>`;
        note.querySelector("[data-copy-new]").onclick = (e) => copyFromButton(e.currentTarget, created.url);
        form.label.value = ""; form.target_url.value = ""; form.lead_email.value = "";
        await reloadAssets();
        if (!disposed) drawLinksTable();
      } catch (e) {
        if (disposed) return;
        PulsifyShell.inlineError(note, e);
      } finally {
        if (button.isConnected) PulsifyShell.pending(button, false);
      }
    }

    async function reloadAssets() {
      const fresh = await api("/api/assets");
      data = { ...data, assets: fresh.assets || [], assetError: null };
      warm = data;
      root.querySelector('[data-count="links"]').textContent = number(data.assets.length);
    }

    async function archiveAsset(token, button) {
      const ok = await PulsifySurface.confirm("Archive this tracked link?", "The short link stops redirecting and leaves this list. Recorded opens are kept.", "Archive link");
      if (!ok || disposed) return;
      PulsifyShell.pending(button);
      try {
        await api(`/api/assets?token=${encodeURIComponent(token)}`, { method: "DELETE" });
        await reloadAssets();
        if (!disposed) drawLinksTable();
      } catch (e) {
        if (disposed) return;
        PulsifyShell.pending(button, false);
        PulsifyShell.inlineError($("#cp-links-feedback"), e);
      }
    }

    // Copy the tracked lead link. A page without a token gets one minted the
    // way the console did: an empty settings save for that client.
    async function copyPageLink(client, button) {
      const campaign = data.campaigns.find((c) => c.client === client);
      if (!campaign) return;
      let url = campaign.share_url;
      if (!url) {
        PulsifyShell.pending(button);
        try {
          const saved = await post("/api/settings", { client: campaign.client });
          url = saved.share_url;
          if (url) campaign.share_url = url;
          await load();
        } catch (e) {
          if (disposed) return;
          PulsifyShell.inlineError(feedback, e);
          return;
        } finally {
          if (button.isConnected) PulsifyShell.pending(button, false);
        }
      }
      if (disposed) return;
      const live = root.querySelector(`[data-copy-page="${CSS.escape(client)}"]`) || button;
      copyFromButton(live, url);
    }

    async function togglePage(client, button) {
      const campaign = data.campaigns.find((c) => c.client === client);
      if (!campaign) return;
      const next = !campaign.page_active;
      if (!next) {
        const ok = await PulsifySurface.confirm("Deactivate this page?", `Prospects who open /${campaign.client} will see it as unavailable until you activate it again. Nothing is deleted.`, "Deactivate page");
        if (!ok || disposed) return;
      }
      PulsifyShell.pending(button);
      try {
        await post("/api/settings", { client: campaign.client, page_active: next });
        await load();
      } catch (e) {
        if (disposed) return;
        PulsifyShell.pending(button, false);
        PulsifyShell.inlineError(feedback, e);
      }
    }

    // Page setup lives in the console client setup, the same hand-off the
    // Clients view uses. The frame covers this view until the operator comes
    // back with the button above it; the list refreshes on return so a page
    // created or edited in the frame shows up.
    function setup(client) {
      root.querySelector(".cp-frame-bar")?.remove();
      root.querySelector(".cp-frame")?.remove();
      const frame = document.createElement("iframe");
      frame.className = "ps-frame cp-frame";
      frame.title = client ? "Edit page setup" : "Create acquisition page";
      frame.src = "/admin/console-view.html?view=clients" + (client ? "&client=" + encodeURIComponent(client) : "");
      frame.addEventListener("load", () => frame.contentWindow?.postMessage({ type: "pulsify-theme", mode: localStorage.getItem("theme") || "dark" }, location.origin));
      const bar = document.createElement("div");
      bar.className = "cp-frame-bar";
      bar.innerHTML = `<button type="button" class="ps-control" data-back>${PulsifyShell.icon("arrow")}Back to pages</button><span class="int-note">${client ? `Editing the setup for /${esc(client)}` : "Set up a new client and their page"}</span>`;
      bar.querySelector("[data-back]").onclick = () => { bar.remove(); frame.remove(); main.hidden = false; load(); };
      main.hidden = true;
      root.append(bar, frame);
    }

    async function openActivity(client) {
      const campaign = data.campaigns.find((c) => c.client === client);
      const followup = data.followups.find((f) => f.client === client);
      const name = campaign?.client_name || followup?.client_name || client;
      const d = document.createElement("dialog");
      d.className = "ps-dialog int-dialog cp-activity";
      d.innerHTML = `<div class="cp-activity-head"><div><h2>${esc(name)}</h2><small class="int-note">Visitor activity on /${esc(client)}</small></div><div class="int-row-actions"><a class="ps-control" href="${esc(previewPath(client))}" target="_blank" rel="noopener">Open page</a><button type="button" class="ps-control" data-close>Close</button></div></div>
        <div class="ps-kpis cp-activity-kpis">${kpiSkeleton()}</div>
        <div class="cp-viewers" aria-label="Loading visitors">${Array.from({ length: 3 }, () => '<div class="cp-viewer cp-viewer-skeleton"><div class="skeleton" style="width:40%"></div><div class="skeleton" style="width:70%"></div></div>').join("")}</div>`;
      document.body.append(d);
      d.addEventListener("close", () => d.remove());
      d.querySelector("[data-close]").onclick = () => d.close();
      d.showModal();
      try {
        const payload = activityCache.get(client) || await api(`/leads?client=${encodeURIComponent(client)}`);
        if (!d.open) return;
        activityCache.set(client, payload);
        drawActivity(d, payload);
      } catch (e) {
        if (!d.open) return;
        d.querySelector(".cp-activity-kpis").replaceChildren();
        d.querySelector(".cp-viewers").replaceChildren();
        PulsifyShell.inlineError(d, e, () => { activityCache.delete(client); d.close(); openActivity(client); });
      }
    }

    function drawActivity(d, payload) {
      const s = payload.summary || {};
      d.querySelector(".cp-activity-kpis").innerHTML = [
        ["Visitors", number(s.visitors), `${number(s.page_views)} page views`],
        ["Watchers", number(s.watchers), `${Math.round((s.play_rate || 0) * 100)}% of visitors pressed play`],
        ["Plays", number(s.plays), `${Math.round(s.average_watched_percent || 0)}% average watch depth`],
        ["Applications", number(s.applications), `${number(s.cta_clicks)} CTA clicks · ${number(s.form_starts)} form starts`],
      ].map(([l, v, n]) => `<div class="ps-kpi"><small>${esc(l)}</small><b>${v}</b><small>${esc(n)}</small></div>`).join("");
      const applied = new Set((payload.leads || []).map((l) => String(l.email || "").trim().toLowerCase()).filter(Boolean));
      const viewers = [...(payload.viewers || [])].sort((a, b) => {
        const aw = Number(a.plays || 0) > 0 || Number(a.watch_seconds || 0) > 0;
        const bw = Number(b.plays || 0) > 0 || Number(b.watch_seconds || 0) > 0;
        if (aw !== bw) return bw - aw;
        return (Number(b.watched_percent || 0) - Number(a.watched_percent || 0)) || String(b.last_watched_at || "").localeCompare(String(a.last_watched_at || ""));
      });
      const list = d.querySelector(".cp-viewers");
      list.removeAttribute("aria-label");
      if (!viewers.length) { list.replaceChildren(PulsifySurface.empty("users", "No visitors recorded", "Once someone opens this page their visit, watch depth and location land here.", "Close", () => d.close())); return; }
      list.innerHTML = viewers.map((v) => {
        const email = String(v.email || "").trim();
        const visitor = String(v.visitor_id || v.viewer || "unknown");
        const label = email || `Visitor ${visitor.slice(0, 6)}`;
        const hasApplied = email && applied.has(email.toLowerCase());
        const where = [v.city, v.country].filter(Boolean).join(", ") || "Location unavailable";
        const watch = percent(v.watched_percent);
        return `<article class="cp-viewer">
          <div class="cp-viewer-head"><div><strong>${esc(label)}</strong><small>${email ? esc(visitor) : "Unidentified visitor"}</small></div><div class="cp-pills">${v.tracked_link ? pill("Tracked lead link", "int-pill-ok") : (email ? pill("Known lead") : pill("Unattributed"))}${hasApplied ? pill("Applied", "int-pill-ok") : ""}</div></div>
          <dl class="cp-viewer-metrics">
            <div><dt>Page views</dt><dd>${number(v.page_views)}</dd></div>
            <div><dt>Watched</dt><dd>${watch}%</dd></div>
            <div><dt>Watch time</dt><dd>${duration(v.watch_seconds)}</dd></div>
            <div><dt>Plays</dt><dd>${number(v.plays)}</dd></div>
            <div><dt>IP</dt><dd>${esc(v.ip || "Unavailable")}</dd></div>
            <div><dt>Location</dt><dd>${esc(where)}</dd></div>
            <div><dt>Last seen</dt><dd>${esc(relativeTime(v.last_seen_at || v.last_watched_at))}</dd></div>
          </dl>
        </article>`;
      }).join("");
    }

    function syncTabs() {
      root.querySelectorAll("[data-tab]").forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle("active", on); b.setAttribute("aria-selected", String(on)); });
    }
    root.querySelectorAll("[data-tab]").forEach((b) => { b.onclick = () => { tab = b.dataset.tab; syncTabs(); if (data) draw(); else drawSkeleton(); }; });
    $("#cp-refresh").onclick = load;
    $("#cp-create").onclick = () => setup("");
    if (data) draw();
    load();
    return () => { disposed = true; sequence++; };
  }
  window.PulsifyCampaignsView = { render };
})();
