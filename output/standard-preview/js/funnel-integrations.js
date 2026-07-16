/**
 * Pulsify landing-page integration layer.
 *
 * Add these attributes to <body>:
 *   data-client="frank"      (fallback default; a "?client=" URL param overrides it)
 *   data-page-id="main"
 *   data-api-origin=""       (optional; blank means same origin)
 *
 * Add these mount points:
 *   <div data-pulsify-wistia></div>
 *   <div data-pulsify-typeform></div>
 *
 * Any form with data-pulsify-optin will send its email to the pipe and Kit.
 *
 * One deployed page can serve any prospect: /?client=jake pulls jake's config
 * without needing a copied HTML file per prospect. Visiting with no ?client=
 * falls back to the data-client attribute baked into the page.
 */

(() => {
  const body = document.body;
  const query = new URLSearchParams(location.search);
  const urlClient = query.get("client");
  const client = sanitize(urlClient || body.dataset.client || "unknown");
  const draftMode = query.get("draft") === "1" && window.parent !== window;
  const operatorPreview = query.get("operator_preview") === "1";
  const leadToken = sanitizeToken(query.get("lead"));
  const clientLabel = client.split(/[-_]+/).filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") || "Pulsify";
  const draftTokenDefaults = {
    BRAND_MARK: clientLabel,
    BRAND_NOTE: "",
    AUDIENCE_PILL: "Applications are open",
    HEADLINE_LINE_ONE: "A private breakdown,",
    HEADLINE_EMPHASIS: "then apply to work together.",
    HERO_SUBHEAD: "Watch the training, then apply below.",
    HERO_CTA: "APPLY NOW",
    MICRO_NOTE: "",
    VIDEO_NOTE_PRIMARY: "Private training",
    VIDEO_NOTE_SECONDARY: "No opt-in required to watch",
    APPLY_STEP_LABEL: "Step 2",
    APPLY_HEADING: "Apply below",
    APPLY_INTRO: "Tell us where you're at and what you're working on.",
    FORM_FRAME_LABEL: "Application",
    FORM_FRAME_NOTE: "",
    PROOF_KICKER: "Proof",
    PROOF_INTRO: "",
    CLOSING_CTA: "CLICK HERE TO APPLY NOW",
    FOOTER_LABEL: clientLabel,
    FOOTER_DISCLAIMER: "Results vary. Nothing on this page guarantees income.",
  };
  const pageId = sanitize(body.dataset.pageId || location.pathname.replace(/\W+/g, "-") || "main");
  const apiOrigin = (body.dataset.apiOrigin || "").replace(/\/$/, "");
  const eventUrl = `${apiOrigin}/event?client=${encodeURIComponent(client)}`;
  const visitorId = persistentId("pulsify_visitor_id", localStorage);
  const sessionId = persistentId("pulsify_session_id", sessionStorage);
  const utm = readUtm();
  let config = null;
  let player = null;
  let playing = false;
  let lastFlushAt = performance.now();
  let lastMilestone = 0;
  let currentWistiaId = "";
  let currentTypeformId = "";
  let latestDraft = null;
  const tokenDefaults = new Map(
    Array.from(document.querySelectorAll("[data-token]"), (element) => [
      element.dataset.token,
      element.textContent,
    ]),
  );
  const videoPlaceholderMarkup = document.querySelector("[data-pulsify-wistia]")?.innerHTML || "";
  const proofFeedPlaceholderMarkup = document.querySelector("[data-proof-feed]")?.innerHTML || "";

  window.PulsifyFunnel = {
    client,
    pageId,
    visitorId,
    sessionId,
    identify(email) {
      const normalized = String(email || "").trim().toLowerCase();
      if (player && normalized) player.email = normalized;
    },
    track(event, metadata = {}) {
      return send({
        kind: "page",
        event,
        visitor_id: visitorId,
        session_id: sessionId,
        page_id: pageId,
        lead_token: leadToken,
        path: location.pathname,
        referrer: document.referrer,
        utm,
        metadata,
      });
    },
  };

  if (draftMode) {
    addEventListener("message", receiveDraft);
    enablePreviewEditorMap();
  }
  trackPageView();
  bindCtas();
  bindOptins();
  loadConfig();

  async function loadConfig() {
    try {
      const response = await fetch(
        `${apiOrigin}/api/funnel-config?client=${encodeURIComponent(client)}`,
        { headers: { accept: "application/json" } },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "config unavailable");
      config = data.config;
      mountWistia(config.wistia_media_id);
      mountTypeform(config.typeform_url);
      mountProofImages(config.proof_images);
      if (latestDraft) applyDraft(latestDraft);
    } catch (error) {
      console.warn("Pulsify funnel config:", error.message);
    }
  }

  function mountProofImages(images) {
    const section = document.querySelector("[data-proof-section]");
    const feed = section?.querySelector("[data-proof-feed]");
    if (!section || !feed) return;

    const urls = images && typeof images === "object"
      ? Object.values(images).map(validImageUrl).filter(Boolean)
      : [];

    section.hidden = false;
    feed.innerHTML = proofFeedPlaceholderMarkup;
    if (!urls.length) return;

    const slots = Array.from(feed.querySelectorAll(".proof-slot"));
    urls.forEach((url, index) => {
      const slot = slots[index];
      if (!slot) return;
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const img = document.createElement("img");
      img.src = url;
      img.alt = "Client result screenshot";
      img.loading = "lazy";
      img.decoding = "async";

      link.appendChild(img);
      slot.replaceChildren(link);
    });
  }

  function receiveDraft(event) {
    if (
      event.origin !== location.origin ||
      event.source !== window.parent ||
      !event.data ||
      event.data.type !== "pulsify-draft"
    ) return;
    latestDraft = event.data;
    applyDraft(latestDraft);
  }

  function applyDraft(draft) {
    const content = draft.page_content && typeof draft.page_content === "object"
      ? draft.page_content
      : {};
    document.querySelectorAll("[data-token]").forEach((element) => {
      const key = element.dataset.token;
      const value = content[key];
      element.textContent = value == null || String(value) === ""
        ? (draftTokenDefaults[key] ?? tokenDefaults.get(key) ?? "")
        : String(value);
    });
    mountProofImages(draft.proof_images);
    mountWistia(draft.wistia_media_id);
    mountTypeform(draft.typeform_url);
  }

  function enablePreviewEditorMap() {
    const style = document.createElement("style");
    style.textContent = `
      [data-token], [data-pulsify-wistia], [data-pulsify-typeform], [data-proof-section]{
        cursor:pointer;
      }
      [data-token]:hover,
      [data-pulsify-wistia]:hover,
      [data-pulsify-typeform]:hover,
      [data-proof-section]:hover{
        outline:2px solid rgba(104,113,244,.28);
        outline-offset:4px;
      }
    `;
    document.head.appendChild(style);
    document.addEventListener("click", handlePreviewEditorClick);
  }

  function handlePreviewEditorClick(event) {
    const tokenElement = event.target.closest("[data-token]");
    if (tokenElement) {
      event.preventDefault();
      sendEditorFocus({ type: "pulsify-focus-token", token: tokenElement.dataset.token });
      return;
    }
    if (event.target.closest("[data-pulsify-wistia], [data-video-block]")) {
      event.preventDefault();
      sendEditorFocus({ type: "pulsify-focus-field", field: "wistia_media_id" });
      return;
    }
    if (event.target.closest("[data-pulsify-typeform], [data-application-section], [data-application-cta]")) {
      event.preventDefault();
      sendEditorFocus({ type: "pulsify-focus-field", field: "typeform_url" });
      return;
    }
    if (event.target.closest("[data-proof-section], [data-proof-feed], .proof-slot")) {
      event.preventDefault();
      sendEditorFocus({ type: "pulsify-focus-field", field: "proof_images" });
    }
  }

  function sendEditorFocus(payload) {
    if (window.parent === window) return;
    window.parent.postMessage(payload, location.origin);
  }

  function mountWistia(mediaId) {
    const mount = document.querySelector("[data-pulsify-wistia]");
    const validMediaId = validWistiaMediaId(mediaId);
    if (!mount) return;
    if (validMediaId && currentWistiaId === validMediaId && mount.childElementCount) {
      revealAll("[data-video-block]");
      return;
    }
    player = null;
    playing = false;
    currentWistiaId = "";
    if (!validMediaId) {
      mount.innerHTML = videoPlaceholderMarkup;
      revealAll("[data-video-block]");
      return;
    }
    currentWistiaId = validMediaId;
    mount.innerHTML = "";

    const mediaScript = document.createElement("script");
    mediaScript.src = `https://fast.wistia.com/embed/${encodeURIComponent(validMediaId)}.js`;
    mediaScript.async = true;
    mediaScript.type = "module";

    if (!document.querySelector('script[src="https://fast.wistia.com/player.js"]')) {
      const playerScript = document.createElement("script");
      playerScript.src = "https://fast.wistia.com/player.js";
      playerScript.async = true;
      document.head.appendChild(playerScript);
    }

    const style = document.createElement("style");
    style.textContent = `
      wistia-player[media-id="${cssEscape(validMediaId)}"]:not(:defined){
        display:block; padding-top:56.25%; background:#111;
      }
      wistia-player[media-id="${cssEscape(validMediaId)}"]{ display:block; width:100%; }
    `;

    player = document.createElement("wistia-player");
    player.id = "pulsifyWistiaPlayer";
    player.setAttribute("media-id", validMediaId);
    player.setAttribute("player-color", "17191F");
    player.setAttribute("aspect", "1.7777777778");

    mount.append(style, mediaScript, player);
    bindWistiaEvents(validMediaId);
    revealAll("[data-video-block]");
  }

  function bindWistiaEvents(mediaId) {
    player.addEventListener("api-ready", () => {
      flushWatch("ready", mediaId);
    });
    player.addEventListener("play", () => {
      playing = true;
      lastFlushAt = performance.now();
      flushWatch("play", mediaId);
    });
    player.addEventListener("pause", () => {
      flushWatch("pause", mediaId);
      playing = false;
    });
    player.addEventListener("ended", () => {
      flushWatch("ended", mediaId, true);
      playing = false;
    });
    player.addEventListener("second-change", (event) => {
      const second = Number(event.detail?.second ?? player.currentTime ?? 0);
      if (second > 0 && second % 5 === 0) flushWatch("snapshot", mediaId);
    });
    player.addEventListener("percent-watched-change", () => {
      const percent = Math.round(Number(player.percentWatched || 0) * 100);
      const milestone = [25, 50, 75, 90, 100].find(
        (value) => percent >= value && lastMilestone < value,
      );
      if (milestone) {
        lastMilestone = milestone;
        flushWatch(`percent_${milestone}`, mediaId);
      }
    });
    player.addEventListener("seeked", (event) => {
      flushWatch("seeked", mediaId, false, event.detail || {});
    });
    player.addEventListener("rate-change", (event) => {
      flushWatch("rate_change", mediaId, false, event.detail || {});
    });
    player.addEventListener("mute-change", (event) => {
      flushWatch("mute_change", mediaId, false, event.detail || {});
    });
    player.addEventListener("enter-fullscreen", () => flushWatch("fullscreen", mediaId));
    player.addEventListener("captions-change", (event) => {
      flushWatch("captions_change", mediaId, false, event.detail || {});
    });

    addEventListener("pagehide", () => {
      flushWatch("exit", mediaId, true, {}, true);
    });
  }

  function flushWatch(event, mediaId, includeVector = false, metadata = {}, beacon = false) {
    if (draftMode || !player) return;
    const now = performance.now();
    const watchSeconds = playing ? Math.max(0, (now - lastFlushAt) / 1000) : 0;
    lastFlushAt = now;
    const payload = {
      kind: "wistia",
      source: "wistia",
      event,
      client,
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
      lead_token: leadToken,
      media_id: mediaId,
      wistia_visitor_key: player.visitorKey || null,
      percent: round(Number(player.percentWatched || 0) * 100, 2),
      position_seconds: round(Number(player.currentTime || 0), 2),
      duration_seconds: round(Number(player.duration || 0), 2),
      watch_seconds: round(watchSeconds, 2),
      unique_seconds: round(Number(player.secondsWatched || 0), 2),
      playback_rate: Number(player.playbackRate || 1),
      muted: Boolean(player.muted),
      metadata: {
        ...metadata,
        ...(includeVector ? { seconds_watched_vector: player.secondsWatchedVector || [] } : {}),
      },
    };
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(eventUrl, new Blob([JSON.stringify(payload)], { type: "application/json" }));
    } else {
      send(payload);
    }
  }

  function mountTypeform(typeformUrl) {
    const mount = document.querySelector("[data-pulsify-typeform]");
    if (!mount) return;
    const formId = parseTypeformId(typeformUrl);
    if (formId && currentTypeformId === formId && mount.childElementCount) {
      revealAll("[data-application-section], [data-application-cta]");
      return;
    }
    hideAll("[data-application-section], [data-application-cta]");
    mount.innerHTML = "";
    currentTypeformId = "";
    if (!formId) return;
    currentTypeformId = formId;

    window.pulsifyTypeformStarted = ({ responseId }) => {
      window.PulsifyFunnel.track("form_start", { response_id: responseId || null });
    };
    window.pulsifyTypeformSubmitted = ({ responseId }) => {
      window.PulsifyFunnel.track("form_submit_client", { response_id: responseId || null });
    };

    const widget = document.createElement("div");
    widget.dataset.tfWidget = formId;
    widget.dataset.tfInlineOnMobile = "";
    widget.dataset.tfOnStarted = "pulsifyTypeformStarted";
    widget.dataset.tfOnSubmit = "pulsifyTypeformSubmitted";
    widget.dataset.tfHidden = hiddenFields();
    widget.style.width = "100%";
    widget.style.height = "540px";
    mount.appendChild(widget);

    const existing = document.querySelector('script[src*="embed.typeform.com/next/embed.js"]');
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.src = "https://embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);
    revealAll("[data-application-section], [data-application-cta]");
  }

  function hiddenFields() {
      const values = {
      client,
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
      lead_token: leadToken,
      referrer: document.referrer,
      ...utm,
    };
    return Object.entries(values)
      .filter(([, value]) => value != null && value !== "")
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join(",");
  }

  function bindCtas() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a,button");
      if (!link) return;
      if (link.matches(".primary-cta,[data-pulsify-cta]")) {
        window.PulsifyFunnel.track("cta_click", {
          label: (link.textContent || "").trim().slice(0, 120),
          href: link.getAttribute("href") || null,
        });
      }
    });
  }

  function bindOptins() {
    document.querySelectorAll("form[data-pulsify-optin]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim().toLowerCase();
        const button = form.querySelector('[type="submit"]');
        if (button) button.disabled = true;
        try {
          const response = await send({
            kind: "optin",
            email,
            name: formData.get("name") || formData.get("first_name") || null,
            visitor_id: visitorId,
            session_id: sessionId,
            page_id: pageId,
            lead_token: leadToken,
            path: location.pathname,
            referrer: document.referrer,
            utm,
          });
          if (!response.ok) throw new Error("opt-in failed");
          const success = form.dataset.success;
          if (success) location.assign(success);
          else form.dataset.submitted = "true";
        } catch {
          form.dataset.error = "true";
        } finally {
          if (button) button.disabled = false;
        }
      });
    });
  }

  function trackPageView() {
    send({
      kind: "page",
      event: "page_view",
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
      lead_token: leadToken,
      path: location.pathname,
      referrer: document.referrer,
      utm,
      metadata: {
        title: document.title,
        screen: `${screen.width}x${screen.height}`,
      },
    });
  }

  async function send(payload) {
    if (draftMode || operatorPreview) return { ok: true };
    return fetch(eventUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  }

  function parseTypeformId(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (/^[a-z0-9_-]{6,64}$/i.test(raw)) return raw;

    try {
      const parsed = new URL(raw);
      if (!["http:", "https:"].includes(parsed.protocol)) return "";
      if (parsed.hostname !== "typeform.com" && !parsed.hostname.endsWith(".typeform.com")) return "";
      const pathname = parsed.pathname.split("/").filter(Boolean);
      const toIndex = pathname.indexOf("to");
      const formId = toIndex >= 0 ? pathname[toIndex + 1] : "";
      return /^[a-z0-9_-]{6,64}$/i.test(formId || "") ? formId : "";
    } catch {
      return "";
    }
  }

  function readUtm() {
    const params = new URLSearchParams(location.search);
    const result = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      if (params.get(key)) result[key] = params.get(key);
    }
    return result;
  }

  function persistentId(key, storage) {
    let value = storage.getItem(key);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      storage.setItem(key, value);
    }
    return value;
  }

  function sanitize(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
  }

  function sanitizeToken(value) {
    return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  }

  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function validWistiaMediaId(value) {
    const mediaId = String(value || "").trim();
    return /^[a-z0-9_-]{6,64}$/i.test(mediaId) ? mediaId : "";
  }

  function revealAll(selector) {
    document.querySelectorAll(selector).forEach((element) => {
      element.hidden = false;
    });
  }

  function hideAll(selector) {
    document.querySelectorAll(selector).forEach((element) => {
      element.hidden = true;
    });
  }

  function validImageUrl(value) {
    try {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const url = new URL(raw, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function round(value, places) {
    if (!Number.isFinite(value)) return null;
    const scale = 10 ** places;
    return Math.round(value * scale) / scale;
  }
})();
