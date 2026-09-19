// Phase 4 layer over the intake. The markup lives in index.html so the
// intake's own step list owns navigation; this file wires the recorder, the
// connect step, progress dots, and the completion hand-off.
(() => {
  const $ = (id) => document.getElementById(id);
  const query = new URLSearchParams(location.search);
  const client = query.get("client") || "";
  const token = query.get("t") || "";
  const authHeaders = () => (token ? { "x-portal-token": token } : {});
  const jsonHeaders = () => ({ "content-type": "application/json", ...authHeaders() });
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const steps = Array.from(document.querySelectorAll("[data-step]"));

  // ---- progress dots ----
  const dots = document.createElement("div");
  dots.className = "ob-dots";
  dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = steps.map(() => "<span></span>").join("");
  $("progressCopy").after(dots);
  const syncDots = () => {
    const current = steps.findIndex((s) => !s.hidden);
    dots.querySelectorAll("span").forEach((d, i) => { d.className = i < current ? "done" : i === current ? "current" : ""; });
  };
  new MutationObserver(syncDots).observe($("onboardForm"), { attributes: true, subtree: true, attributeFilter: ["hidden"] });
  syncDots();

  // ---- voice recorder ----
  let recorder = null, chunks = [], started = 0, timer = null;
  const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
  const setStatus = (text) => { $("obStatus").textContent = text; };
  async function upload(blob, mime) {
    if (!client) { setStatus("This page needs your workspace link to save a recording. Type it on the next question instead."); return; }
    setStatus("Transcribing. This takes a few seconds.");
    $("obRec").disabled = true;
    try {
      const fd = new FormData();
      fd.set("client", client);
      fd.set("file", new File([blob], mime.includes("mp4") ? "note.m4a" : "note.webm", { type: mime }));
      const r = await fetch("/api/voice-note", { method: "POST", headers: authHeaders(), body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus(d.error || "Upload failed. Try again, or type it on the next question."); return; }
      $("obNoteId").value = d.id || "";
      $("offerVoiceNote").value = d.r2_key || "";
      if (d.transcript) {
        $("obTranscript").hidden = false;
        $("obTranscript").value = d.transcript;
        setStatus("Here is what we heard. Fix anything that is off, then press Continue.");
      } else {
        setStatus("Audio saved, but the transcript did not come back. Continue and type the short version on the next question.");
      }
    } catch {
      setStatus("Upload failed. Try again, or type it on the next question.");
    } finally {
      $("obRec").disabled = false;
    }
  }
  $("obRec").addEventListener("click", async () => {
    if (recorder && recorder.state === "recording") { recorder.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("This browser cannot record. Upload a file instead, or type it on the next question.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      recorder = new MediaRecorder(stream, { mimeType: mime });
      chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        $("obRec").classList.remove("live");
        $("obRecLabel").textContent = "Record again";
        upload(new Blob(chunks, { type: mime }), mime);
      };
      recorder.start(1000);
      started = Date.now();
      $("obRec").classList.add("live");
      $("obRecLabel").textContent = "Stop";
      setStatus("Recording. Press Stop when you are done. Ten minutes maximum.");
      timer = setInterval(() => {
        $("obTimer").textContent = fmt(Date.now() - started);
        if (Date.now() - started > 10 * 60000 && recorder.state === "recording") recorder.stop();
      }, 500);
    } catch {
      setStatus("Microphone access was blocked. Upload a file instead, or type it on the next question.");
    }
  });
  $("obFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) upload(file, file.type || "audio/webm");
    e.target.value = "";
  });
  // Continue from the voice step applies the corrected transcript to the brain
  // before the intake's own handler moves on. Capture phase so it runs first.
  $("obVoiceNext").addEventListener("click", () => {
    const id = $("obNoteId").value;
    const transcript = $("obTranscript").value.trim();
    if (!id || !transcript) return;
    fetch("/api/voice-note?action=apply", { method: "POST", headers: jsonHeaders(), body: JSON.stringify({ client, id, transcript }) }).catch(() => null);
  }, { capture: true });

  // ---- connect step: same delegated contract the portal's Integrations view uses ----
  $("obSaveConnect").addEventListener("click", () => {
    const save = (provider, handle) => fetch("/api/client-integrations", { method: "POST", headers: jsonHeaders(), body: JSON.stringify({ provider, confirm: true, config: { handle, channel_note: `@${handle}` } }) }).then((r) => r.ok).catch(() => false);
    const ig = $("obIg").value.trim().replace(/^@/, "");
    const yt = $("obYt").value.trim().replace(/^@/, "");
    if (ig) save("instagram", ig).then((ok) => { if (ok) { $("obIgPill").textContent = "Invite requested"; $("obIgPill").className = "ob-pill ok"; } });
    if (yt) save("youtube", yt).then((ok) => { if (ok) { $("obYtPill").textContent = "Tracking"; $("obYtPill").className = "ob-pill ok"; } });
  }, { capture: true });

  // ---- completion: read the real checklist and hand off into the portal ----
  const completion = $("completion");
  new MutationObserver(async () => {
    if (completion.hidden) return;
    let data = null;
    if (client) {
      try { data = await (await fetch(`/api/checklist?client=${encodeURIComponent(client)}`, { headers: authHeaders() })).json(); } catch { data = null; }
    }
    const portal = new URL("/portal", location.origin);
    if (client) portal.searchParams.set("client", client);
    if (token) portal.searchParams.set("t", token);
    const list = Array.isArray(data?.steps) ? data.steps : [];
    completion.innerHTML = `<div class="ob-done"><p class="step-count">Done</p><h2>You are in.</h2><p>${list.length ? `${esc(data.done)} of ${esc(data.total)} launch steps are done. The rest wait for you in your workspace.` : "Your workspace is ready."}</p>${list.length ? `<ul>${list.map((s) => `<li class="${s.state === "done" ? "done" : ""}">${esc(s.title)}</li>`).join("")}</ul>` : ""}<a class="button primary" id="returnToPortal" href="${esc(portal.toString())}">Open my workspace</a></div>`;
  }).observe(completion, { attributes: true, attributeFilter: ["hidden"] });
})();
