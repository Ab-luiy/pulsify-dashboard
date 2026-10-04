import { normalizeEmail, parseJson } from './common.js';

// Match a recording only when the invitees and start time identify one booking.
export async function recordingBooking(env, client, emails, at) {
  if (!emails.length || !Number.isFinite(Date.parse(at || ''))) return null;
  const rows = (await env.DB.prepare("SELECT external_id,contact_email,ts,payload_json FROM pipeline_touches WHERE client_id=? AND kind='booking' AND external_id NOT LIKE '%#canceled'").bind(client).all()).results || [];
  const matches = rows.filter(r => emails.includes(normalizeEmail(r.contact_email)) && Math.abs(Date.parse(parseJson(r.payload_json,{}).starts_at || r.ts) - Date.parse(at)) <= 15 * 60000);
  const refs = [...new Set(matches.map(r=>r.external_id).filter(Boolean))];
  return refs.length === 1 ? { booking_ref:refs[0], lead_email:normalizeEmail(matches[0].contact_email) } : null;
}

export async function loadCallDetail(env, client, ref) {
  const outcome = ref.startsWith('manual:')
    ? await env.DB.prepare('SELECT * FROM lead_outcomes WHERE client_id=? AND id=?').bind(client,Number(ref.slice(7))).first()
    : await env.DB.prepare('SELECT * FROM lead_outcomes WHERE client_id=? AND booking_ref=?').bind(client,ref).first();
  const booking = ref.startsWith('manual:') ? null : await env.DB.prepare("SELECT * FROM pipeline_touches WHERE client_id=? AND kind='booking' AND external_id=? ORDER BY ts DESC LIMIT 1").bind(client,ref).first();
  if (!outcome && !booking) return null;
  const payload = parseJson(booking?.payload_json,{});
  const at = outcome?.call_at || payload.starts_at || booking?.ts || outcome?.created_at;
  const email = normalizeEmail(outcome?.email || booking?.contact_email);
  const notes = (await env.DB.prepare(`SELECT id,title,summary,decisions,actions,recording_url,source_kind,call_date
    FROM call_notes WHERE client=? AND (booking_ref=? OR (booking_ref IS NULL AND lead_email=? AND julianday(call_date)=julianday(?))) ORDER BY created_at`).bind(client,ref,email,at).all()).results || [];
  const closer = outcome?.closer_id ? await env.DB.prepare('SELECT id,name FROM team_members WHERE client_id=? AND id=?').bind(client,outcome.closer_id).first() : null;
  return { booking_ref:ref, email, call_at:at, closer:closer?.name || outcome?.closer || null,
    outcome:outcome ? { id:outcome.id,attended:outcome.attended,result:outcome.result,deal_cents:outcome.deal_cents,payment_type:outcome.payment_type,pre_sold:outcome.pre_sold,objection:outcome.objection,notes:outcome.notes,closer_id:outcome.closer_id } : null,
    briefs:notes.filter(n=>n.source_kind === 'precall'), recordings:notes.filter(n=>n.source_kind !== 'precall') };
}
