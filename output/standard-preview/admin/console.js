(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const STORAGE_KEY = "pulsify_admin_key";
  const LEGACY_KEYS = [
    "pulsify_admin_key",
    "pulsify_settings_admin_key",
    "pulsify_portal_admin_key",
    "pulsify_integrations_admin_key",
    "pulsify_campaigns_admin_key",
    "admin_key",
  ];
  const AUTH_MESSAGE = "Your admin key was rejected. Paste it again to unlock the console.";
  const ROUTES = {
    clients: ["Client setup", "Clients"],
    delivery: ["Client-facing work", "Delivery"],
    integrations: ["Money and handoff path", "Integrations"],
    campaigns: ["Outreach visibility", "Campaigns"],
  };

  const state = {
    key: "",
    clients: [],
    client: new URLSearchParams(location.search).get("client") || "",
    route: "clients",
    authPrompted: false,
    integrationsReady: false,
    campaigns: [],
    campaignSort: { key: "signal", dir: "desc" },
    currentConfig: null,
  };

  const deliveryState = {
    type: "content",
    rows: [],
    all: { content: [], call: [], asset: [] },
    editingId: null,
  };

  const integrationRecords = new Map();
  let lastProvisionResult = null;

  const wizardState = {
    step: 1,
    created: false,
    slugEdited: false,
    choice: "",
    design: "canonical",
    config: {},
    returnFocus: null,
    busy: false,
  };

  const deleteState = {
    client: "",
    clientName: "",
    returnFocus: null,
    busy: false,
  };

  const DELETE_TABLES = [
    "client_config",
    "content_items",
    "call_notes",
    "client_assets",
    "payments",
    "integrations",
    "integration_events",
    "delivery_failures",
    "page_events",
  ];

  const GLOSSARY = {
    client_id: ["Client ID", "Short slug that identifies the client everywhere in the system (URLs, database). Set once when creating them; never change it afterwards."],
    client_name: ["Client name", "The display name that shows on their landing page."],
    landing_design: ["Landing page design", "Which of the two page designs their landing page uses (the standard one or variant 2)."],
    wistia: ["Wistia media ID", "The short code of the VSL video hosted on Wistia - it is in the video's Wistia URL. Blank = the page shows a video placeholder."],
    typeform_link: ["Typeform link", "The URL of the application form embedded on their landing page."],
    typeform_secret: ["Typeform webhook secret", "A password Typeform sends along when it notifies us of a new application, so fake submissions get rejected. Auto-handled; normally leave alone."],
    kit_key: ["Kit v4 API key", "From Kit (ConvertKit): Settings -> Developer -> v4 key. Lets the system add subscribers and send the onboarding email."],
    kit_tag: ["Kit tag ID", "The number of the Kit tag new leads get added to; that tag drives the email automation. Find it in the tag's URL inside Kit."],
    origin: ["Landing-page origin", "The exact web address allowed to send visitor events to us (a security allowlist). Normally the pulsify-funnels domain, or the custom domain once one exists."],
    proof: ["Proof-wall images", "Direct image URLs for the eight proof screenshots on the landing page. Blank slots show a placeholder shimmer."],
    portal: ["Client portal link", "The tokenized login link you send the client; the Generate button mints a fresh one."],
    discord: ["Webhook URL (Discord)", "From your Discord channel: Settings -> Integrations -> Webhooks -> copy URL. Where application/booking/payment alerts get posted."],
    path_secret: ["Webhook path secret", "A random string baked into the webhook URL we hand a provider (Cal.com, Calendly, Whop) so only that provider can post to it. Auto-generated on first save; leave blank to keep it."],
    stripe_secret: ["Stripe signing secret", "From the Stripe dashboard after you create the webhook endpoint; proves payment events really come from Stripe."],
    template_id: ["Email template ID", "Optional Kit template number controlling how the onboarding email looks. Blank = plain default."],
    onboarding_copy: ["Onboarding subject / preview text", "The subject line and inbox preview of the automatic onboarding email sent when a payment lands."],
    onboarding_links: ["Onboarding form URL / CO1 doc URL", "The intake form and onboarding doc links included in that email. Defaults already point at the real Google Form and CO1 doc."],
    sender: ["Sending email", "Optional from-address for the onboarding email; blank uses the Kit account default."],
    contact: ["Client contact name / email", "Who the onboarding email greets and where it goes."],
    booking: ["Booking URL", "The client's Cal.com or Calendly link, shown where booking is offered."],
    company: ["Company ID", "Only for providers that need an account identifier (e.g. Whop); optional."],
  };

  const GLOSSARY_SECTIONS = {
    clients: ["client_id", "client_name", "landing_design", "wistia", "typeform_link", "typeform_secret", "kit_key", "kit_tag", "origin", "proof", "portal"],
    delivery: ["client_id", "client_name", "portal"],
    integrations: ["kit_key", "discord", "path_secret", "stripe_secret", "template_id", "onboarding_copy", "onboarding_links", "sender", "contact", "booking", "company"],
    campaigns: ["client_id", "client_name", "landing_design"],
  };

  const PROOF_TAGS = [
    "Payment proof", "Store dashboard", "Student DM", "Before / after",
    "Ad results", "Raw clip", "Payout screenshot", "Order volume",
  ];

  const WIZARD_STEPS = [
    "Name", "Client path", "Page design", "VSL video",
    "Application form", "Email automation", "Proof wall", "Done",
  ];

  const CONTENT_FIELDS = [
    { key: "BRAND_MARK", label: "Brand mark", meaning: "The name shown at the top of the page." },
    { key: "AUDIENCE_PILL", label: "Audience line", meaning: "The qualifier line above the headline." },
    { key: "HEADLINE_LINE_ONE", label: "Headline, first line", meaning: "The opening line of the main promise." },
    { key: "HEADLINE_EMPHASIS", label: "Headline, highlighted line", meaning: "The accent-colored line that completes the main promise." },
    { key: "HERO_SUBHEAD", label: "Subheadline", meaning: "The short explanation under the headline.", area: true },
    { key: "HERO_CTA", label: "Hero button text", meaning: "The action text on the first button." },
    { key: "VIDEO_NOTE_PRIMARY", label: "Video caption, left", meaning: "The first short note under the VSL." },
    { key: "VIDEO_NOTE_SECONDARY", label: "Video caption, right", meaning: "The second short note under the VSL." },
    { key: "APPLY_STEP_LABEL", label: "Application step label", meaning: "The small step marker above the application." },
    { key: "APPLY_HEADING", label: "Application heading", meaning: "The headline that introduces the application form." },
    { key: "APPLY_INTRO", label: "Application intro", meaning: "The short explanation before the application form.", area: true },
    { key: "CLOSING_CTA", label: "Closing button text", meaning: "The action text on the final page button." },
    { key: "PAGE_TITLE", label: "Browser tab title", meaning: "The title shown in the browser tab and link previews." },
    { key: "META_DESCRIPTION", label: "Search and share description", meaning: "The description used by search engines and shared links.", area: true },
    { key: "FOOTER_LABEL", label: "Footer name", meaning: "The name shown in the page footer." },
    { key: "FOOTER_DISCLAIMER", label: "Footer disclaimer", meaning: "The factual disclaimer shown at the bottom of the page.", area: true },
    { key: "BRAND_NOTE", label: "Brand note", meaning: "The small note beside the brand mark in variant 2." },
    { key: "MICRO_NOTE", label: "Hero micro-note", meaning: "The small line below the hero button in variant 2." },
    { key: "FORM_FRAME_LABEL", label: "Form frame label", meaning: "The small label around the form in variant 2." },
    { key: "FORM_FRAME_NOTE", label: "Form frame note", meaning: "The supporting note around the form in variant 2." },
    { key: "PROOF_KICKER", label: "Proof section kicker", meaning: "The small label above the proof wall in variant 2." },
    { key: "PROOF_INTRO", label: "Proof section intro", meaning: "The short introduction above the proof wall in variant 2.", area: true },
  ];

  const OPERATOR_CARDS = [
    {
      scope: "operator",
      provider: "kit",
      title: "Kit",
      feeds: "Sends the onboarding email after payment and supports operator-wide email flows.",
      fields: [
        { key: "api_key", secret: true, label: "Kit v4 API key", hint: "Create it in Kit under Settings -> Developer. It sends onboarding email; blank keeps the saved key." },
        { key: "onboarding_subject", label: "Onboarding subject", hint: "Write the subject used on the automatic payment email. Get it from the approved onboarding copy; blank uses the backend default." },
        { key: "onboarding_preview_text", label: "Onboarding preview text", hint: "Write the inbox preview paired with the subject. Get it from approved onboarding copy; blank uses the backend default." },
        { key: "onboarding_sender_email", label: "Sending email", hint: "The approved from-address in the Kit account. Blank uses the Kit account default." },
        { key: "email_template_id", label: "Email template ID", hint: "The optional template number found in Kit. Blank sends the plain default email." },
        { key: "onboarding_form_url", label: "Onboarding form URL", hint: "The live intake-form share link. Copy it from Google Forms; blank uses the real backend default." },
        { key: "onboarding_doc_url", label: "CO1 doc URL", hint: "The live onboarding-document share link. Copy it from Google Docs; blank uses the real backend default." },
      ],
    },
    {
      scope: "operator",
      provider: "discord",
      title: "Discord webhook",
      feeds: "Posts application, booking, payment, watch, and delivery-failure alerts.",
      fields: [
        { key: "webhook_url", secret: true, label: "Webhook URL", hint: "Copy it from the Discord channel's Integrations -> Webhooks screen. Blank keeps the saved URL." },
      ],
    },
  ];

  const CLIENT_CARDS = [
    {
      scope: "client",
      provider: "calcom",
      title: "Cal.com",
      feeds: "Turns Cal.com bookings into the shared booking event used by alerts and the portal.",
      fields: [
        { key: "api_key", secret: true, label: "API key", hint: "Copy it from the client's Cal.com developer settings. It is stored for later API work; blank keeps the saved key." },
        { key: "path_secret", secret: true, label: "Webhook path secret", hint: "Use the random secret in the provider webhook URL. Leave blank to keep it; the first save generates one when needed." },
        { key: "contact_name", label: "Client contact name", hint: "The person onboarding emails should greet. Get it from client intake; blank leaves the name unavailable." },
        { key: "contact_email", label: "Client contact email", hint: "The inbox that receives onboarding. Get it from client intake; blank means payment onboarding has no fallback recipient." },
        { key: "booking_url", label: "Booking URL", hint: "The client's public Cal.com booking link. Copy it from Cal.com; blank hides the booking destination." },
      ],
    },
    {
      scope: "client",
      provider: "calendly",
      title: "Calendly",
      feeds: "Turns Calendly bookings into the same shared booking event as Cal.com.",
      fields: [
        { key: "path_secret", secret: true, label: "Webhook path secret", hint: "Use the random secret in the provider webhook URL. Leave blank to keep it; the first save generates one when needed." },
        { key: "contact_name", label: "Client contact name", hint: "The person onboarding emails should greet. Get it from client intake; blank leaves the name unavailable." },
        { key: "contact_email", label: "Client contact email", hint: "The inbox that receives onboarding. Get it from client intake; blank means payment onboarding has no fallback recipient." },
        { key: "booking_url", label: "Booking URL", hint: "The client's public Calendly link. Copy it from Calendly; blank hides the booking destination." },
      ],
    },
    {
      scope: "client",
      provider: "whop",
      title: "Whop",
      feeds: "Turns Whop payment events into payment records and the onboarding trigger.",
      fields: [
        { key: "api_key", secret: true, label: "API key", hint: "Copy it from the client's Whop developer settings. It is stored for later actions; blank keeps the saved key." },
        { key: "path_secret", secret: true, label: "Webhook path secret", hint: "Use the random secret in the Whop webhook URL. Leave blank to keep it; the first save generates one when needed." },
        { key: "contact_name", label: "Client contact name", hint: "The person onboarding emails should greet. Get it from client intake; blank leaves the name unavailable." },
        { key: "contact_email", label: "Client contact email", hint: "The inbox that receives onboarding. Get it from client intake; blank means payment onboarding has no fallback recipient." },
        { key: "company_id", label: "Company ID", hint: "The client's Whop account identifier, found in Whop. It is optional; blank stores no account reference." },
      ],
    },
    {
      scope: "client",
      provider: "stripe",
      title: "Stripe",
      feeds: "Verifies Stripe payment webhooks before recording money and starting onboarding.",
      fields: [
        { key: "path_secret", secret: true, label: "Webhook path secret", hint: "Use the random secret in the client-specific Stripe webhook URL. Blank keeps the saved value." },
        { key: "webhook_secret", secret: true, label: "Stripe signing secret", hint: "Copy it from Stripe after creating the webhook endpoint. It proves events are genuine; blank keeps the saved secret." },
        { key: "contact_name", label: "Client contact name", hint: "The person onboarding emails should greet. Get it from client intake; blank leaves the name unavailable." },
        { key: "contact_email", label: "Client contact email", hint: "The inbox that receives onboarding. Get it from client intake; blank means payment onboarding has no fallback recipient." },
        { key: "webhook_description", label: "Webhook label", hint: "An optional operator note describing this Stripe endpoint. Write it from the dashboard label; blank stores no note." },
      ],
    },
  ];

  const DELIVERY_SPECS = {
    content: {
      head: ["Title", "Stage", "Platform", "Scheduled", "Notes", ""],
      row: (item) => [
        esc(item.title || ""),
        esc({ production: "In production", scheduled: "Scheduled", published: "Published" }[item.stage] || item.stage || ""),
        esc(item.platform || "-"),
        item.scheduled_for ? formatDate(item.scheduled_for) : "-",
        esc(item.notes || "-"),
      ],
    },
    call: {
      head: ["Date", "Title", "Summary", "Recording", ""],
      row: (item) => [
        item.call_date ? formatDate(item.call_date) : "-",
        esc(item.title || "-"),
        esc((item.summary || "").slice(0, 80) || "-"),
        item.recording_url ? `<a href="${esc(item.recording_url)}" target="_blank" rel="noopener">Open recording</a>` : "-",
      ],
    },
    asset: {
      head: ["Label", "Kind", "URL", "Notes", ""],
      row: (item) => [
        esc(item.label || ""),
        esc(item.kind || "other"),
        item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">Open asset</a>` : "-",
        esc(item.notes || "-"),
      ],
    },
  };

  init();

  function init() {
    applySavedTheme();
    renderGlossaries();
    renderProofFields();
    renderWizardProofFields();
    renderWizardProgress();
    renderContentFields();
    renderIntegrationShell();
    bindEvents();
    routeFromHash();

    const saved = readStoredKey();
    if (saved) {
      $("adminKey").value = saved;
      unlockWithKey(saved, true);
    }
  }

  function bindEvents() {
    $("authForm").addEventListener("submit", (event) => {
      event.preventDefault();
      unlockWithKey($("adminKey").value.trim(), false);
    });
    $("themeButton").addEventListener("click", toggleTheme);
    $("authThemeButton").addEventListener("click", toggleTheme);
    $("lockButton").addEventListener("click", () => lockConsole(""));
    window.addEventListener("hashchange", routeFromHash);

    $("sharedClient").addEventListener("change", async (event) => {
      state.client = event.target.value;
      writeClientQuery();
      resetDeliveryForm();
      await loadCurrentRoute();
    });
    $("addClientButton").addEventListener("click", () => openClientWizard());
    $("emptyAddClientButton").addEventListener("click", () => openClientWizard());
    $("refreshClientsButton").addEventListener("click", loadSettings);
    $("refreshDeliveryButton").addEventListener("click", loadDelivery);
    $("refreshIntegrationsButton").addEventListener("click", loadAllIntegrations);
    $("refreshCampaignsButton").addEventListener("click", loadCampaigns);

    $("clientId").addEventListener("input", updatePreviewLinks);
    $("settingsForm").addEventListener("submit", saveSettings);
    $("generatePortalButton").addEventListener("click", generatePortalLink);
    $("copyPromptButton").addEventListener("click", copyProvisionPrompt);
    $("generateButton").addEventListener("click", generateProvisionViaApi);
    $("createPageButton").addEventListener("click", createProspectPage);
    $("copyResultButton").addEventListener("click", copyProvisionResult);
    $("loadResultButton").addEventListener("click", loadProvisionResult);

    $("wizardClientName").addEventListener("input", handleWizardNameInput);
    $("wizardClientId").addEventListener("input", handleWizardSlugInput);
    $("wizardClientId").addEventListener("blur", () => {
      $("wizardClientId").value = $("wizardClientId").value.trim();
      validateWizardIdentity();
    });
    $("wizardOpenExistingButton").addEventListener("click", openExistingWizardClient);
    $$("[data-wizard-choice]").forEach((button) => {
      button.addEventListener("click", () => selectWizardChoice(button.dataset.wizardChoice));
    });
    $$("[data-wizard-design]").forEach((button) => {
      button.addEventListener("click", () => selectWizardDesign(button.dataset.wizardDesign));
    });
    $("wizardBackButton").addEventListener("click", wizardBack);
    $("wizardContinueButton").addEventListener("click", handleWizardContinue);
    $("wizardSkipButton").addEventListener("click", wizardSkip);
    $("wizardSaveLaterButton").addEventListener("click", closeWizardAndRefresh);
    $("wizardCloseButton").addEventListener("click", requestWizardClose);
    $("wizardMintPortalButton").addEventListener("click", mintWizardPortalLink);
    $("wizardOpenFullFormButton").addEventListener("click", openWizardFullForm);
    $("clientWizard").addEventListener("keydown", handleWizardKeydown);

    $("openDeleteButton").addEventListener("click", openDeleteDialog);
    $("closeDeleteButton").addEventListener("click", () => closeDeleteDialog());
    $("cancelDeleteButton").addEventListener("click", () => closeDeleteDialog());
    $("deleteConfirmInput").addEventListener("input", updateDeleteConfirmation);
    $("confirmDeleteButton").addEventListener("click", deleteActiveClient);
    $("deleteDialog").addEventListener("keydown", handleDeleteKeydown);

    $$(".tab", $("deliveryTabs")).forEach((button) => {
      button.addEventListener("click", () => setDeliveryType(button.dataset.deliveryType));
    });
    $("deliveryForm").addEventListener("submit", saveDeliveryItem);
    $("deliveryCancelButton").addEventListener("click", resetDeliveryForm);
    $("markPaidForm").addEventListener("submit", markPaid);

    $$(".sort-button").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.campaignSort;
        state.campaignSort = state.campaignSort.key === key
          ? { key, dir: state.campaignSort.dir === "desc" ? "asc" : "desc" }
          : { key, dir: "desc" };
        renderCampaignRows();
      });
    });
  }

  function applySavedTheme() {
    let theme = "light";
    try {
      theme = localStorage.getItem("pulsify_admin_theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch {
      theme = "light";
    }
    document.documentElement.dataset.theme = theme;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("pulsify_admin_theme", next); } catch { /* storage may be unavailable */ }
  }

  function readStoredKey() {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of LEGACY_KEYS) {
        try {
          const value = storage.getItem(key);
          if (value) return value;
        } catch { /* storage may be unavailable */ }
      }
    }
    return "";
  }

  function persistKey(key) {
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* storage may be unavailable */ }
    try { sessionStorage.setItem(STORAGE_KEY, key); } catch { /* storage may be unavailable */ }
  }

  function clearStoredKeys() {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of LEGACY_KEYS) {
        try { storage.removeItem(key); } catch { /* storage may be unavailable */ }
      }
    }
  }

  async function unlockWithKey(key, automatic) {
    if (!key) return;
    const button = $("unlockButton");
    button.disabled = true;
    hideMessage($("authMessage"));
    try {
      const response = await fetch("/api/clients", { headers: { "x-admin-key": key } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) throw new Error(AUTH_MESSAGE);
        throw new Error(data.error || "The console could not verify this key.");
      }
      state.key = key;
      state.authPrompted = false;
      state.clients = data.clients || [];
      persistKey(key);
      pickInitialClient();
      renderClientSelector();
      $("authScreen").hidden = true;
      $("shell").hidden = false;
      await loadCurrentRoute();
    } catch (error) {
      state.key = "";
      if (!automatic || error.message === AUTH_MESSAGE) clearStoredKeys();
      showMessage($("authMessage"), error.message || "The console could not be unlocked.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function lockConsole(message = AUTH_MESSAGE) {
    state.key = "";
    clearStoredKeys();
    if (!$("clientWizard").hidden) {
      $("clientWizard").hidden = true;
      $("shell").inert = false;
      document.body.classList.remove("wizard-open");
    }
    if (!$("deleteDialog").hidden) closeDeleteDialog(false, true);
    $("shell").hidden = true;
    $("authScreen").hidden = false;
    $("adminKey").value = "";
    if (message) showMessage($("authMessage"), message, "error");
    else hideMessage($("authMessage"));
    $("adminKey").focus();
  }

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("x-admin-key", state.key);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      if (!state.authPrompted) {
        state.authPrompted = true;
        lockConsole(AUTH_MESSAGE);
      }
      throw new Error(AUTH_MESSAGE);
    }
    return response;
  }

  function pickInitialClient() {
    if (state.client && state.clients.some((client) => client.client === state.client)) return;
    state.client = state.clients[0]?.client || "";
  }

  function renderClientSelector() {
    const select = $("sharedClient");
    if (!state.clients.length && !state.client) {
      select.innerHTML = '<option value="">No clients configured</option>';
      select.disabled = true;
    } else {
      const options = [...state.clients];
      if (state.client && !options.some((client) => client.client === state.client)) {
        options.unshift({ client: state.client, client_name: state.client });
      }
      select.innerHTML = options.map((client) =>
        `<option value="${esc(client.client)}">${esc(client.client_name || client.client)}</option>`
      ).join("");
      select.value = state.client;
      select.disabled = false;
    }
    const noClient = !state.client;
    $("clientsEmpty").hidden = !noClient;
    $("deliveryNoClient").hidden = !noClient;
    $("deliveryPanel").hidden = noClient;
    $("integrationNoClient").hidden = !noClient;
    $("clientCards").hidden = noClient;
    $("markPaidPanel").hidden = noClient;
    renderDangerZone();
  }

  function renderDangerZone() {
    const active = state.clients.find((client) => client.client === state.client);
    $("dangerZone").hidden = !active;
    if (!active) return;
    const name = active.client_name || active.client;
    $("dangerZoneHint").textContent =
      `Permanently remove ${name} (${active.client}) and every record tied to them. This cannot be undone.`;
  }

  function openDeleteDialog() {
    const active = state.clients.find((client) => client.client === state.client);
    if (!active) return;

    deleteState.client = active.client;
    deleteState.clientName = active.client_name || active.client;
    deleteState.returnFocus = document.activeElement;
    deleteState.busy = false;
    $("deleteClientName").textContent = deleteState.clientName;
    $("deleteClientId").textContent = deleteState.client;
    $("deleteConfirmInput").value = "";
    $("confirmDeleteButton").textContent = "Delete client permanently";
    hideMessage($("deleteMessage"));
    updateDeleteConfirmation();
    $("deleteDialog").hidden = false;
    $("shell").inert = true;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => $("deleteConfirmInput").focus());
  }

  function closeDeleteDialog(restoreFocus = true, force = false) {
    if (deleteState.busy && !force) return;
    $("deleteDialog").hidden = true;
    $("shell").inert = false;
    document.body.classList.remove("modal-open");
    const returnFocus = deleteState.returnFocus;
    deleteState.client = "";
    deleteState.clientName = "";
    deleteState.returnFocus = null;
    deleteState.busy = false;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
  }

  function updateDeleteConfirmation() {
    const value = $("deleteConfirmInput").value;
    const armed = Boolean(deleteState.client) && value === deleteState.client;
    $("confirmDeleteButton").disabled = !armed || deleteState.busy;
    const status = $("deleteConfirmStatus");
    status.classList.toggle("armed", armed);
    if (!value) status.textContent = "";
    else if (armed) status.textContent = "Client ID matches. Permanent deletion is armed.";
    else status.textContent = "The client ID does not match.";
  }

  async function deleteActiveClient() {
    const client = deleteState.client;
    if (!client || $("deleteConfirmInput").value !== client || deleteState.busy) return;

    deleteState.busy = true;
    const button = $("confirmDeleteButton");
    button.disabled = true;
    button.textContent = "Deleting";
    hideMessage($("deleteMessage"));

    try {
      const response = await api(`/api/settings?client=${encodeURIComponent(client)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete this client.");

      deleteState.busy = false;
      closeDeleteDialog(false);
      state.clients = state.clients.filter((item) => item.client !== client);
      state.client = state.clients[0]?.client || "";
      state.currentConfig = null;
      deliveryState.all = { content: [], call: [], asset: [] };
      deliveryState.editingId = null;
      renderClientSelector();
      writeClientQuery();
      await loadSettings().catch((error) => {
        if (state.key) showMessage($("globalMessage"), error.message || "The next client could not be loaded.", "error");
      });
      showDeletionToast(client, data.deleted || {});
    } catch (error) {
      deleteState.busy = false;
      button.textContent = "Delete client permanently";
      updateDeleteConfirmation();
      if (state.key) showMessage($("deleteMessage"), error.message || "Could not delete this client.", "error");
    }
  }

  function handleDeleteKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDeleteDialog();
      return;
    }
    if (event.key === "Enter" && document.activeElement === $("deleteConfirmInput")) {
      event.preventDefault();
      deleteActiveClient();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = $$(
      'button:not(:disabled), input:not(:disabled)',
      $("deleteDialog")
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function showDeletionToast(client, deleted) {
    const toast = document.createElement("section");
    toast.className = "toast";
    toast.innerHTML = `
      <strong>${esc(client)} deleted</strong>
      <dl class="toast-counts">
        ${DELETE_TABLES.map((table) => `
          <div><dt>${esc(table)}</dt><dd>${number(deleted[table] || 0)}</dd></div>
        `).join("")}
      </dl>
    `;
    $("toastRegion").replaceChildren(toast);
    window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 15000);
  }

  async function refreshClients(preferredClient = state.client) {
    const response = await api("/api/clients");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not refresh clients.");
    state.clients = data.clients || [];
    if (preferredClient && state.clients.some((client) => client.client === preferredClient)) state.client = preferredClient;
    else pickInitialClient();
    renderClientSelector();
  }

  function writeClientQuery() {
    const url = new URL(location.href);
    if (state.client) url.searchParams.set("client", state.client);
    else url.searchParams.delete("client");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function routeFromHash() {
    const requested = location.hash.replace("#", "");
    state.route = ROUTES[requested] ? requested : "clients";
    if (!location.hash || !ROUTES[requested]) history.replaceState(null, "", `${location.pathname}${location.search}#${state.route}`);
    $$("[data-route-panel]").forEach((panel) => { panel.hidden = panel.dataset.routePanel !== state.route; });
    $$("[data-route]").forEach((link) => link.classList.toggle("active", link.dataset.route === state.route));
    $("routeEyebrow").textContent = ROUTES[state.route][0];
    $("routeTitle").textContent = ROUTES[state.route][1];
    if (state.key) loadCurrentRoute();
  }

  async function loadCurrentRoute() {
    hideMessage($("globalMessage"));
    try {
      if (state.route === "clients") await loadSettings();
      if (state.route === "delivery") await loadDelivery();
      if (state.route === "integrations") await loadAllIntegrations();
      if (state.route === "campaigns") await loadCampaigns();
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "This section could not be loaded.", "error");
    }
  }

  function renderGlossaries() {
    $$("[data-glossary]").forEach((drawer) => {
      const keys = GLOSSARY_SECTIONS[drawer.dataset.glossary] || [];
      drawer.querySelector(".glossary-grid").innerHTML = keys.map((key) => {
        const [term, meaning] = GLOSSARY[key];
        return `<dl class="glossary-item"><dt>${esc(term)}</dt><dd>${esc(meaning)}</dd></dl>`;
      }).join("");
    });
  }

  function renderProofFields() {
    $("proofImageFields").innerHTML = PROOF_TAGS.map((tag) => `
      <div class="field">
        <label>${esc(tag)} <span class="optional">Optional</span></label>
        <input class="proof-image-input" data-proof-tag="${esc(tag)}" type="url" placeholder="Paste a direct hosted image URL">
        <p class="field-hint">The direct hosted URL for the ${esc(tag.toLowerCase())} screenshot. Copy it from the image host; blank keeps the shimmer placeholder.</p>
      </div>
    `).join("");
  }

  function renderWizardProofFields() {
    $("wizardProofFields").innerHTML = PROOF_TAGS.map((tag) => `
      <div class="field">
        <label>${esc(tag)} <span class="optional">Optional</span></label>
        <input class="wizard-proof-input" data-proof-tag="${esc(tag)}" type="url" placeholder="Paste a direct hosted image URL">
        <p class="field-hint">The direct hosted URL for the ${esc(tag.toLowerCase())} screenshot. Copy it from the image host; blank keeps the shimmer placeholder.</p>
      </div>
    `).join("");
  }

  function renderWizardProgress() {
    $("wizardProgress").innerHTML = WIZARD_STEPS.map((label, index) =>
      `<li aria-label="Step ${index + 1}: ${esc(label)}"></li>`
    ).join("");
  }

  function openClientWizard(step = 1, existingClient = false) {
    const config = existingClient && state.currentConfig
      ? { ...state.currentConfig, proof_images: { ...(state.currentConfig.proof_images || {}) } }
      : {};
    wizardState.step = step;
    wizardState.created = existingClient;
    wizardState.slugEdited = existingClient;
    wizardState.choice = "";
    wizardState.design = config.template_variant || "canonical";
    wizardState.config = config;
    wizardState.returnFocus = document.activeElement;
    wizardState.busy = false;

    $("wizardClientName").value = existingClient ? (config.client_name || state.client || "") : "";
    $("wizardClientId").value = existingClient ? (config.client || state.client || "") : "";
    $("wizardClientName").disabled = existingClient;
    $("wizardClientId").disabled = existingClient;
    $("wizardWistiaId").value = config.wistia_media_id || "";
    $("wizardTypeformUrl").value = config.typeform_url || "";
    $("wizardKitTagId").value = config.kit_tag_id || "";
    $("wizardKitApiKey").value = "";
    setSavedState($("wizardKitKeyState"), Boolean(config.kit_api_key_set), "API key");
    $$(".wizard-proof-input").forEach((input) => {
      input.value = config.proof_images?.[input.dataset.proofTag] || "";
    });
    selectWizardChoice("");
    selectWizardDesign(wizardState.design);
    hideMessage($("wizardMessage"));
    hideMessage($("wizardPortalMessage"));

    $("clientWizard").hidden = false;
    $("shell").inert = true;
    document.body.classList.add("wizard-open");
    renderWizardStep();
  }

  function renderWizardStep() {
    const step = wizardState.step;
    const activeStep = document.querySelector(`[data-wizard-step="${step}"]`);
    $$(".wizard-step").forEach((section) => {
      section.hidden = section !== activeStep;
      const title = section.querySelector("h2");
      const intro = section.querySelector(".wizard-intro");
      if (title) title.removeAttribute("id");
      if (intro) intro.removeAttribute("id");
    });
    const activeTitle = activeStep?.querySelector("h2");
    const activeIntro = activeStep?.querySelector(".wizard-intro");
    if (activeTitle) activeTitle.id = "wizardTitle";
    if (activeIntro) activeIntro.id = "wizardIntro";

    $("wizardStepCount").textContent = `Step ${step} of ${WIZARD_STEPS.length}`;
    $$("#wizardProgress li").forEach((item, index) => {
      item.classList.toggle("complete", index + 1 < step);
      item.classList.toggle("current", index + 1 === step);
      if (index + 1 === step) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });

    $("wizardSaveLaterButton").hidden = step < 2;
    $("wizardSkipButton").hidden = step < 3 || step > 7;
    $("wizardContinueButton").textContent = wizardContinueLabel();
    $("wizardPreviewButton").href = wizardState.config.client
      ? `/?client=${encodeURIComponent(wizardState.config.client)}`
      : "#";
    if (step === 8) renderWizardSummary();
    if (step === 1) validateWizardIdentity();
    hideMessage($("wizardMessage"));
    $("clientWizard").querySelector(".wizard-body").scrollTop = 0;
    requestAnimationFrame(focusWizardStep);
  }

  function focusWizardStep() {
    const activeStep = document.querySelector(`[data-wizard-step="${wizardState.step}"]`);
    if (!activeStep) return;
    const target = activeStep.querySelector("input:not(:disabled), button.selected, button, a");
    (target || $("wizardContinueButton")).focus();
  }

  function handleWizardNameInput() {
    if (!wizardState.slugEdited) $("wizardClientId").value = slugifyClientName($("wizardClientName").value);
    validateWizardIdentity();
  }

  function handleWizardSlugInput() {
    wizardState.slugEdited = true;
    validateWizardIdentity();
  }

  function slugifyClientName(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
  }

  function validateWizardIdentity() {
    const name = $("wizardClientName").value.trim();
    const slug = $("wizardClientId").value.trim();
    const status = $("wizardSlugStatus");
    const openExisting = $("wizardOpenExistingButton");
    const taken = !wizardState.created && state.clients.some((client) => client.client === slug);
    openExisting.hidden = !taken;
    status.className = "wizard-inline-status";

    if (wizardState.created) {
      status.textContent = "Created. This permanent ID is now locked.";
      status.classList.add("valid");
      return { valid: true, name, slug, taken: false };
    }
    if (!slug) {
      status.textContent = "Use lowercase letters, numbers, and dashes.";
      return { valid: false, name, slug, taken: false };
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) {
      status.textContent = "Use lowercase letters, numbers, and single dashes only.";
      status.classList.add("invalid");
      return { valid: false, name, slug, taken: false };
    }
    if (taken) {
      status.textContent = "This client ID already exists.";
      status.classList.add("taken");
      return { valid: false, name, slug, taken: true };
    }
    status.textContent = name
      ? "Available. This ID becomes permanent when the client is created."
      : "The client name is still required.";
    status.classList.add(name ? "valid" : "invalid");
    return { valid: Boolean(name), name, slug, taken: false };
  }

  function selectWizardChoice(choice) {
    wizardState.choice = choice;
    $$("[data-wizard-choice]").forEach((button) => {
      const selected = button.dataset.wizardChoice === choice;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $("wizardTypeStatus").textContent = "";
    $("wizardTypeStatus").className = "wizard-inline-status";
  }

  function selectWizardDesign(design) {
    wizardState.design = design === "variant-02" ? "variant-02" : "canonical";
    $$("[data-wizard-design]").forEach((button) => {
      const selected = button.dataset.wizardDesign === wizardState.design;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  async function handleWizardContinue() {
    if (wizardState.busy) return;
    if (wizardState.step === 1) {
      if (wizardState.created) {
        wizardState.step = 2;
        renderWizardStep();
        return;
      }
      await createWizardClient(true);
      return;
    }
    if (wizardState.step === 2) {
      if (!wizardState.choice) {
        $("wizardTypeStatus").textContent = "Choose Signed client or Prospect page to continue.";
        $("wizardTypeStatus").className = "wizard-inline-status taken";
        return;
      }
      if (wizardState.choice === "prospect") {
        await routeWizardToProspect();
        return;
      }
      wizardState.step = 3;
      renderWizardStep();
      return;
    }
    if (wizardState.step === 3) {
      if (await saveWizardPartial({ template_variant: wizardState.design })) wizardAdvance();
      return;
    }
    if (wizardState.step === 4) {
      if (await saveWizardPartial({ wistia_media_id: $("wizardWistiaId").value.trim() })) wizardAdvance();
      return;
    }
    if (wizardState.step === 5) {
      if (await saveWizardPartial({ typeform_url: $("wizardTypeformUrl").value.trim() })) wizardAdvance();
      return;
    }
    if (wizardState.step === 6) {
      const payload = {
        kit_tag_id: $("wizardKitTagId").value.trim(),
        kit_api_key: $("wizardKitApiKey").value.trim(),
      };
      if (await saveWizardPartial(payload)) {
        $("wizardKitApiKey").value = "";
        setSavedState($("wizardKitKeyState"), Boolean(wizardState.config.kit_api_key_set), "API key");
        wizardAdvance();
      }
      return;
    }
    if (wizardState.step === 7) {
      const proofImages = Object.fromEntries(
        $$(".wizard-proof-input").map((input) => [input.dataset.proofTag, input.value.trim()])
      );
      if (await saveWizardPartial({ proof_images: proofImages })) wizardAdvance();
      return;
    }
    if (wizardState.step === 8) await closeWizardAndRefresh();
  }

  async function createWizardClient(advance) {
    const identity = validateWizardIdentity();
    if (!identity.valid) {
      if (!identity.taken) showMessage($("wizardMessage"), "Enter a client name and a valid permanent Client ID.", "error");
      return false;
    }
    const saved = await saveWizardPartial({
      client: identity.slug,
      client_name: identity.name,
    });
    if (!saved) return false;

    wizardState.created = true;
    wizardState.config.client = identity.slug;
    wizardState.config.client_name = identity.name;
    wizardState.config.template_variant = wizardState.config.template_variant || "canonical";
    $("wizardClientName").disabled = true;
    $("wizardClientId").disabled = true;
    state.client = identity.slug;
    if (!state.clients.some((client) => client.client === identity.slug)) {
      state.clients.push({ client: identity.slug, client_name: identity.name });
      state.clients.sort((a, b) => String(a.client_name || a.client).localeCompare(String(b.client_name || b.client)));
    }
    renderClientSelector();
    writeClientQuery();
    if (advance) {
      wizardState.step = 2;
      renderWizardStep();
    }
    return true;
  }

  async function saveWizardPartial(fields) {
    const client = fields.client || wizardState.config.client || $("wizardClientId").value.trim();
    if (!client) return false;
    setWizardBusy(true);
    hideMessage($("wizardMessage"));
    const payload = { client, ...fields };
    try {
      const response = await api("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save this wizard step.");
      mergeWizardConfig(fields);
      return true;
    } catch (error) {
      if (state.key) showMessage($("wizardMessage"), error.message || "Could not save this wizard step.", "error");
      return false;
    } finally {
      setWizardBusy(false);
    }
  }

  function mergeWizardConfig(fields) {
    Object.entries(fields).forEach(([key, value]) => {
      if (key === "kit_api_key") {
        if (value) wizardState.config.kit_api_key_set = true;
        return;
      }
      if (key === "proof_images") {
        wizardState.config.proof_images = Object.fromEntries(
          Object.entries(value || {}).filter(([, url]) => String(url || "").trim())
        );
        return;
      }
      wizardState.config[key] = value;
    });
  }

  function setWizardBusy(busy) {
    wizardState.busy = busy;
    [
      "wizardBackButton", "wizardContinueButton", "wizardSkipButton",
      "wizardSaveLaterButton", "wizardCloseButton",
    ].forEach((id) => { $(id).disabled = busy; });
    $("wizardContinueButton").textContent = busy ? "Saving" : wizardContinueLabel();
  }

  function wizardContinueLabel() {
    if (wizardState.step === 1) return wizardState.created ? "Continue" : "Create client";
    if (wizardState.step === 8) return "Finish";
    if (wizardState.step === 2) return "Continue";
    return "Save and continue";
  }

  function wizardAdvance() {
    wizardState.step = Math.min(8, wizardState.step + 1);
    renderWizardStep();
  }

  function wizardSkip() {
    if (wizardState.busy || wizardState.step < 3 || wizardState.step > 7) return;
    wizardAdvance();
  }

  function wizardBack() {
    if (wizardState.busy) return;
    if (wizardState.step === 1) {
      requestWizardClose();
      return;
    }
    wizardState.step -= 1;
    renderWizardStep();
  }

  async function requestWizardClose() {
    if (wizardState.busy) return;
    if (wizardState.created) {
      if (confirm("Save and finish later? Everything already saved will be kept.")) await closeWizardAndRefresh();
      return;
    }
    const identity = validateWizardIdentity();
    if (identity.valid && confirm("Save this client and finish later?")) {
      if (await createWizardClient(false)) await closeWizardAndRefresh();
      return;
    }
    if (confirm("Close without adding a client?")) closeClientWizard();
  }

  function closeClientWizard() {
    $("clientWizard").hidden = true;
    $("shell").inert = false;
    document.body.classList.remove("wizard-open");
    const returnFocus = wizardState.returnFocus;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }

  async function closeWizardAndRefresh() {
    closeClientWizard();
    if (!wizardState.created) return;
    try {
      await refreshClients(wizardState.config.client);
      if (state.route === "clients") await loadSettings();
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "The client was saved, but the console could not refresh.", "error");
    }
  }

  async function routeWizardToProspect() {
    const client = wizardState.config.client;
    closeClientWizard();
    state.client = client;
    renderClientSelector();
    writeClientQuery();
    if (state.route !== "clients") location.hash = "clients";
    try {
      await loadSettings();
      showMessage(
        $("provisionNote"),
        `Client ID "${client}" is already created. Continue with the New prospect page flow; the active client is preserved.`,
        "neutral"
      );
      $("newProspectPanel").scrollIntoView({ behavior: "smooth", block: "start" });
      $("provisionBrief").focus({ preventScroll: true });
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "Could not open the New prospect page flow.", "error");
    }
  }

  async function openExistingWizardClient() {
    const slug = $("wizardClientId").value.trim();
    if (!slug) return;
    closeClientWizard();
    state.client = slug;
    renderClientSelector();
    writeClientQuery();
    if (state.route !== "clients") location.hash = "clients";
    await loadSettings();
    $("settingsForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function wizardChecklist(config) {
    const proofCount = PROOF_TAGS.filter((tag) => Boolean(config.proof_images?.[tag])).length;
    const design = config.template_variant === "variant-02" ? "Variant 2" : "Standard";
    return [
      { step: 1, label: "Client name", detail: config.client_name || config.client || "", set: Boolean(config.client_name || config.client) },
      { step: 3, label: "Page design", detail: design, set: true },
      { step: 4, label: "VSL video", detail: config.wistia_media_id || "Wistia media ID is missing", set: Boolean(config.wistia_media_id) },
      { step: 5, label: "Application form", detail: config.typeform_url || "Typeform link is missing", set: Boolean(config.typeform_url) },
      {
        step: 6,
        label: "Email automation",
        detail: config.kit_tag_id && config.kit_api_key_set ? "Kit tag and API key are set" : "Kit tag ID or API key is missing",
        set: Boolean(config.kit_tag_id && config.kit_api_key_set),
      },
      {
        step: 7,
        label: "Proof wall",
        detail: `${proofCount} of ${PROOF_TAGS.length} proof images set`,
        set: proofCount === PROOF_TAGS.length,
      },
    ];
  }

  function renderWizardSummary() {
    $("wizardSummary").innerHTML = wizardChecklist(wizardState.config).map((item) => `
      <div class="wizard-summary-row${item.set ? "" : " pending"}">
        <span class="wizard-summary-icon" aria-hidden="true">${item.set ? "✓" : "+"}</span>
        <span><strong>${esc(item.label)}</strong><small>${esc(item.detail)}</small></span>
        <span class="wizard-summary-status">${item.set ? "Set" : "To add later"}</span>
      </div>
    `).join("");
  }

  function renderSetupChecklist() {
    const checklist = $("setupChecklist");
    if (!state.client || !state.currentConfig) {
      checklist.hidden = true;
      $("setupChecklistItems").innerHTML = "";
      return;
    }
    const pending = wizardChecklist(state.currentConfig).filter((item) => !item.set);
    checklist.hidden = pending.length === 0;
    $("setupChecklistItems").innerHTML = pending.map((item) =>
      `<button class="setup-checklist-item" type="button" data-setup-step="${item.step}">${esc(item.label)}</button>`
    ).join("");
    $$("[data-setup-step]", $("setupChecklistItems")).forEach((button) => {
      button.addEventListener("click", () => openClientWizard(Number(button.dataset.setupStep), true));
    });
  }

  async function mintWizardPortalLink() {
    const client = wizardState.config.client;
    if (!client || wizardState.busy) return;
    const button = $("wizardMintPortalButton");
    button.disabled = true;
    hideMessage($("wizardPortalMessage"));
    try {
      const response = await api(`/api/portal-token?client=${encodeURIComponent(client)}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not generate a portal link.");
      $("wizardPortalMessage").innerHTML = `<a href="${esc(data.link)}" target="_blank" rel="noopener">${esc(data.link)}</a>${data.note ? `<br>${esc(data.note)}` : ""}`;
      $("wizardPortalMessage").className = "message success";
      $("wizardPortalMessage").hidden = false;
    } catch (error) {
      if (state.key) showMessage($("wizardPortalMessage"), error.message || "Could not generate a portal link.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function openWizardFullForm() {
    closeClientWizard();
    state.client = wizardState.config.client;
    renderClientSelector();
    writeClientQuery();
    if (state.route !== "clients") location.hash = "clients";
    await loadSettings();
    $("settingsForm").scrollIntoView({ behavior: "smooth", block: "start" });
    $("clientName").focus({ preventScroll: true });
  }

  function handleWizardKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      requestWizardClose();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      const target = event.target;
      if (target.matches("textarea, button, a, select")) return;
      event.preventDefault();
      handleWizardContinue();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = $$(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary',
      $("clientWizard")
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function renderContentFields() {
    $("contentFields").innerHTML = CONTENT_FIELDS.map((field) => `
      <div class="field ${field.area ? "span-all" : ""}">
        <label>${esc(field.label)} <span class="optional">Optional</span></label>
        ${field.area
          ? `<textarea class="content-field" data-content-key="${field.key}" rows="3" placeholder="Leave blank for the template default"></textarea>`
          : `<input class="content-field" data-content-key="${field.key}" placeholder="Leave blank for the template default">`}
        <p class="field-hint">${esc(field.meaning)} Take it from approved page copy or generated JSON; blank uses the template's generic default.</p>
      </div>
    `).join("");
  }

  function clearSettingsFields(client = "") {
    $("clientId").value = client;
    $("clientName").value = "";
    $("templateVariant").value = "canonical";
    $("wistiaMediaId").value = "";
    $("typeformUrl").value = "";
    $("typeformSecret").value = "";
    $("kitTagId").value = "";
    $("kitApiKey").value = "";
    $("allowedOrigin").value = "";
    $$(".proof-image-input").forEach((input) => { input.value = ""; });
    $$(".content-field").forEach((input) => { input.value = ""; });
    setSavedState($("typeformSecretState"), false, "webhook secret");
    setSavedState($("kitKeyState"), false, "API key");
    updatePreviewLinks();
  }

  async function loadSettings() {
    hideMessage($("settingsMessage"));
    hideMessage($("portalLinkMessage"));
    if (!state.client) {
      state.currentConfig = null;
      clearSettingsFields("");
      $("settingsStatus").textContent = "New client";
      $("settingsStatus").className = "status-pill";
      renderSetupChecklist();
      return;
    }
    $("settingsStatus").textContent = "Loading";
    const response = await api(`/api/settings?client=${encodeURIComponent(state.client)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load client settings.");
    clearSettingsFields(state.client);
    const config = data.config;
    state.currentConfig = config ? { ...config, client: config.client || state.client } : null;
    if (config) {
      $("clientName").value = config.client_name || "";
      $("templateVariant").value = config.template_variant || "canonical";
      $("wistiaMediaId").value = config.wistia_media_id || "";
      $("typeformUrl").value = config.typeform_url || "";
      $("kitTagId").value = config.kit_tag_id || "";
      $("allowedOrigin").value = config.allowed_origin || "";
      setSavedState($("typeformSecretState"), Boolean(config.typeform_webhook_secret_set), "webhook secret");
      setSavedState($("kitKeyState"), Boolean(config.kit_api_key_set), "API key");
      const images = config.proof_images || {};
      $$(".proof-image-input").forEach((input) => { input.value = images[input.dataset.proofTag] || ""; });
      const content = config.page_content || {};
      $$(".content-field").forEach((input) => { input.value = content[input.dataset.contentKey] || ""; });
      $("settingsStatus").textContent = "Loaded";
      $("settingsStatus").className = "status-pill success";
    } else {
      $("settingsStatus").textContent = "Not configured";
      $("settingsStatus").className = "status-pill";
    }
    updatePreviewLinks();
    renderSetupChecklist();
  }

  function setSavedState(element, isSet, label) {
    element.textContent = isSet ? `Saved ${label} is set. Leave the field blank to keep it.` : `No saved ${label} reported.`;
    element.classList.toggle("set", isSet);
  }

  function updatePreviewLinks() {
    const client = encodeURIComponent($("clientId").value.trim());
    $("previewCanonical").href = client ? `/?client=${client}&preview=canonical` : "#";
    $("previewVariant").href = client ? `/?client=${client}&preview=variant-02` : "#";
  }

  async function saveSettings(event) {
    event.preventDefault();
    const button = $("saveSettingsButton");
    const client = $("clientId").value.trim();
    if (!client) {
      showMessage($("settingsMessage"), "Client ID is required.", "error");
      return;
    }
    button.disabled = true;
    hideMessage($("settingsMessage"));
    const payload = {
      client,
      client_name: $("clientName").value,
      wistia_media_id: $("wistiaMediaId").value,
      typeform_url: $("typeformUrl").value,
      typeform_webhook_secret: $("typeformSecret").value,
      kit_tag_id: $("kitTagId").value,
      kit_api_key: $("kitApiKey").value,
      allowed_origin: $("allowedOrigin").value,
      proof_images: Object.fromEntries($$(".proof-image-input").map((input) => [input.dataset.proofTag, input.value.trim()])),
      template_variant: $("templateVariant").value,
      page_content: Object.fromEntries($$(".content-field").map((input) => [input.dataset.contentKey, input.value.trim()])),
    };
    try {
      const response = await api("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save settings.");
      $("kitApiKey").value = "";
      $("typeformSecret").value = "";
      state.client = client;
      await refreshClients(client);
      writeClientQuery();
      await loadSettings();
      showMessage($("settingsMessage"), `Saved. Typeform webhook: ${data.webhook_url}`, "success");
    } catch (error) {
      if (state.key) showMessage($("settingsMessage"), error.message || "Could not save settings.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function generatePortalLink() {
    const client = $("clientId").value.trim() || state.client;
    if (!client) {
      showMessage($("portalLinkMessage"), "Select or enter a client before generating a portal link.", "error");
      return;
    }
    const button = $("generatePortalButton");
    button.disabled = true;
    hideMessage($("portalLinkMessage"));
    try {
      const response = await api(`/api/portal-token?client=${encodeURIComponent(client)}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not generate a portal link.");
      $("portalLinkMessage").innerHTML = `<a href="${esc(data.link)}" target="_blank" rel="noopener">${esc(data.link)}</a>${data.note ? `<br>${esc(data.note)}` : ""}`;
      $("portalLinkMessage").className = "message success";
      $("portalLinkMessage").hidden = false;
    } catch (error) {
      if (state.key) showMessage($("portalLinkMessage"), error.message || "Could not generate a portal link.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function copyProvisionPrompt() {
    const builder = window.PulsifyProvisionPrompt;
    if (!builder) {
      showMessage($("provisionNote"), "The prompt builder did not load. Reload the page and try again.", "error");
      return;
    }
    const text = builder.buildPrompt($("provisionBrief").value);
    copyText(text).then((copied) => {
      showMessage($("provisionNote"), copied ? "Landing-page prompt copied." : "The browser blocked copying. Select the generated prompt manually.", copied ? "success" : "error");
    });
  }

  async function generateProvisionViaApi() {
    const brief = $("provisionBrief").value.trim();
    if (!brief) {
      showMessage($("provisionNote"), "Paste a creator brief first.", "error");
      return;
    }
    const button = $("generateButton");
    button.disabled = true;
    button.textContent = "Generating";
    hideMessage($("provisionNote"));
    try {
      const response = await api("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 501) throw new Error("No server LLM key is configured. Use the copy-prompt path.");
      if (!response.ok || !data.ok || !data.result) throw new Error(data.error || "Generation failed. Use the copy-prompt path.");
      $("provisionJson").value = JSON.stringify(data.result, null, 2);
      showMessage($("provisionNote"), "Generated. Review the JSON, then create the page.", "success");
    } catch (error) {
      if (state.key) showMessage($("provisionNote"), error.message || "Generation failed. Use the copy-prompt path.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Generate with API";
    }
  }

  function stripCodeFences(text) {
    let value = String(text || "").trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start !== -1 && end > start) value = value.slice(start, end + 1);
    return value;
  }

  function sanitizeSlug(value) {
    const slug = String(value || "").toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    return /^[a-z0-9][a-z0-9_-]{1,63}$/.test(slug) ? slug : "";
  }

  async function createProspectPage() {
    hideMessage($("provisionMessage"));
    $("provisionResult").hidden = true;
    let parsed;
    try {
      parsed = JSON.parse(stripCodeFences($("provisionJson").value));
    } catch {
      showMessage($("provisionMessage"), "The result is not valid JSON. Remove any text outside the JSON object.", "error");
      return;
    }
    const slug = sanitizeSlug(parsed.client_slug || parsed.client_name || "");
    if (!slug) {
      showMessage($("provisionMessage"), "The JSON needs a usable client_slug made from lowercase letters, numbers, or hyphens.", "error");
      return;
    }
    const knownKeys = window.PulsifyProvisionPrompt?.knownTokenKeys?.() || [];
    const pageContent = {};
    if (parsed.page_content && typeof parsed.page_content === "object") {
      Object.keys(parsed.page_content).forEach((key) => {
        const value = parsed.page_content[key];
        if (knownKeys.includes(key) && value != null && String(value).trim()) pageContent[key] = String(value).trim();
      });
    }
    const templateVariant = parsed.template_variant === "variant-02" ? "variant-02" : "canonical";
    const clientName = String(parsed.client_name || "").trim() || slug;
    const button = $("createPageButton");
    button.disabled = true;
    try {
      let existing = null;
      const check = await api(`/api/settings?client=${encodeURIComponent(slug)}`);
      if (check.ok) existing = (await check.json().catch(() => ({}))).config || null;
      if (existing && !confirm(`"${slug}" already has a saved page. Overwrite it?`)) return;
      const response = await api("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: slug,
          client_name: clientName,
          template_variant: templateVariant,
          page_content: pageContent,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not create the page.");
      showProvisionResult(slug, clientName, templateVariant, pageContent);
      await refreshClients(slug);
      writeClientQuery();
      showMessage($("provisionMessage"), "Page saved.", "success");
    } catch (error) {
      if (state.key) showMessage($("provisionMessage"), error.message || "Could not create the page.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function showProvisionResult(slug, clientName, templateVariant, pageContent) {
    lastProvisionResult = { slug, clientName, templateVariant, pageContent };
    const link = `${location.origin}/?client=${encodeURIComponent(slug)}`;
    $("resultLink").href = link;
    $("resultLink").textContent = link;
    $("resultCanonical").href = `${link}&preview=canonical`;
    $("resultVariant").href = `${link}&preview=variant-02`;
    $("provisionResult").hidden = false;
  }

  function copyProvisionResult() {
    if (!lastProvisionResult) return;
    copyText(`${location.origin}/?client=${encodeURIComponent(lastProvisionResult.slug)}`);
  }

  async function loadProvisionResult() {
    if (!lastProvisionResult) return;
    state.client = lastProvisionResult.slug;
    renderClientSelector();
    writeClientQuery();
    await loadSettings();
    $("settingsForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setDeliveryType(type) {
    deliveryState.type = type;
    $$(".tab", $("deliveryTabs")).forEach((button) => button.classList.toggle("active", button.dataset.deliveryType === type));
    $$(".delivery-fields").forEach((row) => { row.hidden = row.dataset.deliveryFields !== type; });
    resetDeliveryForm();
    renderDeliveryTable();
  }

  async function loadDelivery() {
    if (!state.client) {
      deliveryState.all = { content: [], call: [], asset: [] };
      renderDeliveryTable();
      return;
    }
    const response = await api(`/api/client-data?client=${encodeURIComponent(state.client)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not load delivery data.");
    deliveryState.all = {
      content: data.content || [],
      call: data.calls || [],
      asset: data.assets || [],
    };
    renderDeliveryTable();
  }

  function collectDeliveryItem(type) {
    if (type === "content") {
      return {
        title: $("deliveryTitle").value.trim(),
        stage: $("deliveryStage").value,
        platform: $("deliveryPlatform").value.trim(),
        scheduled_for: $("deliveryScheduled").value,
        url: $("deliveryContentUrl").value.trim(),
        notes: $("deliveryContentNotes").value.trim(),
      };
    }
    if (type === "call") {
      return {
        call_date: $("deliveryCallDate").value,
        title: $("deliveryCallTitle").value.trim(),
        recording_url: $("deliveryRecordingUrl").value.trim(),
        summary: $("deliverySummary").value.trim(),
        decisions: $("deliveryDecisions").value.trim(),
        actions: $("deliveryActions").value.trim(),
      };
    }
    return {
      label: $("deliveryAssetLabel").value.trim(),
      kind: $("deliveryAssetKind").value,
      url: $("deliveryAssetUrl").value.trim(),
      notes: $("deliveryAssetNotes").value.trim(),
    };
  }

  async function saveDeliveryItem(event) {
    event.preventDefault();
    if (!state.client) return;
    const item = collectDeliveryItem(deliveryState.type);
    if (deliveryState.editingId) item.id = deliveryState.editingId;
    const button = $("deliverySubmitButton");
    button.disabled = true;
    hideMessage($("deliveryMessage"));
    try {
      const response = await api("/api/client-data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client: state.client, type: deliveryState.type, item }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the delivery item.");
      resetDeliveryForm();
      await loadDelivery();
      showMessage($("deliveryMessage"), "Delivery item saved.", "success");
    } catch (error) {
      if (state.key) showMessage($("deliveryMessage"), error.message || "Could not save the delivery item.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function fillDeliveryForm(type, item) {
    if (type === "content") {
      $("deliveryTitle").value = item.title || "";
      $("deliveryStage").value = item.stage || "production";
      $("deliveryPlatform").value = item.platform || "";
      $("deliveryScheduled").value = (item.scheduled_for || "").slice(0, 10);
      $("deliveryContentUrl").value = item.url || "";
      $("deliveryContentNotes").value = item.notes || "";
    } else if (type === "call") {
      $("deliveryCallDate").value = (item.call_date || "").slice(0, 10);
      $("deliveryCallTitle").value = item.title || "";
      $("deliveryRecordingUrl").value = item.recording_url || "";
      $("deliverySummary").value = item.summary || "";
      $("deliveryDecisions").value = item.decisions || "";
      $("deliveryActions").value = item.actions || "";
    } else {
      $("deliveryAssetLabel").value = item.label || "";
      $("deliveryAssetKind").value = item.kind || "other";
      $("deliveryAssetUrl").value = item.url || "";
      $("deliveryAssetNotes").value = item.notes || "";
    }
  }

  function resetDeliveryForm() {
    deliveryState.editingId = null;
    $("deliveryForm").reset();
    $("deliverySubmitButton").textContent = "Add item";
    $("deliveryCancelButton").hidden = true;
    hideMessage($("deliveryMessage"));
  }

  function startDeliveryEdit(id) {
    const item = deliveryState.rows.find((row) => String(row.id) === String(id));
    if (!item) return;
    deliveryState.editingId = item.id;
    fillDeliveryForm(deliveryState.type, item);
    $("deliverySubmitButton").textContent = "Save changes";
    $("deliveryCancelButton").hidden = false;
    $("deliveryForm").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function deleteDeliveryItem(id) {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    hideMessage($("deliveryMessage"));
    try {
      const response = await api("/api/client-data", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client: state.client, type: deliveryState.type, id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not delete the delivery item.");
      await loadDelivery();
      showMessage($("deliveryMessage"), "Delivery item deleted.", "success");
    } catch (error) {
      if (state.key) showMessage($("deliveryMessage"), error.message || "Could not delete the delivery item.", "error");
    }
  }

  function renderDeliveryTable() {
    const spec = DELIVERY_SPECS[deliveryState.type];
    const rows = deliveryState.all[deliveryState.type] || [];
    deliveryState.rows = rows;
    $("deliveryHead").innerHTML = `<tr>${spec.head.map((head) => `<th>${esc(head)}</th>`).join("")}</tr>`;
    $("deliveryRows").innerHTML = rows.map((item) => {
      const cells = spec.row(item).map((cell) => `<td>${cell}</td>`).join("");
      return `<tr>${cells}<td><div class="row-actions"><button data-delivery-edit="${esc(item.id)}" type="button">Edit</button><button data-delivery-delete="${esc(item.id)}" type="button">Delete</button></div></td></tr>`;
    }).join("");
    $("deliveryEmpty").hidden = rows.length > 0;
    $$("[data-delivery-edit]", $("deliveryRows")).forEach((button) => {
      button.addEventListener("click", () => startDeliveryEdit(button.dataset.deliveryEdit));
    });
    $$("[data-delivery-delete]", $("deliveryRows")).forEach((button) => {
      button.addEventListener("click", () => deleteDeliveryItem(button.dataset.deliveryDelete));
    });
  }

  function renderIntegrationShell() {
    $("operatorCards").innerHTML = OPERATOR_CARDS.map(renderIntegrationCard).join("");
    $("clientCards").innerHTML = CLIENT_CARDS.map(renderIntegrationCard).join("");
    $$("[data-integration-save]").forEach((button) => {
      button.addEventListener("click", () => saveIntegration(button.dataset.scope, button.dataset.provider));
    });
    $$("[data-integration-test]").forEach((button) => {
      button.addEventListener("click", () => testIntegration(button.dataset.scope, button.dataset.provider));
    });
    $$("[data-integration-disconnect]").forEach((button) => {
      button.addEventListener("click", () => disconnectIntegration(button.dataset.scope, button.dataset.provider));
    });
  }

  function renderIntegrationCard(card) {
    return `<article class="integration-card" id="integration-${card.scope}-${card.provider}">
      <div class="integration-head">
        <div><h3>${esc(card.title)}</h3><p>${esc(card.feeds)}</p></div>
        <span class="provider-status" id="integration-status-${card.scope}-${card.provider}">Not connected</span>
      </div>
      <div class="form-grid two">
        ${card.fields.map((field) => `
          <div class="field">
            <label>${esc(field.label)} <span class="${field.secret ? "optional" : "optional"}">${field.secret ? "Write only" : "Optional"}</span></label>
            <input data-integration-scope="${card.scope}" data-integration-provider="${card.provider}" data-integration-field="${field.key}" ${field.secret ? 'type="password"' : ""} placeholder="${field.secret ? "Paste a new value or leave blank" : "Enter a value if needed"}">
            <p class="field-hint">${esc(field.hint)}</p>
          </div>
        `).join("")}
      </div>
      <p class="integration-meta" id="integration-meta-${card.scope}-${card.provider}">Last event: none yet</p>
      <div class="button-row">
        <button class="button primary small" data-integration-save data-scope="${card.scope}" data-provider="${card.provider}" type="button">Save</button>
        <button class="button outline small" data-integration-test data-scope="${card.scope}" data-provider="${card.provider}" type="button">Test</button>
        <button class="button outline small" data-integration-disconnect data-scope="${card.scope}" data-provider="${card.provider}" type="button">Disconnect</button>
      </div>
      <div class="message" id="integration-message-${card.scope}-${card.provider}" role="status" hidden></div>
      <div class="one-time" id="integration-onetime-${card.scope}-${card.provider}" hidden></div>
    </article>`;
  }

  function integrationKey(scope, client, provider) {
    return `${scope}:${client || ""}:${provider}`;
  }

  async function loadAllIntegrations() {
    await Promise.all([loadIntegrationScope("operator"), state.client ? loadIntegrationScope("client") : Promise.resolve(), loadEnvironment()]);
    state.integrationsReady = true;
  }

  async function loadIntegrationScope(scope) {
    const client = scope === "client" ? state.client : "";
    if (scope === "client" && !client) return;
    const url = scope === "client"
      ? `/api/integrations?scope=client&client=${encodeURIComponent(client)}`
      : "/api/integrations?scope=operator";
    const response = await api(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not load integrations.");
    const cards = scope === "operator" ? OPERATOR_CARDS : CLIENT_CARDS;
    cards.forEach((card) => integrationRecords.delete(integrationKey(scope, client, card.provider)));
    (data.integrations || []).forEach((item) => {
      integrationRecords.set(integrationKey(item.scope, item.client || "", item.provider), item);
    });
    renderIntegrationScope(scope);
  }

  function renderIntegrationScope(scope) {
    const cards = scope === "operator" ? OPERATOR_CARDS : CLIENT_CARDS;
    const client = scope === "client" ? state.client : "";
    cards.forEach((card) => {
      const record = integrationRecords.get(integrationKey(scope, client, card.provider));
      const status = $(`integration-status-${scope}-${card.provider}`);
      status.textContent = record?.connected ? "Connected" : "Not connected";
      status.className = `provider-status${record?.connected ? " connected" : ""}`;
      $(`integration-meta-${scope}-${card.provider}`).textContent =
        `Last event: ${record?.last_event_ts ? new Date(record.last_event_ts).toLocaleString() : "none yet"}`;
      card.fields.forEach((field) => {
        const input = document.querySelector(`[data-integration-scope="${scope}"][data-integration-provider="${card.provider}"][data-integration-field="${field.key}"]`);
        if (!input) return;
        if (field.secret) {
          input.value = "";
          input.placeholder = record?.config?.[`${field.key}_set`] ? "Saved. Leave blank to keep it." : "Paste a new value or leave blank";
        } else {
          input.value = record?.config?.[field.key] || "";
        }
      });
      hideMessage($(`integration-message-${scope}-${card.provider}`));
      $(`integration-onetime-${scope}-${card.provider}`).hidden = true;
      $(`integration-onetime-${scope}-${card.provider}`).innerHTML = "";
    });
  }

  async function saveIntegration(scope, provider) {
    const client = scope === "client" ? state.client : "";
    const message = $(`integration-message-${scope}-${provider}`);
    const oneTime = $(`integration-onetime-${scope}-${provider}`);
    hideMessage(message);
    oneTime.hidden = true;
    oneTime.innerHTML = "";
    const card = [...OPERATOR_CARDS, ...CLIENT_CARDS].find((item) => item.scope === scope && item.provider === provider);
    const config = {};
    const secrets = {};
    card.fields.forEach((field) => {
      const input = document.querySelector(`[data-integration-scope="${scope}"][data-integration-provider="${provider}"][data-integration-field="${field.key}"]`);
      const value = input?.value.trim() || "";
      if (field.secret && value) secrets[field.key] = value;
      if (!field.secret && value) config[field.key] = value;
    });
    try {
      const response = await api("/api/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, client, provider, config, secrets }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save this integration.");
      integrationRecords.set(integrationKey(scope, client, provider), data.integration);
      renderIntegrationScope(scope);
      showMessage(message, "Saved.", "success");
      if (data.one_time?.webhook_url) {
        oneTime.innerHTML = `Webhook endpoint: <a href="${esc(data.one_time.webhook_url)}" target="_blank" rel="noopener">${esc(data.one_time.webhook_url)}</a><br>Copy it now. The raw secret does not return on future reads.`;
        oneTime.hidden = false;
      }
    } catch (error) {
      if (state.key) showMessage(message, error.message || "Could not save this integration.", "error");
    }
  }

  async function testIntegration(scope, provider) {
    const client = scope === "client" ? state.client : "";
    const message = $(`integration-message-${scope}-${provider}`);
    hideMessage(message);
    try {
      const response = await api(`/api/integrations?scope=${encodeURIComponent(scope)}&client=${encodeURIComponent(client)}&provider=${encodeURIComponent(provider)}&action=test`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Test failed.");
      let text = data.test?.connected ? "Config present." : "Config missing.";
      if (provider === "kit" && Array.isArray(data.test?.tags)) text = `Kit ping passed. Tags returned: ${data.test.tags.join(", ") || "none"}.`;
      if (provider === "discord") text = "Discord ping sent.";
      showMessage(message, text, "success");
    } catch (error) {
      if (state.key) showMessage(message, error.message || "Test failed.", "error");
    }
  }

  async function disconnectIntegration(scope, provider) {
    const client = scope === "client" ? state.client : "";
    const message = $(`integration-message-${scope}-${provider}`);
    hideMessage(message);
    try {
      const response = await api("/api/integrations", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, client, provider }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not disconnect this integration.");
      integrationRecords.delete(integrationKey(scope, client, provider));
      renderIntegrationScope(scope);
      showMessage(message, "Disconnected.", "success");
    } catch (error) {
      if (state.key) showMessage(message, error.message || "Could not disconnect this integration.", "error");
    }
  }

  async function loadEnvironment() {
    const response = await api("/api/integration-env");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load environment status.");
    $("envCards").innerHTML = (data.services || []).map((service) => `
      <article class="env-card">
        <span class="provider-status${service.connected ? " connected" : ""}">${service.connected ? "Connected" : "Not connected"}</span>
        <strong>${esc(service.label)}</strong>
        <p>${service.connected ? "Secret present in Cloudflare." : "Secret missing from Cloudflare."}</p>
      </article>
    `).join("") || '<div class="empty-state"><h3>No environment services reported</h3><p>The endpoint returned no service status records.</p></div>';
  }

  async function markPaid(event) {
    event.preventDefault();
    if (!state.client) return;
    const button = $("markPaidButton");
    button.disabled = true;
    hideMessage($("paymentMessage"));
    const payload = {
      client: state.client,
      amount: $("paymentAmount").value,
      currency: $("paymentCurrency").value.trim(),
      rail: $("paymentRail").value.trim(),
      reference: $("paymentReference").value.trim(),
      note: $("paymentNote").value.trim(),
    };
    try {
      const response = await api("/api/payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not record the payment.");
      const message = data.duplicate
        ? "This reference was already recorded. Onboarding was not sent again."
        : "Payment recorded. The existing onboarding flow has been started.";
      showMessage($("paymentMessage"), message, "success");
      if (!data.duplicate) {
        $("paymentAmount").value = "";
        $("paymentReference").value = "";
        $("paymentNote").value = "";
      }
    } catch (error) {
      if (state.key) showMessage($("paymentMessage"), error.message || "Could not record the payment.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function loadCampaigns() {
    const button = $("refreshCampaignsButton");
    button.disabled = true;
    try {
      const response = await api("/api/campaigns");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load campaigns.");
      state.campaigns = data.campaigns || [];
      renderCampaignSummary(data.summary || {});
      renderCampaignRows();
      $("campaignUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
      $("campaignUpdated").className = "status-pill success";
    } finally {
      button.disabled = false;
    }
  }

  function renderCampaignSummary(summary) {
    const cards = [
      ["Total pages", number(summary.total_pages), "clients configured with a page"],
      ["Pages with activity", number(summary.pages_with_activity), "visited, watched, or applied"],
      ["Total applications", number(summary.total_applications), "across every page"],
      ["Delivery failures (7d)", number(summary.total_failures_7d), "Kit sync and Typeform rejections"],
    ];
    $("campaignSummary").innerHTML = cards.map((card) => `
      <article class="metric-card"><span>${card[0]}</span><strong>${card[1]}</strong><small>${card[2]}</small></article>
    `).join("");
  }

  function campaignSortValue(campaign, key) {
    if (key === "visits") return campaign.visits?.visitors || 0;
    if (key === "watch") return campaign.video?.max_watch_percent || 0;
    if (key === "applications") return campaign.applications?.count || 0;
    if (key === "activity") return campaign.last_activity_at || "";
    if (key === "failures") return campaign.failures_7d || 0;
    return signalRank(campaign.signal);
  }

  function signalRank(signal) {
    return { applied: 3, hot: 2, visited: 1 }[signal] || 0;
  }

  function renderCampaignRows() {
    $$(".sort-button span").forEach((span) => { span.textContent = ""; });
    const activeSort = document.querySelector(`[data-campaign-sort="${state.campaignSort.key}"] span`);
    if (activeSort) activeSort.textContent = state.campaignSort.dir === "desc" ? "↓" : "↑";
    const rows = [...state.campaigns].sort((a, b) => {
      const av = campaignSortValue(a, state.campaignSort.key);
      const bv = campaignSortValue(b, state.campaignSort.key);
      let comparison = (typeof av === "string" || typeof bv === "string")
        ? String(av).localeCompare(String(bv))
        : Number(av || 0) - Number(bv || 0);
      if (state.campaignSort.dir === "desc") comparison *= -1;
      if (comparison) return comparison;
      const signal = signalRank(b.signal) - signalRank(a.signal);
      return signal || String(b.last_activity_at || "").localeCompare(String(a.last_activity_at || ""));
    });
    $("campaignRows").innerHTML = rows.map((campaign) => {
      const watch = Math.round(campaign.video?.max_watch_percent || 0);
      const otherVariant = campaign.template_variant === "variant-02" ? "canonical" : "variant-02";
      return `<tr>
        <td><strong>${esc(campaign.client_name || campaign.client)}</strong><span class="muted">${esc(campaign.client)}</span></td>
        <td><span class="badge">${esc(campaign.template_variant || "canonical")}</span></td>
        <td>${number(campaign.visits?.visitors)}<span class="muted">${number(campaign.visits?.page_views)} views</span></td>
        <td class="watch"><div class="watch-label"><span>${watch}%</span><span>${number(campaign.video?.plays)} plays</span></div><div class="watch-track"><i style="width:${Math.min(100, watch)}%"></i></div></td>
        <td>${number(campaign.applications?.count)}${campaign.applications?.kit_synced ? `<span class="muted">${number(campaign.applications.kit_synced)} synced to Kit</span>` : ""}</td>
        <td>${relativeTime(campaign.last_activity_at)}</td>
        <td>${failureBadge(campaign.failures_7d)}</td>
        <td>${signalBadge(campaign.signal)}</td>
        <td><div class="row-actions">
          <a class="button outline small" href="/?client=${encodeURIComponent(campaign.client)}" target="_blank" rel="noopener">Open page</a>
          <a class="button outline small" href="/?client=${encodeURIComponent(campaign.client)}&preview=${encodeURIComponent(otherVariant)}" target="_blank" rel="noopener">Preview alt</a>
          <button class="link-button" type="button" data-campaign-client="${esc(campaign.client)}" data-campaign-route="clients">Client setup</button>
          <button class="link-button" type="button" data-campaign-client="${esc(campaign.client)}" data-campaign-route="delivery">Delivery</button>
        </div></td>
      </tr>`;
    }).join("");
    $("campaignEmpty").hidden = rows.length > 0;
    $$("[data-campaign-client]", $("campaignRows")).forEach((button) => {
      button.addEventListener("click", () => {
        state.client = button.dataset.campaignClient;
        renderClientSelector();
        writeClientQuery();
        location.hash = button.dataset.campaignRoute;
      });
    });
  }

  function signalBadge(signal) {
    if (signal === "applied") return '<span class="badge success">Applied</span>';
    if (signal === "hot") return '<span class="badge accent">Hot</span>';
    if (signal === "visited") return '<span class="badge accent">Visited</span>';
    return '<span class="badge">No activity</span>';
  }

  function failureBadge(value) {
    const count = Number(value || 0);
    return count ? `<span class="badge failure">${number(count)}</span>` : '<span class="muted">0</span>';
  }

  function relativeTime(value) {
    if (!value) return "-";
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return "-";
    const difference = Math.abs(Date.now() - timestamp);
    if (difference < 60000) return "just now";
    if (difference < 3600000) return `${Math.round(difference / 60000)}m ago`;
    if (difference < 86400000) return `${Math.round(difference / 3600000)}h ago`;
    return `${Math.round(difference / 86400000)}d ago`;
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString() : "-";
  }

  function number(value) {
    return Number(value || 0).toLocaleString();
  }

  function showMessage(element, text, type = "neutral") {
    element.textContent = text;
    element.className = `message ${type}`;
    element.hidden = false;
  }

  function hideMessage(element) {
    element.hidden = true;
    element.textContent = "";
    element.className = "message";
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* use the fallback */ }
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
})();
