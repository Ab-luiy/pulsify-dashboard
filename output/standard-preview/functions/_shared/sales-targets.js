import { str } from './common.js';

export const SALES_METRICS = ['calls_taken', 'show_rate', 'close_rate', 'cash_collected_cents', 'eod_forms_filed'];
export function salesPeriod(period, now = Date.now()) {
  const d = new Date(now);
  let start, end;
  if (period === 'week') {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (d.getUTCDay() + 6) % 7));
    end = new Date(start.getTime() + 7 * 86400000);
  } else {
    start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return { start: start.toISOString(), end: end.toISOString(), elapsed: Math.min(1, Math.max(0, (now - start) / (end - start))) };
}

export function targetProgress(target, actual, now = Date.now()) {
  const rate = target.metric.endsWith('_rate');
  const expected = rate ? target.target : target.target * salesPeriod(target.period, now).elapsed;
  const fraction = actual == null ? null : expected === 0 ? 1 : actual / expected;
  return { metric: target.metric, period: target.period, actual, target: target.target,
    status: fraction == null ? 'Watch' : fraction >= 1 ? 'On track' : fraction >= 0.8 ? 'Watch' : 'At risk' };
}

export async function setTarget(env, client, input, now = Date.now()) {
  const metric = str(input?.metric), period = str(input?.period);
  if (!SALES_METRICS.includes(metric) || !['week', 'month'].includes(period)) return { error: 'Choose a metric and period.' };
  const member = str(input?.member_id) || null;
  if (member && !await env.DB.prepare('SELECT id FROM team_members WHERE client_id=? AND id=?').bind(client, member).first()) return { error: "That rep isn't in this workspace.", status: 404 };
  if (input.target === null) {
    await env.DB.prepare("DELETE FROM sales_targets WHERE client_id=? AND COALESCE(member_id,'')=? AND metric=? AND period=?").bind(client, member || '', metric, period).run();
    return { ok: true };
  }
  const target = input.target;
  if (typeof target !== 'number' || !Number.isFinite(target) || target < 0 || target > (metric.endsWith('_rate') ? 1 : 1e12) || (!metric.endsWith('_rate') && !Number.isInteger(target))) return { error: 'Enter a valid target. Rates must be between 0 and 100%.' };
  const at = new Date(now).toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO sales_targets (id,client_id,member_id,metric,period,target,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT DO UPDATE SET target=excluded.target,updated_at=excluded.updated_at`).bind(id, client, member, metric, period, target, at, at).run();
  return { ok: true };
}

export function periodMetrics(outcomes, forms, cash) {
  const showed = outcomes.filter(o => o.attended === 'showed').length;
  const missed = outcomes.filter(o => o.attended === 'no_show').length;
  const closed = outcomes.filter(o => o.attended === 'showed' && o.result === 'closed').length;
  return { calls_taken: showed, show_rate: showed + missed ? showed / (showed + missed) : null,
    close_rate: showed ? closed / showed : null, cash_collected_cents: cash,
    eod_forms_filed: new Set(forms.filter(f => f.kind === 'eod').map(f => `${f.member_id}:${f.day}`)).size };
}
