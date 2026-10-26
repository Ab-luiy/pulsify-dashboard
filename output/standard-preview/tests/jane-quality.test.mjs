import test from 'node:test';
import assert from 'node:assert/strict';
import { JANE_QUALITY_CASES, scoreJaneReply } from '../tools/jane-quality-cases.mjs';
test('quality gates catch the previous long-answer and wrong-bottleneck regressions',()=>{
  const conversation=JANE_QUALITY_CASES.find(c=>c.id==='conversation');
  const bad=scoreJaneReply(conversation,'Send 6 emails daily and build a confirmation page. '+ 'This is generic advice. '.repeat(20));
  assert.equal(bad.automated_pass,false);assert.equal(bad.checks.no_known_regressions,false);assert.equal(bad.checks.question_count,false);
  const depth=JANE_QUALITY_CASES.find(c=>c.id==='depth');
  assert.equal(scoreJaneReply(depth,'word '.repeat(413)).checks.requested_length,false);
  const bounded=scoreJaneReply(depth,'word '.repeat(250));
  assert.equal(bounded.checks.requested_length,true);assert.equal(bounded.human_review,'pending');
});
test('keyword assertions cannot pass a history or draft quality case without actual retrieval',()=>{
  const item=JANE_QUALITY_CASES.find(c=>c.id==='earlier-chat');
  const result=scoreJaneReply(item,'CEDAR. No weekend calls.');
  assert.equal(result.checks.required_facts,true);assert.equal(result.automated_pass,false);
});
