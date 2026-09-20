// Settings for both shells. One renderer, two roles. Sections are anchored so
// other views can deep-link (#settings/security). Every write goes through
// /api/account and shows its result inline; nothing saves silently.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cache=new Map();
  const when = (iso) => (iso ? new Date(iso).toLocaleString() : "never");

  async function render(root, ctx) {
    const role = ctx.role === "operator" ? "operator" : "client";
    const headers = () => ({ "content-type": "application/json", ...(role === "operator" ? { "x-pulsify-operator": "1" } : {}), ...(ctx.headers ? ctx.headers() : {}) });
    const api = async (init) => {
      const r = await fetch("/api/account", { credentials: "same-origin", headers: headers(), ...init });
      if (r.ok && init?.method === "POST" && r.headers.get("content-disposition")) return r;
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.ok === false) throw PulsifyShell.failure(r.status);
      return d;
    };
    const key=JSON.stringify([role,headers()]);
    const titles=role==='operator'?['Appearance','Account','Team access','Security','Client defaults','Notifications']:['Appearance','Account','Security and sessions','Workspace','Notifications','Connected accounts','Plan and billing','Your data','Close workspace'];
    root.innerHTML = '<h1>Settings</h1><p class="ps-subtitle">Your account, your workspace, and how Pulsify talks to you.</p><div class="set-layout"><nav class="set-nav"></nav><div class="set-body"></div></div>';
    let data=cache.get(key);
    if(!data){
      root.querySelector('.set-nav').innerHTML=titles.map(t=>'<span class="set-nav-item">'+esc(t)+'</span>').join('');
      root.querySelector('.set-body').innerHTML=titles.map(t=>'<section class="set-section set-loading" aria-label="Loading '+esc(t)+'"><div class="set-head"><div class="skeleton"></div><div class="skeleton"></div></div>'+Array.from({length:3},()=>'<div class="set-row"><div class="skeleton"></div><div class="skeleton"></div></div>').join('')+'</section>').join('');
      try { data = await api();cache.set(key,data); } catch (e) {if(root.isConnected){root.querySelector('.set-body').replaceChildren();PulsifyShell.inlineError(root.querySelector('.set-body'),e,()=>render(root,ctx));}return;}
    }
    if(!root.isConnected)return;
    const ro = Boolean(data.read_only);
    const sections = role === "operator" ? operatorSections(data) : clientSections(data, ro);
    root.querySelector(".set-nav").className = "set-nav";
    root.querySelector(".set-nav").innerHTML = `<button class="set-nav-item active" data-jump="appearance">Appearance</button>${sections.map((s) => `<button class="set-nav-item" data-jump="${s.id}">${esc(s.title)}</button>`).join("")}`;
    root.querySelector(".set-body").innerHTML = appearance() + sections.map((s) => `<section class="set-section" id="set-${s.id}"><div class="set-head"><h2>${esc(s.title)}</h2><p>${esc(s.blurb)}</p></div>${s.html}</section>`).join("");
    if (ro) root.querySelector(".set-body").insertAdjacentHTML("afterbegin", '<p class="set-readonly">Operator preview. Settings are read-only while viewing as this client.</p>');

    const teamEmpty=root.querySelector('[data-team-empty]');if(teamEmpty)teamEmpty.append(PulsifySurface.empty('users','No operators listed','Review the access policy to manage who can open this console.','Open access settings',()=>window.open('https://one.dash.cloudflare.com/','_blank','noopener')));
    // Appearance
    const applyTheme = () => root.querySelectorAll("[data-theme-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeMode === (localStorage.getItem("theme") || "dark"))));
    root.querySelectorAll("[data-theme-mode]").forEach((b) => (b.onclick = () => { window.PulsifyTheme?.apply(b.dataset.themeMode); applyTheme(); }));
    applyTheme();
    root.querySelector("[data-density]")?.addEventListener("change", (e) => { try { localStorage.setItem("pulsify:density", e.target.value); } catch {} document.documentElement.dataset.density = e.target.value; });

    // Nav
    root.querySelectorAll("[data-jump]").forEach((b) => (b.onclick = () => { root.querySelectorAll("[data-jump]").forEach((x) => x.classList.toggle("active", x === b)); root.querySelector(`#set-${b.dataset.jump}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    if (ctx.section) root.querySelector(`[data-jump="${ctx.section}"]`)?.click();

    // Forms: each form posts {action, ...fields} and prints the result under itself.
    root.querySelectorAll("form[data-action]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (ro) return;
        const confirmation=form.querySelector("[data-confirm]");
        if(confirmation && !await PulsifySurface.confirm("Request workspace deletion?",confirmation.dataset.confirm,"Send request"))return;
        const status = form.querySelector(".set-status");
        const button = form.querySelector("button[type=submit]");
        const fd = new FormData(form);
        const payload = { action: form.dataset.action };
        for (const [k, v] of fd.entries()) payload[k] = v;
        form.querySelectorAll("input[type=checkbox]").forEach((c) => { payload[c.name] = c.checked; });
        if (form.dataset.action === "password" && payload.next !== payload.confirm) { status.textContent = "The two new passwords do not match."; status.className = "set-status ps-inline-error"; return; }
        delete payload.confirm;
        button.disabled = true; status.textContent = "Saving…"; status.className = "set-status";
        try {
          const r = await api({ method: "POST", body: JSON.stringify(payload) });
          cache.delete(key);
          if (r instanceof Response) {
            const blob = await r.blob(); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (r.headers.get("content-disposition") || "").split('filename="')[1]?.replace('"', "") || "export.json"; a.click();
            status.textContent = "Export downloaded."; status.className = "set-status ok";
          } else {
            status.textContent = r.message || form.dataset.done || "Saved."; status.className = "set-status ok";
            if (form.dataset.action === "password") form.reset();
            if (form.dataset.action === "workspace" && payload.name && ctx.onWorkspaceName) ctx.onWorkspaceName(payload.name);
          }
        } catch (err) { status.textContent = err.message; status.className = "set-status err"; }
        finally { PulsifyShell.pending(button,false); }
      });
    });
    root.querySelector("[data-signout-all]")?.addEventListener("click", () => ctx.signOut?.());
  }

  const field = (label, inner, hint) => `<label class="set-field"><span>${esc(label)}</span>${inner}${hint ? `<small>${esc(hint)}</small>` : ""}</label>`;
  const toggle = (name, label, checked, hint) => `<label class="set-toggle"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ""}</span></label>`;
  const select = (name, options, value) => `<select name="${name}" class="set-input">${options.map((o) => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o || "Not set")}</option>`).join("")}</select>`;
  const submit = (label, extra = "") => `<div class="set-actions"><button type="submit" class="ps-control set-primary" ${extra}>${esc(label)}</button><span class="set-status" role="status"></span></div>`;

  function appearance() {
    const density = (() => { try { return localStorage.getItem("pulsify:density") || "comfortable"; } catch { return "comfortable"; } })();
    return `<section class="set-section" id="set-appearance"><div class="set-head"><h2>Appearance</h2><p>How this device shows your workspace. Saved on this browser only.</p></div>
      <div class="set-row"><div><strong>Theme</strong><small>Dark is the default. System follows your device.</small></div><div class="ps-segments">${["light", "dark", "system"].map((t) => `<button class="ps-control" data-theme-mode="${t}" aria-pressed="false">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div></div>
      <div class="set-row"><div><strong>Density</strong><small>Comfortable keeps room to breathe. Compact fits more on screen.</small></div>${select("density", ["comfortable", "compact"], density).replace("<select", '<select data-density style="max-width:200px"')}</div></section>`;
  }

  function clientSections(d, ro) {
    const dis = ro ? "disabled" : "";
    const tzOptions = ["", ...(d.timezones?.length ? d.timezones : ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Dubai"])];
    return [
      { id: "account", title: "Account", blurb: "How you sign in.", html: `
        <div class="set-row"><div><strong>Email</strong><small>${esc(d.account.email || "No login email yet")}</small></div><small class="set-muted">To change the email you sign in with, reply to any Pulsify email and we move it for you. It affects your contract records, so we do it by hand.</small></div>
        <form data-action="password" data-done="Password changed. Every other device was signed out." class="set-form">
          <div class="set-grid">${d.account.has_password ? field("Current password", `<input class="set-input" type="password" name="current" autocomplete="current-password" required ${dis}>`) : ""}${field("New password", `<input class="set-input" type="password" name="next" autocomplete="new-password" minlength="10" required ${dis}>`, "At least 10 characters.")}${field("Repeat new password", `<input class="set-input" type="password" name="confirm" autocomplete="new-password" minlength="10" required ${dis}>`)}</div>
          ${submit(d.account.has_password ? "Change password" : "Set password", dis)}
        </form>` },
      { id: "security", title: "Security and sessions", blurb: "Where you are signed in.", html: `
        <div class="set-row"><div><strong>${d.sessions.active} active session${d.sessions.active === 1 ? "" : "s"}</strong><small>Oldest started ${esc(when(d.sessions.oldest))}. Sessions last 30 days.</small></div>
        <form data-action="signout-others" data-done="Every other device is signed out." class="set-inline">${submit("Sign out other devices", dis)}</form></div>
        <div class="set-row"><div><strong>Sign out here</strong><small>Ends this session on this device.</small></div><button type="button" class="ps-control" data-signout-all>Sign out</button></div>` },
      { id: "workspace", title: "Workspace", blurb: "The name and defaults your workspace runs on.", html: `
        <form data-action="workspace" class="set-form">
          <div class="set-grid">${field("Workspace name", `<input class="set-input" name="name" value="${esc(d.workspace.name)}" maxlength="80" minlength="2" required ${dis}>`, "Shown at the top of your workspace and in reports.")}${field("Website", `<input class="set-input" name="website" type="url" placeholder="https://" value="${esc(d.workspace.website || "")}" ${dis}>`)}${field("Timezone", select("timezone", tzOptions, d.workspace.timezone || ""), "Report days and scheduling follow this.")}${field("Currency", select("currency", d.currencies, d.workspace.currency || "USD"), "How cash collected is shown.")}</div>
          ${submit("Save workspace", dis)}
        </form>
        <div class="set-row"><div><strong>Workspace id</strong><small><code>${esc(d.workspace.client)}</code> · status ${esc(d.workspace.status || "unknown")}</small></div></div>` },
      { id: "notifications", title: "Notifications", blurb: "Everything lands in the bell at the top of your workspace. No email.", html: `
        <div class="set-row"><div><strong>In your workspace</strong><small>Payments, launch steps, sequence reviews and messages from Pulsify appear in the bell and stay until you read them.</small></div><span class="int-pill int-pill-ok">On</span></div>
        <div class="set-row"><div><strong>Email</strong><small>Off. Pulsify does not send notification emails.</small></div><span class="int-pill">Off</span></div>` },
      { id: "connections", title: "Connected accounts", blurb: "Instagram, YouTube, payments and booking live in Integrations.", html: `<div class="set-row"><div><strong>Manage connections</strong><small>Read-only access, revoke any time.</small></div><button type="button" class="ps-control" onclick="window.PulsifyClientShell?.go('access')">Open Integrations</button></div>` },
      { id: "plan", title: "Plan and billing", blurb: "What you are on and what it includes.", html: `<div class="set-row"><div><strong>Your plan</strong><small>Plans, invoices and what each tier unlocks.</small></div><button type="button" class="ps-control" onclick="window.PulsifyClientShell?.go('plans')">View plans</button></div>` },
      { id: "data", title: "Your data", blurb: "It is yours. Take a copy any time.", html: `
        <div class="set-row"><div><strong>Export everything</strong><small>${d.data.brain_fields} brain fields, ${d.data.records} saved records, ${d.data.proof_items} proof items. One JSON file.</small></div><form data-action="export" class="set-inline">${submit("Download export", dis)}</form></div>` },
      { id: "danger", title: "Close workspace", blurb: "Nothing here is instant. We confirm by email first.", html: `
        <form data-action="delete-request" class="set-form set-danger">
          ${field("Why are you leaving? (optional)", `<textarea class="set-input" name="reason" rows="3" maxlength="500" ${dis}></textarea>`)}
          ${submit("Request workspace deletion", `${dis} data-confirm="Send a deletion request to Pulsify? Nothing is deleted until we confirm with you by email."`)}
        </form>` },
    ];
  }

  function operatorSections(d) {
    const tzOptions = ["", ...(d.timezones?.length ? d.timezones : ["UTC", "Europe/London", "Europe/Berlin", "America/New_York"])];
    return [
      { id: "account", title: "Account", blurb: "You, on this console.", html: `
        <div class="set-row"><div><strong>${esc(d.account.email || "Signed in")}</strong><small>Signed in through Cloudflare Access with Google.</small></div><a class="ps-control" href="/portal/login?operator=1&logout=1">Sign out</a></div>` },
      { id: "team", title: "Team access", blurb: "Who can open this console.", html: `
        <ul class="set-list">${(d.team.operators || []).map((e) => `<li><strong>${esc(e)}</strong><small>Operator</small></li>`).join("") || "<li data-team-empty></li>"}</ul>
        <p class="set-muted">Adding someone takes two steps and neither is self-serve yet: add their Google email to the Access policy in Cloudflare Zero Trust, then to <code>OPERATOR_EMAILS</code> in wrangler.toml so the sign-in page recognises them.</p>` },
      { id: "security", title: "Security", blurb: "What protects the console and the automations.", html: `
        <div class="set-row"><div><strong>Cloudflare Access</strong><small>Google identity in front of ${d.security.access_protected_paths.map(esc).join(", ")}.</small></div><span class="int-pill int-pill-ok">Active</span></div>
        <div class="set-row"><div><strong>Automation key</strong><small>Used ${d.security.admin_key_uses} time${d.security.admin_key_uses === 1 ? "" : "s"}, last ${esc(when(d.security.admin_key_last_used))}. Rotate it in Cloudflare Pages secrets and the gitignored .env; it is never shown here.</small></div></div>` },
      { id: "defaults", title: "Client defaults", blurb: "Starting values for every new workspace.", html: `
        <form data-action="defaults" class="set-form">
          <div class="set-grid">${field("Timezone", select("timezone", tzOptions, d.defaults.timezone || ""))}${field("Currency", select("currency", d.currencies, d.defaults.currency || "USD"))}</div>
          ${submit("Save defaults")}
        </form>` },
      { id: "notifications", title: "Notifications", blurb: "Everything in the bell. One outside ping only: Discord, when a lead replies.", html: `
        <div class="set-row"><div><strong>In the console</strong><small>Lead replies, seen-no-reply, payments, refunds, new clients, launch steps, sync failures. Bell at the top, badge with the unread count, a toast for replies while you are on the page.</small></div><span class="int-pill int-pill-ok">On</span></div>
        <div class="set-row"><div><strong>Discord, lead replies only</strong><small>Fires the moment a prospect answers a DM. Needs a Discord webhook saved in Integrations; nothing else is ever sent there.</small></div><button type="button" class="ps-control" onclick="window.PulsifyOperatorShell?.go('integrations')">Set up in Integrations</button></div>
        <div class="set-row"><div><strong>Email</strong><small>Off.</small></div><span class="int-pill">Off</span></div>` },
    ];
  }

  window.PulsifySettingsView = { render };
})();
