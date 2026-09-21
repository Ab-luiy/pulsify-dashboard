import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectCutoff,bookingEvidence} from '../functions/_shared/prospect-policy.js';
import {deriveThread} from '../functions/_shared/outreach.js';
import {reviewBooking} from '../functions/_shared/booking-review.js';
import {allowedImageUrl} from '../functions/api/spine/instagram-image.js';

test('cutoffs use calendar months and clamp month ends',()=>{
 assert.equal(prospectCutoff('recent',Date.parse('2026-04-30T12:00:00Z')),'2026-02-28T12:00:00.000Z');
 assert.equal(prospectCutoff('year',Date.parse('2026-09-22T12:00:00Z')),'2026-01-01T00:00:00.000Z');
});
test('booking signals retain evidence, distinguish a proposal, and honor cancellation',()=>{
 const m=text=>({text,sent_at:'2026-09-20'});
 assert.equal(bookingEvidence([m('can we schedule a call?')]),null);
 assert.equal(bookingEvidence([m('our call is scheduled')]).kind,'Call scheduled');
 assert.equal(bookingEvidence([m('send your whatsapp number')]).confirmed,false);
 assert.equal(bookingEvidence([m('https://meet.google.com/abc-defg-hij')]).kind,'Google Meet link');
 assert.equal(bookingEvidence([m('call scheduled'),m('cancelled it')]),null);
});
test('old receipts never label a newer outbound message left on read',()=>{
 const messages=[{direction:'outbound',sent_at:'2026-09-20T10:00:00Z',text:'first',payload_json:JSON.stringify({readAt:'2026-09-20T10:01:00Z'})},{direction:'outbound',sent_at:'2026-09-21T10:00:00Z',text:'next'}];
 const t=deriveThread({id:'a'},messages,{},Date.parse('2026-09-22T10:00:00Z'));
 assert.equal(t.seen_at,'2026-09-20T10:01:00Z');assert.equal(t.latest_message_seen,false);assert.equal(t.left_on_read,false);
});
test('AI booking review rejects invented evidence and preserves WhatsApp as unconfirmed',async()=>{
 const messages=[{text:'send your whatsapp number',sent_at:'2026-09-22'}];
 const env={AI:{run:async()=>({response:JSON.stringify({kind:'scheduled',quote:'our call is booked'})})}};
 await assert.rejects(()=>reviewBooking(env,messages),/verifiable/);
 env.AI.run=async()=>({response:JSON.stringify({kind:'whatsapp',quote:messages[0].text})});
 const review=await reviewBooking(env,messages);assert.equal(review.source,'ai');assert.equal(review.confirmed,false);
});
test('image fetch allowlist rejects arbitrary origins, ports and lookalike hosts',()=>{
 assert.equal(allowedImageUrl('https://scontent.cdninstagram.com/a.jpg'),true);
 for(const url of ['http://scontent.cdninstagram.com/a','https://cdninstagram.com.evil.test/a','https://localhost/a','https://fbcdn.net:8443/a','https://user:pass@fbcdn.net/a'])assert.equal(allowedImageUrl(url),false,url);
});
