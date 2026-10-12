import test from 'node:test';
import assert from 'node:assert/strict';
import { clientMethodReference, SOURCE_NAMES } from '../functions/_shared/source-scrub.js';
import { buildIdeasPrompt } from '../functions/_shared/youtube-ideas.js';
import { buildTitlesPrompt } from '../functions/_shared/youtube-titles.js';
import { buildVideoPrompt } from '../functions/_shared/youtube-build.js';
import { buildSequencePrompt } from '../functions/_shared/sequence-prompt.js';

test('public references omit attributed results rather than relabel them',()=>{
 const result=clientMethodReference('Teach one specific process.\n\nAlexei earned $58,000 with his channel.\n\nSee wiki/people/alexei.md\n\nUse only the client\'s verified proof.');
 assert.match(result,/Teach one specific process/);
 assert.match(result,/verified proof/);
 assert.doesNotMatch(result,/58,000|Alexei|Pulsify earned|wiki\//);
});

const shared={clientName:'QA Creator',clientBrain:'My mentor is Alexei; this is a client-supplied fact.',proofLines:[],answers:[],learning:null};
for(const [name,build]of [
 ['ideas',()=>buildIdeasPrompt(shared)],
 ['titles',()=>buildTitlesPrompt({...shared,idea:{idea:'A journal',working_title:'review the rule'},layout:'raw'})],
 ['video',()=>buildVideoPrompt({...shared,video:{idea:'A journal',title:'review the rule'},nextStep:'video'})],
 ['stories',()=>buildSequencePrompt({...shared,type:'value-driven',topic:'A journal',goal:'reach',slideCount:3})],
])test(`${name}: complete client handoff excludes internal named sources but preserves client facts`,()=>{
 const {system,user}=build();
 for(const name of SOURCE_NAMES)assert.ok(!system.toLowerCase().includes(name.toLowerCase()),`source exposed: ${name}`);
 assert.doesNotMatch(system,/\b(?:wiki|raw-sources)\//i);
 assert.match(system,/JSON/i);
 assert.match(system,/never invent|do not invent|real numbers only/i);
 assert.match(user,/My mentor is Alexei/);
 assert.ok(system.length>2000,'Method instructions must remain substantial');
});
