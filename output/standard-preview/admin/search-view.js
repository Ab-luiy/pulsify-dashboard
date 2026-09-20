// Semantic search across DMs and client brains. Ask in plain words
// ("who mentioned prop firm payouts", "clients selling to day traders"); the
// answer is the messages and brain fields that mean that, not just contain it.
// Ctrl+K anywhere in the console opens this view with the box focused.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = (iso) => { if (!iso) return ""; const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000); if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`; if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} d ago`; };
  async function api(path) {
    const r = await fetch(path, { headers: { "x-pulsify-operator": "1" } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw PulsifyShell.failure(r.status);
    return d;
  }
  const contact=window.PulsifyContact;
  const cache=new Map();
  const EXAMPLES = ["who mentioned blowing an account", "anyone asking about pricing", "clients who sell to dropshippers", "people who said they would think about it", "offers built around a signal service"];

  function render(root, ctx = {}) {
    let sequence = 0, order="recent", hits=[], took=0, disposed=false;
    root.innerHTML = `
      <h1>Search</h1><p class="ps-subtitle">Ask in plain words. This finds what people meant across every DM and every client brain, not just the exact words.</p>
      <form class="sr-form" id="sr-form"><input id="sr-q" class="ps-input sr-input" aria-label="Search conversations and client brains" placeholder="who mentioned prop firm payouts" autocomplete="off" autofocus><button class="ps-control int-primary" type="submit">Search</button></form>
      <div class="sr-filters"><label class="leads-chip active"><input type="checkbox" name="kind" value="dm" checked hidden>DMs</label><label class="leads-chip active"><input type="checkbox" name="kind" value="brain" checked hidden>Client brains</label><small id="sr-status" class="int-note"></small></div>
      <div class="sr-examples" id="sr-examples">${EXAMPLES.map((e) => `<button class="ps-control" data-example="${esc(e)}">${esc(e)}</button>`).join("")}</div>
      <div class="contact-toolbar"><span class="int-note">Matches grouped by person</span>${contact.control("sr-sort","recent",["recent","name"])}</div>
      <div id="sr-results" class="sr-results"></div>`;
    const q = root.querySelector("#sr-q"), results = root.querySelector("#sr-results"), status = root.querySelector("#sr-status");
    root.querySelectorAll(".sr-filters label").forEach((l) => l.addEventListener("click", (e) => { e.preventDefault(); const c = l.querySelector("input"); c.checked = !c.checked; l.classList.toggle("active", c.checked); if (q.value.trim()) run(); }));
    root.querySelectorAll("[data-example]").forEach((b) => (b.onclick = () => { q.value = b.dataset.example; run(); }));
    root.querySelector("#sr-form").addEventListener("submit", (e) => { e.preventDefault(); run(); });
    function loadStatus(){return api("/api/search?status=1").then((s) => {
      if(disposed || !root.isConnected)return;status.parentElement.querySelector(".ps-inline-error")?.remove();
      const dm = s.indexed?.dm?.count || 0, br = s.indexed?.brain?.count || 0;
      status.textContent = s.ready ? `${dm} of ${s.totals?.dms || 0} messages and ${br} of ${s.totals?.brain || 0} brain fields indexed${dm < (s.totals?.dms || 0) ? ", filling in" : ""}` : "Search index is not bound yet.";
    }).catch(e=>{if(!disposed)PulsifyShell.inlineError(status.parentElement,e,loadStatus);});}
    loadStatus();
    showEmpty(true);
    if (ctx.q) { q.value = ctx.q; run(); }
    q.focus();

    root.querySelector("#sr-sort").onchange=e=>{order=e.target.value;draw();};
    async function run() {
      const current = ++sequence;
      const text = q.value.trim();
      if (text.length < 2) { showEmpty(true);return; }
      const kinds = [...root.querySelectorAll('input[name="kind"]:checked')].map((c) => c.value);
      const key=JSON.stringify([text,kinds]);const saved=cache.get(key);
      if(saved){hits=saved.hits || [];took=saved.took_ms;draw();}else results.innerHTML = contact.skeleton(3);
      PulsifyShell.pending(root.querySelector("#sr-form button"));
      root.querySelector("#sr-examples").hidden = true;
      try {
        const d = await api(`/api/search?q=${encodeURIComponent(text)}&kinds=${kinds.join(",")}&limit=20`);
        if (disposed || current !== sequence || !root.isConnected) return;
        cache.set(key,d);if(cache.size>30)cache.delete(cache.keys().next().value);hits=d.hits || [];took=d.took_ms;draw();
      } catch (e) { if (current !== sequence || !root.isConnected) return; if(!saved)results.replaceChildren();PulsifyShell.inlineError(results,e,run); } finally {if(current===sequence)PulsifyShell.pending(root.querySelector("#sr-form button"),false);}
    }
    function showEmpty(initial=false){results.replaceChildren(PulsifySurface.empty('search',initial?'Find a conversation':'No matching conversations or brain fields',initial?'Ask about something a lead said or a client offers.':'Try different words or another source.','Try one of these',()=>{root.querySelector('#sr-examples').hidden=false;root.querySelector('[data-example]')?.focus();}));}
    function draw() {
      const groups=new Map();
      for(const h of hits){const key=h.kind==='dm'?'dm:'+h.conversation_id:'brain:'+h.client_id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(h);}
      const people=[...groups.values()].map(items=>{
        const latest=contact.sort(items)[0],best=[...items].sort((a,b)=>b.score-a.score)[0];
        return {...latest,name:latest.name || latest.client_name || latest.handle,items,snippet:best.snippet,score:best.score};
      });
      results.innerHTML=people.length?`<div class="contact-result">${contact.sort(people,order).map(h=>contact.row(h,{attribute:h.kind==='dm'?'data-thread':'data-brain',value:h.kind==='dm'?h.conversation_id:h.client_id,source:h.kind==='dm'?'Instagram':'Client brain',stage:`${Math.round(h.score*100)}% match`,detail:`${h.kind==='dm'?'Instagram':'Client brain'} / ${h.items.length} matching ${h.items.length===1?'passage':'passages'}`})+(h.items.length>1?`<div class="contact-extra"><details><summary>${h.items.length-1} more matching passages</summary>${h.items.filter(x=>x.snippet!==h.snippet).map(x=>`<p>${esc(x.snippet)}</p>`).join('')}</details></div>`:'')).join('')}</div><p class="int-note">${hits.length} matches across ${people.length} contacts / ${took} ms</p>`:'';
      if(!people.length)showEmpty();
      results.querySelectorAll('[data-thread]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('pulsify:open-thread',b.dataset.thread);window.PulsifyOperatorShell?.go('outreach');});
      results.querySelectorAll('[data-brain]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('pulsify:brain-client',b.dataset.brain);window.PulsifyOperatorShell?.go('brain');});
    }

  }

  // Ctrl+K / Cmd+K from anywhere in the console.
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); window.PulsifyOperatorShell?.go("search"); setTimeout(() => document.getElementById("sr-q")?.focus(), 150); }
  });

  window.PulsifySearchView = { render };
})();
