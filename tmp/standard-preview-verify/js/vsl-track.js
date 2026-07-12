/* Self-owned VSL tracker — free alternative to Vidalytics/VTurb.
   Captures play rate, watch time, %-reached milestones, and drop-off.
   Demo: logs to console + localStorage + an on-page readout.
   Production: set window.VSL_ENDPOINT to a Cloudflare Function URL and each
   event is POSTed there (sendBeacon), which is the same pipe that feeds the
   client portal/dashboard. */
(function () {
  const video = document.getElementById("vsl");
  const frame = document.getElementById("training");
  const btn = document.getElementById("trainingButton");
  if (!video) return;

  const KEY = "vsl_metrics_v1";
  const MILESTONES = [10, 25, 50, 75, 90, 100];
  const state = { plays: 0, maxPercent: 0, watchedSec: 0, milestones: {}, _lastT: 0 };

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function emit(event, data) {
    const payload = Object.assign({ event, at: new Date().toISOString() }, data || {});
    console.log("[VSL]", event, payload);
    persist();
    if (window.VSL_ENDPOINT && navigator.sendBeacon) {
      navigator.sendBeacon(window.VSL_ENDPOINT, JSON.stringify(payload));
    }
    render();
  }

  function render() {
    const o = document.getElementById("vslDebug");
    if (!o) return;
    o.innerHTML =
      "&#9654; plays: <b>" + state.plays + "</b> &middot; watched: <b>" +
      Math.round(state.watchedSec) + "s</b> &middot; max reached: <b>" +
      state.maxPercent + "%</b>";
  }

  if (btn) btn.addEventListener("click", function () { video.play(); });

  video.addEventListener("play", function () {
    if (frame) frame.classList.add("is-playing");
    video.setAttribute("controls", "controls");
    if (state.plays === 0) { state.plays = 1; emit("play"); }
    state._lastT = video.currentTime;
  });

  video.addEventListener("timeupdate", function () {
    const d = video.duration || 0;
    if (!d) return;
    const dt = video.currentTime - state._lastT;
    if (dt > 0 && dt < 2) state.watchedSec += dt; // ignore seeks
    state._lastT = video.currentTime;

    const pct = Math.floor((video.currentTime / d) * 100);
    if (pct > state.maxPercent) state.maxPercent = pct;
    MILESTONES.forEach(function (m) {
      if (pct >= m && !state.milestones[m]) {
        state.milestones[m] = true;
        emit("progress", { percent: m });
      }
    });
    render();
  });

  video.addEventListener("pause", function () { emit("pause", { percent: state.maxPercent }); });
  video.addEventListener("ended", function () { emit("complete", { percent: 100 }); });
  window.addEventListener("pagehide", function () {
    emit("exit", { percent: state.maxPercent, watchedSec: Math.round(state.watchedSec) });
  });

  window.__vsl = state; // exposed for verification
  render();
})();
