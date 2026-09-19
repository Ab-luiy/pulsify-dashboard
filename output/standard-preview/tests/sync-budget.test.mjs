import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledJobs} from '../workers/sync/src/index.js';
test('background recovery is bounded; webhook outbox still runs each minute',()=>{
 const counts={};
 for(let m=0;m<60;m++)for(const job of scheduledJobs('* * * * *',Date.UTC(2026,8,20,0,m)))counts[job]=(counts[job]||0)+1;
 assert.deepEqual(counts,{'webhook-outbox':60,'instagram-inbox':12,'zernio-inbox':12,'search-index':4});
 assert.deepEqual(scheduledJobs('15 */6 * * *'),['youtube']);
});
