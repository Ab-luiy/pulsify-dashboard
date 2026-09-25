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
  const AUTH_MESSAGE = "Your session has expired. Sign in again.";
  const MAX_MEDIA_BYTES = 900 * 1024;
  const LINK_GROUPS = [
    {
      title: "Client access",
      note: "Client-facing entry points and intake.",
      entries: [
        { name: "Client portal", note: "Client workspace", url: "https://pulsify-ai.com/portal" },
        { name: "Client login", note: "Client sign-in", url: "https://pulsify-ai.com/portal/login" },
        { name: "Onboarding form", note: "Unique client token required", url: "https://pulsify-ai.com/onboard" },
      ],
    },
    {
      title: "Internal tools",
      note: "Operator surfaces used to run delivery and acquisition.",
      entries: [
        { name: "Operator admin", note: "Command center, follow-up queue, Studio review, and email", url: "https://pulsify-ai.com/admin" },
        { name: "SDR dashboard", note: "Leads and CRM", url: "https://ops.pulsify-ai.com" },
        { name: "Design preview", note: "Founder-approved portal design reference", url: "https://pulsify-ai.com/portal-preview" },
      ],
    },
    {
      title: "Legacy + infrastructure",
      note: "Reference builds and infrastructure controls.",
      entries: [
        { name: "Cloudflare dashboard", note: "Pulsify Pages and infrastructure", url: "https://dash.cloudflare.com/437f6dfbb738a4267395bd5da251494a" },
        { name: "Brain repo", note: "Private Pulsify operating repository", url: "https://github.com/Ab-luiy/pulsify-brain" },
      ],
    },
  ];
  const QUICK_LINK_NAMES = ["Client portal", "Client login", "Onboarding form", "SDR dashboard", "Design preview"];
  const ROUTES = {
    launch: ["Pulsify workspace", "Where would you like to go?"],
    command: ["Cross-client rollup", "Command center"],
    home: ["Operator overview", "Home"],
    clients: ["Client setup", "Clients"],
    brain: ["Structured client context", "Client brain"],
    delivery: ["Client-facing work", "Client work"],
    integrations: ["Money and handoff path", "Integrations"],
    email: ["Operator email", "Email"],
    campaigns: ["Client acquisition", "Acquisition pages"],
    links: ["Operator directory", "Links"],
  };

  const state = {
    key: "",
    clients: [],
    client: new URLSearchParams(location.search).get("client") || "",
    route: "command",
    authPrompted: false,
    integrationsReady: false,
    operatorClients: [],
    operatorSummary: {},
    operatorActivity: [],
    operatorSelectedClient: "",
    operatorSort: { key: "health", dir: "asc" },
    campaigns: [],
    campaignSort: { key: "signal", dir: "desc" },
    followups: [],
    followupFilters: { hideApplied: true, hideBooked: true },
    currentConfig: null,
    homeConfigs: new Map(),
    activity: [],
    campaignSummary: {},
    trackedAssets: [],
    studioReviews: [],
    carouselReviews: [],
    brain: null,
    emailConfigured: false,
    emailTags: [],
    emailDrafts: [],
    emailBusy: false,
    performance: {
      rows: [],
      weekSummary: null,
      weeklyReport: null,
      latestSnapshot: null,
      priorSnapshot: null,
      editingSequenceId: null,
    },
  };

  const deliveryState = {
    type: "content",
    rows: [],
    all: { content: [], call: [], asset: [] },
    editingId: null,
  };

  const integrationRecords = new Map();
  let lastProvisionResult = null;
  let activityDrawerReturnFocus = null;
  let acquisitionModalReturnFocus = null;
  let acquisitionEditingClient = "";
  let acquisitionSlugEdited = false;

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

  const previewState = {
    timer: null,
    collapsed: false,
  };

  const DELETE_TABLES = [
    "client_config",
    "content_items",
    "call_notes",
    "client_assets",
    "client_brain",
    "proof_items",
    "payments",
    "integrations",
    "integration_events",
    "delivery_failures",
    "email_drafts",
    "studio_carousels",
    "page_events",
    "media",
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
    proof: ["Proof-wall images", "Ordered direct image URLs for testimonials, results, DMs, payouts, and dashboards. Empty means the public proof section stays hidden."],
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
    { key: "VIDEO_LABEL", label: "Video overlay label", meaning: "The short label inside the hero video frame." },
    { key: "APPLY_STEP_LABEL", label: "Application step label", meaning: "The small step marker above the application." },
    { key: "APPLY_HEADING", label: "Application heading", meaning: "The headline that introduces the application form." },
    { key: "APPLY_INTRO", label: "Application intro", meaning: "The short explanation before the application form.", area: true },
    { key: "PROOF_KICKER", label: "Proof section kicker", meaning: "The small label above the proof block." },
    { key: "PROOF_HEADING", label: "Proof section heading", meaning: "The main heading above the student-proof section." },
    { key: "PROOF_INTRO", label: "Proof section intro", meaning: "The short introduction above the proof wall.", area: true },
    { key: "CASE_STUDY_LABEL", label: "Case-study label", meaning: "The small label above each video case-study card." },
    { key: "CASE_STUDY_CARD_ONE", label: "Case-study card one", meaning: "The first video case-study headline.", area: true },
    { key: "CASE_STUDY_CARD_TWO", label: "Case-study card two", meaning: "The second video case-study headline.", area: true },
    { key: "CASE_STUDY_CARD_THREE", label: "Case-study card three", meaning: "The third video case-study headline.", area: true },
    { key: "CLOSING_CTA", label: "Closing button text", meaning: "The action text on the final page button." },
    { key: "CLOSING_NOTE", label: "Closing note", meaning: "The small note under the final CTA.", area: true },
    { key: "PAGE_TITLE", label: "Browser tab title", meaning: "The title shown in the browser tab and link previews." },
    { key: "META_DESCRIPTION", label: "Search and share description", meaning: "The description used by search engines and shared links.", area: true },
    { key: "FOOTER_LABEL", label: "Footer name", meaning: "The name shown in the page footer." },
    { key: "FOOTER_DISCLAIMER", label: "Footer disclaimer", meaning: "The factual disclaimer shown at the bottom of the page.", area: true },
    { key: "BRAND_NOTE", label: "Brand note", meaning: "The small note beside the brand mark in variant 2." },
    { key: "MICRO_NOTE", label: "Hero micro-note", meaning: "The small line below the hero button in variant 2." },
    { key: "FORM_FRAME_LABEL", label: "Form frame label", meaning: "The small label around the form in variant 2." },
    { key: "FORM_FRAME_NOTE", label: "Form frame note", meaning: "The supporting note around the form in variant 2." },
  ];

  const OPERATOR_CARDS = [
    {
      scope: "operator",
      provider: "kit",
      title: "Kit",
      feeds: "Sends the onboarding email after payment and supports operator-wide email flows.",
      fields: [
        { key: "api_key", secret: true, label: "Kit v4 API key", hint: "Create it in Kit under Settings -> Developer. It sends onboarding email; blank keeps the saved key." },
        { key: "onboarding_subject", advanced: true, label: "Onboarding subject", hint: "Write the subject used on the automatic payment email. Get it from the approved onboarding copy; blank uses the backend default." },
        { key: "onboarding_preview_text", advanced: true, label: "Onboarding preview text", hint: "Write the inbox preview paired with the subject. Get it from approved onboarding copy; blank uses the backend default." },
        { key: "onboarding_sender_email", advanced: true, label: "Sending email", hint: "The approved from-address in the Kit account. Blank uses the Kit account default." },
        { key: "email_template_id", advanced: true, label: "Email template ID", hint: "The optional template number found in Kit. Blank sends the plain default email." },
        { key: "onboarding_form_url", advanced: true, label: "Onboarding form URL", hint: "The live intake-form share link. Copy it from Google Forms; blank uses the real backend default." },
        { key: "onboarding_doc_url", advanced: true, label: "CO1 doc URL", hint: "The live onboarding-document share link. Copy it from Google Docs; blank uses the real backend default." },
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
        { key: "path_secret", secret: true, advanced: true, label: "Webhook path secret", hint: "Use the random secret in the provider webhook URL. Leave blank to keep it; the first save generates one when needed." },
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
        { key: "path_secret", secret: true, advanced: true, label: "Webhook path secret", hint: "Use the random secret in the provider webhook URL. Leave blank to keep it; the first save generates one when needed." },
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
        { key: "path_secret", secret: true, advanced: true, label: "Webhook path secret", hint: "Use the random secret in the Whop webhook URL. Leave blank to keep it; the first save generates one when needed." },
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
        { key: "path_secret", secret: true, advanced: true, label: "Webhook path secret", hint: "Use the random secret in the client-specific Stripe webhook URL. Blank keeps the saved value." },
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

  window.PulsifyOperator = { navigate: routeFromHash, state };
  init();

  function init() {
    window.PulsifyTheme?.apply();
    renderGlossaries();
    renderProofFields();
    renderWizardProofFields();
    renderWizardProgress();
    renderContentFields();
    renderPerformanceTypeOptions();
    renderIntegrationShell();
    bindEvents();
    $("launchAddClient").onclick=()=>openClientWizard();
    routeFromHash();

    clearStoredKeys();
    unlockWithKey("access", true);
  }

  function bindEvents() {
    $("contractStatusButton").onclick = async () => {
      const target=$("contractStatus");target.textContent='Checking contract onboarding…';
      try {const response=await api('/api/contract-status');const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load onboarding status.');
        target.replaceChildren();const line=document.createElement('p');line.textContent=data.configured?'Configuration present. Test a completed contract before using this with clients.':'Setup required: '+data.missing.join(', ');target.append(line);
        const steps=document.createElement('p');steps.textContent='In DocuSign Connect, use JSON SIM with HMAC, recipients and custom fields. URL: '+data.webhook+'. Use the '+data.role+' signer role and envelope custom field pulsify_portal=true.';target.append(steps);
        for(const row of data.rows){const item=document.createElement('p');item.textContent=row.client_id+' · '+row.state+' · '+row.created_at;target.append(item);}
      } catch(error) {target.textContent=error.message;}
    };


    $("themeButton").addEventListener("click", toggleTheme);
    $("authThemeButton").addEventListener("click", toggleTheme);
    $("lockButton").addEventListener("click", () => lockConsole(""));
    window.addEventListener("hashchange", routeFromHash);
    window.addEventListener("resize", syncPreviewUi);
    window.addEventListener("message", handlePreviewMessage);

    $("sharedClient").addEventListener("change", async (event) => {
      state.client = event.target.value;
      writeClientQuery();
      syncAssetClientOptions();
      resetDeliveryForm();
      await loadCurrentRoute();
    });
    $("addClientButton").addEventListener("click", () => openClientWizard());
    $("homeAddClientButton").addEventListener("click", () => openClientWizard());
    $("emptyAddClientButton").addEventListener("click", () => openClientWizard());
    $("refreshOperatorButton").addEventListener("click", loadOperatorOverview);
    $("refreshHomeButton").addEventListener("click", loadHome);
    $("refreshStudioReviewButton").addEventListener("click", loadStudioReviewQueue);
    $("refreshCarouselReviewButton").addEventListener("click", loadCarouselReviewQueue);
    $("refreshClientsButton").addEventListener("click", loadSettings);
    $("refreshBrainButton").addEventListener("click", loadBrain);
    $("exportBrainButton").addEventListener("click", exportBrainContext);
    $("savePerformanceSequenceButton").addEventListener("click", savePerformanceSequence);
    $("clearPerformanceSequenceButton").addEventListener("click", clearPerformanceSequenceForm);
    $("savePerformanceSnapshotButton").addEventListener("click", savePerformanceSnapshot);
    $("refreshDeliveryButton").addEventListener("click", loadDelivery);
    $("refreshIntegrationsButton").addEventListener("click", loadAllIntegrations);
    $("refreshEmailButton").addEventListener("click", loadEmailComposer);
    $("emailComposeForm").addEventListener("submit", (event) => event.preventDefault());
    $("saveEmailDraftButton").addEventListener("click", () => submitEmail("draft"));
    $("sendEmailButton").addEventListener("click", () => submitEmail("send"));
    $("emailTag").addEventListener("change", syncEmailComposerUi);
    $("emailDraftRows").addEventListener("click", handleEmailDraftAction);
    $("refreshCampaignsButton").addEventListener("click", loadCampaigns);
    $("refreshLinksButton").addEventListener("click", loadLinksDirectory);
    $("linksDirectory").addEventListener("click", handleLinkCopy);
    $("openAcquisitionPageButton").addEventListener("click", () => openAcquisitionModal());
    $("closeAcquisitionModalButton").addEventListener("click", closeAcquisitionModal);
    $("cancelAcquisitionModalButton").addEventListener("click", closeAcquisitionModal);
    $("acquisitionModalBackdrop").addEventListener("click", closeAcquisitionModal);
    $("acquisitionPageForm").addEventListener("submit", saveAcquisitionPage);
    $("acquisitionPageName").addEventListener("input", syncAcquisitionModalPreview);
    $("acquisitionPageSlug").addEventListener("input", () => {
      acquisitionSlugEdited = true;
      syncAcquisitionModalPreview();
    });
    $("acquisitionVideo").addEventListener("input", syncAcquisitionModalPreview);
    $("acquisitionPageModal").addEventListener("keydown", handleAcquisitionModalKeydown);
    $("campaignRows").addEventListener("click", handleAcquisitionCardAction);
    $("hideAppliedFollowups").addEventListener("change", (event) => {
      state.followupFilters.hideApplied = event.target.checked;
      renderFollowupRows();
    });
    $("hideBookedFollowups").addEventListener("change", (event) => {
      state.followupFilters.hideBooked = event.target.checked;
      renderFollowupRows();
    });
    $("assetForm").addEventListener("submit", createTrackedAsset);
    $("copyAssetResultButton").addEventListener("click", () => copyTrackedAsset($("assetResultUrl").value));
    $("assetRows").addEventListener("click", handleTrackedAssetAction);
    $("brainSections").addEventListener("click", handleBrainAction);
    $("closeActivityDrawerButton").addEventListener("click", closeActivityDrawer);
    $("activityDrawerBackdrop").addEventListener("click", closeActivityDrawer);
    $("activityDrawer").addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeActivityDrawer();
    });
    $("operatorClientActions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-operator-route]");
      if (!button || !state.operatorSelectedClient) return;
      state.client = state.operatorSelectedClient;
      renderClientSelector();
      writeClientQuery();
      location.hash = button.dataset.operatorRoute;
    });

    $("clientId").addEventListener("input", () => {
      updatePreviewLinks();
      scheduleDraftPreview();
    });
    $("templateVariant").addEventListener("change", reloadLivePreview);
    $("settingsForm").addEventListener("input", (event) => {
      if (event.target !== $("templateVariant")) scheduleDraftPreview();
    });
    $("settingsForm").addEventListener("change", (event) => {
      if (event.target !== $("templateVariant")) scheduleDraftPreview();
    });
    $("settingsForm").addEventListener("submit", saveSettings);
    $("generateDashboardSetupButton").addEventListener("click", () => generateDashboardSetupLink(false));
    $("emailDashboardSetupButton").addEventListener("click", () => generateDashboardSetupLink(true));
    $("provisionNowButton").addEventListener("click", provisionNow);
    $("addProofImageButton").addEventListener("click", () => addProofRow("proofImageFields", "proof-image-input"));
    $("proofImageFields").addEventListener("click", handleProofListAction);
    $("proofImageFields").addEventListener("input", scheduleDraftPreview);
    bindProofUploader({
      input: $("proofFileInput"),
      dropZone: $("proofDropZone"),
      queue: $("proofUploadQueue"),
      context: "settings",
    });
    bindProofUploader({
      input: $("wizardProofFileInput"),
      dropZone: $("wizardProofDropZone"),
      queue: $("wizardProofUploadQueue"),
      context: "wizard",
    });
    $("togglePreviewButton").addEventListener("click", toggleLivePreview);
    $("closePreviewButton").addEventListener("click", closeLivePreview);
    $("livePreviewFrame").addEventListener("load", () => {
      scheduleDraftPreview(0);
      window.setTimeout(() => scheduleDraftPreview(0), 500);
    });
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
    $("wizardAddProofImageButton").addEventListener("click", () => addProofRow("wizardProofFields", "wizard-proof-input"));
    $("wizardProofFields").addEventListener("click", handleProofListAction);
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

    $$('[data-campaign-sort]').forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.campaignSort;
        state.campaignSort = state.campaignSort.key === key
          ? { key, dir: state.campaignSort.dir === "desc" ? "asc" : "desc" }
          : { key, dir: "desc" };
        renderCampaignRows();
      });
    });
    $$('[data-operator-sort]').forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.operatorSort;
        state.operatorSort = state.operatorSort.key === key
          ? { key, dir: state.operatorSort.dir === "desc" ? "asc" : "desc" }
          : { key, dir: key === "name" || key === "health" ? "asc" : "desc" };
        renderOperatorRows();
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
      const response = await fetch("/api/clients");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) throw new Error(AUTH_MESSAGE);
        throw new Error(data.error || "The console could not verify this session.");
      }
      state.key = key;
      state.authPrompted = false;
      state.clients = data.clients || [];
      window.dispatchEvent(new CustomEvent("pulsify:operator-ready", {detail:{clients:state.clients}}));
      pickInitialClient();
      renderClientSelector();
      $("authScreen").hidden = true;
      $("shell").hidden = false;
      renderQuickLinks();
      await loadCurrentRoute();
    } catch (error) {
      state.key = "";
      if (!automatic || error.message === AUTH_MESSAGE) clearStoredKeys();
      $("shell").hidden = true;
      $("authScreen").hidden = false;
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
    if (!$("activityDrawer").hidden) closeActivityDrawer();
    if (!$("acquisitionPageModal").hidden) closeAcquisitionModal(false);
    $("quickLinksGrid").replaceChildren();
    $("linksDirectory").replaceChildren();
    hideMessage($("linksMessage"));
    $("shell").hidden = true;
    $("authScreen").hidden = false;

    if (message) showMessage($("authMessage"), message, "error");
    else hideMessage($("authMessage"));
    location.href = "/portal/login?operator=1";
  }

  async function api(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.delete("x-admin-key");
    headers.set("x-pulsify-operator", "1");
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
    $("brainNoClient").hidden = !noClient;
    $("brainWorkspace").hidden = noClient;
    $("integrationNoClient").hidden = !noClient;
    $("clientCards").hidden = noClient;
    $("markPaidPanel").hidden = noClient;
    $("homeClientsEmpty").hidden = state.clients.length > 0;
    renderEmailClient();
    syncAssetClientOptions();
    renderDangerZone();
  }

  function syncAssetClientOptions() {
    const select = $("assetClient");
    if (!select) return;
    select.innerHTML = [
      '<option value="">Unassigned</option>',
      ...state.clients.map((client) =>
        `<option value="${esc(client.client)}">${esc(client.client_name || client.client)}</option>`
      ),
    ].join("");
    select.value = state.clients.some((client) => client.client === state.client) ? state.client : "";
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

  function routeFromHash(requestedView) {
    const requested = typeof requestedView === "string" ? requestedView : location.hash.replace("#", "").split("/")[0];
    state.route = ROUTES[requested] ? requested : "launch";

    $$("[data-route-panel]").forEach((panel) => { panel.hidden = panel.dataset.routePanel !== state.route; });
    $$("[data-route]").forEach((link) => link.classList.toggle("active", link.dataset.route === state.route));
    $("routeEyebrow").textContent = ROUTES[state.route][0];
    $("routeTitle").textContent = ROUTES[state.route][1];
    if (state.route !== "clients") closeLivePreview();
    if (state.route !== "campaigns" && !$("activityDrawer").hidden) closeActivityDrawer();
    if (state.route !== "campaigns" && !$("acquisitionPageModal").hidden) closeAcquisitionModal(false);
    syncPreviewUi();
    if (state.key) loadCurrentRoute();
  }

  async function loadCurrentRoute() {
    hideMessage($("globalMessage"));
    try {
      if (state.route === "command") await loadOperatorOverview();
      if (state.route === "home") await loadHome();
      if (state.route === "clients") await loadSettings();
      if (state.route === "brain") await loadBrain();
      if (state.route === "delivery") await loadDelivery();
      if (state.route === "integrations") await loadAllIntegrations();
      if (state.route === "email") await loadEmailComposer();
      if (state.route === "campaigns") await loadCampaigns();
      if (state.route === "links") await loadLinksDirectory();
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "This section could not be loaded.", "error");
    }
  }

  async function loadOperatorOverview() {
    const button = $("refreshOperatorButton");
    button.disabled = true;
    try {
      const response = await api("/api/operator-overview");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not load the command center.");
      }
      state.operatorClients = Array.isArray(data.clients) ? data.clients : [];
      state.operatorSummary = data.summary || {};
      state.operatorActivity = Array.isArray(data.operator_activity) ? data.operator_activity : [];
      if (state.operatorSelectedClient
        && !state.operatorClients.some((client) => client.client === state.operatorSelectedClient)) {
        state.operatorSelectedClient = "";
      }
      renderOperatorSummary();
      renderOperatorRows();
      renderOperatorActivity();
      $("operatorUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
      $("operatorUpdated").className = "status-pill success";
    } finally {
      button.disabled = false;
    }
  }

  function renderOperatorSummary() {
    const summary = state.operatorSummary || {};
    const cards = [
      ["Clients", number(summary.client_count), "configured client accounts"],
      ["At-risk", number(summary.at_risk_count), "clients below the watch threshold"],
      ["Collected", formatCurrencyTotals(summary.total_collected_by_currency), "recorded payment total"],
    ];
    $("operatorSummary").innerHTML = cards.map((card) => `
      <article class="metric-card"><span>${esc(card[0])}</span><strong>${esc(card[1])}</strong><small>${esc(card[2])}</small></article>
    `).join("");
  }

  function operatorSortValue(client, key) {
    if (key === "name") return String(client.client_name || client.client).toLowerCase();
    if (key === "collected") return Number(client.collected?.total_cents || 0);
    if (key === "followers") return Number(client.followers?.delta ?? -Infinity);
    if (key === "cadence") return Number(client.cadence?.posted_7d || 0);
    if (key === "brain") return Number(client.brain?.completeness_percent || 0);
    if (key === "activity") return client.last_activity_at || "";
    const rank = operatorHealthRank(client.health?.label);
    const score = client.health?.score == null ? 0 : Number(client.health.score) / 1000;
    return rank + score;
  }

  function renderOperatorRows() {
    $$('[data-operator-sort] span').forEach((span) => { span.textContent = ""; });
    const activeSort = document.querySelector(`[data-operator-sort="${state.operatorSort.key}"] span`);
    if (activeSort) activeSort.textContent = state.operatorSort.dir === "desc" ? "v" : "^";

    const rows = [...state.operatorClients].sort((a, b) => {
      const av = operatorSortValue(a, state.operatorSort.key);
      const bv = operatorSortValue(b, state.operatorSort.key);
      let comparison = (typeof av === "string" || typeof bv === "string")
        ? String(av).localeCompare(String(bv))
        : Number(av) - Number(bv);
      if (state.operatorSort.dir === "desc") comparison *= -1;
      if (comparison) return comparison;
      const risk = operatorHealthRank(a.health?.label) - operatorHealthRank(b.health?.label);
      if (risk) return risk;
      return String(a.client_name || a.client).localeCompare(String(b.client_name || b.client));
    });

    $("operatorRows").innerHTML = rows.map((client) => {
      const selected = state.operatorSelectedClient === client.client;
      const followerLatest = client.followers?.latest;
      const followerDelta = client.followers?.delta;
      const posted7d = Number(client.cadence?.posted_7d || 0);
      const brainPercent = Number(client.brain?.completeness_percent || 0);
      return `<tr class="${selected ? "selected" : ""}">
        <td><button class="operator-client-button" type="button" data-operator-client="${esc(client.client)}"><strong>${esc(client.client_name || client.client)}</strong><span>${esc(client.client)}</span></button></td>
        <td>${operatorHealthBadge(client.health)}</td>
        <td>${esc(formatMoney(client.collected?.total_cents, client.collected?.currency))}<span class="muted">${number(client.collected?.payment_count)} payments</span></td>
        <td>${followerLatest == null ? '<span class="muted">Not logged</span>' : `${number(followerLatest)}<span class="muted ${client.followers?.trend === "down" ? "negative" : ""}">${esc(formatDelta(followerDelta))}</span>`}</td>
        <td><strong>${number(posted7d)} / 7d</strong><span class="muted">${client.cadence?.last_posted_on ? `last post ${relativeTime(client.cadence.last_posted_on)}` : "No posts logged"}</span></td>
        <td><div class="operator-brain-value"><strong>${number(brainPercent)}%</strong><span>${number(client.brain?.sections_complete)} of ${number(client.brain?.total_sections)}</span></div></td>
        <td>${relativeTime(client.last_activity_at)}</td>
        <td><button class="operator-view-button" type="button" data-impersonate-client="${esc(client.client)}">View as client</button></td>
      </tr>`;
    }).join("");

    $("operatorEmpty").hidden = rows.length > 0;
    $$('[data-operator-client]', $("operatorRows")).forEach((button) => {
      button.addEventListener("click", () => openOperatorClient(button.dataset.operatorClient, button));
    });
    $$('[data-impersonate-client]', $("operatorRows")).forEach((button) => {
      button.addEventListener("click", () => startImpersonation(button.dataset.impersonateClient, button));
    });
  }

  async function startImpersonation(client, button) {
    if (!client) return;
    const portalWindow = window.open("about:blank", "_blank");
    if (portalWindow) portalWindow.opener = null;
    button.disabled = true;
    try {
      const response = await api("/api/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Could not start the operator view.");
      }
      if (data.event) state.operatorActivity.unshift(data.event);
      renderOperatorActivity();
      const destination = new URL(data.url, location.origin).toString();
      if (portalWindow) portalWindow.location.replace(destination);
      else window.open(destination, "_blank", "noopener");
    } catch (error) {
      if (portalWindow) portalWindow.close();
      if (state.key) showMessage($("globalMessage"), error.message || "Could not start the operator view.", "error");
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  async function openOperatorClient(client, button) {
    if (!client) return;
    button.disabled = true;
    try {
      const response = await api("/api/operator-overview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "view-client", client }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not record the client view.");
      }
      state.operatorSelectedClient = client;
      if (data.event) state.operatorActivity.unshift(data.event);
      renderOperatorRows();
      renderOperatorActivity();
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "Could not open the client.", "error");
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  function renderOperatorActivity() {
    const selected = state.operatorSelectedClient;
    const selectedClient = state.operatorClients.find((client) => client.client === selected);
    const rows = state.operatorActivity
      .filter((event) => !selected || event.client === selected)
      .slice(0, 12);

    $("operatorActivityTitle").textContent = selectedClient
      ? `${selectedClient.client_name || selectedClient.client} activity`
      : "Recent operator activity";
    $("operatorActivityMeta").textContent = selected
      ? `Audit events recorded for ${selected}.`
      : "Client views and read-only impersonation starts appear here.";
    $("operatorClientActions").hidden = !selected;
    $("operatorActivityList").innerHTML = rows.map((event) => `
      <div class="operator-activity-row">
        <span class="activity-dot" aria-hidden="true"></span>
        <p><strong>${esc(operatorActionLabel(event.action))}</strong><span>${esc(event.client || "No client")}</span></p>
        <time datetime="${esc(event.created_at || "")}">${relativeTime(event.created_at)}</time>
      </div>
    `).join("");
    $("operatorActivityEmpty").hidden = rows.length > 0;
  }

  function operatorActionLabel(action) {
    if (action === "view-client") return "Client opened";
    if (action === "impersonate-start") return "Operator view started";
    if (action === "impersonate-use") return "Operator view opened";
    return String(action || "Operator event");
  }

  function operatorHealthBadge(health) {
    const label = health?.label || "new / needs onboarding";
    const score = health?.score == null ? "No score" : `${number(health.score)} / 100`;
    const badgeClass = {
      healthy: "healthy",
      watch: "watch",
      "at-risk": "at-risk",
      "new / needs onboarding": "new",
    }[label] || "new";
    return `<span class="operator-health ${badgeClass}"><strong>${esc(label)}</strong><small>${esc(score)}</small></span>`;
  }

  function operatorHealthRank(label) {
    return { "at-risk": 0, watch: 1, "new / needs onboarding": 2, healthy: 3 }[label] ?? 4;
  }

  async function loadHome() {
    const button = $("refreshHomeButton");
    button.disabled = true;
    $("attentionCount").textContent = "Loading";
    try {
      const [activityResponse, campaignResponse, reviewResponse, carouselReviewResponse, configResults] = await Promise.all([
        api("/api/activity"),
        api("/api/campaigns"),
        api("/api/studio-sequences?status=review"),
        api("/api/studio-carousels?status=review"),
        Promise.all(state.clients.map(async (client) => {
          try {
            const response = await api(`/api/settings?client=${encodeURIComponent(client.client)}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Settings unavailable");
            return [client.client, data.config || null];
          } catch (error) {
            if (!state.key) throw error;
            return [client.client, null];
          }
        })),
      ]);
      const activityData = await activityResponse.json().catch(() => ({}));
      const campaignData = await campaignResponse.json().catch(() => ({}));
      const reviewData = await reviewResponse.json().catch(() => ({}));
      const carouselReviewData = await carouselReviewResponse.json().catch(() => ({}));
      if (!activityResponse.ok || !activityData.ok) {
        throw new Error(activityData.error || "Could not load activity.");
      }
      if (!campaignResponse.ok || !campaignData.ok) {
        throw new Error(campaignData.error || "Could not load page activity.");
      }
      if (!reviewResponse.ok || !reviewData.ok) {
        throw new Error(reviewData.error || "Could not load the studio review queue.");
      }
      if (!carouselReviewResponse.ok || !carouselReviewData.ok) {
        throw new Error(carouselReviewData.error || "Could not load the carousel review queue.");
      }
      state.homeConfigs = new Map(configResults);
      state.activity = Array.isArray(activityData.activity) ? activityData.activity : [];
      state.campaignSummary = campaignData.summary || {};
      state.studioReviews = Array.isArray(reviewData.rows) ? reviewData.rows : [];
      state.carouselReviews = Array.isArray(carouselReviewData.rows) ? carouselReviewData.rows : [];
      renderHome();
    } finally {
      button.disabled = false;
    }
  }

  function renderHome() {
    $("homeTrackingStat").textContent =
      `${number(state.campaignSummary.pages_with_activity)} of ${number(state.campaignSummary.total_pages)}`;
    const failuresByClient = new Map();
    state.activity
      .filter((item) => item.kind === "failure")
      .forEach((item) => {
        const failures = failuresByClient.get(item.client) || [];
        failures.push(item);
        failuresByClient.set(item.client, failures);
      });

    const attention = state.clients.map((client) => {
      const config = state.homeConfigs.get(client.client);
      const missing = config
        ? wizardChecklist(config).filter((item) => !item.set)
        : [{ label: "Page configuration", step: 1 }];
      return {
        client,
        missing,
        failures: failuresByClient.get(client.client) || [],
      };
    }).filter((item) => item.missing.length || item.failures.length);

    $("attentionCount").textContent = attention.length
      ? `${attention.length} ${attention.length === 1 ? "client" : "clients"}`
      : "Clear";
    $("attentionCount").className = `status-pill${attention.length ? "" : " success"}`;
    $("attentionStack").innerHTML = attention.map(({ client, missing, failures }) => `
      <button class="home-attention-row home-client-link" type="button" data-home-client="${esc(client.client)}">
        <span class="home-row-copy">
          <strong>${esc(client.client_name || client.client)}</strong>
          <small>${failures.length
            ? esc(`${failures.length} recent delivery ${failures.length === 1 ? "failure" : "failures"}`)
            : "Saved setup is incomplete"}</small>
        </span>
        <span class="health-chip-row">
          ${missing.map((item) => `<span class="health-chip missing">${esc(item.label)}</span>`).join("")}
          ${failures.slice(0, 2).map((failure) => `<span class="health-chip failure">${esc(failure.summary || "Delivery failed")}</span>`).join("")}
        </span>
      </button>
    `).join("");
    $("attentionEmpty").hidden = attention.length > 0;

    $("activityStack").innerHTML = state.activity.slice(0, 30).map((item) => {
      const client = state.clients.find((entry) => entry.client === item.client);
      const name = client?.client_name || item.client || "Operator";
      return `<div class="activity-row">
        <span class="activity-dot ${item.kind === "failure" ? "failure" : ""}" aria-hidden="true"></span>
        <p><strong>${esc(name)}:</strong> ${esc(lowerFirst(item.summary || "Activity recorded"))}.</p>
        <time datetime="${esc(item.ts || "")}">${relativeTime(item.ts)}</time>
      </div>`;
    }).join("");
    $("activityEmpty").hidden = state.activity.length > 0;

    $("clientHealthGrid").innerHTML = state.clients.map((client) => {
      const config = state.homeConfigs.get(client.client);
      const proofCount = proofImageValues(config?.proof_images).length;
      const kitReady = Boolean(config?.kit_tag_id && config?.kit_api_key_set);
      return `<button class="client-health-card home-client-link" type="button" data-home-client="${esc(client.client)}">
        <span class="client-health-head">
          <span><strong>${esc(client.client_name || client.client)}</strong><small>${esc(client.client)}</small></span>
          <span class="health-chip ${config ? "ready" : "missing"}">${config ? "Page live" : "Page missing"}</span>
        </span>
        <span class="health-chip-row">
          ${healthChip("Video", Boolean(config?.wistia_media_id))}
          ${healthChip("Form", Boolean(config?.typeform_url))}
          ${healthChip("Kit", kitReady)}
          <span class="health-chip ${proofCount ? "ready" : "missing"}">${proofCount} proof</span>
        </span>
      </button>`;
    }).join("");
    $("homeClientsEmpty").hidden = state.clients.length > 0;
    $$(".home-client-link").forEach((button) => {
      button.addEventListener("click", () => openHomeClient(button.dataset.homeClient));
    });
    renderStudioReviewQueue();
    renderCarouselReviewQueue();
  }

  async function loadStudioReviewQueue() {
    const button = $("refreshStudioReviewButton");
    button.disabled = true;
    try {
      const response = await api("/api/studio-sequences?status=review");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not load the studio review queue.");
      }
      state.studioReviews = Array.isArray(data.rows) ? data.rows : [];
      renderStudioReviewQueue();
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "Could not load the studio review queue.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function renderStudioReviewQueue() {
    $("studioReviewQueue").innerHTML = state.studioReviews.map((row) => `
      <article class="review-card">
        <div class="review-head">
          <div>
            <strong>${esc(row.client_id)} · ${esc(row.type || row.intent || "sequence")}</strong>
            <p>${esc(row.topic || "")}</p>
          </div>
          <span class="badge accent">${esc(row.status || "review")}</span>
        </div>
        <div class="review-meta">
          <span>Goal: ${esc(row.goal || "reach")}</span>
          <span>Updated ${relativeTime(row.updated_at)}</span>
        </div>
        <div class="review-slides">
          ${(Array.isArray(row.output?.slides) ? row.output.slides : []).map((slide) => `
            <div class="review-slide">
              <span class="review-slide-num">Slide ${Number(slide.n || 0)}</span>
              <strong>${esc(slide.job || "")}</strong>
              <div class="review-pill-list">${(slide.text_pills || []).map((pill) => `<span>${esc(pill)}</span>`).join("") || "<span>No copy returned</span>"}</div>
              <p>${esc(slide.photo?.primary || "")}</p>
            </div>
          `).join("") || `<div class="message error">No structured JSON was saved for this sequence. Open the manual prompt and regenerate.</div>`}
        </div>
        <label class="field review-output-box">
          <span>Paste finished sequence</span>
          <textarea rows="5" data-review-output="${row.id}" placeholder="Paste the final JSON or raw text here before approval."></textarea>
        </label>
        <div class="button-row">
          <button class="button outline small" type="button" data-review-attach="${row.id}">Save pasted output</button>
        </div>
        <label class="field">
          <span>Review note</span>
          <textarea rows="3" data-review-note="${row.id}" placeholder="Write the approval context or the rejection reason."></textarea>
        </label>
        <div class="button-row">
          <button class="button primary small" type="button" data-review-action="approve" data-review-id="${row.id}">Approve</button>
          <button class="button outline small" type="button" data-review-action="reject" data-review-id="${row.id}">Reject</button>
        </div>
      </article>
    `).join("");
    $("studioReviewEmpty").hidden = state.studioReviews.length > 0;
    $$("[data-review-action]", $("studioReviewQueue")).forEach((button) => {
      button.addEventListener("click", () => handleStudioReviewAction(button.dataset.reviewAction, Number(button.dataset.reviewId)));
    });
    $$("[data-review-attach]", $("studioReviewQueue")).forEach((button) => {
      button.addEventListener("click", () => attachStudioOutputFromReview(Number(button.dataset.reviewAttach)));
    });
  }

  async function loadCarouselReviewQueue() {
    const button = $("refreshCarouselReviewButton");
    button.disabled = true;
    try {
      const response = await api("/api/studio-carousels?status=review");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load the carousel review queue.");
      state.carouselReviews = Array.isArray(data.rows) ? data.rows : [];
      renderCarouselReviewQueue();
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "Could not load the carousel review queue.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function renderCarouselReviewQueue() {
    $("carouselReviewQueue").innerHTML = state.carouselReviews.map((row) => `
      <article class="review-card">
        <div class="review-head">
          <div>
            <strong>${esc(row.client_id)} | ${esc(row.structure || "carousel")}</strong>
            <p>${esc(row.topic || "")}</p>
          </div>
          <span class="badge accent">${esc(row.status || "review")}</span>
        </div>
        <div class="review-meta">
          <span>Goal: ${esc(row.goal || "reach")}</span>
          <span>Updated ${relativeTime(row.updated_at)}</span>
        </div>
        <div class="review-slides">
          ${(Array.isArray(row.output?.slides) ? row.output.slides : []).map((slide) => `
            <div class="review-slide">
              <span class="review-slide-num">Slide ${Number(slide.n || 0)} | ${esc(slide.role || "")}</span>
              <strong>${esc(slide.headline || "Copy pending")}</strong>
              ${slide.body ? `<p>${esc(slide.body)}</p>` : ""}
              ${slide.cta ? `<p><strong>CTA:</strong> ${esc(slide.cta)}</p>` : ""}
              ${renderCarouselDesignReview(slide)}
            </div>
          `).join("") || `<div class="message error">No structured slides were saved for this carousel.</div>`}
        </div>
        <label class="field">
          <span>Review note</span>
          <textarea rows="3" data-carousel-review-note="${row.id}" placeholder="Write the approval context or the rejection reason."></textarea>
        </label>
        <div class="button-row">
          <button class="button primary small" type="button" data-carousel-review-action="approve" data-carousel-review-id="${row.id}">Approve</button>
          <button class="button outline small" type="button" data-carousel-review-action="reject" data-carousel-review-id="${row.id}">Reject</button>
        </div>
      </article>
    `).join("");
    $("carouselReviewEmpty").hidden = state.carouselReviews.length > 0;
    $$('[data-carousel-review-action]', $("carouselReviewQueue")).forEach((button) => {
      button.addEventListener("click", () => handleCarouselReviewAction(button.dataset.carouselReviewAction, Number(button.dataset.carouselReviewId)));
    });
  }

  function renderCarouselDesignReview(slide) {
    const raw = slide?.design || slide?.design_direction || {};
    const annotations = raw.annotation || raw.annotations || [];
    const image = raw.image_class && typeof raw.image_class === "object"
      ? `${raw.image_class.type || ""}, ${raw.image_class.artifact || ""}`
      : String(raw.image_class || "");
    const chips = Array.isArray(raw.chips)
      ? raw.chips.map((chip) => `${chip.axis || "chip"}: ${chip.label || ""}`).join(", ")
      : "";
    return `
      <div class="review-meta carousel-review-design">
        <span>Annotation: ${esc((Array.isArray(annotations) ? annotations : [annotations]).map((item) => item?.type || item).filter(Boolean).join(", ") || "none")}</span>
        <span>Image: ${esc(image || "not set")}</span>
        ${chips ? `<span>Chips: ${esc(chips)}</span>` : ""}
        <span>Ghost: ${esc(raw.ghost_number || raw.ghostNumber || String(slide.n || 0).padStart(2, "0"))}</span>
      </div>
    `;
  }

  function healthChip(label, ready) {
    return `<span class="health-chip ${ready ? "ready" : "missing"}">${esc(label)} ${ready ? "set" : "missing"}</span>`;
  }

  function lowerFirst(value) {
    const text = String(value || "");
    return text ? text[0].toLowerCase() + text.slice(1).replace(/[.!?]+$/, "") : "";
  }

  function openHomeClient(client) {
    state.client = client;
    renderClientSelector();
    writeClientQuery();
    location.hash = "clients";
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

  function renderProofFields(images) {
    renderProofUrlList("proofImageFields", proofImageValues(images), "proof-image-input");
  }

  function renderWizardProofFields(images) {
    renderProofUrlList("wizardProofFields", proofImageValues(images), "wizard-proof-input");
  }

  function renderProofUrlList(containerId, urls, inputClass) {
    const rows = urls.length ? urls : [""];
    $(containerId).innerHTML = rows.map((url, index) => `
      <div class="proof-url-row" data-proof-row>
        <label for="${containerId}-${index}">Screenshot URL ${index + 1}</label>
        <input id="${containerId}-${index}" class="${inputClass}" type="url" value="${esc(url)}" placeholder="Paste a direct hosted image URL">
        <div class="proof-row-actions" aria-label="Reorder screenshot URL ${index + 1}">
          <button class="button outline icon-button" type="button" data-proof-action="up"${index === 0 ? " disabled" : ""}>Up</button>
          <button class="button outline icon-button" type="button" data-proof-action="down"${index === rows.length - 1 ? " disabled" : ""}>Down</button>
          <button class="button outline icon-button" type="button" data-proof-action="remove">Remove</button>
        </div>
      </div>
    `).join("");
  }

  function proofImageValues(images) {
    if (!images || typeof images !== "object") return [];
    return Object.values(images)
      .map((url) => String(url || "").trim())
      .filter(Boolean);
  }

  function proofListValues(container) {
    return $$('input[type="url"]', container).map((input) => input.value);
  }

  function proofImagesPayload(selector) {
    const urls = $$(selector)
      .map((input) => input.value.trim())
      .filter(Boolean);
    return Object.fromEntries(urls.map((url, index) => [String(index + 1), url]));
  }

  function addProofRow(containerId, inputClass) {
    const container = $(containerId);
    renderProofUrlList(containerId, [...proofListValues(container), ""], inputClass);
    const inputs = $$(`.${inputClass}`, container);
    inputs.at(-1)?.focus();
    if (containerId === "proofImageFields") scheduleDraftPreview();
  }

  function handleProofListAction(event) {
    const button = event.target.closest("[data-proof-action]");
    if (!button) return;
    const container = event.currentTarget;
    const row = button.closest("[data-proof-row]");
    const rows = $$("[data-proof-row]", container);
    const index = rows.indexOf(row);
    if (index < 0) return;

    const values = proofListValues(container);
    const action = button.dataset.proofAction;
    if (action === "remove") values.splice(index, 1);
    if (action === "up" && index > 0) [values[index - 1], values[index]] = [values[index], values[index - 1]];
    if (action === "down" && index < values.length - 1) [values[index + 1], values[index]] = [values[index], values[index + 1]];

    const inputClass = container.id === "wizardProofFields" ? "wizard-proof-input" : "proof-image-input";
    renderProofUrlList(container.id, values, inputClass);
    const focusIndex = action === "up" ? index - 1 : action === "down" ? index + 1 : Math.min(index, Math.max(0, values.length - 1));
    $$(`.${inputClass}`, container)[focusIndex]?.focus();
    if (container.id === "proofImageFields") scheduleDraftPreview();
  }

  function bindProofUploader({ input, dropZone, queue, context }) {
    input.addEventListener("change", () => {
      processProofFiles(input.files, context, queue);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach((type) => {
      dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        dropZone.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        dropZone.classList.remove("dragging");
      });
    });
    dropZone.addEventListener("drop", (event) => {
      processProofFiles(event.dataTransfer?.files, context, queue);
    });
  }

  async function processProofFiles(fileList, context, queue) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const client = context === "wizard"
      ? wizardState.config.client
      : ($("clientId").value.trim() || state.client);
    if (!client) {
      appendUploadError(queue, "Select or create a client before uploading proof.");
      return;
    }

    const uploads = files.map((file) => ({ file, row: createUploadRow(queue, file.name) }));
    for (const { file, row } of uploads) {
      try {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          throw new Error("Use a PNG, JPEG, or WebP image.");
        }
        updateUploadRow(row, "Compressing", 8);
        const compressed = await compressProofImage(file);
        if (compressed.blob.size > MAX_MEDIA_BYTES) {
          throw new Error(
            `Still ${formatBytes(compressed.blob.size)} after compression. Crop the image or export it smaller, then try again. The upload limit is 900KB.`
          );
        }
        updateUploadRow(row, `Uploading ${formatBytes(compressed.blob.size)}`, 18);
        const dataBase64 = await blobToBase64(compressed.blob);
        const result = await uploadMedia({
          client,
          filename: replaceFileExtension(file.name, compressed.extension),
          contentType: compressed.blob.type,
          dataBase64,
          onProgress: (percent) => updateUploadRow(row, "Uploading", 18 + Math.round(percent * 0.8)),
        });
        appendProofUrl(context, result.url);
        updateUploadRow(row, "Added to proof list", 100, "success");
      } catch (error) {
        updateUploadRow(row, error.message || "Upload failed.", 100, "error");
      }
    }
  }

  async function compressProofImage(file) {
    const image = await loadImage(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) throw new Error("The image could not be read.");
    const width = Math.min(1600, sourceWidth);
    const height = Math.max(1, Math.round(sourceHeight * (width / sourceWidth)));

    const jpegCanvas = document.createElement("canvas");
    jpegCanvas.width = width;
    jpegCanvas.height = height;
    const jpegContext = jpegCanvas.getContext("2d");
    jpegContext.fillStyle = "#ffffff";
    jpegContext.fillRect(0, 0, width, height);
    jpegContext.drawImage(image, 0, 0, width, height);
    const jpeg = await canvasToBlob(jpegCanvas, "image/jpeg", 0.85);
    if (!jpeg) throw new Error("The browser could not compress this image.");

    if (file.type === "image/png") {
      const pngCanvas = document.createElement("canvas");
      pngCanvas.width = width;
      pngCanvas.height = height;
      pngCanvas.getContext("2d").drawImage(image, 0, 0, width, height);
      const png = await canvasToBlob(pngCanvas, "image/png");
      if (png && png.size < jpeg.size) return { blob: png, extension: "png" };
    }
    return { blob: jpeg, extension: "jpg" };
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("The image could not be read."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
      reader.onerror = () => reject(new Error("The compressed image could not be prepared."));
      reader.readAsDataURL(blob);
    });
  }

  function uploadMedia({ client, filename, contentType, dataBase64, onProgress }) {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", "/api/media");
      request.setRequestHeader("content-type", "application/json");
      request.setRequestHeader("x-admin-key", state.key);
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      });
      request.addEventListener("load", () => {
        let data = {};
        try { data = JSON.parse(request.responseText || "{}"); } catch { data = {}; }
        if (request.status === 401) {
          lockConsole(AUTH_MESSAGE);
          reject(new Error(AUTH_MESSAGE));
          return;
        }
        if (request.status < 200 || request.status >= 300 || !data.ok || !data.url) {
          reject(new Error(data.error || `Upload failed with status ${request.status}.`));
          return;
        }
        resolve(data);
      });
      request.addEventListener("error", () => reject(new Error("The upload could not reach the server.")));
      request.send(JSON.stringify({
        client,
        filename,
        content_type: contentType,
        data_base64: dataBase64,
      }));
    });
  }

  function appendProofUrl(context, url) {
    const containerId = context === "wizard" ? "wizardProofFields" : "proofImageFields";
    const inputClass = context === "wizard" ? "wizard-proof-input" : "proof-image-input";
    const container = $(containerId);
    const values = proofListValues(container);
    const emptyIndex = values.findIndex((value) => !String(value).trim());
    if (emptyIndex >= 0) values[emptyIndex] = url;
    else values.push(url);
    renderProofUrlList(containerId, values, inputClass);
    if (context === "wizard") {
      wizardState.config.proof_images = proofImagesPayload(".wizard-proof-input");
    } else {
      scheduleDraftPreview(0);
    }
  }

  function createUploadRow(queue, filename) {
    const row = document.createElement("div");
    row.className = "upload-row";
    row.innerHTML = `
      <span class="upload-name">${esc(filename)}</span>
      <span class="upload-status">Queued</span>
      <progress max="100" value="0"></progress>
    `;
    queue.appendChild(row);
    return row;
  }

  function updateUploadRow(row, status, progress, result = "") {
    row.className = `upload-row${result ? ` ${result}` : ""}`;
    row.querySelector(".upload-status").textContent = status;
    row.querySelector("progress").value = Math.max(0, Math.min(100, progress));
  }

  function appendUploadError(queue, message) {
    const row = createUploadRow(queue, "Upload");
    updateUploadRow(row, message, 100, "error");
  }

  function replaceFileExtension(filename, extension) {
    const stem = String(filename || "proof").replace(/\.[^.]+$/, "") || "proof";
    return `${stem}.${extension}`;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    return `${Math.round(bytes / 1024)}KB`;
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
    renderWizardProofFields(config.proof_images);
    $("wizardProofUploadQueue").replaceChildren();
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
      ? `/${encodeURIComponent(wizardState.config.client)}?operator_preview=1`
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
      const proofImages = proofImagesPayload(".wizard-proof-input");
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
      if (state.route === "home") await loadHome();
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
    const proofCount = proofImageValues(config.proof_images).length;
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
        detail: `${proofCount} proof ${proofCount === 1 ? "image" : "images"} set`,
        set: proofCount > 0,
      },
    ];
  }

  function renderWizardSummary() {
    $("wizardSummary").innerHTML = wizardChecklist(wizardState.config).map((item) => `
      <div class="wizard-summary-row${item.set ? "" : " pending"}">
        <span class="wizard-summary-icon" aria-hidden="true">${item.set ? "OK" : "+"}</span>
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
      $("wizardPortalMessage").innerHTML = clientAccessLinksMarkup(data, client);
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

  function renderPerformanceTypeOptions() {
    const options = [
      "value-driven",
      "credibility",
      "q&a",
      "day-in-the-life",
      "breakdown",
      "lifestyle",
      "cta",
      "start-here",
      "story launch",
    ];
    $("adminSequenceType").innerHTML = options.map((type) => `<option value="${esc(type)}">${esc(type)}</option>`).join("");
    $("adminSequenceType").value = options[0];
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
    $("dashboardLoginEmail").value = "";
    $("dashboardPlansJson").value = "";
    $("dashboardTodosJson").value = "";
    $("dashboardTeamJson").value = "";
    $("dashboardMomentumJson").value = "";
    $("dashboardEmailHint").textContent = "Setup-link emails are off until RESEND_API_KEY is set.";
    $("emailDashboardSetupButton").disabled = true;
    renderProofFields();
    $$(".content-field").forEach((input) => { input.value = ""; });
    setSavedState($("typeformSecretState"), false, "webhook secret");
    setSavedState($("kitKeyState"), false, "API key");
    setSavedState($("dashboardPasswordState"), false, "dashboard password");
    clearPerformanceForms();
    renderPerformanceSection();
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
      reloadLivePreview();
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
      renderProofFields(images);
      const content = config.page_content || {};
      $$(".content-field").forEach((input) => { input.value = content[input.dataset.contentKey] || ""; });
      $("dashboardLoginEmail").value = data.dashboard_auth?.email || "";
      setSavedState($("dashboardPasswordState"), Boolean(data.dashboard_auth?.has_password), "dashboard password");
      syncDashboardEmailUi(data.dashboard_auth);
      $("dashboardPlansJson").value = formatJsonForEditor(data.dashboard_content?.plans);
      $("dashboardTodosJson").value = formatJsonForEditor(data.dashboard_content?.todos);
      $("dashboardTeamJson").value = formatJsonForEditor(data.dashboard_content?.team);
      $("dashboardMomentumJson").value = formatJsonForEditor(data.dashboard_content?.momentum);
      $("settingsStatus").textContent = "Loaded";
      $("settingsStatus").className = "status-pill success";
    } else {
      $("settingsStatus").textContent = "Not configured";
      $("settingsStatus").className = "status-pill";
      $("dashboardLoginEmail").value = data.dashboard_auth?.email || "";
      setSavedState($("dashboardPasswordState"), Boolean(data.dashboard_auth?.has_password), "dashboard password");
      syncDashboardEmailUi(data.dashboard_auth);
      $("dashboardPlansJson").value = formatJsonForEditor(data.dashboard_content?.plans);
      $("dashboardTodosJson").value = formatJsonForEditor(data.dashboard_content?.todos);
      $("dashboardTeamJson").value = formatJsonForEditor(data.dashboard_content?.team);
      $("dashboardMomentumJson").value = formatJsonForEditor(data.dashboard_content?.momentum);
    }
    updatePreviewLinks();
    renderSetupChecklist();
    reloadLivePreview();
    await loadPerformanceEntries();
  }

  async function loadBrain() {
    hideMessage($("brainMessage"));
    if (!state.client) {
      state.brain = null;
      $("brainSummary").innerHTML = "";
      $("brainSections").innerHTML = "";
      return;
    }

    const button = $("refreshBrainButton");
    button.disabled = true;
    try {
      const response = await api(`/api/client-brain?client=${encodeURIComponent(state.client)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load this client brain.");
      state.brain = data;
      renderBrain();
    } finally {
      button.disabled = false;
    }
  }

  async function exportBrainContext() {
    if (!state.client) return;
    const button = $("exportBrainButton");
    button.disabled = true;
    hideMessage($("brainMessage"));
    try {
      const response = await api(`/api/client-brain-export?client=${encodeURIComponent(state.client)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Could not export this context package.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/i)?.[1] || `${state.client}-pulsify-context.md`;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      showMessage($("brainMessage"), "Context package downloaded.", "neutral");
    } catch (error) {
      if (state.key) showMessage($("brainMessage"), error.message || "Could not export this context package.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function renderBrain() {
    const data = state.brain;
    if (!data) return;
    const summary = data.summary || {};
    $("brainSummary").innerHTML = `
      <article><span>Client</span><strong>${esc(data.client_name || data.client)}</strong><small>${esc(data.client)}</small></article>
      <article><span>Fields filled</span><strong>${number(summary.filled_fields)} / ${number(summary.total_fields)}</strong><small>Structured answers and operator facts</small></article>
      <article class="${Number(summary.gaps || 0) ? "has-gaps" : ""}"><span>Gaps</span><strong>${number(summary.gaps)}</strong><small>Fields still empty</small></article>
      <article><span>Last updated</span><strong>${summary.updated_at ? esc(formatDate(summary.updated_at)) : "No answers"}</strong><small>Newest field freshness</small></article>`;

    $("brainSections").innerHTML = (data.sections || []).map((section) => `
      <section class="brain-section" data-brain-section="${esc(section.key)}">
        <header class="brain-section-head">
          <div>
            <p class="kicker">${section.operator_only ? "Operator-only section" : "Client brain section"}</p>
            <h3>${esc(section.label)}</h3>
            <p>${esc(brainSectionDescription(section.key))}</p>
          </div>
          <span class="status-pill ${section.gaps ? "warning" : "success"}">${number(section.gaps)} ${section.gaps === 1 ? "gap" : "gaps"}</span>
        </header>
        <div class="brain-field-list">
          ${(section.fields || []).map((field) => renderBrainField(section.key, field)).join("")}
        </div>
        ${section.key === "proof" ? renderProofLedger(data.proof_items || []) : ""}
      </section>`).join("");
  }

  function renderBrainField(section, field) {
    const source = field.source ? sourceLabel(field.source) : "No source";
    const defaultSource = section === "icp" && field.key !== "client_guess" ? "research" : "operator";
    const selectedSource = ["operator", "research"].includes(field.source) ? field.source : defaultSource;
    return `
      <article class="brain-field ${field.gap ? "is-gap" : ""}" data-brain-field data-section="${esc(section)}" data-field="${esc(field.key)}" data-type="${esc(field.type || "textarea")}">
        <div class="brain-field-head">
          <div>
            <span class="brain-question">${esc(field.label)}</span>
            <div class="brain-meta">
              <span class="source-chip ${field.source ? "" : "missing"}">${esc(source)}</span>
              <span>${field.updated_at ? `Fresh ${esc(formatDate(field.updated_at))}` : "No freshness stamp"}</span>
              ${field.operator_only ? '<span class="operator-chip">Operator field</span>' : ""}
            </div>
          </div>
          <button class="button outline small" data-brain-edit type="button">Edit</button>
        </div>
        <div class="brain-answer" data-brain-answer>${renderBrainValue(field.value, field.gap)}</div>
        <div class="brain-editor" data-brain-editor hidden>
          ${renderBrainInput(field)}
          <div class="brain-editor-row">
            <label>Save source
              <select data-brain-source>
                <option value="operator"${selectedSource === "operator" ? " selected" : ""}>Operator</option>
                <option value="research"${selectedSource === "research" ? " selected" : ""}>Research</option>
              </select>
            </label>
            <div class="button-row">
              <button class="button primary small" data-brain-save type="button">Save field</button>
              <button class="button ghost small" data-brain-cancel type="button">Cancel</button>
            </div>
          </div>
          <p class="field-hint">Saving an empty answer clears this field and returns it to gap status.</p>
        </div>
      </article>`;
  }

  function renderBrainInput(field) {
    if (field.type === "boolean") {
      const value = field.gap ? "" : String(Boolean(field.value));
      return `<select data-brain-input aria-label="${esc(field.label)}">
        <option value=""${value === "" ? " selected" : ""}>Not set</option>
        <option value="true"${value === "true" ? " selected" : ""}>Yes</option>
        <option value="false"${value === "false" ? " selected" : ""}>No</option>
      </select>`;
    }
    return `<textarea data-brain-input rows="${field.type === "textarea" || field.type === "proof-list" ? 6 : 3}" aria-label="${esc(field.label)}">${esc(brainEditorValue(field.value, field.type))}</textarea>`;
  }

  function renderBrainValue(value, gap) {
    if (gap) return '<p class="gap-copy"><strong>Gap to close</strong><span>No answer is stored for this field.</span></p>';
    if (typeof value === "boolean") return `<p>${value ? "Yes" : "No"}</p>`;
    if (Array.isArray(value)) {
      if (!value.length) return '<p class="gap-copy"><strong>Gap to close</strong><span>No answer is stored for this field.</span></p>';
      return `<ul>${value.map((item) => {
        if (item && typeof item === "object") {
          const url = safeWebUrl(item.url);
          const link = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(item.url)}</a>` : esc(item.url || "Proof item");
          return `<li><strong>${esc(item.kind || "proof")}</strong> ${link}${item.claim ? `<span>${esc(item.claim)}</span>` : ""}${item.permission ? `<span>Permission: ${esc(item.permission)}</span>` : ""}</li>`;
        }
        const url = safeWebUrl(item);
        return `<li>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(item)}</a>` : esc(item)}</li>`;
      }).join("")}</ul>`;
    }
    if (value && typeof value === "object") {
      return `<dl>${Object.entries(value).map(([key, entry]) => `<div><dt>${esc(labelFromKey(key))}</dt><dd>${esc(entry)}</dd></div>`).join("")}</dl>`;
    }
    const url = safeWebUrl(value);
    return url
      ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">${esc(value)}</a></p>`
      : `<p>${esc(value).replace(/\n/g, "<br>")}</p>`;
  }

  function renderProofLedger(items) {
    return `
      <div class="proof-ledger">
        <div class="subsection-head"><p class="kicker">Proof item rows</p><h4>Proof index</h4><p>Uploaded images render here. Video testimonials remain linked to their source.</p></div>
        ${items.length ? `<div class="proof-ledger-grid">${items.map((item) => {
          const url = safeWebUrl(item.url);
          const image = item.kind === "image" && url
            ? `<a class="proof-ledger-image" href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(item.claim || "Uploaded proof image")}" loading="lazy"></a>`
            : "";
          return `<article>${image}<span>${esc(labelFromKey(item.kind))}</span><strong>${esc(item.claim || "No claim added")}</strong>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${item.kind === "image" ? "Open image" : "Open proof"}</a>` : ""}<small>Permission: ${esc(item.permission || "unknown")} | ${esc(formatDate(item.created_at))}</small></article>`;
        }).join("")}</div>` : '<div class="empty-state inset"><h4>No proof stored</h4><p>The client selected no proof, or the proof section has not been submitted.</p></div>'}
      </div>`;
  }

  async function handleBrainAction(event) {
    const button = event.target.closest("[data-brain-edit], [data-brain-save], [data-brain-cancel]");
    if (!button) return;
    const card = button.closest("[data-brain-field]");
    if (!card) return;
    const editor = card.querySelector("[data-brain-editor]");
    const answer = card.querySelector("[data-brain-answer]");

    if (button.hasAttribute("data-brain-edit")) {
      answer.hidden = true;
      editor.hidden = false;
      button.hidden = true;
      editor.querySelector("[data-brain-input]")?.focus();
      return;
    }
    if (button.hasAttribute("data-brain-cancel")) {
      editor.hidden = true;
      answer.hidden = false;
      card.querySelector("[data-brain-edit]").hidden = false;
      return;
    }

    const input = editor.querySelector("[data-brain-input]");
    const type = card.dataset.type || "textarea";
    const value = parseBrainEditor(input.value, type);
    button.disabled = true;
    try {
      const response = await api("/api/client-brain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: state.client,
          section: card.dataset.section,
          field: card.dataset.field,
          value,
          source: editor.querySelector("[data-brain-source]").value,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save this brain field.");
      await loadBrain();
      showMessage($("brainMessage"), data.cleared ? "Field cleared." : "Field saved.", "neutral");
    } catch (error) {
      if (state.key) showMessage($("brainMessage"), error.message || "Could not save this brain field.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function parseBrainEditor(value, type) {
    const text = String(value || "").trim();
    if (type === "boolean") return text === "" ? "" : text === "true";
    if (type === "list") return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (type === "proof-list") return text.split(/\r?\n/).map((line) => {
      const [kind, url, claim, permission] = line.split("|").map((part) => part.trim());
      return {
        kind: ["image-link", "video-link", "screenshot-link"].includes(kind) ? kind : "screenshot-link",
        url: url || kind,
        claim: claim || "",
        permission: ["unknown", "granted", "denied"].includes(permission) ? permission : "unknown",
      };
    }).filter((item) => item.url);
    return text;
  }

  function brainEditorValue(value, type) {
    if (value == null) return "";
    if (type === "proof-list" && Array.isArray(value)) {
      return value.map((item) => `${item.kind || "screenshot-link"} | ${item.url || ""} | ${item.claim || ""} | ${item.permission || "unknown"}`).join("\n");
    }
    if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : Object.values(item).join(" | ")).join("\n");
    if (typeof value === "object") return Object.entries(value).map(([key, entry]) => `${labelFromKey(key)}: ${entry}`).join("\n");
    return String(value);
  }

  function brainSectionDescription(section) {
    return ({
      identity: "The full business explanation plus the operator-distilled positioning and mechanism name.",
      offer: "What they want to sell and the operator-refined offer structure.",
      icp: "The client's guess stays visible beside the real operator-conducted avatar research.",
      story: "Voice note, transcript, or written journey, followed by the usable narrative bank.",
      voice: "Tone, language habits, positioning attitude, and real voice samples.",
      proof: "Student results only. Lifestyle imagery is not proof currency.",
      funnel: "Operator-only trigger words, routes, links, lead magnets, and cadence facts.",
      donot: "Claims, topics, names, numbers, and compliance lines the work cannot cross.",
    })[section] || "Structured client context.";
  }

  function sourceLabel(source) {
    return ({ "client-form": "Client form", "voice-note": "Voice note", transcript: "Transcript", operator: "Operator", research: "Research" })[source] || labelFromKey(source);
  }

  function labelFromKey(value) {
    return String(value || "").replace(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
  }

  function safeWebUrl(value) {
    const text = String(value || "").trim();
    return /^https?:\/\//i.test(text) || /^\/(?!\/)/.test(text) ? text : "";
  }

  function setSavedState(element, isSet, label) {
    element.textContent = isSet ? `Saved ${label} is set. Leave the field blank to keep it.` : `No saved ${label} reported.`;
    element.classList.toggle("set", isSet);
  }

  function syncDashboardEmailUi(auth) {
    const available = Boolean(auth?.email_delivery_available);
    $("dashboardEmailHint").textContent = auth?.email_delivery_hint || "Setup-link emails are off until RESEND_API_KEY is set.";
    $("dashboardEmailHint").dataset.available = available ? "1" : "0";
    $("emailDashboardSetupButton").disabled = !available;
  }

  function updatePreviewLinks() {
    const client = encodeURIComponent($("clientId").value.trim());
    $("previewCanonical").href = client ? `/?client=${client}&preview=canonical&operator_preview=1` : "#";
    $("previewVariant").href = client ? `/?client=${client}&preview=variant-02&operator_preview=1` : "#";
  }

  async function loadPerformanceEntries() {
    if (!state.client) {
      clearPerformanceForms();
      renderPerformanceSection();
      return;
    }
    try {
      const [sequenceResponse, weeklyResponse] = await Promise.all([
        api(`/api/metrics-sequences?client=${encodeURIComponent(state.client)}`),
        api(`/api/metrics-weekly?client=${encodeURIComponent(state.client)}`),
      ]);
      const sequenceData = await sequenceResponse.json().catch(() => ({}));
      const weeklyData = await weeklyResponse.json().catch(() => ({}));
      if (!sequenceResponse.ok || !sequenceData.ok) {
        throw new Error(sequenceData.error || "Could not load sequence metrics.");
      }
      if (!weeklyResponse.ok || !weeklyData.ok) {
        throw new Error(weeklyData.error || "Could not load the weekly metrics.");
      }
      state.performance.rows = Array.isArray(sequenceData.rows) ? sequenceData.rows : [];
      state.performance.weekSummary = sequenceData.week_summary || null;
      state.performance.weeklyReport = weeklyData.report || null;
      state.performance.latestSnapshot = weeklyData.latest || null;
      state.performance.priorSnapshot = weeklyData.prior || null;
      renderPerformanceSection();
    } catch (error) {
      state.performance.rows = [];
      state.performance.weekSummary = null;
      state.performance.weeklyReport = null;
      state.performance.latestSnapshot = null;
      state.performance.priorSnapshot = null;
      renderPerformanceSection();
      if (state.key) showMessage($("performanceMessage"), error.message || "Could not load performance metrics.", "error");
    }
  }

  async function savePerformanceSequence() {
    if (!state.client) {
      showMessage($("performanceMessage"), "Select a client first.", "error");
      return;
    }
    try {
      const response = await api("/api/metrics-sequences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: state.client,
          id: state.performance.editingSequenceId || undefined,
          posted_on: $("adminSequenceDate").value,
          type: $("adminSequenceType").value,
          topic: $("adminSequenceTopic").value.trim(),
          slide_count: Number($("adminSequenceSlideCount").value || 0),
          slide_views: parseCommaIntegers($("adminSequenceViews").value),
          dms: $("adminSequenceDms").value.trim(),
          profile_visits: $("adminSequenceProfileVisits").value.trim(),
          notes: $("adminSequenceNotes").value.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the sequence log.");
      clearPerformanceSequenceForm();
      await loadPerformanceEntries();
      showMessage($("performanceMessage"), data.updated ? "Sequence log updated." : "Sequence log saved.", "success");
    } catch (error) {
      if (state.key) showMessage($("performanceMessage"), error.message || "Could not save the sequence log.", "error");
    }
  }

  async function savePerformanceSnapshot() {
    if (!state.client) {
      showMessage($("performanceMessage"), "Select a client first.", "error");
      return;
    }
    try {
      const response = await api("/api/metrics-weekly", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: state.client,
          taken_on: $("adminSnapshotDate").value,
          followers: $("adminSnapshotFollowers").value.trim(),
          icp_leads: $("adminSnapshotIcpLeads").value.trim(),
          avg_views: $("adminSnapshotAvgViews").value.trim(),
          notes: $("adminSnapshotNotes").value.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the snapshot.");
      clearPerformanceSnapshotForm();
      await loadPerformanceEntries();
      showMessage($("performanceMessage"), "Snapshot saved.", "success");
    } catch (error) {
      if (state.key) showMessage($("performanceMessage"), error.message || "Could not save the snapshot.", "error");
    }
  }

  function renderPerformanceSection() {
    const summary = state.performance.weekSummary || {};
    const report = state.performance.weeklyReport || {};
    const latest = state.performance.latestSnapshot;
    const prior = state.performance.priorSnapshot;

    $("performanceSummary").innerHTML = `
      <div class="performance-summary-grid">
        ${metricCard("This week", number(summary.sequences_this_week || 0), `${number(summary.cadence_floor || 3)} minimum | ${number(summary.cadence_target_min || 5)}-${number(summary.cadence_target_max || 7)} target`)}
        ${metricCard("Last week", number(summary.sequences_last_week || 0), summary.cadence_status || "week status")}
        ${metricCard("Followers", weeklyValue(report.followers), weeklyDelta(report.followers))}
        ${metricCard("ICP leads", weeklyValue(report.icp_leads), weeklyDelta(report.icp_leads))}
        ${metricCard("Follower to view", weeklyValue(report.follower_to_view_ratio), weeklyDelta(report.follower_to_view_ratio))}
        ${metricCard("Dollars per follower", weeklyValue(report.dollars_per_follower), weeklyDelta(report.dollars_per_follower))}
      </div>
      <div class="review-card" style="margin-top:12px">
        <div class="review-meta-column">
          <span><strong>This week type mix</strong> ${esc(formatTypeMix(summary.type_mix_current_week))}</span>
          <span><strong>Last week type mix</strong> ${esc(formatTypeMix(summary.type_mix_prior_week))}</span>
          <span><strong>Latest snapshot</strong> ${latest ? `${esc(latest.taken_on)} | ${number(latest.followers)} followers` : "Not logged yet"}</span>
          <span><strong>Prior snapshot</strong> ${prior ? `${esc(prior.taken_on)} | ${number(prior.followers)} followers` : "Need one more weekly snapshot"}</span>
        </div>
      </div>
    `;

    $("performanceSequenceList").innerHTML = state.performance.rows.map((row) => `
      <article class="review-card${state.performance.editingSequenceId === row.id ? " editing" : ""}">
        <div class="review-head">
          <div>
            <strong>${esc(row.topic || row.type || "Sequence")}</strong>
            <p>${esc(row.type || "sequence")} | ${esc(row.posted_on || "")}</p>
          </div>
          <span class="badge ${row.diagnostic === "healthy" ? "success" : "accent"}">${esc(row.diagnostic || "monitor")}</span>
        </div>
        <div class="review-meta">
          <span>${row.completion_pct == null ? "Completion not logged" : `${row.completion_pct}% completion`}</span>
          <span>${row.dropoff_pct == null ? "Drop-off not logged" : `${row.dropoff_pct}% drop-off`}</span>
          <span>${row.biggest_drop_slide ? `Biggest drop: slide ${row.biggest_drop_slide}` : "No slide drop yet"}</span>
        </div>
        <div class="sequence-bar-strip">
          ${(row.slide_views || []).map((value, index) => `
            <div class="sequence-bar" title="Slide ${index + 1}: ${number(value)} views">
              <i style="height:${barHeight(value, row.slide_views)}%"></i>
              <span>${index + 1}</span>
            </div>
          `).join("")}
        </div>
        <div class="review-meta">
          <span>${row.dms == null ? "DMs not logged" : `${number(row.dms)} DMs`}</span>
          <span>${row.profile_visits == null ? "Profile visits not logged" : `${number(row.profile_visits)} profile visits`}</span>
        </div>
        ${row.notes ? `<p>${esc(row.notes)}</p>` : ""}
        <div class="button-row">
          <button class="button outline small" type="button" data-performance-edit="${row.id}">Edit</button>
        </div>
      </article>
    `).join("");
    $("performanceEmpty").hidden = state.performance.rows.length > 0;
    $$("[data-performance-edit]", $("performanceSequenceList")).forEach((button) => {
      button.addEventListener("click", () => loadPerformanceSequenceIntoForm(Number(button.dataset.performanceEdit)));
    });
  }

  function loadPerformanceSequenceIntoForm(id) {
    const row = state.performance.rows.find((item) => item.id === id);
    if (!row) return;
    state.performance.editingSequenceId = id;
    $("adminSequenceDate").value = row.posted_on || todayIso();
    $("adminSequenceType").value = row.type || $("adminSequenceType").value;
    $("adminSequenceTopic").value = row.topic || "";
    $("adminSequenceSlideCount").value = row.slide_count || (row.slide_views || []).length || 8;
    $("adminSequenceViews").value = Array.isArray(row.slide_views) ? row.slide_views.join(", ") : "";
    $("adminSequenceDms").value = row.dms == null ? "" : row.dms;
    $("adminSequenceProfileVisits").value = row.profile_visits == null ? "" : row.profile_visits;
    $("adminSequenceNotes").value = row.notes || "";
    renderPerformanceSection();
    showMessage($("performanceMessage"), "Editing sequence log entry.", "neutral");
  }

  function clearPerformanceForms() {
    clearPerformanceSequenceForm();
    clearPerformanceSnapshotForm();
  }

  function clearPerformanceSequenceForm() {
    state.performance.editingSequenceId = null;
    $("adminSequenceDate").value = todayIso();
    $("adminSequenceType").value = $("adminSequenceType").value || "value-driven";
    $("adminSequenceTopic").value = "";
    $("adminSequenceSlideCount").value = 8;
    $("adminSequenceViews").value = "";
    $("adminSequenceDms").value = "";
    $("adminSequenceProfileVisits").value = "";
    $("adminSequenceNotes").value = "";
    renderPerformanceSection();
  }

  function clearPerformanceSnapshotForm() {
    $("adminSnapshotDate").value = todayIso();
    $("adminSnapshotFollowers").value = "";
    $("adminSnapshotIcpLeads").value = "";
    $("adminSnapshotAvgViews").value = "";
    $("adminSnapshotNotes").value = "";
  }

  function reloadLivePreview() {
    window.clearTimeout(previewState.timer);
    const frame = $("livePreviewFrame");
    const client = $("clientId").value.trim() || state.client;
    if (!client) {
      frame.removeAttribute("src");
      $("previewEmpty").hidden = false;
      return;
    }
    const variant = $("templateVariant").value === "variant-02" ? "variant-02" : "canonical";
    $("previewEmpty").hidden = true;
    frame.src = `/?client=${encodeURIComponent(client)}&preview=${encodeURIComponent(variant)}&tokens=1&draft=1`;
  }

  function scheduleDraftPreview(delay = 300) {
    window.clearTimeout(previewState.timer);
    previewState.timer = window.setTimeout(postDraftPreview, delay);
  }

  function postDraftPreview() {
    const frame = $("livePreviewFrame");
    if (!frame.contentWindow || !frame.getAttribute("src")) return;
    frame.contentWindow.postMessage(currentDraftPayload(), location.origin);
  }

  function handlePreviewMessage(event) {
    const frame = $("livePreviewFrame");
    if (
      event.origin !== location.origin ||
      event.source !== frame.contentWindow ||
      !event.data ||
      state.route !== "clients"
    ) return;

    if (event.data.type === "pulsify-focus-token" && event.data.token) {
      focusEditorField(document.querySelector(`.content-field[data-content-key="${event.data.token}"]`));
      return;
    }

    if (event.data.type === "pulsify-focus-field") {
      if (event.data.field === "wistia_media_id") {
        focusEditorField($("wistiaMediaId"));
        return;
      }
      if (event.data.field === "typeform_url") {
        focusEditorField($("typeformUrl"));
        return;
      }
      if (event.data.field === "proof_images") {
        focusEditorField(document.querySelector(".proof-image-input"));
      }
    }
  }

  function focusEditorField(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus({ preventScroll: true });
    element.classList.add("field-jump");
    window.setTimeout(() => element.classList.remove("field-jump"), 900);
  }

  function currentDraftPayload() {
    return {
      type: "pulsify-draft",
      page_content: Object.fromEntries(
        $$(".content-field").map((input) => [input.dataset.contentKey, input.value])
      ),
      proof_images: proofImagesPayload(".proof-image-input"),
      wistia_media_id: $("wistiaMediaId").value.trim(),
      typeform_url: $("typeformUrl").value.trim(),
      template_variant: $("templateVariant").value,
    };
  }

  function toggleLivePreview() {
    const mobile = matchMedia("(max-width: 1099px)").matches;
    if (mobile) {
      $("previewPane").classList.add("open");
      document.body.classList.add("preview-overlay-open");
      $("togglePreviewButton").setAttribute("aria-expanded", "true");
      $("togglePreviewButton").textContent = "Preview";
      scheduleDraftPreview(0);
      return;
    }
    previewState.collapsed = !previewState.collapsed;
    $("clientWorkspace").classList.toggle("preview-collapsed", previewState.collapsed);
    $("togglePreviewButton").setAttribute("aria-expanded", String(!previewState.collapsed));
    $("togglePreviewButton").textContent = previewState.collapsed ? "Show preview" : "Hide preview";
  }

  function closeLivePreview() {
    $("previewPane").classList.remove("open");
    document.body.classList.remove("preview-overlay-open");
    if (matchMedia("(min-width: 1100px)").matches && state.route === "clients") {
      previewState.collapsed = true;
      $("clientWorkspace").classList.add("preview-collapsed");
      $("togglePreviewButton").setAttribute("aria-expanded", "false");
      $("togglePreviewButton").textContent = "Show preview";
    } else if (matchMedia("(max-width: 1099px)").matches) {
      $("togglePreviewButton").setAttribute("aria-expanded", "false");
      $("togglePreviewButton").textContent = "Preview";
    }
  }

  function syncPreviewUi() {
    const mobile = matchMedia("(max-width: 1099px)").matches;
    if (mobile) {
      const open = $("previewPane").classList.contains("open");
      $("togglePreviewButton").setAttribute("aria-expanded", String(open));
      $("togglePreviewButton").textContent = "Preview";
      return;
    }
    $("previewPane").classList.remove("open");
    document.body.classList.remove("preview-overlay-open");
    $("clientWorkspace").classList.toggle("preview-collapsed", previewState.collapsed);
    $("togglePreviewButton").setAttribute("aria-expanded", String(!previewState.collapsed));
    $("togglePreviewButton").textContent = previewState.collapsed ? "Show preview" : "Hide preview";
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
    let dashboardContent;
    try {
      dashboardContent = {
        plans: parseJsonEditorValue($("dashboardPlansJson").value),
        todos: parseJsonEditorValue($("dashboardTodosJson").value),
        team: parseJsonEditorValue($("dashboardTeamJson").value),
        momentum: parseJsonEditorValue($("dashboardMomentumJson").value),
      };
    } catch (error) {
      showMessage($("settingsMessage"), error.message, "error");
      button.disabled = false;
      return;
    }

    const payload = {
      client,
      client_name: $("clientName").value,
      wistia_media_id: $("wistiaMediaId").value,
      typeform_url: $("typeformUrl").value,
      typeform_webhook_secret: $("typeformSecret").value,
      kit_tag_id: $("kitTagId").value,
      kit_api_key: $("kitApiKey").value,
      allowed_origin: $("allowedOrigin").value,
      proof_images: proofImagesPayload(".proof-image-input"),
      template_variant: $("templateVariant").value,
      page_content: Object.fromEntries($$(".content-field").map((input) => [input.dataset.contentKey, input.value.trim()])),
      dashboard_content: dashboardContent,
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

  function clientAccessLinksMarkup(data, client) {
    const onboardingLink = `${location.origin}/onboard/?client=${encodeURIComponent(client)}&t=${encodeURIComponent(data.token || "")}`;
    return `<strong>Client portal</strong><br><a href="${esc(data.link)}" target="_blank" rel="noopener">${esc(data.link)}</a><br><br><strong>Client onboarding</strong><br><a href="${esc(onboardingLink)}" target="_blank" rel="noopener">${esc(onboardingLink)}</a>${data.note ? `<br><br>${esc(data.note)}` : ""}`;
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
      $("portalLinkMessage").innerHTML = clientAccessLinksMarkup(data, client);
      $("portalLinkMessage").className = "message success";
      $("portalLinkMessage").hidden = false;
    } catch (error) {
      if (state.key) showMessage($("portalLinkMessage"), error.message || "Could not generate a portal link.", "error");
    } finally {
      button.disabled = false;
    }
  }

  // Phase 4: manual trigger for the signed-to-live flow. Idempotent on the server.
  async function provisionNow() {
    const client = $("clientId").value.trim() || state.client;
    const email = $("dashboardLoginEmail").value.trim();
    const name = ($("clientName")?.value || "").trim();
    if (!client || !email) {
      showMessage($("dashboardSetupMessage"), "Client and login email are required before provisioning.", "error");
      return;
    }
    const button = $("provisionNowButton");
    button.disabled = true;
    hideMessage($("dashboardSetupMessage"));
    try {
      const response = await api("/api/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client, email, name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Provisioning did not run.");
      const welcome = data.welcome?.state || data.welcome_state || "";
      showMessage(
        $("dashboardSetupMessage"),
        data.duplicate
          ? `Already provisioned as ${data.client || client}. Nothing was re-sent.`
          : `Provisioned ${data.client || client}. Welcome email: ${welcome || "not attempted"}. Setup link is live for 48 hours.`,
        data.duplicate ? "neutral" : "success",
      );
    } catch (error) {
      if (state.key) showMessage($("dashboardSetupMessage"), error.message || "Provisioning did not run.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function generateDashboardSetupLink(sendEmail) {
    const client = $("clientId").value.trim() || state.client;
    const email = $("dashboardLoginEmail").value.trim();
    if (!client) {
      showMessage($("dashboardSetupMessage"), "Select or enter a client before generating a dashboard login.", "error");
      return;
    }
    if (!email) {
      showMessage($("dashboardSetupMessage"), "Login email is required before generating a dashboard setup link.", "error");
      return;
    }
    const button = $("generateDashboardSetupButton");
    const emailButton = $("emailDashboardSetupButton");
    button.disabled = true;
    emailButton.disabled = true;
    hideMessage($("dashboardSetupMessage"));
    try {
      const response = await api("/api/client-setup-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ client, email, send_email: sendEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not generate the dashboard setup link.");
      $("dashboardSetupMessage").innerHTML = sendEmail
        ? `Setup link emailed to ${esc(email)}.<br><a href="${esc(data.link)}" target="_blank" rel="noopener">${esc(data.link)}</a>`
        : `<a href="${esc(data.link)}" target="_blank" rel="noopener">${esc(data.link)}</a>${data.note ? `<br>${esc(data.note)}` : ""}`;
      $("dashboardSetupMessage").className = "message success";
      $("dashboardSetupMessage").hidden = false;
    } catch (error) {
      if (state.key) showMessage($("dashboardSetupMessage"), error.message || "Could not generate the dashboard setup link.", "error");
    } finally {
      button.disabled = false;
      emailButton.disabled = $("dashboardEmailHint").dataset.available !== "1";
    }
  }

  async function handleStudioReviewAction(action, id) {
    const noteField = document.querySelector(`[data-review-note="${id}"]`);
    const note = noteField?.value.trim() || "";
    try {
      const response = await api("/api/studio-sequences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Could not ${action} this sequence.`);
      }
      state.studioReviews = state.studioReviews.filter((row) => row.id !== id);
      renderStudioReviewQueue();
      showMessage($("globalMessage"), `Sequence ${action === "approve" ? "approved" : "rejected"}.`, "success");
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || `Could not ${action} this sequence.`, "error");
    }
  }

  async function handleCarouselReviewAction(action, id) {
    const noteField = document.querySelector(`[data-carousel-review-note="${id}"]`);
    const note = noteField?.value.trim() || "";
    try {
      const response = await api("/api/studio-carousels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id, note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `Could not ${action} this carousel.`);
      }
      state.carouselReviews = state.carouselReviews.filter((row) => row.id !== id);
      renderCarouselReviewQueue();
      showMessage($("globalMessage"), `Carousel ${action === "approve" ? "approved" : "rejected"}.`, "success");
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || `Could not ${action} this carousel.`, "error");
    }
  }

  async function attachStudioOutputFromReview(id) {
    const field = document.querySelector(`[data-review-output="${id}"]`);
    const rawText = field?.value.trim() || "";
    if (!rawText) {
      showMessage($("globalMessage"), "Paste the finished sequence first.", "error");
      return;
    }
    try {
      const response = await api("/api/studio-sequences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "attach-output", id, raw_text: rawText }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not save the pasted sequence output.");
      }
      await loadStudioReviewQueue();
      showMessage($("globalMessage"), "Finished sequence output saved.", "success");
    } catch (error) {
      if (state.key) showMessage($("globalMessage"), error.message || "Could not save the pasted sequence output.", "error");
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
      showProvisionResult(slug, clientName, templateVariant, pageContent, data.share_url);
      await refreshClients(slug);
      writeClientQuery();
      showMessage($("provisionMessage"), "Page saved.", "success");
    } catch (error) {
      if (state.key) showMessage($("provisionMessage"), error.message || "Could not create the page.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function showProvisionResult(slug, clientName, templateVariant, pageContent, shareUrl = null) {
    const link = shareUrl || `${location.origin}/${encodeURIComponent(slug)}`;
    lastProvisionResult = { slug, clientName, templateVariant, pageContent, shareUrl: link };
    $("resultLink").href = `${location.origin}/${encodeURIComponent(slug)}?operator_preview=1`;
    $("resultLink").textContent = link;
    $("resultCanonical").href = `${location.origin}/?client=${encodeURIComponent(slug)}&preview=canonical&operator_preview=1`;
    $("resultVariant").href = `${location.origin}/?client=${encodeURIComponent(slug)}&preview=variant-02&operator_preview=1`;
    $("provisionResult").hidden = false;
  }

  function copyProvisionResult() {
    if (!lastProvisionResult) return;
    copyText(lastProvisionResult.shareUrl);
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
    const regularFields = card.fields.filter((field) => !field.advanced);
    const advancedFields = card.fields.filter((field) => field.advanced);
    return `<article class="integration-card" id="integration-${card.scope}-${card.provider}">
      <div class="integration-head">
        <div><h3>${esc(card.title)}</h3><p>${esc(card.feeds)}</p></div>
        <span class="provider-status" id="integration-status-${card.scope}-${card.provider}">Not connected</span>
      </div>
      <div class="form-grid two">
        ${regularFields.map((field) => renderIntegrationField(card, field)).join("")}
      </div>
      ${advancedFields.length ? `
        <details class="advanced integration-advanced">
          <summary>Advanced</summary>
          <p class="advanced-intro">Rarely changed provider and onboarding values. Leave write-only fields blank to keep saved secrets.</p>
          <div class="form-grid two">
            ${advancedFields.map((field) => renderIntegrationField(card, field)).join("")}
          </div>
        </details>
      ` : ""}
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

  function renderIntegrationField(card, field) {
    return `<div class="field">
      <label>${esc(field.label)} <span class="optional">${field.secret ? "Write only" : "Optional"}</span></label>
      <input data-integration-scope="${card.scope}" data-integration-provider="${card.provider}" data-integration-field="${field.key}" ${field.secret ? 'type="password"' : ""} placeholder="${field.secret ? "Paste a new value or leave blank" : "Enter a value if needed"}">
      <p class="field-hint">${esc(field.hint)}</p>
    </div>`;
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

  async function loadEmailComposer() {
    const button = $("refreshEmailButton");
    button.disabled = true;
    renderEmailClient();
    try {
      await Promise.all([loadEmailTags(), loadEmailDrafts()]);
      renderEmailDraftRows();
    } finally {
      button.disabled = false;
      syncEmailComposerUi();
    }
  }

  async function loadEmailTags() {
    const response = await api("/api/email-compose?action=tags");
    const data = await response.json().catch(() => ({}));
    state.emailConfigured = Boolean(data.api_key_set);
    state.emailTags = Array.isArray(data.tags) ? data.tags : [];

    const status = $("emailKitStatus");
    const select = $("emailTag");
    const previousTag = select.value;
    if (!state.emailConfigured) {
      status.textContent = "Not connected";
      status.className = "provider-status";
      $("emailKitHeading").textContent = "Kit is not connected";
      $("emailKitHint").textContent = data.message || "Connect the operator Kit account in Integrations. Draft saving still works.";
      $("emailTagHint").textContent = "Connect Kit to load the account tags. Send stays unavailable until then.";
      select.innerHTML = '<option value="">Connect Kit to load tags</option>';
      select.disabled = true;
      return;
    }

    status.textContent = "Connected";
    status.className = "provider-status connected";
    $("emailKitHeading").textContent = "Kit is connected";
    if (!response.ok || !data.ok) {
      $("emailKitHint").textContent = data.error || "The API key is set, but Kit tags could not be loaded.";
      $("emailTagHint").textContent = "Refresh after the Kit connection can return tags.";
      select.innerHTML = '<option value="">Tags unavailable</option>';
      select.disabled = true;
      return;
    }

    $("emailKitHint").textContent = "The saved operator API key is active. Send creates a real Kit broadcast for one selected tag.";
    if (!state.emailTags.length) {
      $("emailTagHint").textContent = "The connected Kit account returned no tags. Create a tag in Kit, then refresh.";
      select.innerHTML = '<option value="">No Kit tags found</option>';
      select.disabled = true;
      return;
    }

    $("emailTagHint").textContent = "Choose the exact Kit audience tag for this broadcast.";
    select.innerHTML = [
      '<option value="">Select a Kit tag</option>',
      ...state.emailTags.map((tag) => `<option value="${esc(tag.id)}">${esc(tag.name)} (${esc(tag.id)})</option>`),
    ].join("");
    if (state.emailTags.some((tag) => String(tag.id) === previousTag)) select.value = previousTag;
    select.disabled = false;
  }

  async function loadEmailDrafts() {
    const response = await api("/api/email-compose?action=drafts");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Could not load stored email.");
    state.emailDrafts = Array.isArray(data.drafts) ? data.drafts : [];
    renderEmailDraftRows();
    $("emailDraftsUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
    $("emailDraftsUpdated").className = "status-pill success";
  }

  function renderEmailClient() {
    const active = state.clients.find((client) => client.client === state.client);
    $("emailClientLabel").textContent = active
      ? `${active.client_name || active.client} email`
      : "No active client";
    syncEmailComposerUi();
  }

  function syncEmailComposerUi() {
    const hasClient = Boolean(state.client);
    const hasTag = Boolean($("emailTag").value);
    $("saveEmailDraftButton").disabled = state.emailBusy || !hasClient;
    $("sendEmailButton").disabled = state.emailBusy || !hasClient || !state.emailConfigured || !hasTag;
    $("emailComposerPanel").classList.toggle("email-no-client", !hasClient);
  }

  async function submitEmail(action) {
    const subject = $("emailSubject").value.trim();
    const bodyText = $("emailBody").value.trim();
    const tagId = $("emailTag").value;
    const message = $("emailComposeMessage");
    hideMessage(message);

    if (!state.client) {
      showMessage(message, "Select a client before saving or sending email.", "error");
      return;
    }
    if (!subject || !bodyText) {
      showMessage(message, "Subject and body are required.", "error");
      return;
    }
    if (action === "send" && !tagId) {
      showMessage(message, "Select the Kit tag before sending.", "error");
      return;
    }

    state.emailBusy = true;
    syncEmailComposerUi();
    try {
      const response = await api(`/api/email-compose?action=${encodeURIComponent(action)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client: state.client,
          subject,
          body_text: bodyText,
          tag_id: tagId || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      await loadEmailDrafts();

      if (data.status === "sent" && data.sent) {
        showMessage(message, `Sent through Kit. Broadcast ${data.broadcast_id}.`, "success");
        return;
      }
      if (data.status === "draft") {
        showMessage(message, data.message || "Draft saved. No email was sent.", "neutral");
        return;
      }
      if (data.status === "failed") {
        showMessage(message, data.error || "Kit failed. The complete email is stored for copy and paste.", "error");
        return;
      }
      if (!response.ok || !data.ok) throw new Error(data.error || "The email action failed.");
      showMessage(message, "Draft saved. No email was sent.", "neutral");
    } catch (error) {
      if (state.key) showMessage(message, error.message || "The email action failed.", "error");
    } finally {
      state.emailBusy = false;
      syncEmailComposerUi();
    }
  }

  function renderEmailDraftRows() {
    const rows = state.emailDrafts || [];
    $("emailDraftsEmpty").hidden = rows.length > 0;
    $("emailDraftsTableWrap").hidden = rows.length === 0;
    $("emailDraftRows").innerHTML = rows.map((draft) => {
      const statusClass = draft.status === "sent" ? "success" : draft.status === "failed" ? "failure" : "";
      const tag = state.emailTags.find((item) => String(item.id) === String(draft.tag_id));
      return `<tr>
        <td><strong>${esc(draft.client || "operator")}</strong></td>
        <td><strong>${esc(draft.subject)}</strong><span class="muted email-body-preview">${esc(String(draft.body || "").slice(0, 90))}</span></td>
        <td>${esc(tag?.name || draft.tag_id || "Not selected")}</td>
        <td><span class="badge ${statusClass}">${esc(draft.status || "draft")}</span></td>
        <td>${esc(formatDate(draft.sent_at || draft.created_at))}</td>
        <td><div class="row-actions"><button data-email-load="${esc(draft.id)}" type="button">Load</button><button data-email-copy="${esc(draft.id)}" type="button">Copy</button></div></td>
      </tr>`;
    }).join("");
  }

  async function handleEmailDraftAction(event) {
    const loadButton = event.target.closest("[data-email-load]");
    const copyButton = event.target.closest("[data-email-copy]");
    const id = loadButton?.dataset.emailLoad || copyButton?.dataset.emailCopy;
    if (!id) return;
    const draft = state.emailDrafts.find((item) => String(item.id) === String(id));
    if (!draft) return;

    if (loadButton) {
      $("emailSubject").value = draft.subject || "";
      $("emailBody").value = draft.body || "";
      if (draft.tag_id && !Array.from($("emailTag").options).some((option) => option.value === String(draft.tag_id))) {
        $("emailTag").add(new Option(`Stored tag ${draft.tag_id}`, String(draft.tag_id)));
        $("emailTag").disabled = false;
      }
      $("emailTag").value = draft.tag_id || "";
      syncEmailComposerUi();
      showMessage($("emailComposeMessage"), `Loaded ${draft.status} email. No email was sent by this action.`, "neutral");
      $("emailSubject").focus();
      return;
    }

    const copied = await copyText(`Subject: ${draft.subject}\n\n${draft.body}`);
    showMessage(
      $("emailComposeMessage"),
      copied ? "Email copied." : "The browser blocked copying. Load the email and copy it manually.",
      copied ? "neutral" : "error",
    );
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
      state.campaignSummary = data.summary || {};
      renderCampaignSummary(data.summary || {});
      renderCampaignRows();
      await Promise.all([loadFollowups(), loadTrackedAssets()]);
      $("campaignUpdated").textContent = `Updated ${new Date().toLocaleTimeString()}`;
      $("campaignUpdated").className = "status-pill success";
    } finally {
      button.disabled = false;
    }
  }

  function allStaticLinks() {
    return LINK_GROUPS.flatMap((group) => group.entries);
  }

  function renderQuickLinks() {
    const entries = allStaticLinks().filter((entry) => QUICK_LINK_NAMES.includes(entry.name));
    $("quickLinksGrid").innerHTML = entries.map((entry) => `
      <a class="quick-link" href="${esc(entry.url)}" target="_blank" rel="noopener">
        <span>${esc(entry.name)}</span>
        <small>${esc(entry.note)}</small>
      </a>
    `).join("");
  }

  async function loadLinksDirectory() {
    const button = $("refreshLinksButton");
    button.disabled = true;
    hideMessage($("linksMessage"));
    renderLinksDirectory();
    try {
      const response = await api("/api/campaigns");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not load prospect pages.");
      state.campaigns = Array.isArray(data.campaigns) ? data.campaigns : [];
      renderLinksDirectory();
    } catch (error) {
      if (state.key) {
        showMessage($("linksMessage"), error.message || "Could not load prospect pages.", "error");
      }
    } finally {
      button.disabled = false;
    }
  }

  function renderLinksDirectory() {
    const prospectEntries = state.campaigns
      .filter((campaign) => campaign.client && state.clients.some((client) => client.client === campaign.client))
      .sort((a, b) => String(a.client_name || a.client).localeCompare(String(b.client_name || b.client)))
      .map((campaign) => ({
        name: campaign.client_name || campaign.client,
        note: `/${campaign.client}`,
        url: `https://pulsify-ai.com/${encodeURIComponent(campaign.client)}`,
        active: campaign.page_active !== false,
      }));
    const groups = [
      ...LINK_GROUPS,
      {
        title: "Prospect pages",
        note: "Generated from the current Acquisition pages library.",
        entries: prospectEntries,
        empty: "No prospect pages are configured.",
      },
    ];

    $("linksDirectory").innerHTML = groups.map((group) => `
      <article class="panel link-group">
        <div class="panel-head">
          <div>
            <p class="kicker">Directory group</p>
            <h3>${esc(group.title)}</h3>
            <p>${esc(group.note)}</p>
          </div>
          <span class="status-pill">${number(group.entries.length)} links</span>
        </div>
        <div class="link-list">
          ${group.entries.length ? group.entries.map(renderLinkRow).join("") : `<div class="empty-state inset"><p>${esc(group.empty || "No links configured.")}</p></div>`}
        </div>
      </article>
    `).join("");
  }

  function renderLinkRow(entry) {
    const inactive = entry.active === false;
    return `<div class="link-row${inactive ? " is-inactive" : ""}">
      <div class="link-copy">
        <div><strong>${esc(entry.name)}</strong>${inactive ? '<span class="badge">Inactive</span>' : ""}</div>
        <small>${esc(entry.note)}</small>
      </div>
      <div class="link-actions">
        <a class="button dark small" href="${esc(entry.url)}" target="_blank" rel="noopener">Open</a>
        <button class="icon-action" type="button" data-link-copy="${esc(entry.url)}" data-link-name="${esc(entry.name)}">Copy link</button>
      </div>
    </div>`;
  }

  async function handleLinkCopy(event) {
    const button = event.target.closest("[data-link-copy]");
    if (!button) return;
    button.disabled = true;
    try {
      const copied = await copyText(button.dataset.linkCopy);
      showMessage(
        $("linksMessage"),
        copied ? `${button.dataset.linkName} link copied.` : `Copy this link: ${button.dataset.linkCopy}`,
        copied ? "success" : "neutral",
      );
    } finally {
      button.disabled = false;
    }
  }

  async function loadFollowups() {
    $("followupUpdated").textContent = "Loading";
    $("followupUpdated").className = "status-pill";
    hideMessage($("followupMessage"));
    try {
      const response = await api("/api/followups");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not load the follow-up queue.");
      }
      state.followups = Array.isArray(data.followups) ? data.followups : [];
      renderFollowupRows();
      $("followupUpdated").textContent = `${number(data.summary?.needing_followup)} need follow-up`;
      $("followupUpdated").className = "status-pill success";
    } catch (error) {
      if (!state.key) return;
      state.followups = [];
      renderFollowupRows();
      $("followupUpdated").textContent = "Unavailable";
      showMessage(
        $("followupMessage"),
        error.message || "Could not load the follow-up queue.",
        "error",
      );
    }
  }

  function renderFollowupRows() {
    const rows = state.followups.filter((followup) => {
      if (state.followupFilters.hideApplied && followup.outcomes?.applied) return false;
      if (state.followupFilters.hideBooked && followup.outcomes?.booked) return false;
      return true;
    });

    $("followupRows").innerHTML = rows.map((followup) => {
      const watch = Math.round(Number(followup.engagement?.max_watch_percent || 0));
      const visits = Number(followup.engagement?.page_views || 0);
      const pagePath = `/${encodeURIComponent(followup.client)}?operator_preview=1`;
      return `<tr>
        <td><strong>${esc(followup.client_name || followup.client)}</strong><span class="muted">${number(visits)} page views</span></td>
        <td><a class="followup-page-link" href="${esc(pagePath)}" target="_blank" rel="noopener">${esc(pagePath)}</a></td>
        <td><div class="followup-score">${followupSignalBadge(followup.signal)}<small>${number(followup.score)} points</small></div></td>
        <td class="watch"><div class="watch-label"><span>${watch}%</span><span>${number(followup.engagement?.plays)} plays</span></div><div class="watch-track"><i style="width:${Math.min(100, Math.max(0, watch))}%"></i></div></td>
        <td>${relativeTime(followup.engagement?.last_viewed_at)}</td>
        <td>${outcomeBadge(followup.outcomes?.applied, "Applied")}</td>
        <td>${outcomeBadge(followup.outcomes?.booked, "Booked")}</td>
        <td><div class="row-actions"><button type="button" data-followup-activity="${esc(followup.client)}">View activity</button></div></td>
      </tr>`;
    }).join("");

    $("followupCount").textContent = `${number(rows.length)} of ${number(state.followups.length)} engaged`;
    $("followupEmpty").hidden = rows.length > 0;
    $$("[data-followup-activity]", $("followupRows")).forEach((button) => {
      button.addEventListener("click", () => openCampaignActivity(button.dataset.followupActivity));
    });
  }

  function renderCampaignSummary(summary) {
    const cards = [
      ["Total pages", number(summary.total_pages), "clients configured with a page"],
      ["Active pages", number(summary.active_pages), "currently available to prospects"],
      ["Pages viewed", number(summary.pages_with_activity), "with real tracked activity"],
      ["Total applications", number(summary.total_applications), "across every page"],
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
    const rows = [...state.campaigns].sort((a, b) => {
      const signal = signalRank(b.signal) - signalRank(a.signal);
      return signal || String(b.last_activity_at || "").localeCompare(String(a.last_activity_at || ""));
    });
    $("campaignRows").innerHTML = rows.map((campaign) => {
      const watch = Math.round(campaign.video?.max_watch_percent || 0);
      const title = campaign.client_name || campaign.client;
      const headline = campaign.preview?.headline || "A private breakdown, then apply to work together.";
      const attributed = Number(campaign.visits?.attributed_visitors || 0);
      const totalViews = Number(campaign.visits?.page_views || 0);
      const previewUrl = `/${encodeURIComponent(campaign.client)}?operator_preview=1`;
      return `<article class="acquisition-card ${campaign.page_active ? "" : "is-inactive"}">
        <a class="acquisition-card-preview" href="${previewUrl}" target="_blank" rel="noopener" aria-label="Preview ${esc(title)} without tracking">
          <span class="acquisition-card-topline"><b>${esc(title)}</b>${pageStateBadge(campaign.page_active)}</span>
          <span class="acquisition-card-headline">${esc(headline)}</span>
          <span class="acquisition-card-video"><i>${campaign.wistia_media_id ? "Play" : "Add video"}</i></span>
        </a>
        <div class="acquisition-card-body">
          <div class="acquisition-card-title">
            <div><strong>${esc(title)}</strong><small>/${esc(campaign.client)}</small></div>
            ${signalBadge(campaign.signal)}
          </div>
          <div class="acquisition-view-row">
            <span><b>${number(totalViews)}</b> views</span>
            <span><b>${number(campaign.visits?.visitors)}</b> unique</span>
            <span><b>${number(attributed)}</b> lead-attributed</span>
          </div>
          <div class="acquisition-watch-row">
            <div><span>Watch depth</span><b>${watch}%</b></div>
            <div class="watch-track"><i style="width:${Math.min(100, Math.max(0, watch))}%"></i></div>
            <small>${number(campaign.video?.plays)} plays / ${relativeTime(campaign.last_activity_at)}</small>
          </div>
          <div class="acquisition-card-actions">
            <button class="button dark small" type="button" data-acquisition-action="analytics" data-client="${esc(campaign.client)}">Analytics</button>
            <button class="icon-action" type="button" data-acquisition-action="copy" data-client="${esc(campaign.client)}">Copy link</button>
            <button class="icon-action" type="button" data-acquisition-action="edit" data-client="${esc(campaign.client)}">Edit</button>
            <button class="icon-action" type="button" data-acquisition-action="toggle" data-client="${esc(campaign.client)}">${campaign.page_active ? "Deactivate" : "Activate"}</button>
          </div>
        </div>
      </article>`;
    }).join("");
    $("campaignEmpty").hidden = rows.length > 0;
  }

  function pageStateBadge(active) {
    return active
      ? '<span class="badge success">Active</span>'
      : '<span class="badge">Inactive</span>';
  }

  function openAcquisitionModal(campaign = null) {
    acquisitionModalReturnFocus = document.activeElement;
    acquisitionEditingClient = campaign?.client || "";
    acquisitionSlugEdited = Boolean(campaign);
    $("acquisitionModalTitle").textContent = campaign ? "Edit acquisition page" : "Create acquisition page";
    $("saveAcquisitionPageButton").textContent = campaign ? "Save changes" : "Create page";
    $("acquisitionPageName").value = campaign?.client_name || "";
    $("acquisitionPageSlug").value = campaign?.client || "";
    $("acquisitionPageSlug").disabled = Boolean(campaign);
    $("acquisitionVideo").value = campaign?.wistia_media_id || "";
    $("acquisitionLeadEmail").value = campaign?.prospect_email || "";
    $("acquisitionPageActive").checked = campaign ? campaign.page_active !== false : true;
    $("acquisitionOriginLabel").textContent = `${location.origin}/`;
    hideMessage($("acquisitionModalMessage"));
    syncAcquisitionModalPreview();
    $("acquisitionPageModal").hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => $("acquisitionPageName").focus());
  }

  function closeAcquisitionModal(restoreFocus = true) {
    $("acquisitionPageModal").hidden = true;
    document.body.classList.remove("modal-open");
    const returnFocus = acquisitionModalReturnFocus;
    acquisitionModalReturnFocus = null;
    acquisitionEditingClient = "";
    acquisitionSlugEdited = false;
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
  }

  function syncAcquisitionModalPreview() {
    const name = $("acquisitionPageName").value.trim();
    if (!acquisitionEditingClient && !acquisitionSlugEdited) {
      $("acquisitionPageSlug").value = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
    }
    const slug = $("acquisitionPageSlug").value.trim();
    $("acquisitionPreviewBrand").textContent = name || "Prospect page";
    $("acquisitionPreviewTitle").textContent = name
      ? `A private breakdown for ${name}`
      : "A private breakdown";
    $("acquisitionUrlPreview").textContent = `${location.origin}/${slug || "prospect-name"}`;
    $("acquisitionPageSlug").classList.toggle("invalid", Boolean(slug) && !sanitizeSlug(slug));
  }

  function parseWistiaMediaId(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^[a-z0-9_-]{6,64}$/i.test(raw)) return raw;
    const match = raw.match(/\/embed\/iframe\/([a-z0-9_-]{6,64})(?:[/?#]|$)/i)
      || raw.match(/\/(?:medias|iframe)\/([a-z0-9_-]{6,64})(?:[/?#]|$)/i)
      || raw.match(/[?&]media(?:_id)?=([a-z0-9_-]{6,64})(?:[&#]|$)/i);
    return match?.[1] || "";
  }

  async function saveAcquisitionPage(event) {
    event.preventDefault();
    const button = $("saveAcquisitionPageButton");
    const name = $("acquisitionPageName").value.trim();
    const slug = sanitizeSlug($("acquisitionPageSlug").value);
    const videoInput = $("acquisitionVideo").value.trim();
    const wistiaMediaId = parseWistiaMediaId(videoInput);
    if (!name || !slug) {
      showMessage($("acquisitionModalMessage"), "Add a page title and a valid page URL.", "error");
      return;
    }
    if (!acquisitionEditingClient && state.clients.some((client) => client.client === slug)) {
      showMessage($("acquisitionModalMessage"), "That page URL already exists. Edit the existing page instead.", "error");
      return;
    }
    if (videoInput && !wistiaMediaId) {
      showMessage($("acquisitionModalMessage"), "Paste a valid Wistia URL or media ID.", "error");
      return;
    }

    button.disabled = true;
    hideMessage($("acquisitionModalMessage"));
    const payload = {
      client: slug,
      client_name: name,
      wistia_media_id: wistiaMediaId || null,
      prospect_email: $("acquisitionLeadEmail").value.trim() || null,
      page_active: $("acquisitionPageActive").checked,
    };
    if (!acquisitionEditingClient) {
      payload.page_content = {
        PAGE_TITLE: `${name} - Private breakdown`,
        BRAND_MARK: "Pulsify",
        FOOTER_LABEL: "Pulsify",
      };
    }

    try {
      const wasEditing = Boolean(acquisitionEditingClient);
      const response = await api("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not save the acquisition page.");
      await refreshClients(slug);
      await loadCampaigns();
      closeAcquisitionModal(false);
      showMessage(
        $("acquisitionMessage"),
        wasEditing ? "Page updated." : "Page created. Its tracked link is ready to copy.",
        "success",
      );
    } catch (error) {
      if (state.key) showMessage($("acquisitionModalMessage"), error.message || "Could not save the acquisition page.", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function handleAcquisitionCardAction(event) {
    const button = event.target.closest("[data-acquisition-action]");
    if (!button) return;
    const campaign = state.campaigns.find((item) => item.client === button.dataset.client);
    if (!campaign) return;
    const action = button.dataset.acquisitionAction;
    if (action === "analytics") {
      openCampaignActivity(campaign.client);
      return;
    }
    if (action === "edit") {
      openAcquisitionModal(campaign);
      return;
    }
    button.disabled = true;
    hideMessage($("acquisitionMessage"));
    try {
      if (action === "copy") {
        let shareUrl = campaign.share_url;
        if (!shareUrl) {
          const response = await api("/api/settings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ client: campaign.client }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ok) throw new Error(data.error || "Could not create the tracked link.");
          shareUrl = data.share_url;
          await loadCampaigns();
        }
        const copied = await copyText(shareUrl);
        showMessage(
          $("acquisitionMessage"),
          copied ? "Tracked lead link copied." : `Copy this tracked lead link: ${shareUrl}`,
          copied ? "success" : "neutral",
        );
      }
      if (action === "toggle") {
        const response = await api("/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ client: campaign.client, page_active: !campaign.page_active }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not change the page status.");
        await loadCampaigns();
        showMessage($("acquisitionMessage"), campaign.page_active ? "Page deactivated." : "Page activated.", "success");
      }
    } catch (error) {
      if (state.key) showMessage($("acquisitionMessage"), error.message || "The page action failed.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function handleAcquisitionModalKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAcquisitionModal();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = $$('button:not(:disabled), input:not(:disabled)', $("acquisitionPageModal"))
      .filter((element) => element.offsetParent !== null);
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

  async function openCampaignActivity(client) {
    const campaign = state.campaigns.find((item) => item.client === client);
    const followup = state.followups.find((item) => item.client === client);
    activityDrawerReturnFocus = document.activeElement;
    $("activityDrawerTitle").textContent = "Visitor activity";
    $("activityDrawerClient").textContent = campaign?.client_name || followup?.client_name || client;
    $("activityViewerSummary").innerHTML =
      '<article class="metric-card"><span>Status</span><strong>Loading</strong><small>reading visitor activity</small></article>';
    $("activityViewerRows").innerHTML = "";
    $("activityViewerEmpty").hidden = true;
    hideMessage($("activityViewerMessage"));
    $("activityDrawer").hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => $("closeActivityDrawerButton").focus());

    try {
      const response = await api(`/leads?client=${encodeURIComponent(client)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not load visitor activity.");
      }
      renderCampaignActivity(data);
    } catch (error) {
      if (!state.key) return;
      $("activityViewerSummary").innerHTML = "";
      showMessage(
        $("activityViewerMessage"),
        error.message || "Could not load visitor activity.",
        "error",
      );
    }
  }

  function closeActivityDrawer() {
    $("activityDrawer").hidden = true;
    document.body.classList.remove("modal-open");
    const returnFocus = activityDrawerReturnFocus;
    activityDrawerReturnFocus = null;
    if (returnFocus?.isConnected) returnFocus.focus();
  }

  function renderCampaignActivity(data) {
    const summary = data.summary || {};
    const summaryCards = [
      ["Visitors", number(summary.visitors), "page visitors"],
      ["Watchers", number(summary.watchers), "people who watched"],
      ["Plays", number(summary.plays), "video starts"],
      ["Applications", number(summary.applications), "forms submitted"],
    ];
    $("activityViewerSummary").innerHTML = summaryCards.map((card) => `
      <article class="metric-card"><span>${card[0]}</span><strong>${card[1]}</strong><small>${card[2]}</small></article>
    `).join("");

    const appliedEmails = new Set(
      (data.leads || [])
        .map((lead) => String(lead.email || "").trim().toLowerCase())
        .filter(Boolean),
    );
    const viewers = [...(data.viewers || [])].sort((a, b) => {
      const aWatched = Number(a.plays || 0) > 0 || Number(a.watch_seconds || 0) > 0;
      const bWatched = Number(b.plays || 0) > 0 || Number(b.watch_seconds || 0) > 0;
      if (aWatched !== bWatched) return bWatched - aWatched;
      const depth = Number(b.watched_percent || 0) - Number(a.watched_percent || 0);
      if (depth) return depth;
      return String(b.last_watched_at || "").localeCompare(String(a.last_watched_at || ""));
    });

    $("activityViewerRows").innerHTML = viewers.map((viewer) => {
      const email = String(viewer.email || "").trim();
      const visitorId = String(viewer.visitor_id || viewer.viewer || "unknown");
      const label = email || `visitor ${visitorId.slice(0, 4)}...`;
      const applied = email && appliedEmails.has(email.toLowerCase());
      const locationLabel = [viewer.city, viewer.country].filter(Boolean).join(", ") || "Location unavailable";
      return `<article class="viewer-card">
        <div class="viewer-card-head">
          <div><strong>${esc(label)}</strong><small>${email ? esc(visitorId) : "Unidentified visitor"}</small></div>
          <div class="viewer-badges">
            ${viewer.tracked_link
              ? '<span class="badge accent">Tracked lead link</span>'
              : (email ? '<span class="badge">Known lead</span>' : '<span class="badge">Unattributed</span>')}
            <span class="badge ${applied ? "success" : ""}">${applied ? "Applied" : "No application"}</span>
          </div>
        </div>
        <dl class="viewer-metrics">
          <div><dt>Page views</dt><dd>${number(viewer.page_views)}</dd></div>
          <div><dt>Watched</dt><dd>${Math.round(Number(viewer.watched_percent || 0))}%</dd></div>
          <div><dt>Watch time</dt><dd>${formatDuration(viewer.watch_seconds)}</dd></div>
          <div><dt>Plays</dt><dd>${number(viewer.plays)}</dd></div>
          <div><dt>IP address</dt><dd>${esc(viewer.ip || "Unavailable")}</dd></div>
          <div><dt>Location</dt><dd>${esc(locationLabel)}</dd></div>
          <div><dt>Last seen</dt><dd>${relativeTime(viewer.last_seen_at || viewer.last_watched_at)}</dd></div>
        </dl>
      </article>`;
    }).join("");
    $("activityViewerEmpty").hidden = viewers.length > 0;
  }

  async function loadTrackedAssets() {
    $("trackedAssetsStatus").textContent = "Loading";
    $("trackedAssetsStatus").className = "status-pill";
    try {
      const response = await api("/api/assets");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not load tracked assets.");
      }
      state.trackedAssets = data.assets || [];
      renderTrackedAssets();
      $("trackedAssetsStatus").textContent = `${number(state.trackedAssets.length)} active`;
      $("trackedAssetsStatus").className = "status-pill success";
    } catch (error) {
      if (!state.key) return;
      state.trackedAssets = [];
      renderTrackedAssets();
      $("trackedAssetsStatus").textContent = "Unavailable";
      showMessage($("assetMessage"), error.message || "Could not load tracked assets.", "error");
    }
  }

  function renderTrackedAssets() {
    $("assetRows").innerHTML = state.trackedAssets.map((asset) => `
      <tr>
        <td><strong>${esc(asset.label || "Tracked asset")}</strong><span class="muted">${esc(asset.lead_email || asset.client || "Unassigned")}</span></td>
        <td><a class="asset-destination" href="${esc(asset.target_url)}" title="${esc(asset.target_url)}" target="_blank" rel="noopener">${esc(asset.target_url)}</a></td>
        <td>${number(asset.opens)}</td>
        <td>${number(asset.unique_ips)}</td>
        <td>${relativeTime(asset.last_open_at)}</td>
        <td><div class="row-actions">
          <button type="button" data-asset-action="copy" data-asset-url="${esc(asset.url)}">Copy link</button>
          <button type="button" data-asset-action="archive" data-asset-token="${esc(asset.token)}">Archive</button>
        </div></td>
      </tr>
    `).join("");
    $("assetEmpty").hidden = state.trackedAssets.length > 0;
  }

  async function createTrackedAsset(event) {
    event.preventDefault();
    const button = $("createAssetButton");
    button.disabled = true;
    hideMessage($("assetMessage"));
    try {
      const response = await api("/api/assets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: $("assetLabel").value.trim(),
          target_url: $("assetTargetUrl").value.trim(),
          client: $("assetClient").value || null,
          lead_email: $("assetLeadEmail").value.trim() || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not create the tracked link.");
      }
      $("assetResultUrl").value = data.url;
      $("assetResult").hidden = false;
      $("assetLabel").value = "";
      $("assetTargetUrl").value = "";
      $("assetLeadEmail").value = "";
      showMessage($("assetMessage"), "Tracked link created.", "success");
      await loadTrackedAssets();
    } catch (error) {
      if (state.key) {
        showMessage($("assetMessage"), error.message || "Could not create the tracked link.", "error");
      }
    } finally {
      button.disabled = false;
    }
  }

  async function handleTrackedAssetAction(event) {
    const button = event.target.closest("[data-asset-action]");
    if (!button) return;
    if (button.dataset.assetAction === "copy") {
      await copyTrackedAsset(button.dataset.assetUrl);
      return;
    }

    button.disabled = true;
    try {
      const response = await api(`/api/assets?token=${encodeURIComponent(button.dataset.assetToken)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not archive the tracked link.");
      showMessage($("assetMessage"), "Tracked link archived.", "success");
      await loadTrackedAssets();
    } catch (error) {
      if (state.key) {
        showMessage($("assetMessage"), error.message || "Could not archive the tracked link.", "error");
      }
      button.disabled = false;
    }
  }

  async function copyTrackedAsset(url) {
    if (!url) return;
    const copied = await copyText(url);
    showMessage(
      $("assetMessage"),
      copied ? "Tracked link copied." : "Copy failed. Select the link and copy it manually.",
      copied ? "success" : "error",
    );
  }

  function signalBadge(signal) {
    if (signal === "applied") return '<span class="badge success">Applied</span>';
    if (signal === "hot") return '<span class="badge accent">Hot</span>';
    if (signal === "visited") return '<span class="badge accent">Visited</span>';
    return '<span class="badge">No activity</span>';
  }

  function followupSignalBadge(signal) {
    if (signal === "hot") return '<span class="badge hot">Hot</span>';
    if (signal === "warm") return '<span class="badge accent">Warm</span>';
    return '<span class="badge">Cool</span>';
  }

  function outcomeBadge(value, label) {
    return value
      ? `<span class="badge success">${esc(label)}</span>`
      : '<span class="muted">No</span>';
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

  function formatDuration(value) {
    const seconds = Math.max(0, Math.round(Number(value || 0)));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function formatJsonForEditor(value) {
    if (value == null) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }

  function parseJsonEditorValue(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid dashboard JSON: ${error.message}`);
    }
  }

  function metricCard(label, value, note) {
    return `<article class="metric-card"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  }

  function weeklyValue(metric) {
    if (metric?.value == null) return "Not logged yet";
    return Number(metric.value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function weeklyDelta(metric) {
    if (metric?.delta == null) return metric?.hint || "Need another weekly snapshot.";
    const delta = Number(metric.delta);
    return `${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, { maximumFractionDigits: 2 })} vs prior week`;
  }

  function formatTypeMix(mix) {
    const entries = Object.entries(mix || {});
    if (!entries.length) return "No logged sequences yet.";
    return entries.map(([type, count]) => `${type}: ${count}`).join(" | ");
  }

  function parseCommaIntegers(value) {
    return String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part))
      .filter((part) => Number.isFinite(part) && part >= 0)
      .map((part) => Math.round(part));
  }

  function barHeight(value, allValues) {
    const max = Math.max(...(Array.isArray(allValues) && allValues.length ? allValues : [1]), 1);
    return Math.max(10, Math.round((Number(value || 0) / max) * 100));
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString() : "-";
  }

  function formatCurrencyTotals(totals) {
    const entries = Object.entries(totals || {}).filter(([, cents]) => Number(cents || 0) !== 0);
    if (!entries.length) return "0";
    return entries.map(([currency, cents]) => formatMoney(cents, currency)).join(" | ");
  }

  function formatMoney(cents, currency) {
    const amount = Number(cents || 0) / 100;
    if (!currency || currency === "unknown") return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (currency === "mixed") return "Mixed currencies";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency).toUpperCase(),
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${String(currency).toUpperCase()} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  }

  function formatDelta(value) {
    if (value == null) return "Need prior snapshot";
    const delta = Number(value || 0);
    return `${delta > 0 ? "+" : ""}${number(delta)} vs prior`;
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
