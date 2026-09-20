// Shared contact anatomy, ordering and loading state for operator contact views.
(() => {
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const time = v => Number.isFinite(Date.parse(v)) ? Date.parse(v) : 0;
  const last = r => r.last_message_at || r.last_seen || r.sent_at || r.updated_at;
  const name = r => r.name || r.participant_name || r.contact_name || r.client_name || r.handle || r.contact_email || "Unknown contact";
  const rate = r => r.our_messages ? Math.min(100, 100 * (r.their_messages || 0) / r.our_messages) : 0;
  const sorts = [["recent","Last interaction"],["due","Follow-up due"],["reply","Reply rate"],["name","Name"]];
  function sort(rows, mode = "recent") {
    return [...rows].sort((a,b) => {
      if (mode === "name") return name(a).localeCompare(name(b)) || time(last(b))-time(last(a));
      if (mode === "reply") return rate(b)-rate(a) || time(last(b))-time(last(a));
      if (mode === "due") {
        const due = Number(Boolean(b.follow_up_due))-Number(Boolean(a.follow_up_due));
        if (due) return due;
        if (a.follow_up_due && b.follow_up_due) return (b.hours_since_our_message || 0)-(a.hours_since_our_message || 0);
      }
      return time(last(b))-time(last(a)) || name(a).localeCompare(name(b));
    });
  }
  function control(id, value = "recent", modes = sorts.map(x=>x[0])) {
    return `<label class="contact-sort" for="${esc(id)}">Sort by <select class="ps-control" id="${esc(id)}">${sorts.filter(([key])=>modes.includes(key)).map(([key,label])=>`<option value="${key}" ${value===key?'selected':''}>${label}</option>`).join("")}</select></label>`;
  }
  function ago(value) {
    const t=time(value); if (!t) return "No interaction yet";
    const m=Math.max(0,Math.floor((Date.now()-t)/60000));
    return m<1?'Just now':m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:new Intl.DateTimeFormat('en',{month:'short',day:'numeric'}).format(new Date(t));
  }
  function row(r, {attribute="data-contact", value=r.id, expanded, source="Instagram", stage="", detail=""}={}) {
    const n=name(r), handle=r.handle || r.participant_username || r.contact_email || '';
    const initials=n.split(/[\s._-]+/).slice(0,2).map(w=>w[0] || '').join('').toUpperCase();
    const picture=/^https:\/\//.test(r.pfp_url || '') ? r.pfp_url : '';
    return `<button type="button" class="contact-row" ${attribute}="${esc(value)}" ${expanded===undefined?'':`aria-expanded="${expanded}"`}>
      <span class="contact-avatar">${picture?`<img src="${esc(picture)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:esc(initials)}</span>
      <span class="contact-person"><strong>${esc(n)}</strong><small>${esc(handle && !handle.includes('@')?'@'+handle:handle || source)}</small></span>
      <span class="contact-preview"><span>${esc(r.last_text || r.snippet || '(attachment)')}</span><small>${esc(detail || (r.last_direction==='outbound' || r.direction==='outbound'?'You spoke last':'They spoke last'))}</small></span>
      <span class="contact-meta"><time datetime="${esc(last(r) || '')}">${esc(ago(last(r)))}</time><span class="contact-stage">${esc(stage || r.stage_label || r.stage || source)}</span></span>
      <span class="contact-chevron ot-chevron" aria-hidden="true">${PulsifyShell.icon(expanded ? 'chevron-down' : 'chevron-right')}</span>
    </button>`;
  }
  function skeleton(count=6) {
    return `<div class="contact-loading" role="status" aria-label="Loading contacts">${Array.from({length:count},()=>'<div class="contact-row contact-skeleton" aria-hidden="true"><span class="contact-avatar skeleton"></span><span class="contact-person"><i class="skeleton"></i><i class="skeleton"></i></span><span class="contact-preview"><i class="skeleton"></i><i class="skeleton"></i></span><span class="contact-meta"><i class="skeleton"></i><i class="skeleton"></i></span></div>').join('')}</div>`;
  }
  window.PulsifyContact = {esc, sort, control, row, skeleton, ago};
})();
