// Operator Leads view: people, not pipeline. Two sources on one page:
// the Instagram inbox (every thread, handle, who spoke last, in CRM or not)
// and funnel contacts across every client (applied, opted in, booked, paid).
// CRM stays the outbound working list; this is where inbound lands first.
(() => {
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (cents, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format((cents || 0) / 100);
  const ago = (iso) => {
    if (!iso) return "";
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 14) return `${Math.floor(s / 86400)} d ago`;
    return new Date(iso).toLocaleDateString();
  };
  async function api(path, init) {
    const r = await fetch(path, { headers: { "content-type": "application/json", "x-pulsify-operator": "1", ...(init?.headers || {}) }, ...init });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw PulsifyShell.failure(r.status);
    return d;
  }
  const contact = window.PulsifyContact;
  let warm = null;
  const threadCache = new Map();
  const pill = (label, cls) => `<span class="int-pill ${cls || ""}">${esc(label)}</span>`;

  function render(root, ctx = {}) {
    let q="", filter=ctx.section === "funnel" ? "funnel" : "all", order="recent", sequence=0, disposed=false;
    let cache=warm || {inbox:[],funnel:[]}, loaded=Boolean(warm);
    root.innerHTML=`<h1>Leads</h1><p class="ps-subtitle">This year's contacts. An inbox entry is not a vetted prospect; approve the fit in CRM before outreach.</p>
      <div class="contact-toolbar"><input id="leads-q" class="ps-input leads-search" placeholder="Search name, handle or email" aria-label="Search leads"><button class="ps-control" id="leads-refresh">Refresh</button>${contact.control("leads-sort","recent",["recent","name"])}</div>
      <div class="leads-filters">${[["all","All contacts"],["inbox","Instagram"],["funnel","Funnel"],["awaiting","Waiting on you"],["new","Not in CRM"]].map(([key,label])=>`<button class="leads-chip ${filter===key?'active':''}" data-filter="${key}">${label}</button>`).join('')}</div>
      <div id="leads-body" class="contact-result">${loaded ? "" : contact.skeleton(6)}</div>`;
    const body=root.querySelector('#leads-body');
    async function load() {
      const current=++sequence;
      if(!loaded) body.innerHTML=contact.skeleton(6);
      root.querySelector("#leads-feedback")?.remove();
      try {
        const [inbox,funnel]=await Promise.all([api('/api/spine/conversations'),api('/api/pipeline')]);
        if(disposed || current!==sequence || !root.isConnected)return;
        cache={inbox:inbox.conversations || [],funnel:funnel.contacts || []};warm=cache;loaded=true;draw();
      } catch(e) {if(!disposed && current===sequence){if(!loaded)body.replaceChildren();const note=PulsifyShell.inlineError(body,e,load);note.id="leads-feedback";}}
    }
    function draw() {
      if(!loaded)return;
      let rows=[...cache.inbox.map(c=>({...c,source:'Instagram',_original:c,name:c.participant_name || c.participant_username})),...cache.funnel.map(c=>({...c,source:'Funnel',name:c.contact_name || c.contact_email,last_text:c.client_name || c.client_id,last_message_at:c.last_seen}))];
      rows=rows.filter(c=>(!q || `${c.name} ${c.participant_username || ''} ${c.contact_email || ''} ${c.last_text || ''}`.toLowerCase().includes(q)) &&
        (filter==='all' || filter==='inbox' && c.source==='Instagram' || filter==='funnel' && c.source==='Funnel' || filter==='awaiting' && c.last_direction==='inbound' || filter==='new' && c.source==='Instagram' && !c.in_crm));
      body.innerHTML=contact.sort(rows,order).map(c=>{
        if(c.source==='Instagram')return contact.row(c,{attribute:'data-open',source:c.source,stage:c.in_crm?'In CRM':'New contact'})+
          `<div class="contact-extra"><span class="contact-source">Instagram</span>${!c.in_crm && (c.participant_username || c.participant_id)?`<button class="ps-control" data-add="${esc(c.id)}">Add to CRM</button>`:''}</div>`;
        return contact.row(c,{attribute:'data-client',value:c.client_id,source:c.source,stage:c.stage,detail:`Funnel / ${c.paid_cents ? money(c.paid_cents)+' collected' : 'No payment matched'}`})+(!c.paid_cents?'<div class="contact-extra"><button class="ps-button ghost" data-payment>Match a payment</button></div>':'');
      }).join('');
      if(!rows.length){const filtered=q || !['all','inbox','funnel'].includes(filter);body.replaceChildren(PulsifySurface.empty('users',filtered?'No matching contacts':'No contacts yet',filtered?'Try another name or clear the filters.':'Connect a source to bring conversations and funnel contacts here.',filtered?'Clear filters':'Open Integrations',()=>{if(filtered){q='';filter='all';root.querySelector('#leads-q').value='';root.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));draw();}else window.PulsifyOperatorShell?.go('integrations');}));}
      body.querySelectorAll('[data-payment]').forEach(b=>b.onclick=()=>window.PulsifyOperatorShell?.go('payments'));
      body.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openThread(b.dataset.open));
      body.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCrm(cache.inbox.find(c=>c.id===b.dataset.add),b));
      body.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('pulsify:brain-client',b.dataset.client);window.PulsifyOperatorShell?.go('brain');});
    }
    async function openThread(id) {
      const d = document.createElement("dialog");
      d.className = "ps-dialog int-dialog leads-thread";
      d.innerHTML = '<div class="ps-message-skeleton" aria-label="Loading conversation">'+ '<div class="skeleton"></div>'.repeat(3)+'</div>';
      document.body.append(d);
      d.addEventListener("close", () => d.remove());
      d.showModal();
      try {
        const payload = threadCache.get(id) || await api(`/api/spine/conversations?id=${encodeURIComponent(id)}`);
        if(!d.open)return;threadCache.set(id,payload);const {conversation:c,messages=[]}=payload;
        const handle = c.participant_username ? `@${c.participant_username}` : (c.participant_name || "Unknown");
        d.innerHTML = `<div class="leads-thread-head"><div><h2>${esc(handle)}</h2><small class="int-note">${messages.length} messages · first ${esc(ago(c.first_message_at))} · last ${esc(ago(c.last_message_at))}</small></div><div class="int-row-actions">${c.participant_username ? `<a class="ps-control" href="https://instagram.com/${encodeURIComponent(c.participant_username)}" target="_blank" rel="noopener">Open on Instagram</a>` : ""}<button class="ps-control" data-close>Close</button></div></div>
          <div class="leads-messages">${messages.map((m) => `<div class="leads-msg ${m.direction}"><p>${esc(m.text || "(attachment)")}</p><small>${m.direction === "outbound" ? "You" : esc(handle)} · ${esc(new Date(m.sent_at).toLocaleString())}</small></div>`).join("")}</div>
          <p class="int-note">Replying from here is not on yet. Open the thread on Instagram to answer.</p>`;
        if(!messages.length)d.querySelector(".leads-messages").replaceChildren(PulsifySurface.empty("message-circle","No messages stored","Read the conversation on Instagram.","Open Instagram",()=>window.open("https://www.instagram.com/direct/inbox/","_blank","noopener")));
        d.querySelector("[data-close]").onclick = () => d.close();
        d.querySelector(".leads-messages").scrollTop = 1e9;
      } catch (e) {
        d.innerHTML = `<div class="int-actions"><button class="ps-control" data-close>Close</button></div>`;
        PulsifyShell.inlineError(d,e,()=>{d.close();openThread(id);});
        d.querySelector("[data-close]").onclick = () => d.close();
      }
    }

    async function addToCrm(c, button) {
      if (!c) return;
      PulsifyShell.pending(button);
      button.parentElement.querySelector(".ps-inline-error")?.remove();
      const name = c.participant_username || c.participant_id;
      const ts = Date.now();
      try {
        // Same record shape the inbox job writes for outreach threads.
        await api("/api/crm-sync", { method: "POST", body: JSON.stringify({ added: { [name]: { n: c.participant_name || name, h: c.participant_username || name, niche: "", dms: c.message_count || 0, stage: "new-lead", src: "instagram", igConversationId: c.id, _ts: ts } } }) });
        c.in_crm = true;
        draw();
      } catch (e) {
        button.disabled = false;
        button.textContent = e.message.slice(0, 40);
      }
    }


    root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;root.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));draw();});
    root.querySelector('#leads-q').oninput=e=>{q=e.target.value.trim().toLowerCase();draw();};
    root.querySelector('#leads-sort').onchange=e=>{order=e.target.value;draw();};
    root.querySelector('#leads-refresh').onclick=load;
    load();
    return ()=>{disposed=true;sequence++;};
  }
  window.PulsifyLeadsView={render};
})();
