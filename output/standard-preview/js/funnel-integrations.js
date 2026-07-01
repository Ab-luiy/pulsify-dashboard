/**
 * Pulsify landing-page integration layer.
 *
 * Add these attributes to <body>:
 *   data-client="frank"
 *   data-page-id="main"
 *   data-api-origin=""       (optional; blank means same origin)
 *
 * Add these mount points:
 *   <div data-pulsify-wistia></div>
 *   <div data-pulsify-typeform></div>
 *
 * Any form with data-pulsify-optin will send its email to the pipe and Kit.
 */

(() => {
  const body = document.body;
  const client = sanitize(body.dataset.client || "unknown");
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
        path: location.pathname,
        referrer: document.referrer,
        utm,
        metadata,
      });
    },
  };

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
      if (config.wistia_media_id) mountWistia(config.wistia_media_id);
      if (config.typeform_url) mountTypeform(config.typeform_url);
    } catch (error) {
      console.warn("Pulsify funnel config:", error.message);
    }
  }

  function mountWistia(mediaId) {
    const mount = document.querySelector("[data-pulsify-wistia]");
    if (!mount) return;
    mount.innerHTML = "";

    const mediaScript = document.createElement("script");
    mediaScript.src = `https://fast.wistia.com/embed/${encodeURIComponent(mediaId)}.js`;
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
      wistia-player[media-id="${cssEscape(mediaId)}"]:not(:defined){
        display:block; padding-top:56.25%; background:#111;
      }
      wistia-player[media-id="${cssEscape(mediaId)}"]{ display:block; width:100%; }
    `;

    player = document.createElement("wistia-player");
    player.id = "pulsifyWistiaPlayer";
    player.setAttribute("media-id", mediaId);
    player.setAttribute("player-color", "6871F4");
    player.setAttribute("aspect", "1.7777777778");

    mount.append(style, mediaScript, player);
    bindWistiaEvents(mediaId);
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
    if (!player) return;
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
    if (!formId) return;

    window.pulsifyTypeformStarted = ({ responseId }) => {
      window.PulsifyFunnel.track("form_start", { response_id: responseId || null });
    };
    window.pulsifyTypeformSubmitted = ({ responseId }) => {
      window.PulsifyFunnel.track("form_submit_client", { response_id: responseId || null });
    };

    mount.innerHTML = "";
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
  }

  function hiddenFields() {
    const values = {
      client,
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
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
    return fetch(eventUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  }

  function parseTypeformId(url) {
    try {
      const pathname = new URL(url).pathname.split("/").filter(Boolean);
      const toIndex = pathname.indexOf("to");
      return toIndex >= 0 ? pathname[toIndex + 1] : pathname.at(-1);
    } catch {
      return String(url || "").trim();
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

  function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function round(value, places) {
    if (!Number.isFinite(value)) return null;
    const scale = 10 ** places;
    return Math.round(value * scale) / scale;
  }
})();
