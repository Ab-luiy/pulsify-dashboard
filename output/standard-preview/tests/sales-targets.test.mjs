import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodMetrics, salesPeriod, targetProgress } from '../functions/_shared/sales-targets.js';
test('calendar weeks start Monday and months handle year boundaries', () => {
  const now = Date.parse('2027-01-03T12:00:00Z');
  assert.equal(salesPeriod('week',now).start,'2026-12-28T00:00:00.000Z');
  assert.equal(salesPeriod('month',now).end,'2027-02-01T00:00:00.000Z');
});
test('call rates exclude cancelled and rescheduled calls, EOD counts days once', () => {
  const stats = periodMetrics([{attended:'showed',result:'closed'},{attended:'showed',result:'not_closed'},{attended:'no_show'},{attended:'cancelled'},{attended:'rescheduled'}], [{kind:'eod',member_id:'a',day:'2026-10-04'},{kind:'eod',member_id:'a',day:'2026-10-04'},{kind:'eod',member_id:'b',day:'2026-10-04'}],25000);
  assert.deepEqual(stats,{calls_taken:2,show_rate:2/3,close_rate:0.5,cash_collected_cents:25000,eod_forms_filed:2});
});
test('counts use elapsed time while rates compare directly, no calls remain Watch', () => {
  const now=Date.parse('2026-10-08T12:00:00Z'); // half way through Monday-start week
  const t={metric:'calls_taken',period:'week',target:10};
  assert.equal(targetProgress(t,5,now).status,'On track');
  assert.equal(targetProgress(t,4,now).status,'Watch');
  assert.equal(targetProgress(t,3,now).status,'At risk');
  assert.equal(targetProgress({...t,metric:'show_rate',target:0.8},0.4,now).status,'At risk');
  assert.equal(targetProgress({...t,metric:'show_rate'},null,now).status,'Watch');
});
