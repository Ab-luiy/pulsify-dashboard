
    const params = new URLSearchParams(location.search);
    const initialToken = params.get("t") || "";
    if (initialToken) {
      sessionStorage.setItem("pulsify_portal_token", initialToken);
      const clean = new URL(location.href);
      clean.searchParams.delete("t");
      history.replaceState(history.state, "", clean.pathname + clean.search + clean.hash);
    }

    const TOKEN = sessionStorage.getItem("pulsify_portal_token") || "";
    const CLIENT = window.PulsifySession?.client || params.get("client") || "";
    const $ = (id) => document.getElementById(id);
    const STUDIO_TYPES = [
      ["value-driven", "Teach something genuinely useful."],
      ["credibility", "Stack proof and position the result."],
      ["q&a", "Answer the question your ICP already has."],
      ["day-in-the-life", "Document the day while carrying value."],
      ["breakdown", "Walk one topic step by step."],
      ["lifestyle", "Humanity without flex."],
      ["cta", "Run the conversion sequence."],
      ["start-here", "Build the permanent first highlight."],
      ["story launch", "Run the campaign story sequence."],
    ];
    const REEL_ANGLES = [
      ["A win", "Credibility sequence or proof reel"],
      ["A new strategy", "Value-driven sequence or breakdown"],
      ["A recurring belief", "Philosophy carousel or reframe reel"],
      ["An objection you heard", "Q and A sequence or myth-buster reel"],
      ["A behind-the-scenes moment", "Day-in-the-life story or process reel"],
      ["A client transformation", "Proof pin post plus long-form breakdown"],
    ];
    const REFRAME_ROTATOR = [
      ["reel", "A 20-second talking head with the belief stated plainly."],
      ["story", "A value-driven sequence that walks through one profile fix."],
      ["carousel", "A saveable philosophy or taxonomy set."],
      ["long-form", "A deeper YouTube segment with the full mechanism."],
      ["hook", "One bare hook to test the belief without building the full asset yet."],
    ];
    const FORMAT_LABELS = ["Reel", "Story sequence", "Carousel", "Long-form segment"];
    const state = {
      client: CLIENT,
      sections: {},
      revenue: {},
      brainSections: [],
      brainLoadState: "loading",
      integrations: [],
      integrationsLoadState: "loading",
      contentItems: [],
      proofItems: [],
      pulseItems: [],
      performance: {
        rows: [],
        variantGroups: [],
        weekSummary: null,
        weeklyReport: null,
        latestSnapshot: null,
        priorSnapshot: null,
        editingSequenceId: null,
        retestSequenceRef: null,
      },
      studio: {
        selectedType: "",
        rows: [],
        current: null,
      },
      carousels: {
        rows: [],
      },
      reels: {
        thoughts: loadSavedThoughts(),
      },
      impersonated: false,
    };

    document.querySelectorAll(".tab-btn").forEach((button) => {
      button.addEventListener("click", () => openTab(button.dataset.tab));
    });
    document.querySelectorAll("[data-open-tab]").forEach((button) => {
      button.addEventListener("click", () => openTab(button.dataset.openTab));
    });
    document.querySelectorAll("[data-scroll-to]").forEach((button) => {
      button.addEventListener("click", () => $(button.dataset.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
    $("nextMoveButton").addEventListener("click", () => openTab($("nextMoveButton").dataset.nextTab || "performance"));
    $("focusSequenceLogButton").addEventListener("click", () => {
      $("logSequenceCard").scrollIntoView({ behavior: "smooth", block: "start" });
      $("sequenceTopicInput").focus({ preventScroll: true });
    });
    $("themeButton").addEventListener("click", toggleTheme);
    $("logoutButton").addEventListener("click", logout);

    const dark = localStorage.getItem("pulsify_client_dashboard_theme") === "dark";
    document.body.classList.toggle("dark", dark);

    renderTypeGrid();
    renderSequenceTypeSelect();
    $("generateSequenceButton").addEventListener("click", generateSequence);
    $("generateCarouselButton").addEventListener("click", generateCarousel);
    $("saveSequenceLogButton").addEventListener("click", saveSequenceLog);
    $("clearSequenceLogButton").addEventListener("click", clearSequenceForm);
    $("saveSnapshotButton").addEventListener("click", saveSnapshot);
    $("captureButton").addEventListener("click", addThought);
    $("proofUploadButton").addEventListener("click", uploadProof);
    $("saveClientSettingsButton").addEventListener("click", saveClientSettings);
    $("connectionProvider").addEventListener("change", renderConnectionForm);
    $("connectionForm").addEventListener("submit", saveConnection);
    renderConnectionForm();
    $("openIntakeButton").addEventListener("click", () => {
      const next = new URL("/onboard", location.origin);
      next.searchParams.set("client", state.client);
      if (TOKEN) next.searchParams.set("t", TOKEN);
      location.href = next.toString();
    });
    $("downloadContextButton").addEventListener("click", async () => {
      const button = $("downloadContextButton");
      button.disabled = true;
      try {
        const response = await fetch(`/api/client-context?client=${encodeURIComponent(state.client)}`, { headers: authHeaders(), credentials: "same-origin" });
        if (!response.ok) throw new Error("Could not download your context. Please try again.");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = `${state.client}-pulsify-context.md`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) { showMessage(error.message); }
      finally { button.disabled = false; }
    });
    $("studioInsightGenerateButton").addEventListener("click", startInsightSequence);
    $("studioInsightLogButton").addEventListener("click", openInsightLogSurface);
    $("closeRetestDialogButton").addEventListener("click", () => $("retestDialog").close());
    $("launchRetestButton").addEventListener("click", launchRetest);
    $("proofGrid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-proof-save]");
      if (button) saveProofClaim(button);
    });
    $("captureInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addThought();
      }
    });
    setTodayDefaults();
    renderReels();
    renderClientSettings();
    renderRevenueIntegrations();
    renderStudioInsight();
    loadDashboard();

    async function loadDashboard() {
      try {
        const response = await fetch(`/api/client-dashboard?client=${encodeURIComponent(state.client)}`, {
          headers: authHeaders(),
          credentials: "same-origin",
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load the dashboard.");
        renderDashboard(data);
        try { localStorage.setItem('pulsify:analytics:v1:'+data.client,JSON.stringify(data)); } catch {}
        await Promise.all([loadStudioHistory(), loadCarouselHistory(), loadPerformanceData(), loadProofVault(), loadPulseFeed(), loadClientIntegrations()]);
      } catch (error) {
        showMessage(error.message || "Could not load the dashboard.");
      }
    }

    async function loadPulseFeed() {
      try {
        const response = await fetch(`/api/pulse-feed?client=${encodeURIComponent(state.client)}`, {
          headers: authHeaders(),
          credentials: "same-origin",
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load Pulse.");
        state.pulseItems = Array.isArray(data.items) ? data.items : [];
        renderPulseFeed();
      } catch (error) {
        $("pulseStatus").textContent = "Pulse unavailable";
        $("pulseList").innerHTML = `<div class="empty-card"><h3>Pulse is unavailable</h3><p>${esc(error.message || "Recent activity could not be loaded.")}</p></div>`;
      }
    }

    async function loadProofVault() {
      try {
        const response = await fetch(`/api/client-brain?client=${encodeURIComponent(state.client)}`, {
          headers: authHeaders(),
          credentials: "same-origin",
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load the proof vault.");
        state.proofItems = Array.isArray(data.proof_items) ? data.proof_items : [];
        state.brainSections = Array.isArray(data.sections) ? data.sections : [];
        state.brainLoadState = "ready";
        renderProofVault();
        renderClientSettings();
        renderRevenue(state.revenue || {});
        renderHome();
      } catch (error) {
        state.brainLoadState = "error";
        $("proofStatus").textContent = "Proof unavailable";
        $("proofGrid").innerHTML = `<div class="empty-card"><h3>Proof is unavailable</h3><p>${esc(error.message || "Saved proof could not be loaded.")}</p></div>`;
        renderClientSettings(error.message || "Client-owned settings could not be loaded.");
      }
    }

    async function loadClientIntegrations() {
      try {
        const response = await fetch(`/api/client-integrations?client=${encodeURIComponent(state.client)}`, {
          headers: authHeaders(),
          credentials: "same-origin",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load integration states.");
        state.integrations = Array.isArray(data.integrations) ? data.integrations : [];
        state.integrationsLoadState = "ready";
      } catch (error) {
        state.integrations = [];
        state.integrationsLoadState = "error";
      }
      renderRevenueIntegrations();
    }

    async function loadPerformanceData() {
      try {
        const [sequenceResponse, weeklyResponse, variantsResponse] = await Promise.all([
          fetch(`/api/metrics-sequences?client=${encodeURIComponent(state.client)}`, {
            headers: authHeaders(),
            credentials: "same-origin",
          }),
          fetch(`/api/metrics-weekly?client=${encodeURIComponent(state.client)}`, {
            headers: authHeaders(),
            credentials: "same-origin",
          }),
          fetch(`/api/sequence-variants?client=${encodeURIComponent(state.client)}`, {
            headers: authHeaders(),
            credentials: "same-origin",
          }),
        ]);
        if ([sequenceResponse, weeklyResponse, variantsResponse].some((response) => response.status === 401 || response.status === 403)) {
          redirectToLogin();
          return;
        }
        const sequenceData = await sequenceResponse.json().catch(() => ({}));
        const weeklyData = await weeklyResponse.json().catch(() => ({}));
        const variantsData = await variantsResponse.json().catch(() => ({}));
        if (!sequenceResponse.ok || !sequenceData.ok) throw new Error(sequenceData.error || "Could not load sequence metrics.");
        if (!weeklyResponse.ok || !weeklyData.ok) throw new Error(weeklyData.error || "Could not load the weekly report.");
        if (!variantsResponse.ok || !variantsData.ok) throw new Error(variantsData.error || "Could not load retest lineage.");
        state.performance.rows = Array.isArray(sequenceData.rows) ? sequenceData.rows : [];
        state.performance.variantGroups = Array.isArray(variantsData.rows) ? variantsData.rows : [];
        state.performance.weekSummary = sequenceData.week_summary || null;
        state.performance.weeklyReport = weeklyData.report || null;
        state.performance.latestSnapshot = weeklyData.latest || null;
        state.performance.priorSnapshot = weeklyData.prior || null;
        renderPerformance();
      } catch (error) {
        $("performanceStatus").textContent = "Metrics unavailable";
        showMessage(error.message || "Could not load the performance metrics.");
      }
    }

    async function loadStudioHistory() {
      try {
        const response = await fetch("/api/studio-sequences", {
          headers: authHeaders(),
          credentials: "same-origin",
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load sequence history.");
        state.studio.rows = Array.isArray(data.rows) ? data.rows : [];
        state.studio.current = state.studio.current
          ? state.studio.rows.find((row) => row.id === state.studio.current.id) || state.studio.rows[0] || null
          : state.studio.rows[0] || null;
        renderHistory();
        renderCurrentSequence();
        $("studioStatus").textContent = `${state.studio.rows.length} sequence${state.studio.rows.length === 1 ? "" : "s"} saved`;
        renderStudioInsight();
      } catch (error) {
        showMessage(error.message || "Could not load sequence history.");
        $("studioStatus").textContent = "History unavailable";
        renderStudioInsight();
      }
    }

    async function loadCarouselHistory() {
      try {
        const response = await fetch("/api/studio-carousels", {
          headers: authHeaders(),
          credentials: "same-origin",
        });
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load carousel history.");
        state.carousels.rows = Array.isArray(data.rows) ? data.rows : [];
        renderCarouselStudio();
        $("carouselStatus").textContent = `${state.carousels.rows.length} carousel${state.carousels.rows.length === 1 ? "" : "s"} saved`;
        renderStudioPipeline();
      } catch (error) {
        $("carouselStatus").textContent = "Carousel history unavailable";
        showMessage(error.message || "Could not load carousel history.");
      }
    }

    function renderDashboard(data) {
      state.client = data.client;
      state.impersonated = data.impersonated === true;
      state.sections = data.sections || {};
      state.contentItems = Array.isArray(data.content_items) ? data.content_items : [];
      document.body.classList.toggle("impersonating", state.impersonated);
      $("connectionSetup").hidden = state.impersonated;
      $("openIntakeButton").disabled = state.impersonated;
      $("operatorReadOnlyBanner").hidden = !state.impersonated;
      $("clientName").textContent = data.client_name || data.client;
      if (data.client === "demo-rio") $("clientName").textContent = "Founder test workspace";
      $("clientSubtitle").textContent = state.impersonated
        ? "Operator view is read only."
        : data.auth_mode === "token"
        ? "Private token access is active for this session."
        : "Signed in with saved client credentials.";
      if (data.client === "demo-rio") $("clientSubtitle").textContent = "Demo workspace. Sample figures and tasks are for testing.";
      const clean = new URL(location.href);
      clean.searchParams.set("client", state.client);
      history.replaceState(history.state, "", clean.pathname + clean.search + clean.hash);

      renderRevenue(data.revenue || {});
      renderContentSection();
      renderTeam(state.sections.team);
      renderPlans(state.sections.plans);
      renderTodos(state.sections.todos);
      renderHome();
    }

    function renderPulseFeed() {
      $("pulseStatus").textContent = state.pulseItems.length
        ? `${state.pulseItems.length} recent item${state.pulseItems.length === 1 ? "" : "s"}`
        : "Last 30 days";
      if (!state.pulseItems.length) {
        $("pulseList").innerHTML = `<div class="empty-card"><h3>No recent activity yet</h3><p>Payments, funnel activity, sequences, proof, bookings, and shipped content will appear here as they happen.</p></div>`;
        return;
      }
      $("pulseList").innerHTML = state.pulseItems.map((entry) => `
        <div class="pulse-item">
          <span class="pulse-icon" aria-hidden="true">${esc(pulseIcon(entry.kind))}</span>
          <div class="pulse-copy">
            <strong>${esc(entry.title || "Activity")}</strong>
            ${entry.detail ? `<span>${esc(entry.detail)}</span>` : ""}
          </div>
          <time class="pulse-time" datetime="${esc(entry.ts || "")}" title="${esc(date(entry.ts))}">${esc(relativeTime(entry.ts))}</time>
        </div>
      `).join("");
    }

    function renderProofVault() {
      $("proofStatus").textContent = `${state.proofItems.length} item${state.proofItems.length === 1 ? "" : "s"}`;
      if (!state.proofItems.length) {
        $("proofGrid").innerHTML = `<div class="empty-card"><h3>No proof yet</h3><p>Student results carry the selling. Add the first real result above.</p></div>`;
        return;
      }
      $("proofGrid").innerHTML = state.proofItems.map(renderProofCard).join("");
    }

    function renderProofCard(entry) {
      const id = Number(entry.id || 0);
      const permission = String(entry.permission || "unknown").toLowerCase();
      const isVideo = entry.kind === "video-link";
      const mediaUrl = safeMediaUrl(entry.url);
      const asset = isVideo
        ? (safeWebUrl(entry.url)
          ? `<a class="proof-link" href="${esc(safeWebUrl(entry.url))}" target="_blank" rel="noopener noreferrer">Open video testimonial</a>`
          : `<div class="proof-link">Video link unavailable</div>`)
        : (mediaUrl
          ? `<img class="proof-thumb" src="${esc(mediaUrl)}" alt="Student result proof">`
          : `<div class="proof-link">Image unavailable</div>`);
      return `
        <article class="proof-card" data-proof-id="${id}">
          ${asset}
          <div class="proof-body">
            <div class="proof-meta">
              <span class="proof-kind">${esc(isVideo ? "Video testimonial" : "Result image")}</span>
              <span class="permission-badge ${esc(permission)}">Permission: ${esc(permission)}</span>
            </div>
            <div class="proof-edit">
              <input type="text" maxlength="500" value="${esc(entry.claim || "")}" aria-label="Claim caption" placeholder="What does this result show?">
              <button type="button" data-proof-save="${id}">Save</button>
            </div>
          </div>
        </article>
      `;
    }

    async function uploadProof() {
      const file = $("proofFileInput").files?.[0];
      if (!file) {
        setProofUploadStatus("Choose a result image first.", true);
        return;
      }
      const button = $("proofUploadButton");
      button.disabled = true;
      setProofUploadStatus("Uploading image.", false);
      try {
        const form = new FormData();
        form.set("file", file, file.name);
        form.set("claim", $("proofClaimInput").value.trim());
        const response = await fetch("/api/media-upload", {
          method: "POST",
          headers: authHeaders(),
          credentials: "same-origin",
          body: form,
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "The image could not be uploaded.");
        state.proofItems.unshift({ ...data, created_at: new Date().toISOString() });
        $("proofFileInput").value = "";
        $("proofClaimInput").value = "";
        renderProofVault();
        setProofUploadStatus("Proof uploaded.", false);
        await loadPulseFeed();
      } catch (error) {
        setProofUploadStatus(error.message || "The image could not be uploaded.", true);
      } finally {
        button.disabled = false;
      }
    }

    async function saveProofClaim(button) {
      const card = button.closest("[data-proof-id]");
      const id = Number(card?.dataset.proofId || 0);
      const input = card?.querySelector("input");
      if (!id || !input) return;
      button.disabled = true;
      try {
        const response = await fetch("/api/client-brain", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ action: "update-proof", client: state.client, id, claim: input.value.trim() }),
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "The claim caption could not be saved.");
        state.proofItems = state.proofItems.map((entry) => Number(entry.id) === id ? { ...entry, claim: data.proof_item.claim } : entry);
        input.value = data.proof_item.claim;
        showMessage("Claim caption saved.", "success");
        await loadPulseFeed();
      } catch (error) {
        showMessage(error.message || "The claim caption could not be saved.");
      } finally {
        button.disabled = false;
      }
    }

    function setProofUploadStatus(message, isError) {
      $("proofUploadStatus").textContent = message;
      $("proofUploadStatus").className = `proof-upload-status${isError ? " error" : ""}`;
    }

    function renderClientSettings(errorMessage = "") {
      const identity = brainSection("identity");
      const name = brainFieldValue(identity, "name");
      const handles = brainFieldValue(identity, "handles");
      const explainer = brainFieldValue(identity, "business_explainer");
      $("clientIdentityName").value = typeof name === "string" ? name : "";
      $("clientIdentityHandles").value = Array.isArray(handles)
        ? handles.join("\n")
        : (typeof handles === "string" ? handles : "");
      $("clientBusinessExplainer").value = typeof explainer === "string" ? explainer : "";
      $("clientSettingsStatus").textContent = state.brainLoadState === "ready"
        ? "Client-owned fields"
        : (state.brainLoadState === "error" ? "Unavailable" : "Loading");
      $("clientSettingsMessage").textContent = errorMessage
        || (state.brainLoadState === "ready"
          ? "Only client-owned identity fields can be changed here."
          : "Waiting for the client brain.");
      $("saveClientSettingsButton").disabled = state.brainLoadState !== "ready";
    }

    async function saveClientSettings() {
      const button = $("saveClientSettingsButton");
      button.disabled = true;
      $("clientSettingsMessage").textContent = "Saving client-owned identity fields.";
      try {
        const response = await fetch("/api/client-brain", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            client: state.client,
            answers: {
              identity: {
                name: $("clientIdentityName").value.trim(),
                handles: parseListInput($("clientIdentityHandles").value),
                business_explainer: $("clientBusinessExplainer").value.trim(),
              },
            },
          }),
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not save client settings.");
        $("clientSettingsMessage").textContent = "Client identity settings saved.";
        await loadProofVault();
        showMessage("Client identity settings saved.", "success");
      } catch (error) {
        $("clientSettingsMessage").textContent = error.message || "Could not save client settings.";
        showMessage(error.message || "Could not save client settings.");
      } finally {
        button.disabled = state.brainLoadState !== "ready";
      }
    }

    function renderRevenueIntegrations() {
      const target = $("integrationStatusList");
      if (state.integrationsLoadState === "loading") {
        $("integrationCount").textContent = "Checking";
        target.innerHTML = `<div class="revenue-inline-empty">Checking the client's available connections.</div>`;
        return;
      }
      if (state.integrationsLoadState === "error") {
        $("integrationCount").textContent = "Unavailable";
        target.innerHTML = `<div class="revenue-inline-empty">Connection states could not be loaded. Existing portal data remains available.</div>`;
        return;
      }

      const connected = state.integrations.filter((item) => item.connected);
      $("integrationCount").textContent = `${connected.length} of ${state.integrations.length} configured`;
      target.innerHTML = state.integrations.map((item) => {
        const status = item.last_event_ts ? "Receiving events" : item.connected ? "Configured" : "Not configured";
        const timestamp = item.last_event_ts || item.updated_at || "";
        const detail = item.connected
          ? (timestamp ? `Last activity ${relativeTime(timestamp)}` : "Configured for this client")
          : integrationInstruction(item.provider);
        return `
          <div class="integration-status-row${item.connected ? " connected" : ""}">
            <span class="integration-provider-mark" aria-hidden="true">${esc(integrationMark(item.provider))}</span>
            <div><strong>${esc(integrationLabel(item.provider))}</strong><small>${esc(detail)}</small></div>
            <span class="integration-state">${esc(status)}</span>
          </div>
        `;
      }).join("");
    }

    function integrationLabel(provider) {
      return ({ kit: "Kit", calcom: "Cal.com", calendly: "Calendly", whop: "Whop", stripe: "Stripe", youtube: "YouTube", instagram: "Instagram", zapier: "Zapier" })[provider] || capitalize(provider);
    }

    function connectionDefinition(provider) {
      return ({
        kit: [["tag_id", "Kit tag ID", "text", "config"], ["api_key", "Kit v4 API key", "password", "secrets"]],
        calcom: [["booking_url", "Booking URL", "url", "config"], ["api_key", "API key (optional)", "password", "secrets"]],
        calendly: [["booking_url", "Booking URL", "url", "config"]],
        stripe: [["webhook_secret", "Stripe webhook signing secret", "password", "secrets"]],
        whop: [["company_id", "Whop company ID", "text", "config"], ["api_key", "API key (optional)", "password", "secrets"]],
        youtube: [["channel_note", "YouTube channel URL or access note", "text", "config"]],
        instagram: [["channel_note", "Instagram handle or access note", "text", "config"]],
        zapier: [["webhook_url", "Zapier catch-hook URL", "url", "secrets"]],
      })[provider] || [];
    }

    function renderConnectionForm() {
      const provider = $("connectionProvider").value;
      const saved = state.integrations.find(item => item.provider === provider);
      const delegated = ["youtube", "instagram"].includes(provider);
      $("connectionFields").innerHTML = connectionDefinition(provider).map(([key,label,type,group]) => `<label for="connection-${key}">${esc(label)}<input id="connection-${key}" name="${key}" type="${type}" autocomplete="off" value="${group === "config" ? esc(saved?.config?.[key] || "") : ""}" ${group === "secrets" ? 'placeholder="Leave blank to keep the saved value"' : ""}></label>`).join("")
        + (delegated ? `<label><input id="connectionConfirmed" type="checkbox" ${saved?.config?.confirmed ? "checked" : ""}> I have granted Pulsify access to this account.</label><p>Share access through YouTube Studio permissions or Meta Business Suite. This records access; it does not automatically import analytics.</p>` : `<p>Saved credentials stay private. For booking and payment services, add the webhook URL returned after saving in that service. Events appear only after the service delivers them.</p>`);
      $("connectionMessage").textContent = "";
    }

    async function saveConnection(event) {
      event.preventDefault();
      const button = $("saveConnectionButton");
      button.disabled = true;
      const provider = $("connectionProvider").value;
      const payload = { provider, config: {}, secrets: {} };
      for (const [key,,,group] of connectionDefinition(provider)) {
        const value = $("connection-" + key).value.trim();
        if (group === "config" || value) payload[group][key] = value;
      }
      if (["youtube", "instagram"].includes(provider)) payload.confirm = $("connectionConfirmed").checked;
      try {
        const response = await fetch("/api/client-integrations", { method:"POST", credentials:"same-origin", headers:{...authHeaders(),"content-type":"application/json"}, body:JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the connection.");
        await loadClientIntegrations();
        renderConnectionForm();
        $("connectionMessage").textContent = data.one_time?.webhook_url
          ? `Saved. Copy this webhook URL into ${integrationLabel(provider)} now; it is shown only once: ${data.one_time.webhook_url}`
          : "Connection settings saved. Analytics and events appear when the service sends them.";
      } catch(error) { $("connectionMessage").textContent = error.message || "Could not save the connection."; }
      finally { button.disabled = false; }
    }

    function integrationMark(provider) {
      return ({ kit: "K", calcom: "C", calendly: "C", whop: "W", stripe: "S", youtube: "Y", instagram: "I", zapier: "Z" })[provider] || "I";
    }

    function integrationInstruction(provider) {
      return ({
        kit: "Add the API key and tag during setup.",
        calcom: "Add the booking key and event details during setup.",
        calendly: "Add the personal token during setup.",
        whop: "Add the payment webhook details during setup.",
        stripe: "Add the signed payment webhook during setup.",
        youtube: "Confirm delegated YouTube access during onboarding.",
        instagram: "Confirm delegated Instagram access during onboarding.",
        zapier: "Add the destination webhook during setup.",
      })[provider] || "Complete this connection during onboarding.";
    }

    function pulseIcon(kind) {
      return ({ payment: "$", page: "P", watch: "W", studio: "S", sequence: "L", proof: "V", integration: "I", content: "C" })[kind] || "P";
    }

    function safeMediaUrl(value) {
      const url = String(value || "").trim();
      return url.startsWith("/m/") || /^https?:\/\//i.test(url) ? url : "";
    }

    function safeWebUrl(value) {
      const url = String(value || "").trim();
      return /^https?:\/\//i.test(url) ? url : "";
    }

    function renderContentSection() {
      const target = $("contentSection");
      if (!state.contentItems.length) {
        target.innerHTML = emptyText("No content items yet", "This section will show scheduled, in-production, and published work once items are saved in the operator console.");
        return;
      }
      target.innerHTML = `
        <div class="content-list">
          ${state.contentItems.map((item) => `
            <div class="content-item">
              <strong>${esc(item.title || "Untitled item")}</strong>
              <span class="hint-text">${esc(contentStageLabel(item.stage))}</span>
              ${item.notes ? `<p>${esc(item.notes)}</p>` : `<p>No extra note saved.</p>`}
              <div class="content-meta">
                <span>${esc(item.platform || "No platform")}</span>
                <span>${item.scheduled_for ? `Scheduled ${esc(item.scheduled_for)}` : `Updated ${date(item.updated_at)}`}</span>
                ${item.url ? `<span><a href="${esc(item.url)}" target="_blank" rel="noopener">Open link</a></span>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    function renderRevenue(revenue) {
      state.revenue = revenue;
      const total = Number(revenue.total_revenue_cents || 0);
      const currentMonth = Number(revenue.current_month_revenue_cents || 0);
      const payments = (revenue.payments || []).filter(row=>!window.PulsifyRange||PulsifyRange.contains(row.occurred_at));
      const currencyCode = payments[0]?.currency || "USD";
      const revenueGoal = getRevenueGoalCents();
      $("revenueUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
      $("revenueMetrics").innerHTML = [
        metricCard("Total cash collected", currency(total), "all recorded payments"),
        metricCard("This month", currency(currentMonth), "recorded in the current month"),
        metricCard("Payment count", number(payments.length), "verified rows in the payments table"),
        revenueGoal == null
          ? metricCard("Revenue goal", "Not set", "No revenue target is stored in the client brain funnel facts.")
          : metricCard("Revenue goal", formatPercent(total / revenueGoal * 100), `${currency(total, currencyCode)} of ${currency(revenueGoal, currencyCode)}`),
      ].join("");
      $("paymentCount").textContent = `${payments.length} payment${payments.length === 1 ? "" : "s"}`;
      $("paymentsEmpty").hidden = payments.length > 0;
      $("paymentsTableWrap").hidden = payments.length === 0;
      $("paymentRows").innerHTML = payments.map((payment) => `
        <tr>
          <td>${date(payment.occurred_at)}</td>
          <td class="amount">${currency(payment.amount_cents, payment.currency)}</td>
          <td>${esc(payment.rail || "Manual")}</td>
          <td><span class="muted">${esc(payment.reference || "-")}</span></td>
          <td>${esc(payment.note || "-")}</td>
        </tr>
      `).join("");
      renderHome();
    }

    function getRevenueGoalCents() {
      const funnel = brainSection("funnel");
      const fields = Array.isArray(funnel?.fields) ? funnel.fields : [];
      const goalField = fields.find((field) => ["revenue_goal", "revenue_goal_cents", "monthly_revenue_goal", "revenue_target", "cash_goal", "target_revenue", "goal"].includes(field.key));
      if (!goalField || goalField.gap) return null;
      return parseMoneyToCents(goalField.value, goalField.key.endsWith("_cents"));
    }

    function parseMoneyToCents(value, alreadyCents = false) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (Number.isFinite(Number(value.amount_cents)) && Number(value.amount_cents) > 0) return Math.round(Number(value.amount_cents));
        if (Number.isFinite(Number(value.amount)) && Number(value.amount) > 0) return Math.round(Number(value.amount) * 100);
      }
      const normalized = String(value ?? "").replace(/[^0-9.-]/g, "");
      const amount = Number(normalized);
      return Number.isFinite(amount) && amount > 0 ? Math.round(alreadyCents ? amount : amount * 100) : null;
    }

    function renderHome() {
      const revenue = state.revenue || {};
      const payments = Array.isArray(revenue.payments) ? revenue.payments : [];
      const report = state.performance.weeklyReport || {};
      const summary = state.performance.weekSummary || {};
      const rows = state.performance.rows || [];
      const currentWeekStart = summary.current_week_start || startOfCurrentUtcWeek();
      const nextWeekStart = addIsoDays(currentWeekStart, 7);
      const priorWeekStart = summary.prior_week_start || addIsoDays(currentWeekStart, -7);
      const currentRows = rows.filter((row) => row.posted_on >= currentWeekStart && row.posted_on < nextWeekStart);
      const priorRows = rows.filter((row) => row.posted_on >= priorWeekStart && row.posted_on < currentWeekStart);
      const weekPayments = payments.filter((payment) => {
        const occurredOn = String(payment.occurred_at || "").slice(0, 10);
        return occurredOn >= currentWeekStart && occurredOn < nextWeekStart;
      });
      const weekCash = weekPayments.reduce((sum, payment) => sum + Number(payment.amount_cents || 0), 0);
      const totalCash = Number(revenue.total_revenue_cents || 0);
      const currencyCode = payments[0]?.currency || "USD";
      const currentDms = sumLoggedMetric(currentRows, "dms");
      const priorDms = sumLoggedMetric(priorRows, "dms");

      $("weekStrip").innerHTML = `
        <article class="week-hero${payments.length ? "" : " empty"}">
          <span>Cash collected, this week</span>
          <strong class="mono">${payments.length ? esc(currency(weekCash, currencyCode)) : "No payments yet"}</strong>
          <small>${payments.length
            ? esc(`${weekPayments.length} payment${weekPayments.length === 1 ? "" : "s"} this week, ${currency(totalCash, currencyCode)} all time`)
            : "Connect a payment rail to see revenue here."}</small>
        </article>
        ${renderWeekMetric(
          "Followers",
          report.followers?.value == null ? null : number(report.followers.value),
          report.followers?.delta == null
            ? (report.followers?.hint || "Log two weekly follower snapshots.")
            : `${signedNumber(report.followers.delta)} this week`,
        )}
        ${renderWeekMetric(
          "Dollars per follower",
          report.dollars_per_follower?.value == null ? null : formatCurrencyNumber(report.dollars_per_follower.value),
          report.dollars_per_follower?.hint || "All-time cash divided by the latest follower count.",
        )}
        ${renderWeekMetric(
          "DMs from stories",
          currentDms == null ? null : number(currentDms),
          currentDms == null
            ? "Log DMs on a sequence to track story intent."
            : (priorDms == null ? "Need a prior week for the delta." : `${signedNumber(currentDms - priorDms)} from last week`),
        )}
      `;

      renderHomeLists(currentWeekStart, nextWeekStart);
      renderNextMove();
    }

    function renderWeekMetric(label, value, detail) {
      return `
        <article class="week-mini${value == null ? " empty" : ""}">
          <span>${esc(label)}</span>
          <strong class="mono">${value == null ? "Not logged" : esc(value)}</strong>
          <small>${esc(detail)}</small>
        </article>
      `;
    }

    function renderHomeLists(currentWeekStart, nextWeekStart) {
      const shipped = state.contentItems.filter((item) => {
        const itemDate = String(item.scheduled_for || item.updated_at || "").slice(0, 10);
        return String(item.stage || "").toLowerCase() === "published" && itemDate >= currentWeekStart && itemDate < nextWeekStart;
      });
      const todos = Array.isArray(state.sections.todos)
        ? state.sections.todos
        : (Array.isArray(state.sections.todos?.items) ? state.sections.todos.items : []);
      const openTodos = todos.filter((item) => !coerceItem(item).done).map(coerceItem);
      const hasDeadlines = openTodos.some((item) => item.deadline);
      const owed = hasDeadlines
        ? openTodos.filter((item) => String(item.deadline || "").slice(0, 10) < nextWeekStart)
        : openTodos;

      $("shippedCount").textContent = `${shipped.length} shipped`;
      $("shippedThisWeek").innerHTML = shipped.length
        ? shipped.map((item) => `
          <div class="home-list-item done">
            <span class="home-list-mark" aria-hidden="true">S</span>
            <div><strong>${esc(item.title || "Untitled item")}</strong><small>${esc(item.platform || "Platform not logged")} | ${esc(String(item.scheduled_for || item.updated_at || "").slice(0, 10))}</small></div>
          </div>
        `).join("")
        : `<div class="home-list-empty">Published content appears here when it ships this week.</div>`;

      $("owedCount").textContent = `${owed.length} open`;
      $("owedThisWeek").innerHTML = owed.length
        ? owed.map((item) => `
          <div class="home-list-item">
            <span class="home-list-mark" aria-hidden="true">O</span>
            <div><strong>${esc(item.label || item.title || item.task || "Open task")}</strong><small>${esc([item.owner, item.deadline].filter(Boolean).join(" | ") || "Owner and deadline not logged")}</small></div>
          </div>
        `).join("")
        : `<div class="home-list-empty">No client to-dos are owed this week.</div>`;
    }

    /*
      Shared sequence read rules, in order:
      1. With no sequence data, finish the proof base or log the first sequence.
      2. If a real diagnostic identifies a hook or body leak, retest the row with the highest drop-off.
      3. Otherwise, repeat the type with the highest average completion.
    */
    function getSequenceRead() {
      const rows = state.performance.rows || [];
      const activeRetest = state.performance.variantGroups.find((group) => group.active) || null;
      const resolvedRetest = state.performance.variantGroups.find((group) => group.resolved) || null;
      let title;
      let text;
      let tab;
      let label;
      let leak = null;
      let best = null;

      if (!rows.length) {
        if (!state.proofItems.length) {
          title = "Build the proof base";
          text = "Add the first real student result to the Proof vault, then log the first sequence so the system can diagnose it.";
          tab = "proof";
          label = "Open Proof vault";
        } else {
          title = "Log the first sequence";
          text = "Add per-slide views and DMs from the first posted sequence. That creates the retention curve and next retest.";
          tab = "performance";
          label = "Open Performance";
        }
      } else {
        leak = rows
          .filter((row) => row.diagnostic === "hook failed" || row.diagnostic === "body failed before the ask")
          .sort((a, b) => Number(b.dropoff_pct || 0) - Number(a.dropoff_pct || 0))[0];
        if (leak) {
          title = `Retest ${leak.type || "the sequence"}`;
          text = `${leak.topic || "The latest sequence"} loses the most attention at slide ${leak.biggest_drop_slide || "unknown"}. Keep the remaining slides stable and retest that transition.`;
          tab = "performance";
          label = "Open the sequence";
        } else {
          best = sequenceTypeLeaderboard(rows).find((item) => item.count > 0) || null;
          title = best ? `Make more ${best.type}` : "Log a complete sequence";
          text = best
            ? `${capitalize(best.type)} leads the logged types at ${formatPercent(best.completion)} average completion. Reuse the frame with a new topic.`
            : "The sequence rows need first-slide and last-slide views before the system can rank the winning type.";
          tab = best ? "studio" : "performance";
          label = best ? "Open Studio" : "Open Performance";
        }
      }

      if (!best) best = sequenceTypeLeaderboard(rows).find((item) => item.count > 0) || null;
      return { rows, title, text, tab, label, leak, best, activeRetest, resolvedRetest };
    }

    function renderNextMove() {
      const read = getSequenceRead();
      const button = $("nextMoveButton");
      const heading = $("nextMove").querySelector("h3");
      const copy = $("nextMove").querySelector("p");

      heading.textContent = read.title;
      copy.textContent = read.text;
      button.dataset.nextTab = read.tab;
      button.textContent = read.label;
    }

    function renderStudioInsight() {
      const read = getSequenceRead();
      const summary = state.performance.weekSummary || {};
      const currentWeekStart = summary.current_week_start || startOfCurrentUtcWeek();
      const nextWeekStart = addIsoDays(currentWeekStart, 7);
      const currentRows = read.rows.filter((row) => row.posted_on >= currentWeekStart && row.posted_on < nextWeekStart);
      const currentDms = sumLoggedMetric(currentRows, "dms");
      const measured = currentRows.filter((row) => row.completion_pct != null && Number.isFinite(Number(row.completion_pct)));
      const average = measured.length
        ? measured.reduce((sum, row) => sum + Number(row.completion_pct), 0) / measured.length
        : null;
      const lines = [];

      if (!read.rows.length) {
        lines.push({ tone: "neutral", mark: "1", text: "Log the first posted sequence with per-slide views. The first measured row creates the weekly read." });
        lines.push({ tone: "neutral", mark: "2", text: state.proofItems.length ? "The proof base is ready for a credibility sequence." : "Add the first student result before building a proof-led sequence." });
      } else {
        if (read.best) {
          lines.push({ tone: "success", mark: "W", text: `${capitalize(read.best.type)} leads the measured types at ${formatPercent(read.best.completion)} average completion.` });
        }
        if (read.leak) {
          lines.push({ tone: "danger", mark: "L", text: `${read.leak.topic || capitalize(read.leak.type)} loses the most attention at slide ${read.leak.biggest_drop_slide || "unknown"}. Retest that transition and keep the remaining slides stable.` });
        } else {
          lines.push({ tone: "neutral", mark: "N", text: read.text });
        }
      }
      if (read.activeRetest) {
        const topic = read.activeRetest.sequence?.topic || `sequence ${read.activeRetest.sequence_ref}`;
        const testing = read.activeRetest.variants.find((variant) => variant.status === "testing" && variant.completion_pct == null);
        lines.push({ tone: "neutral", mark: "T", text: `A hook retest is running on ${topic}${testing?.label ? ` as ${testing.label}` : ""}. Log its completion after the next posting.` });
      } else if (read.resolvedRetest?.winner) {
        const topic = read.resolvedRetest.sequence?.topic || `sequence ${read.resolvedRetest.sequence_ref}`;
        lines.push({ tone: "success", mark: "R", text: `${read.resolvedRetest.winner.label} won the hook retest on ${topic} at ${formatPercent(read.resolvedRetest.winner.completion_pct)} completion.` });
      }

      $("studioInsightLines").innerHTML = lines.map((line) => `
        <div class="studio-insight-line"><span class="insight-mark ${line.tone}">${esc(line.mark)}</span><p>${esc(line.text)}</p></div>
      `).join("");
      $("studioInsightStats").innerHTML = [
        studioStat("Sequences", number(currentRows.length), "this week"),
        studioStat("DMs generated", currentDms == null ? "Not logged" : number(currentDms), "this week"),
        studioStat("Avg completion", average == null ? "Not logged" : formatPercent(average), "measured this week"),
        studioStat("Best type", read.best ? capitalize(read.best.type) : "Not ranked", read.best ? `${read.best.count} measured` : "needs completion data"),
      ].join("");

      $("studioInsightGenerateButton").textContent = read.best ? `Generate ${read.best.type}` : "Start a sequence";
      $("studioInsightLogButton").textContent = read.activeRetest
        ? "Open active retest"
        : (read.resolvedRetest ? "Open winning retest" : (read.leak ? "Open leaking log" : "Open sequence log"));
      renderStudioPipeline();
    }

    function studioStat(label, value, detail) {
      return `<div class="studio-stat"><span>${esc(label)}</span><strong class="mono">${esc(value)}</strong><small>${esc(detail)}</small></div>`;
    }

    function renderStudioPipeline() {
      const stages = [
        ["draft", "Draft"],
        ["review", "In review"],
        ["approved", "Approved"],
      ];
      $("studioPipeline").innerHTML = stages.map(([status, label]) => {
        const count = [...state.studio.rows, ...state.carousels.rows].filter((row) => row.status === status).length;
        return `<div class="studio-pipeline-stage ${status}"><span>${esc(label)}</span><strong class="mono">${number(count)}</strong><small>saved Studio asset${count === 1 ? "" : "s"}</small></div>`;
      }).join("");
    }

    function startInsightSequence() {
      const read = getSequenceRead();
      if (read.best) {
        state.studio.selectedType = read.best.type;
        renderTypeGrid();
      }
      openTab("studio");
      $("studioBuilderCard").scrollIntoView({ behavior: "smooth", block: "start" });
      $("topicInput").focus({ preventScroll: true });
    }

    function openInsightLogSurface() {
      const read = getSequenceRead();
      const retest = read.activeRetest || read.resolvedRetest;
      if (retest?.sequence_ref) {
        openTab("performance");
        $(`sequenceRow${Number(retest.sequence_ref)}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (read.leak?.id) {
        loadSequenceIntoForm(Number(read.leak.id));
        return;
      }
      openTab("performance");
      $("logSequenceCard").scrollIntoView({ behavior: "smooth", block: "start" });
      $("sequenceTopicInput").focus({ preventScroll: true });
    }

    function sumLoggedMetric(rows, key) {
      const logged = rows.filter((row) => row[key] != null);
      return logged.length ? logged.reduce((sum, row) => sum + Number(row[key] || 0), 0) : null;
    }

    function signedNumber(value) {
      const numeric = Number(value || 0);
      return `${numeric > 0 ? "+" : ""}${number(numeric)}`;
    }

    function formatCurrencyNumber(value) {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value || 0));
    }

    function renderTypeGrid() {
      $("typeGrid").innerHTML = STUDIO_TYPES.map(([type, note]) => `
        <button class="type-card${state.studio.selectedType === type ? " active" : ""}" type="button" data-sequence-type="${type}">
          <strong>${esc(type)}</strong>
          <span>${esc(note)}</span>
        </button>
      `).join("");
      document.querySelectorAll("[data-sequence-type]").forEach((button) => {
        button.addEventListener("click", () => {
          state.studio.selectedType = button.dataset.sequenceType === state.studio.selectedType ? "" : button.dataset.sequenceType;
          renderTypeGrid();
        });
      });
    }

    function renderSequenceTypeSelect() {
      $("sequenceTypeSelect").innerHTML = STUDIO_TYPES.map(([type]) => `
        <option value="${esc(type)}">${esc(type)}</option>
      `).join("");
    }

    async function generateSequence() {
      const payload = {
        type: state.studio.selectedType || "",
        intent: $("intentInput").value.trim(),
        topic: $("topicInput").value.trim(),
        goal: $("goalSelect").value,
        trigger_word: $("triggerWordInput").value.trim(),
        proof_lines: $("proofLinesInput").value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        slide_count: Number($("slideCountInput").value || 8),
      };
      if (!payload.type && !payload.intent) {
        showMessage("Pick a type or write the intent.");
        openTab("studio");
        return;
      }
      if (!payload.topic) {
        showMessage("Topic is required.");
        openTab("studio");
        return;
      }
      const button = $("generateSequenceButton");
      button.disabled = true;
      showMessage("Generating sequence...");
      try {
        const response = await fetch("/api/studio-generate", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not generate the sequence.");
        await loadStudioHistory();
        state.studio.current = state.studio.rows.find((row) => row.id === data.id) || state.studio.current;
        renderHistory();
        renderCurrentSequence();
        showMessage(data.mode === "manual"
          ? "Manual prompt and slide design directions were saved."
          : (data.warning ? data.warning : "Sequence draft generated."), data.warning ? "warning" : "success");
        openTab("studio");
      } catch (error) {
        showMessage(error.message || "Could not generate the sequence.");
      } finally {
        button.disabled = false;
      }
    }

    async function generateCarousel() {
      const topic = $("carouselTopicInput").value.trim();
      if (!topic) {
        showMessage("Carousel topic is required.");
        $("carouselTopicInput").focus({ preventScroll: true });
        return;
      }
      const button = $("generateCarouselButton");
      button.disabled = true;
      showMessage("Generating carousel...");
      try {
        const response = await fetch("/api/studio-carousels", {
          method: "POST",
          headers: { ...authHeaders(), "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            action: "generate",
            manual_mode: true,
            structure: $("carouselStructureSelect").value,
            topic,
            goal: $("carouselGoalSelect").value,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 403 && state.impersonated) throw new Error("Operator view is read only.");
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not generate the carousel.");
        await loadCarouselHistory();
        $("carouselTopicInput").value = "";
        showMessage(data.mode === "manual"
          ? "Manual carousel prompt and numbered design directions were saved."
          : (data.warning || "Carousel draft generated."), data.warning ? "warning" : "success");
      } catch (error) {
        showMessage(error.message || "Could not generate the carousel.");
      } finally {
        button.disabled = false;
      }
    }

    function renderPerformance() {
      const rows = (state.performance.rows||[]).filter(row=>!window.PulsifyRange||PulsifyRange.contains(row.posted_on));
      const summary = state.performance.weekSummary || {};
      const report = state.performance.weeklyReport || {};
      const latest = state.performance.latestSnapshot;
      const prior = state.performance.priorSnapshot;

      $("performanceStatus").textContent = rows.length
        ? `${rows.length} sequence${rows.length === 1 ? "" : "s"} logged`
        : "No sequences logged yet";

      renderPerformanceKpis(rows, summary);
      renderRetentionCurve(rows);
      renderTypeLeaderboard(rows);

      $("performanceMetricGrid").innerHTML = [
        metricCard("This week", `${number(summary.sequences_this_week || 0)}`, `${number(summary.cadence_floor || 3)} minimum, ${number(summary.cadence_target_min || 5)}-${number(summary.cadence_target_max || 7)} target`),
        metricCard("Last week", `${number(summary.sequences_last_week || 0)}`, summary.cadence_status || "week status"),
      ].join("");

      $("performanceWeeklyList").innerHTML = [
        renderWeeklyMetric("Followers", report.followers),
        renderWeeklyMetric("ICP leads", report.icp_leads),
        renderWeeklyMetric("Follower to view", report.follower_to_view_ratio, "", true),
        renderWeeklyMetric("Dollars per follower", report.dollars_per_follower),
      ].join("");

      $("performanceMixList").innerHTML = `
        <div class="mix-chip">
          <strong>Cadence status</strong>
          <span>${esc(`${number(summary.sequences_this_week || 0)} of ${number(summary.cadence_floor || 3)} minimum this week`)}</span>
        </div>
        <div class="mix-chip">
          <strong>This week type mix</strong>
          <span>${esc(formatTypeMix(summary.type_mix_current_week))}</span>
        </div>
        <div class="mix-chip">
          <strong>Last week type mix</strong>
          <span>${esc(formatTypeMix(summary.type_mix_prior_week))}</span>
        </div>
      `;

      $("snapshotList").innerHTML = [latest, prior].filter(Boolean).map((snapshot, index) => `
        <div class="snapshot-item">
          <strong>${index === 0 ? "Latest snapshot" : "Prior snapshot"}</strong>
          <span>${esc(snapshot.taken_on || "")}</span>
          <div class="snapshot-meta">
            <span>${number(snapshot.followers)} followers</span>
            <span>${snapshot.icp_leads == null ? "ICP leads not logged" : `${number(snapshot.icp_leads)} ICP leads`}</span>
            <span>${snapshot.avg_views == null ? "Average views not logged" : `${number(snapshot.avg_views)} avg views`}</span>
          </div>
          ${snapshot.notes ? `<p>${esc(snapshot.notes)}</p>` : ""}
        </div>
      `).join("") || `<div class="empty-inline">No snapshots saved yet.</div>`;

      $("sequenceList").innerHTML = rows.map((row) => renderSequenceRow(row)).join("");
      $("sequenceListEmpty").hidden = rows.length > 0;
      document.querySelectorAll("[data-edit-sequence]").forEach((button) => {
        button.addEventListener("click", () => loadSequenceIntoForm(Number(button.dataset.editSequence)));
      });
      document.querySelectorAll("[data-retest-sequence]").forEach((button) => {
        button.addEventListener("click", () => openRetestDialog(Number(button.dataset.retestSequence)));
      });
      document.querySelectorAll("[data-log-variant]").forEach((button) => {
        button.addEventListener("click", () => logVariantOutcome(Number(button.dataset.logVariant)));
      });
      document.querySelectorAll("[data-resolve-retest]").forEach((button) => {
        button.addEventListener("click", () => resolveHookRetest(Number(button.dataset.resolveRetest)));
      });
      renderHome();
      renderStudioInsight();
    }

    function renderPerformanceKpis(rows, summary) {
      const completions = rows
        .filter((row) => row.completion_pct != null)
        .map((row) => Number(row.completion_pct))
        .filter(Number.isFinite);
      const avgCompletion = completions.length
        ? completions.reduce((sum, value) => sum + value, 0) / completions.length
        : null;
      const currentWeekStart = summary.current_week_start || startOfCurrentUtcWeek();
      const nextWeekStart = addIsoDays(currentWeekStart, 7);
      const currentRows = rows.filter((row) => row.posted_on >= currentWeekStart && row.posted_on < nextWeekStart);
      const currentDms = sumLoggedMetric(currentRows, "dms");
      const best = sequenceTypeLeaderboard(rows).find((item) => item.count > 0);

      $("performanceKpis").innerHTML = [
        metricCard(
          "Average completion",
          avgCompletion == null ? "Not logged yet" : formatPercent(avgCompletion),
          avgCompletion == null ? "Log first-slide and last-slide views." : `${completions.length} measured sequence${completions.length === 1 ? "" : "s"}`,
        ),
        metricCard(
          "Cadence",
          `${number(summary.sequences_this_week || 0)} / ${number(summary.cadence_target_max || 7)}`,
          `${number(summary.cadence_floor || 3)} minimum, ${number(summary.cadence_target_min || 5)} to ${number(summary.cadence_target_max || 7)} target`,
        ),
        metricCard(
          "DMs from stories",
          currentDms == null ? "Not logged yet" : number(currentDms),
          currentDms == null ? "Add DMs when logging a sequence." : "Logged on this week's sequences",
        ),
        metricCard(
          "Best type",
          best ? capitalize(best.type) : "Not ranked yet",
          best ? `${formatPercent(best.completion)} average completion` : "A type needs a measured completion rate.",
        ),
      ].join("");
    }

    function renderRetentionCurve(rows) {
      const row = rows.find((item) => Array.isArray(item.slide_views) && item.slide_views.length > 1 && Number(item.slide_views[0]) > 0);
      const target = $("retentionCurve");
      const badge = $("retentionBadge");
      const note = $("retentionNote");
      if (!row) {
        target.innerHTML = `<div class="retention-empty"><strong>No retention curve yet</strong><span>Log per-slide views on a sequence to see the first cliff.</span></div>`;
        badge.textContent = "No sequence data";
        badge.className = "home-count";
        note.textContent = "The curve stays empty until a real sequence has at least two logged slide-view values.";
        return;
      }

      const views = row.slide_views.map((value) => Number(value || 0));
      const first = views[0];
      const retention = views.map((value) => Math.max(0, Math.min(100, (value / first) * 100)));
      const width = 640;
      const height = 180;
      const padX = 18;
      const padTop = 14;
      const padBottom = 28;
      const chartHeight = height - padTop - padBottom;
      const x = (index) => padX + index * ((width - padX * 2) / Math.max(1, retention.length - 1));
      const y = (value) => padTop + ((100 - value) / 100) * chartHeight;
      const line = retention.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
      const area = `${line} L${x(retention.length - 1).toFixed(1)} ${height - padBottom} L${padX} ${height - padBottom} Z`;
      const cliffIndex = row.biggest_drop_slide ? Number(row.biggest_drop_slide) - 1 : -1;
      const points = retention.map((value, index) => `
        <circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="${index === cliffIndex ? 5 : 3.5}" class="${index === cliffIndex ? "cliff" : ""}"></circle>
        <text x="${x(index).toFixed(1)}" y="${height - 7}" text-anchor="middle">S${index + 1}</text>
      `).join("");
      target.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Retention curve for ${esc(row.topic || row.type || "logged sequence")}">
          <defs><linearGradient id="portalRetentionGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ui-accent)" stop-opacity=".24"></stop><stop offset="1" stop-color="var(--ui-accent)" stop-opacity="0"></stop></linearGradient></defs>
          <path class="retention-area" d="${area}"></path>
          <path class="retention-line" d="${line}"></path>
          ${points}
        </svg>
      `;

      badge.textContent = row.topic || capitalize(row.type || "sequence");
      badge.className = `home-count${row.diagnostic === "healthy" ? " success" : " danger"}`;
      if (cliffIndex > 0) {
        const priorValue = views[cliffIndex - 1];
        const dropFromPrior = priorValue > 0 ? ((priorValue - views[cliffIndex]) / priorValue) * 100 : 0;
        const direction = cliffIndex === 1
          ? "Retest the hook and keep the body stable."
          : (cliffIndex >= 5 && cliffIndex <= 7 ? "Retest the body before the ask." : "Review the transition into this slide.");
        note.innerHTML = `<span class="curve-cliff-badge">Slide ${cliffIndex + 1}</span><span>${formatPercent(dropFromPrior)} of viewers leave from the prior slide. ${esc(direction)}</span>`;
      } else {
        note.textContent = "No clear consecutive slide cliff is available yet.";
      }
    }

    function renderTypeLeaderboard(rows) {
      $("typeLeaderboard").innerHTML = sequenceTypeLeaderboard(rows).map((item) => `
        <div class="leaderboard-row${item.count ? "" : " empty"}">
          <span>${esc(item.type)}</span>
          <div class="leaderboard-track"><i style="width:${item.count ? Math.max(2, Math.min(100, item.completion)) : 0}%"></i></div>
          <strong class="mono">${item.count ? formatPercent(item.completion) : "n/a"}</strong>
        </div>
      `).join("");
    }

    function sequenceTypeLeaderboard(rows) {
      const byType = new Map(STUDIO_TYPES.map(([type]) => [type, []]));
      rows.forEach((row) => {
        if (row.completion_pct == null) return;
        const completion = Number(row.completion_pct);
        if (Number.isFinite(completion)) {
          if (!byType.has(row.type)) byType.set(row.type, []);
          byType.get(row.type).push(completion);
        }
      });
      return Array.from(byType, ([type, values]) => ({
        type,
        count: values.length,
        completion: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
      })).sort((a, b) => (b.count > 0) - (a.count > 0) || b.completion - a.completion || a.type.localeCompare(b.type));
    }

    async function saveSequenceLog() {
      try {
        const payload = {
          id: state.performance.editingSequenceId || undefined,
          posted_on: $("sequenceDateInput").value,
          type: $("sequenceTypeSelect").value,
          topic: $("sequenceTopicInput").value.trim(),
          slide_count: Number($("sequenceSlideCountInput").value || 0),
          slide_views: parseViewsInput($("sequenceViewsInput").value),
          dms: $("sequenceDmsInput").value.trim(),
          profile_visits: $("sequenceProfileVisitsInput").value.trim(),
          notes: $("sequenceNotesInput").value.trim(),
        };
        const response = await fetch("/api/metrics-sequences", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the sequence log.");
        clearSequenceForm();
        await loadPerformanceData();
        showMessage(data.updated ? "Sequence log updated." : "Sequence logged.", "success");
      } catch (error) {
        showMessage(error.message || "Could not save the sequence log.");
      }
    }

    async function saveSnapshot() {
      try {
        const payload = {
          taken_on: $("snapshotDateInput").value,
          followers: $("snapshotFollowersInput").value.trim(),
          icp_leads: $("snapshotIcpLeadsInput").value.trim(),
          avg_views: $("snapshotAvgViewsInput").value.trim(),
          notes: $("snapshotNotesInput").value.trim(),
        };
        const response = await fetch("/api/metrics-weekly", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the snapshot.");
        clearSnapshotForm();
        await loadPerformanceData();
        showMessage("Snapshot saved.", "success");
      } catch (error) {
        showMessage(error.message || "Could not save the snapshot.");
      }
    }

    function loadSequenceIntoForm(id) {
      const row = state.performance.rows.find((item) => item.id === id);
      if (!row) return;
      state.performance.editingSequenceId = id;
      $("sequenceDateInput").value = row.posted_on || "";
      $("sequenceTypeSelect").value = row.type || STUDIO_TYPES[0][0];
      $("sequenceTopicInput").value = row.topic || "";
      $("sequenceSlideCountInput").value = row.slide_count || row.slide_views.length || 1;
      $("sequenceViewsInput").value = Array.isArray(row.slide_views) ? row.slide_views.join(", ") : "";
      $("sequenceDmsInput").value = row.dms == null ? "" : row.dms;
      $("sequenceProfileVisitsInput").value = row.profile_visits == null ? "" : row.profile_visits;
      $("sequenceNotesInput").value = row.notes || "";
      renderPerformance();
      openTab("performance");
      showMessage("Editing sequence log entry.");
    }

    function clearSequenceForm() {
      state.performance.editingSequenceId = null;
      $("sequenceDateInput").value = todayIso();
      $("sequenceTypeSelect").value = STUDIO_TYPES[0][0];
      $("sequenceTopicInput").value = "";
      $("sequenceSlideCountInput").value = 8;
      $("sequenceViewsInput").value = "";
      $("sequenceDmsInput").value = "";
      $("sequenceProfileVisitsInput").value = "";
      $("sequenceNotesInput").value = "";
      renderPerformance();
    }

    function clearSnapshotForm() {
      $("snapshotDateInput").value = todayIso();
      $("snapshotFollowersInput").value = "";
      $("snapshotIcpLeadsInput").value = "";
      $("snapshotAvgViewsInput").value = "";
      $("snapshotNotesInput").value = "";
    }

    function setTodayDefaults() {
      $("sequenceDateInput").value = todayIso();
      $("snapshotDateInput").value = todayIso();
      $("sequenceTypeSelect").value = STUDIO_TYPES[0][0];
    }

    function renderHistory() {
      $("historyList").innerHTML = state.studio.rows.map((row) => `
        <div class="history-item${state.studio.current?.id === row.id ? " active" : ""}">
          <div class="history-top">
            <div>
              <strong>${esc(row.topic || row.type || "Sequence")}</strong>
              <p>${esc(row.type || row.intent || "sequence")} · ${esc(row.goal || "reach")}</p>
            </div>
            <span class="status-pill ${esc(row.status || "draft")}">${esc(labelStatus(row.status))}</span>
          </div>
          <p>Updated ${relativeTime(row.updated_at)}</p>
          <div class="button-row" style="margin-top:12px">
            <button class="outline" type="button" data-open-sequence="${row.id}">Open</button>
            ${row.status === "draft" || row.status === "rejected"
              ? `<button class="secondary" type="button" data-submit-review="${row.id}">Send for review</button>`
              : ""}
            ${row.status === "draft"
              ? `<button class="outline" type="button" data-delete-sequence="${row.id}">Delete draft</button>`
              : ""}
          </div>
        </div>
      `).join("");
      $("historyEmpty").hidden = state.studio.rows.length > 0;
      document.querySelectorAll("[data-open-sequence]").forEach((button) => {
        button.addEventListener("click", () => {
          state.studio.current = state.studio.rows.find((row) => row.id === Number(button.dataset.openSequence)) || null;
          renderHistory();
          renderCurrentSequence();
        });
      });
      document.querySelectorAll("[data-submit-review]").forEach((button) => {
        button.addEventListener("click", () => submitForReview(Number(button.dataset.submitReview)));
      });
      document.querySelectorAll("[data-delete-sequence]").forEach((button) => {
        button.addEventListener("click", () => deleteDraft(Number(button.dataset.deleteSequence)));
      });
    }

    function renderCarouselStudio() {
      const rows = state.carousels.rows;
      $("carouselHistoryList").innerHTML = rows.map((row, index) => {
        const slides = Array.isArray(row.output?.slides) ? row.output.slides : [];
        const label = carouselLabel(row);
        return `
          <details class="carousel-history-item" ${index === 0 ? "open" : ""}>
            <summary>
              <div>
                <strong>${esc(label)} | ${esc(row.topic || row.structure || "Carousel")}</strong>
                <p>${esc(row.structure || "methodology")} | ${esc(row.goal || "reach")} | updated ${relativeTime(row.updated_at)}</p>
              </div>
              <span class="status-pill ${esc(row.status || "draft")}">${esc(labelStatus(row.status))}</span>
            </summary>
            <div class="carousel-history-body">
              ${row.review_note ? `<div class="review-note"><strong>Review note</strong><p>${esc(row.review_note)}</p></div>` : ""}
              <div class="button-row" style="padding-top:16px">
                <button class="outline" type="button" data-copy-carousel="${row.id}">Copy all slides</button>
                ${row.manual_prompt ? `<button class="outline" type="button" data-copy-carousel-prompt="${row.id}">Copy manual prompt</button>` : ""}
                ${row.status === "draft" || row.status === "rejected"
                  ? `<button class="secondary" type="button" data-submit-carousel="${row.id}">Send for review</button>`
                  : ""}
              </div>
              ${row.manual_prompt && row.output?.manual_mode ? `
                <div class="manual-card">
                  <h3>Manual prompt</h3>
                  <p>This is the exact prompt saved with the draft. Copy it into the manual writing path, then keep the numbered design rows attached.</p>
                  <textarea readonly>${esc(row.manual_prompt)}</textarea>
                </div>
              ` : ""}
              <div class="carousel-slide-list">
                ${slides.map((slide) => `
                  <div class="slide-card">
                    <div class="slide-head">
                      <div>
                        <div class="slide-number">Slide ${Number(slide.n || 0)}</div>
                        <strong>${esc(slide.role || "")}</strong>
                      </div>
                      <span class="status-pill draft">${esc(normalizeSlideDesign(slide)?.ghostNumber || String(slide.n || 0).padStart(2, "0"))}</span>
                    </div>
                    <div class="carousel-slide-copy">
                      ${slide.headline ? `<strong>${esc(slide.headline)}</strong>` : `<span class="pill">Copy pending in manual prompt</span>`}
                      ${slide.body ? `<p>${esc(slide.body)}</p>` : ""}
                      ${slide.cta ? `<p class="carousel-cta">${esc(slide.cta)}</p>` : ""}
                    </div>
                    ${renderDesignDirection(slide)}
                  </div>
                `).join("") || `<div class="empty-inline">No structured slides are saved on this carousel.</div>`}
              </div>
            </div>
          </details>
        `;
      }).join("");
      $("carouselHistoryEmpty").hidden = rows.length > 0;
      document.querySelectorAll("[data-copy-carousel]").forEach((button) => {
        button.addEventListener("click", async () => {
          const row = rows.find((item) => item.id === Number(button.dataset.copyCarousel));
          const copied = await copyText(formatCarouselForCopy(row));
          showMessage(copied ? "Carousel slides copied." : "Copy failed. Select the text manually.", copied ? "success" : undefined);
        });
      });
      document.querySelectorAll("[data-copy-carousel-prompt]").forEach((button) => {
        button.addEventListener("click", async () => {
          const row = rows.find((item) => item.id === Number(button.dataset.copyCarouselPrompt));
          const copied = await copyText(row?.manual_prompt || "");
          showMessage(copied ? "Manual carousel prompt copied." : "Copy failed. Select the prompt manually.", copied ? "success" : undefined);
        });
      });
      document.querySelectorAll("[data-submit-carousel]").forEach((button) => {
        button.addEventListener("click", () => submitCarouselForReview(Number(button.dataset.submitCarousel)));
      });
    }

    function carouselLabel(row) {
      const ordered = [...state.carousels.rows].sort((a, b) => a.id - b.id);
      const index = ordered.findIndex((item) => item.id === row.id);
      return `Carousel ${String(Math.max(1, index + 1)).padStart(2, "0")}`;
    }

    function formatCarouselForCopy(row) {
      if (!row) return "";
      const slides = Array.isArray(row.output?.slides) ? row.output.slides : [];
      return [
        `${carouselLabel(row)}: ${row.topic || "Carousel"}`,
        `Structure: ${row.structure || ""}`,
        `Goal: ${row.goal || "reach"}`,
        "",
        ...slides.flatMap((slide) => [
          `Slide ${slide.n || ""}: ${slide.role || ""}`,
          slide.headline || "",
          slide.body || "",
          slide.cta || "",
          formatDesignForCopy(slide),
          "",
        ]),
        row.output?.caption ? `Caption: ${row.output.caption}` : "",
        row.output?.posting_note ? `Posting note: ${row.output.posting_note}` : "",
      ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join("\n").trim();
    }

    function formatDesignForCopy(slide) {
      const direction = normalizeSlideDesign(slide);
      if (!direction) return "";
      const annotations = direction.annotations.map((item) => `${item.type} on ${item.target}`).join(", ") || "none";
      const chips = direction.chips.map((item) => `${item.axis}: ${item.label} (${item.color || "gray"})`).join(", ");
      return [
        `Design: annotation ${annotations}`,
        `Image: ${direction.imageClass}, ${direction.artifactSlot}`,
        `Treatment: ${direction.treatment.text}, ${direction.treatment.alignment}`,
        chips ? `Chips: ${chips}` : "",
        `Ghost number: ${direction.ghostNumber || String(slide.n || 0).padStart(2, "0")}`,
      ].filter(Boolean).join("\n");
    }

    function renderCurrentSequence() {
      const target = $("studioDetail");
      const row = state.studio.current;
      if (!row) {
        target.innerHTML = `<div class="empty-card" id="studioEmpty"><h3>No sequence open yet</h3><p>Generate a new sequence or open one from history.</p></div>`;
        return;
      }

      const slides = Array.isArray(row.output?.slides) ? row.output.slides : [];
      const hooks = Array.isArray(row.output?.hooks) ? row.output.hooks : [];
      target.innerHTML = `
        <div class="review-card">
          <div class="review-top">
            <div>
              <strong>${esc(row.topic || "Sequence")}</strong>
              <p>${esc(row.type || row.intent || "sequence")} · ${esc(row.goal || "reach")}</p>
            </div>
            <span class="status-pill ${esc(row.status || "draft")}">${esc(labelStatus(row.status))}</span>
          </div>
          <div class="button-row" style="margin-top:14px">
            <button class="outline" type="button" id="copyAllButton">Copy all slides</button>
            ${row.manual_prompt ? `<button class="outline" type="button" id="copyManualPromptButton">Copy manual prompt</button>` : ""}
          </div>
          ${row.review_note ? `<div class="review-note"><strong>Review note</strong><p>${esc(row.review_note)}</p></div>` : ""}
        </div>
        ${row.manual_prompt && (row.output?.manual_mode || !slides.length) ? `
          <div class="manual-card">
            <h3>Manual prompt</h3>
            <p>The copy contract is saved for Claude. The slide cards below carry the matching design direction.</p>
            <textarea readonly id="manualPromptBox">${esc(row.manual_prompt)}</textarea>
          </div>
        ` : ""}
        <div class="manual-card paste-box">
          <h3>Paste finished sequence</h3>
          <p>Paste the final Claude-written output here. Valid JSON is stored as-is. Everything else is saved as raw text and sent to review.</p>
          <textarea id="finishedSequenceInput" placeholder='Paste the final sequence JSON or raw text'></textarea>
          <div class="inline-form-actions">
            <button id="saveFinishedSequenceButton" type="button">Save finished sequence</button>
          </div>
        </div>
        ${hooks.length ? `
          <div class="studio-card">
            <h3>Hook alternates</h3>
            <div class="pill-list">${hooks.map((hook) => `<span class="pill">${esc(hook)}</span>`).join("")}</div>
            <p>${esc(row.output?.why_order || "")}</p>
            <p>${esc(row.output?.posting_note || "")}</p>
          </div>
        ` : ""}
        ${slides.length ? `
          <div class="studio-card">
            <h3>Photo checklist</h3>
            <div class="photo-list" id="photoList">
              ${slides.map((slide) => `
                <label class="photo-item">
                  <input type="checkbox" data-photo-check="${row.id}-${slide.n}" ${isPhotoChecked(row.id, slide.n) ? "checked" : ""}>
                  <span><strong>Slide ${Number(slide.n || 0)}</strong><br>${esc(slide.photo?.primary || "")}<br>${slide.photo?.alternative ? `Alternative: ${esc(slide.photo.alternative)}` : ""}</span>
                </label>
              `).join("")}
            </div>
            <p>Uploads are not wired in v1. The existing media path is admin-only, not client-scoped.</p>
          </div>
        ` : ""}
        <div class="slide-list">
          ${slides.map((slide) => `
            <div class="slide-card">
              <div class="slide-head">
                <div>
                  <div class="slide-number">Slide ${Number(slide.n || 0)}</div>
                  <strong>${esc(slide.job || "")}</strong>
                </div>
                <span class="status-pill draft">${esc(slide.interactive || "none")}</span>
              </div>
              <div class="pill-list">${(slide.text_pills || []).map((pill) => `<span class="pill">${esc(pill)}</span>`).join("") || `<span class="pill">No pills returned</span>`}</div>
              ${slide.emphasis ? `<p><strong>Emphasis:</strong> ${esc(slide.emphasis)}</p>` : ""}
              <div class="photo-box">
                <strong>Photo request</strong>
                <p>${esc(slide.photo?.primary || "")}</p>
                ${slide.photo?.alternative ? `<p>Alternative: ${esc(slide.photo.alternative)}</p>` : ""}
              </div>
              ${renderDesignDirection(slide)}
              <div class="slide-actions">
                <button class="outline" type="button" data-copy-slide="${row.id}-${slide.n}">Copy slide</button>
              </div>
            </div>
          `).join("") || `
            <div class="empty-card">
              <h3>No structured slide output</h3>
              <p>This draft only has the manual prompt or a raw model response. Use the prompt and paste the final copy back through a new run.</p>
            </div>
          `}
        </div>
      `;

      const copyAllButton = $("copyAllButton");
      if (copyAllButton) {
        copyAllButton.addEventListener("click", async () => {
          const copied = await copyText(formatSequenceForCopy(row));
          showMessage(copied ? "All slides copied." : "Copy failed. Select the text manually.", copied ? "success" : undefined);
        });
      }
      const copyManualPromptButton = $("copyManualPromptButton");
      if (copyManualPromptButton) {
        copyManualPromptButton.addEventListener("click", async () => {
          const copied = await copyText(row.manual_prompt || "");
          showMessage(copied ? "Manual prompt copied." : "Copy failed. Select the prompt manually.", copied ? "success" : undefined);
        });
      }
      const saveFinishedSequenceButton = $("saveFinishedSequenceButton");
      if (saveFinishedSequenceButton) {
        saveFinishedSequenceButton.addEventListener("click", () => attachFinishedSequence(row.id));
      }
      document.querySelectorAll("[data-copy-slide]").forEach((button) => {
        button.addEventListener("click", async () => {
          const [, slideNumber] = button.dataset.copySlide.split("-");
          const slide = slides.find((item) => String(item.n) === slideNumber);
          const copied = await copyText(formatSingleSlide(slide));
          showMessage(copied ? `Slide ${slideNumber} copied.` : "Copy failed. Select the text manually.", copied ? "success" : undefined);
        });
      });
      document.querySelectorAll("[data-photo-check]").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          localStorage.setItem(`pulsify_photo_check_${checkbox.dataset.photoCheck}`, checkbox.checked ? "1" : "0");
        });
      });
    }

    function renderDesignDirection(slide) {
      const direction = normalizeSlideDesign(slide);
      if (!direction) return "";
      const annotations = direction.annotations;
      const annotationText = annotations.length
        ? annotations.map((item) => `${item.type || "none"} on ${item.target || "selected line"}`).join(", ")
        : "none";
      const treatment = `${direction.treatment.text}, ${direction.treatment.alignment}-aligned`;
      const chips = direction.chips.length
        ? direction.chips.map((chip) => `${chip.axis}: ${chip.label}`).join(", ")
        : "";
      return `
        <div class="dd">
          <div class="dd-row"><b>Annotation</b><span class="dd-chip"><span class="dd-dot" style="background:${annotationColor(annotations[0]?.type)}"></span>${esc(annotationText)}</span></div>
          <div class="dd-row"><b>Image</b><span class="dd-chip"><span class="dd-dot" style="background:${imageClassColor(direction.imageClass)}"></span>${esc(direction.imageClass)}, ${esc(direction.artifactSlot)}</span></div>
          <div class="dd-row"><b>Type</b><span>${esc(treatment)}</span></div>
          ${chips ? `<div class="dd-row"><b>Chips</b><span>${esc(chips)}</span></div>` : ""}
        </div>
      `;
    }

    function normalizeSlideDesign(slide) {
      const raw = slide?.design || slide?.design_direction || null;
      if (!raw || typeof raw !== "object") return null;
      const rawImageClass = raw.image_class && typeof raw.image_class === "object"
        ? raw.image_class.type
        : raw.image_class;
      const rawArtifact = raw.artifact_slot
        || (raw.image_class && typeof raw.image_class === "object" ? raw.image_class.artifact : "");
      const annotations = Array.isArray(raw.annotations)
        ? raw.annotations
        : raw.annotation
          ? (Array.isArray(raw.annotation) ? raw.annotation : [raw.annotation])
          : [];
      const treatment = raw.treatment && typeof raw.treatment === "object"
        ? raw.treatment
        : { text: raw.treatment || "pill-box", alignment: raw.alignment || "left" };
      return {
        annotations: annotations
          .map((item) => (item && typeof item === "object" ? item : { type: String(item || "none"), target: "selected line" }))
          .filter((item) => item.type)
          .slice(0, 3),
        imageClass: normalizeImageClass(rawImageClass),
        artifactSlot: String(rawArtifact || "student-proof artifact").trim() || "student-proof artifact",
        treatment: {
          text: String(treatment.text || treatment.type || "pill-box").trim() === "drop-shadow" ? "drop-shadow" : "pill-box",
          alignment: String(treatment.alignment || "left").trim() === "right" ? "right" : "left",
        },
        chips: Array.isArray(raw.chips) ? raw.chips.filter(Boolean).slice(0, 6) : [],
        ghostNumber: String(raw.ghost_number || raw.ghostNumber || "").trim(),
      };
    }

    function normalizeImageClass(value) {
      return [
        "proof-screenshot",
        "device-mockup",
        "proof-wall",
        "real-workspace",
      ].includes(String(value || "").trim()) ? String(value || "").trim() : "real-workspace";
    }

    function annotationColor(type) {
      const value = String(type || "");
      if (value.includes("green")) return "var(--ui-accent)";
      if (value.includes("blue")) return "var(--ui-sky)";
      if (value === "none") return "var(--ui-muted)";
      return "var(--ui-rose)";
    }

    function imageClassColor(value) {
      return ({
        "proof-screenshot": "var(--ui-accent)",
        "device-mockup": "var(--ui-indigo)",
        "proof-wall": "var(--ui-sky)",
        "real-workspace": "var(--ui-amber)",
      })[String(value || "")] || "var(--ui-muted)";
    }

    function renderReels() {
      $("angleLib").innerHTML = REEL_ANGLES.map(([from, to]) => `
        <div class="angle-card">
          <strong>${esc(from)}</strong>
          <div class="to">${esc(to)}</div>
        </div>
      `).join("");
      $("rotList").innerHTML = REFRAME_ROTATOR.map(([tag, text]) => `
        <div class="rot-item"><span class="tag">${esc(tag)}</span><div>${esc(text)}</div></div>
      `).join("");
      renderThoughts();
    }

    function renderThoughts() {
      if (!state.reels.thoughts.length) {
        $("thoughtList").innerHTML = `<div class="empty-card"><h3>No captured thoughts yet</h3><p>Capture one raw idea and the four-format translation appears here for this session.</p></div>`;
        return;
      }
      $("thoughtList").innerHTML = state.reels.thoughts.map((thought, index) => `
        <div class="thought${thought.open ? " open" : ""}" id="thought-${index}">
          <div class="thought-head" role="button" tabindex="0" aria-expanded="${thought.open ? "true" : "false"}" data-toggle-thought="${index}">
            <div class="thought-ic">${index + 1}</div>
            <div>
              <div class="thought-title">${esc(thought.text)}</div>
              <div class="thought-angle">${esc(thought.angle)}</div>
            </div>
            <span>${thought.open ? "Close" : "Open"}</span>
          </div>
          <div class="thought-body">
            <div>
              <div class="translate">
                ${thought.formats.map((format, formatIndex) => `
                  <div class="fmt">
                    <strong>${esc(FORMAT_LABELS[formatIndex] || "Format")}</strong>
                    <p>${esc(format)}</p>
                    ${formatIndex === 1 && thought.sequenceId ? `<button type="button" data-open-reel-sequence="${thought.sequenceId}">Open Studio draft</button>` : ""}
                  </div>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      `).join("");
      document.querySelectorAll("[data-toggle-thought]").forEach((row) => {
        row.addEventListener("click", () => toggleThought(Number(row.dataset.toggleThought)));
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleThought(Number(row.dataset.toggleThought));
          }
        });
      });
      document.querySelectorAll("[data-open-reel-sequence]").forEach((button) => {
        button.addEventListener("click", () => openGeneratedSequence(Number(button.dataset.openReelSequence)));
      });
    }

    function toggleThought(index) {
      state.reels.thoughts = state.reels.thoughts.map((thought, thoughtIndex) => ({
        ...thought,
        open: thoughtIndex === index ? !thought.open : thought.open,
      }));
      saveThoughts();
      renderThoughts();
    }

    async function addThought() {
      const input = $("captureInput");
      const text = input.value.trim();
      if (!text) {
        showMessage("Capture a thought first.");
        openTab("reels");
        return;
      }
      $("captureButton").disabled = true;
      try {
        const generated = await createReelSiblingSequence(text);
        state.reels.thoughts.unshift({
          text,
          angle: chooseAngle(text),
          sequenceId: generated.id || null,
          open: true,
          formats: buildThoughtFormats(text, generated),
        });
        state.reels.thoughts = state.reels.thoughts.slice(0, 12);
        input.value = "";
        saveThoughts();
        renderThoughts();
        await loadStudioHistory();
        showMessage("Thought captured and translated into four formats.", "success");
        openTab("reels");
      } catch (error) {
        showMessage(error.message || "Could not translate this thought.");
      } finally {
        $("captureButton").disabled = false;
      }
    }

    async function createReelSiblingSequence(text) {
      const response = await fetch("/api/studio-generate", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          manual_mode: true,
          type: "breakdown",
          intent: `Turn this raw reel thought into a sibling story sequence: ${text}`,
          topic: text,
          goal: "reach",
          trigger_word: "",
          proof_lines: [],
          slide_count: 8,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return {};
      }
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not create the Studio draft.");
      return data;
    }

    function buildThoughtFormats(text, generated) {
      const clean = text.replace(/\s+/g, " ").trim();
      return [
        `Talking-head reel: open on "${clean}", then explain the mistake, the better frame, and the proof-backed next move.`,
        generated.id
          ? `Story sequence draft saved in Studio as #${generated.id}. Use the manual prompt and design directions attached to the draft.`
          : `Story sequence: expand "${clean}" across curiosity, pain, proof, belief shift, result, and close.`,
        `Carousel: turn the idea into a saveable set with one clear taxonomy, proof screenshot, and chip code where it fits.`,
        `Long-form segment: use this as a 3 to 5 minute section inside a YouTube breakdown or client-call lesson.`,
      ];
    }

    function chooseAngle(text) {
      const value = text.toLowerCase();
      if (value.includes("client") || value.includes("closed") || value.includes("win")) return "A win to credibility";
      if (value.includes("objection") || value.includes("skeptical") || value.includes("question")) return "An objection to Q and A";
      if (value.includes("belief") || value.includes("most people") || value.includes("think")) return "A belief to reframe";
      if (value.includes("strategy") || value.includes("system") || value.includes("framework")) return "A strategy to breakdown";
      if (value.includes("behind") || value.includes("call") || value.includes("day")) return "A behind-the-scenes moment";
      return "Routing to the closest proven angle";
    }

    function openGeneratedSequence(id) {
      const row = state.studio.rows.find((item) => item.id === id);
      if (row) {
        state.studio.current = row;
        renderHistory();
        renderCurrentSequence();
      }
      openTab("studio");
    }

    function loadSavedThoughts() {
      try {
        const parsed = JSON.parse(sessionStorage.getItem("pulsify_reel_thoughts") || "[]");
        return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
      } catch {
        return [];
      }
    }

    function saveThoughts() {
      sessionStorage.setItem("pulsify_reel_thoughts", JSON.stringify(state.reels.thoughts));
    }

    async function attachFinishedSequence(id) {
      const rawText = $("finishedSequenceInput")?.value.trim() || "";
      if (!rawText) {
        showMessage("Paste the finished sequence first.");
        return;
      }
      try {
        const response = await fetch("/api/studio-sequences", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ action: "attach-output", id, raw_text: rawText }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the finished sequence.");
        await loadStudioHistory();
        showMessage("Finished sequence saved and moved to review.", "success");
      } catch (error) {
        showMessage(error.message || "Could not save the finished sequence.");
      }
    }

    async function submitForReview(id) {
      try {
        const response = await fetch("/api/studio-sequences", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ action: "submit-for-review", id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not send this draft for review.");
        await loadStudioHistory();
        showMessage("Draft sent for review.", "success");
      } catch (error) {
        showMessage(error.message || "Could not send this draft for review.");
      }
    }

    async function submitCarouselForReview(id) {
      try {
        const response = await fetch("/api/studio-carousels", {
          method: "POST",
          headers: { ...authHeaders(), "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ action: "submit-for-review", id }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 403 && state.impersonated) throw new Error("Operator view is read only.");
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not send this carousel for review.");
        await loadCarouselHistory();
        showMessage("Carousel sent for review.", "success");
      } catch (error) {
        showMessage(error.message || "Could not send this carousel for review.");
      }
    }

    async function deleteDraft(id) {
      try {
        const response = await fetch("/api/studio-sequences", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ action: "delete", id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete this draft.");
        await loadStudioHistory();
        showMessage("Draft deleted.", "success");
      } catch (error) {
        showMessage(error.message || "Could not delete this draft.");
      }
    }

    function renderTeam(value) {
      const target = $("teamContent");
      const items = sectionItems(value, ["members", "team", "items"]);
      if (!items.length) {
        target.innerHTML = emptyText("No team assigned yet", "Your Pulsify team appears here once assigned.");
        return;
      }
      target.innerHTML = items.map((item, index) => {
        const name = item.name || item.title || item.label || item.person || item.owner || `Team member ${index + 1}`;
        const role = item.role || item.position || item.lane || "Role not logged";
        const current = item.current_task || item.task || item.working_on || item.detail || item.note || "";
        const email = item.email || item.contact_email || "";
        const slack = item.slack || item.slack_handle || "";
        return `
          <article class="team-member-card">
            <div class="team-member-head">
              <span class="team-avatar" aria-hidden="true">${esc(initials(name))}</span>
              <div><h3>${esc(name)}</h3><p>${esc(role)}</p></div>
            </div>
            ${(email || slack) ? `<div class="team-contact-list">${email ? `<span>${esc(email)}</span>` : ""}${slack ? `<span>${esc(slack)}</span>` : ""}</div>` : ""}
            <div class="team-now">
              <span>Right now</span>
              <strong>${esc(current || "Current work has not been logged.")}</strong>
            </div>
          </article>
        `;
      }).join("");
    }

    function renderPlans(value) {
      const target = $("plansContent");
      const items = sectionItems(value, ["plans", "phases", "items"]);
      $("plansCount").textContent = `${items.length} plan${items.length === 1 ? "" : "s"}`;
      if (!items.length) {
        target.innerHTML = emptyText("No plan loaded yet", "The current roadmap appears here once Pulsify adds it to the client dashboard.");
        return;
      }
      target.innerHTML = items.map((item, index) => {
        const title = item.title || item.name || item.label || item.phase || `Plan ${index + 1}`;
        const status = String(item.status || item.state || "Status not logged");
        const detail = item.detail || item.description || item.note || item.summary || "No plan detail has been logged.";
        const progress = planProgress(item);
        const dates = planDateMeta(item);
        return `
          <article class="plan-card">
            <div class="plan-card-top"><h3>${esc(title)}</h3><span class="plan-status ${esc(planStatusClass(status))}">${esc(status)}</span></div>
            <div class="plan-progress${progress == null ? " unmeasured" : ""}" role="progressbar" aria-label="${esc(title)} progress" ${progress == null ? "" : `aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"`}><i style="width:${progress == null ? 0 : progress}%"></i></div>
            <p>${esc(detail)}</p>
            <div class="plan-meta"><span>${esc(dates || "Dates not logged")}</span><strong class="mono">${progress == null ? "Progress not logged" : `${progress}%`}</strong></div>
          </article>
        `;
      }).join("");
    }

    function sectionItems(value, keys = []) {
      if (Array.isArray(value)) return value.map(coerceItem);
      for (const key of keys) {
        if (Array.isArray(value?.[key])) return value[key].map(coerceItem);
      }
      if (value && typeof value === "object") {
        return Object.entries(value)
          .filter(([key]) => !keys.includes(key))
          .map(([title, detail]) => detail && typeof detail === "object" && !Array.isArray(detail)
            ? { title, ...detail }
            : { title, detail: String(detail ?? "") });
      }
      return [];
    }

    function planProgress(item) {
      const raw = item.progress_pct ?? item.progress_percent ?? item.percentage ?? item.progress;
      if (raw == null || raw === "") return null;
      const numeric = Number(String(raw).replace("%", "").trim());
      if (!Number.isFinite(numeric)) return null;
      const percentage = numeric > 0 && numeric <= 1 && !String(raw).includes("%") ? numeric * 100 : numeric;
      return Math.round(Math.max(0, Math.min(100, percentage)));
    }

    function planDateMeta(item) {
      if (item.date_meta || item.period || item.date_range) return item.date_meta || item.period || item.date_range;
      const start = item.start_date || item.starts_on || item.start || "";
      const end = item.end_date || item.ends_on || item.end || item.deadline || "";
      if (start && end) return `${start} to ${end}`;
      if (start) return `Starts ${start}`;
      if (end) return `Due ${end}`;
      return item.date || "";
    }

    function planStatusClass(status) {
      const value = String(status || "").toLowerCase();
      if (value.includes("progress") || value.includes("active") || value.includes("current")) return "active";
      if (value.includes("done") || value.includes("complete") || value.includes("shipped")) return "complete";
      if (value.includes("block") || value.includes("risk")) return "blocked";
      return "queued";
    }

    function initials(value) {
      return String(value || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "P";
    }

    function renderListSection(targetId, heading, value, emptyHtml) {
      const target = $(targetId);
      const items = normalizeItems(value);
      if (!items.length) {
        target.innerHTML = emptyHtml;
        return;
      }
      target.innerHTML = `
        <div class="list-card">
          <h3>${heading}</h3>
          <ul>${items.map(renderGenericItem).join("")}</ul>
        </div>
      `;
    }

    function renderMomentum(targetId, value) {
      const target = $(targetId);
      if (!value) {
        target.innerHTML = emptyText("No momentum summary yet", "Pulsify will post the shipped, shipping, and delta summary here once the weekly rhythm starts.");
        return;
      }
      if (Array.isArray(value)) {
        renderListSection(targetId, "Momentum", value, "");
        return;
      }
      const cards = [];
      if (value.headline) cards.push({ title: value.headline, note: value.detail || "" });
      if (Array.isArray(value.shipped)) cards.push(...value.shipped.map((item) => ({ title: "Shipped", note: String(item) })));
      if (Array.isArray(value.next)) cards.push(...value.next.map((item) => ({ title: "Next", note: String(item) })));
      if (Array.isArray(value.deltas)) cards.push(...value.deltas.map((item) => ({ title: "Delta", note: String(item) })));
      if (!cards.length) {
        target.innerHTML = emptyText("No momentum summary yet", "Pulsify will post the shipped, shipping, and delta summary here once the weekly rhythm starts.");
        return;
      }
      target.innerHTML = `
        <div class="two-col">
          ${cards.map((item) => `<div class="list-card"><h3>${esc(item.title)}</h3><div class="item-note">${esc(item.note || "")}</div></div>`).join("")}
        </div>
      `;
    }

    function renderTodos(value) {
      const target = $("todosContent");
      const items = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
      if (!items.length) {
        target.innerHTML = emptyText("No to-dos loaded yet", "Pulsify will add the current action list here once the client roadmap is written.");
        return;
      }
      target.innerHTML = `
        <div class="todo-card">
          <h3>Current action list</h3>
          <ul>${items.map((item, index) => renderTodoItem(item, index)).join("")}</ul>
        </div>
      `;
      target.querySelectorAll("[data-todo-index]").forEach((input) => {
        input.addEventListener("change", () => toggleTodo(Number(input.dataset.todoIndex), input.checked));
      });
    }

    async function toggleTodo(index, done) {
      try {
        const response = await fetch("/api/client-dashboard-todo", {
          method: "POST",
          headers: {
            ...authHeaders(),
            "content-type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ client: state.client, index, done }),
        });
        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not save this to-do item.");
        state.sections.todos = data.todos;
        renderTodos(state.sections.todos);
        renderHome();
      } catch (error) {
        showMessage(error.message || "Could not save this to-do item.");
        renderTodos(state.sections.todos);
      }
    }

    async function logout() {
      await fetch("/api/client-logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
      sessionStorage.removeItem("pulsify_portal_token");
      sessionStorage.removeItem("pulsify_reel_thoughts");
      redirectToLogin();
    }

    function openTab(tab) {
      document.querySelectorAll(".tab-btn").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
      document.querySelectorAll(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tab}`));
    }

    function toggleTheme() {
      const next = document.body.classList.toggle("dark");
      localStorage.setItem("pulsify_client_dashboard_theme", next ? "dark" : "light");
    }

    function redirectToLogin() {
      const login = new URL("/portal/login", location.origin);
      if (state.client) login.searchParams.set("client", state.client);
      location.href = login.toString();
    }

    function authHeaders() {
      return TOKEN ? { "x-portal-token": TOKEN } : {};
    }

    function variantGroupFor(sequenceRef) {
      return state.performance.variantGroups.find((group) => Number(group.sequence_ref) === Number(sequenceRef)) || null;
    }

    function sequenceLeakLoss(row) {
      const slide = Number(row.biggest_drop_slide || 0);
      const views = Array.isArray(row.slide_views) ? row.slide_views : [];
      const prior = Number(views[slide - 2] || 0);
      const current = Number(views[slide - 1] || 0);
      return prior > 0 ? Math.round(Math.max(0, ((prior - current) / prior) * 100) * 10) / 10 : null;
    }

    function suggestedRetestHook(row) {
      const topic = String(row.topic || row.type || "this topic").trim().replace(/[.!?]+$/, "");
      return `What changed when ${topic} stopped holding attention?`;
    }

    function openRetestDialog(sequenceRef) {
      const row = state.performance.rows.find((item) => Number(item.id) === Number(sequenceRef));
      if (!row || row.diagnostic !== "hook failed") return;
      const group = variantGroupFor(sequenceRef);
      if (group?.active) {
        showMessage("This sequence already has an active hook retest.");
        return;
      }
      state.performance.retestSequenceRef = Number(sequenceRef);
      const loss = sequenceLeakLoss(row);
      $("retestDialogTitle").textContent = `Retest, ${row.topic || row.type || "sequence"}`;
      $("retestDiagnostic").innerHTML = `<strong>Slide ${number(row.biggest_drop_slide)} is the leak.</strong> ${loss == null ? "The loss rate is unavailable." : `${formatPercent(loss)} of viewers left at this transition.`}`;
      $("retestOldHook").textContent = row.topic || "Current logged hook";
      $("retestNewHookInput").value = suggestedRetestHook(row);
      $("retestDialogError").textContent = "";
      $("launchRetestButton").disabled = Boolean(state.impersonated);
      $("retestDialog").showModal();
      $("retestNewHookInput").focus();
    }

    async function launchRetest() {
      const sequenceRef = Number(state.performance.retestSequenceRef || 0);
      const newHook = $("retestNewHookInput").value.trim();
      if (!newHook) {
        $("retestDialogError").textContent = "Write the new hook before launching the retest.";
        return;
      }
      const button = $("launchRetestButton");
      button.disabled = true;
      try {
        const data = await postSequenceVariant({ action: "start", sequence_ref: sequenceRef, new_hook: newHook });
        $("retestDialog").close();
        await loadPerformanceData();
        showMessage(`${data.variant?.label || "The new variant"} is testing. Keep every other slide identical.`, "success");
      } catch (error) {
        $("retestDialogError").textContent = error.message || "Could not launch the retest.";
      } finally {
        button.disabled = Boolean(state.impersonated);
      }
    }

    async function logVariantOutcome(variantId) {
      const input = $(`variantCompletion${variantId}`);
      const completion = Number(input?.value);
      if (!input || input.value.trim() === "" || !Number.isFinite(completion) || completion < 0 || completion > 100) {
        showMessage("Enter a completion rate from 0 to 100.");
        return;
      }
      try {
        await postSequenceVariant({ action: "log", variant_id: variantId, completion_pct: completion });
        await loadPerformanceData();
        showMessage("Variant completion logged. Resolve the comparison when both results are ready.", "success");
      } catch (error) {
        showMessage(error.message || "Could not log the variant outcome.");
      }
    }

    async function resolveHookRetest(sequenceRef) {
      try {
        const data = await postSequenceVariant({ action: "resolve", sequence_ref: sequenceRef });
        await loadPerformanceData();
        showMessage(`${data.winner?.label || "The higher-completion variant"} won the hook retest.`, "success");
      } catch (error) {
        showMessage(error.message || "Could not resolve the hook retest.");
      }
    }

    async function postSequenceVariant(payload) {
      const response = await fetch("/api/sequence-variants", {
        method: "POST",
        headers: { ...authHeaders(), "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        redirectToLogin();
        throw new Error("The portal session expired.");
      }
      if (response.status === 403 && state.impersonated) throw new Error("Operator view is read only.");
      if (!response.ok || !data.ok) throw new Error(data.error || "The retest request failed.");
      return data;
    }

    function renderRetestLineage(group) {
      if (!group) return "";
      const variants = Array.isArray(group.variants) ? group.variants : [];
      const winner = group.winner;
      const pending = variants.find((variant) => variant.status === "testing" && variant.completion_pct == null);
      const ready = group.active && variants.filter((variant) => variant.status === "testing").length === 2
        && variants.filter((variant) => variant.status === "testing").every((variant) => variant.completion_pct != null);
      return `
        <div class="retest-lineage" role="group" aria-label="Hook retest lineage">
          ${variants.map((variant) => `
            <div class="retest-variant ${esc(variant.status)}">
              <strong>${esc(variant.label)}${variant.status === "won" ? " winner" : ""}</strong>
              <span>${variant.completion_pct == null ? "Testing, result not logged" : `${formatPercent(variant.completion_pct)} completion`}</span>
            </div>
          `).join("")}
          ${winner ? `<div class="retest-winner">${esc(winner.label)} won with ${formatPercent(winner.completion_pct)} completion.</div>` : ""}
          ${pending && !state.impersonated ? `
            <div class="retest-outcome">
              <label for="variantCompletion${pending.id}">Completion after posting
                <input id="variantCompletion${pending.id}" type="number" min="0" max="100" step="0.1" placeholder="0 to 100">
              </label>
              <button class="outline" type="button" data-log-variant="${pending.id}">Log result</button>
            </div>
          ` : ""}
          ${ready && !state.impersonated ? `<div class="retest-outcome"><button type="button" data-resolve-retest="${group.sequence_ref}">Resolve winner</button></div>` : ""}
        </div>
      `;
    }

    function renderSequenceRow(row) {
      const maxView = Math.max(...(row.slide_views || [0]), 1);
      const group = variantGroupFor(row.id);
      const canRetest = row.diagnostic === "hook failed" && !group?.active;
      return `
        <div class="sequence-row${state.performance.editingSequenceId === row.id ? " editing" : ""}${group ? " has-retest" : ""}" id="sequenceRow${row.id}">
          <div class="sequence-top">
            <div>
              <strong>${esc(row.topic || row.type || "Sequence")}</strong>
              <div class="sequence-meta">${esc(row.type || "sequence")} | ${esc(row.posted_on || "")} | ${row.dms == null ? "DMs not logged" : `${number(row.dms)} DMs`}</div>
            </div>
            <span class="diagnostic-badge${row.diagnostic === "healthy" ? " healthy" : ""}">${esc(row.diagnostic || "monitor")}</span>
          </div>
          <div class="sequence-strip">
            ${(row.slide_views || []).map((value, index) => `
              <div class="sequence-bar" title="Slide ${index + 1}: ${number(value)} views">
                <i style="height:${Math.max(10, Math.round((Number(value || 0) / maxView) * 100))}%"></i>
                <span>${index + 1}</span>
              </div>
            `).join("")}
          </div>
          <div class="content-meta">
            <span>${row.completion_pct == null ? "Completion not available" : `${row.completion_pct}% completion`}</span>
            <span>${row.dropoff_pct == null ? "Drop-off not available" : `${row.dropoff_pct}% drop-off`}</span>
            <span>${row.biggest_drop_slide ? `Biggest drop: slide ${row.biggest_drop_slide}` : "No drop pattern yet"}</span>
            <span>${row.profile_visits == null ? "Profile visits not logged" : `${number(row.profile_visits)} profile visits`}</span>
          </div>
          ${renderRetestLineage(group)}
          ${row.notes ? `<p>${esc(row.notes)}</p>` : ""}
          <div class="inline-form-actions">
            <button class="outline" type="button" data-edit-sequence="${row.id}">Edit</button>
            ${canRetest ? `<button type="button" data-retest-sequence="${row.id}">Retest hook</button>` : ""}
          </div>
        </div>
      `;
    }

    function renderWeeklyMetric(label, metric, suffix = "", plain = false) {
      const value = metric?.value;
      const delta = metric?.delta;
      const valueText = value == null ? "Not logged yet" : `${formatMetricValue(value, plain)}${suffix}`;
      const deltaText = delta == null ? (metric?.hint || "Need another weekly snapshot.") : `${delta > 0 ? "+" : ""}${formatMetricValue(delta, plain)}${suffix} vs prior week`;
      return `
        <div class="weekly-metric">
          <strong>${esc(label)}</strong>
          <span>${esc(valueText)}</span>
          <span>${esc(deltaText)}</span>
        </div>
      `;
    }

    function formatMetricValue(value, plain = false) {
      if (plain) return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
      if (Math.abs(Number(value)) >= 1000) return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
      return String(value);
    }

    function formatTypeMix(mix) {
      const entries = Object.entries(mix || {});
      if (!entries.length) return "No logged sequences this week.";
      return entries.map(([type, count]) => `${type}: ${count}`).join(" | ");
    }

    function parseViewsInput(value) {
      return String(value || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => Number(part))
        .filter((part) => Number.isFinite(part) && part >= 0)
        .map((part) => Math.round(part));
    }

    function todayIso() {
      return new Date().toISOString().slice(0, 10);
    }

    function startOfCurrentUtcWeek() {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      const day = date.getUTCDay();
      date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
      return date.toISOString().slice(0, 10);
    }

    function addIsoDays(isoDate, days) {
      const date = new Date(`${isoDate}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + Number(days || 0));
      return date.toISOString().slice(0, 10);
    }

    function formatPercent(value) {
      return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    }

    function capitalize(value) {
      const text = String(value || "");
      return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
    }

    function contentStageLabel(value) {
      return ({
        production: "In production",
        scheduled: "Scheduled",
        published: "Published",
      })[String(value || "").toLowerCase()] || "Open";
    }

    function metricCard(label, value, note) {
      return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
    }

    function renderGenericItem(item) {
      const title = item.title || item.name || item.label || item.role || "Item";
      const noteParts = [item.status, item.detail, item.note, item.owner, item.deadline].filter(Boolean);
      return `<li><span class="item-title">${esc(title)}</span><div class="item-note">${esc(noteParts.join(" | ") || "No extra detail")}</div></li>`;
    }

    function renderTodoItem(item, index) {
      const title = item.label || item.title || item.task || `Task ${index + 1}`;
      const noteParts = [item.owner, item.deadline, item.note].filter(Boolean);
      return `
        <li class="${item.done ? "todo-done" : ""}">
          <label class="todo-row">
            <input type="checkbox" data-todo-index="${index}" ${item.done ? "checked" : ""}>
            <span>
              <span class="item-title">${esc(title)}</span>
              <span class="item-note">${esc(item.detail || item.description || "No extra detail")}</span>
              ${noteParts.length ? `<div class="todo-meta">${esc(noteParts.join(" | "))}</div>` : ""}
            </span>
          </label>
        </li>
      `;
    }

    function normalizeItems(value) {
      if (Array.isArray(value)) return value.map(coerceItem);
      if (Array.isArray(value?.items)) return value.items.map(coerceItem);
      if (value && typeof value === "object") {
        return Object.entries(value).map(([title, detail]) => ({
          title,
          detail: typeof detail === "string" ? detail : JSON.stringify(detail),
        }));
      }
      return [];
    }

    function brainSection(key) {
      return state.brainSections.find((section) => section.key === key) || null;
    }

    function brainFieldValue(section, key) {
      const field = Array.isArray(section?.fields) ? section.fields.find((entry) => entry.key === key) : null;
      return field && !field.gap ? field.value : null;
    }

    function parseListInput(value) {
      return String(value || "")
        .split(/[\r\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 50);
    }

    function coerceItem(item) {
      if (item && typeof item === "object") return item;
      return { title: String(item) };
    }

    function emptyText(title, note) {
      return `<div class="empty-card"><h3>${title}</h3><p>${note}</p></div>`;
    }

    function currency(amountCents, code = "USD") {
      return `${(Number(amountCents || 0) / 100).toFixed(2)} ${String(code || "USD").toUpperCase()}`;
    }

    function number(value) {
      return Number(value || 0).toLocaleString();
    }

    function date(value) {
      return value ? new Date(value).toLocaleString() : "-";
    }

    function relativeTime(value) {
      if (!value) return "just now";
      const timestamp = new Date(value).getTime();
      if (Number.isNaN(timestamp)) return "just now";
      const delta = Date.now() - timestamp;
      if (delta < 60000) return "just now";
      if (delta < 3600000) return `${Math.round(delta / 60000)}m ago`;
      if (delta < 86400000) return `${Math.round(delta / 3600000)}h ago`;
      return `${Math.round(delta / 86400000)}d ago`;
    }

    function labelStatus(value) {
      return ({
        draft: "Draft",
        review: "In review",
        approved: "Approved",
        rejected: "Rejected",
      })[String(value || "").toLowerCase()] || "Draft";
    }

    function isPhotoChecked(id, slideNumber) {
      return localStorage.getItem(`pulsify_photo_check_${id}-${slideNumber}`) === "1";
    }

    function formatSingleSlide(slide) {
      if (!slide) return "";
      const direction = normalizeSlideDesign(slide);
      const treatment = direction
        ? `${direction.treatment.text}, ${direction.treatment.alignment}-aligned`
        : "";
      const annotations = direction
        ? direction.annotations.map((item) => `${item.type || "none"} on ${item.target || "selected line"}`).join(" | ")
        : "";
      return [
        `SLIDE ${slide.n} - ${slide.job || ""}`,
        `TEXT: ${(slide.text_pills || []).join(" | ")}`,
        `EMPHASIS: ${slide.emphasis || ""}`,
        `PHOTO: ${slide.photo?.primary || ""}`,
        slide.photo?.alternative ? `ALTERNATIVE: ${slide.photo.alternative}` : "",
        direction ? `DESIGN IMAGE: ${direction.imageClass} - ${direction.artifactSlot}` : "",
        annotations ? `DESIGN ANNOTATION: ${annotations}` : "",
        treatment ? `DESIGN TYPE: ${treatment}` : "",
        `INTERACTIVE: ${slide.interactive || "none"}`,
      ].filter(Boolean).join("\n");
    }

    function formatSequenceForCopy(row) {
      const slides = Array.isArray(row.output?.slides) ? row.output.slides : [];
      return [
        row.topic || "Sequence",
        row.output?.why_order || "",
        row.output?.posting_note || "",
        "",
        ...slides.map(formatSingleSlide),
      ].filter(Boolean).join("\n\n");
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {}
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        return copied;
      } catch {
        return false;
      }
    }

    function esc(value) {
      return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
      }[character]));
    }

    function showMessage(text, kind) {
      $("message").textContent = text;
      $("message").className = kind ? `message ${kind}` : "message";
      $("message").hidden = false;
    }
  