// Browser side of live push. Subscribes to the Pulsify topic over Supabase
// Realtime and hands events to whoever registered. Config comes from
// /api/realtime-config (public values only). Loads supabase-js from the CDN
// on first use so pages that never subscribe pay nothing.
//   PulsifyRealtime.on("tracker.changed", (payload) => ...)
//   PulsifyRealtime.on("notification", (payload) => ...)
//   PulsifyRealtime.status()  -> "off" | "connecting" | "live" | "error"
(() => {
  const handlers = new Map();
  let state = "off", channel = null, booted = false, topic = "";

  function on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
    boot();
    return () => handlers.get(event)?.delete(fn);
  }
  function emit(event, payload) { for (const fn of handlers.get(event) || []) { try { fn(payload); } catch { /* one listener must not break the rest */ } } for (const fn of handlers.get("*") || []) { try { fn(event, payload); } catch {} } }

  async function boot() {
    if (booted) return; booted = true;
    state = "connecting";
    try {
      const r = await fetch("/api/realtime-config", { credentials: "same-origin" });
      const cfg = await r.json();
      if (!cfg.ok || !cfg.url || !cfg.key) { state = "off"; return; }
      topic = cfg.topic;
      if (!window.supabase?.createClient) await load("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
      const client = window.supabase.createClient(cfg.url, cfg.key, { realtime: { params: { eventsPerSecond: 10 } } });
      channel = client.channel(topic, { config: { broadcast: { self: false } } });
      channel.on("broadcast", { event: "*" }, (msg) => emit(msg.event, msg.payload || {}));
      channel.subscribe((status) => {
        state = status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "error" : "connecting";
        document.dispatchEvent(new CustomEvent("pulsify:realtime", { detail: { state } }));
      });
    } catch { state = "error"; }
  }
  function load(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }

  window.PulsifyRealtime = { on, status: () => state, topic: () => topic };
})();
