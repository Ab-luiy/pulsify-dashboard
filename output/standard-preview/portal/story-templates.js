/* Original editable layouts. Bracketed fields are intentionally not fabricated proof. */
window.PulsifyTemplates=(()=>{
 const styles=[{id:'editorial',name:'Editorial',background:'#252131',accent:'#BAA6EF',text:'#FFFFFF',y:.34,fontSize:58,treatment:'drop-shadow'}, {id:'paper',name:'Paper notes',background:'#EAE4D9',accent:'#79664F',text:'#28241E',pill:'#F9F6F0',y:.27,fontSize:54,treatment:'pill-box'}, {id:'signal',name:'Signal',background:'#173A36',accent:'#A3D7B2',text:'#FFFFFF',y:.39,fontSize:62,treatment:'drop-shadow'}];
 const middles={
 'value-driven':['The situation: [specific problem].','The rule I use: [one practical rule].','Here is the example: [show your real work].','Use this when [specific situation].'],
 credibility:['The starting point was [verified baseline].','The change was [specific action].','This receipt shows [verified observation].','What made the difference: [process].'],
 'q&a':['The short answer: [direct answer].','My decision rule is [rule].','Here is how that looks in [real example].'],
 'day-in-the-life':['First: [real preparation moment].','In progress: [real task].','The decision I made: [decision and reason].','What changed: [actual observation].'],
 breakdown:['The full example: [show the process].','First, check [condition].','Then decide [next decision].','A common mistake is [mistake].'],
 lifestyle:['The real moment: [describe what happened].','What I noticed: [observation].','Why this matters to my work: [connection].'],
 cta:['If you are dealing with [specific problem]…','Here is what we work on: [actual mechanism].','This is suitable for [qualified audience].','The evidence: [permitted result or process].'],
 'start-here':['I work with [audience] on [specific outcome].','I started here: [true background].','The problem I kept seeing: [real observation].','My approach: [unique mechanism].','The evidence: [permission-cleared work].','What you can learn here: [topics].'],
 'story launch':['The problem this addresses: [specific problem].','One useful insight: [teach something].','Here is the mechanism: [show how it works].','Who it is for: [qualified audience].','What is included: [actual offer].','The evidence: [permitted proof].']};
 function list(type){const spec=window.PulsifyContent.stories[type];if(!spec)return [];return styles.map(style=>({id:type+'::'+style.id,type,name:spec.title+' / '+style.name,style,slides:spec.steps.map((job,i)=>({n:i+1,job,text_pills:[i===0?spec.hook:i===spec.steps.length-1?spec.close:(middles[type]||[])[(i-1)%(middles[type]||[]).length]||'[Add your specific point]'],font_style:style.id==='paper'?'classic':'modern',composition:{...style,label:spec.title.toUpperCase()+' / '+String(i+1).padStart(2,'0'),y:i%2?style.y-.08:style.y},design:{treatment:{text:style.treatment,alignment:i%3===2?'right':'left'}},photo:{primary:spec.materials[Math.min(i,spec.materials.length-1)]}}))}));}
 function find(id){const [type]=String(id).split('::');return list(type).find(t=>t.id===id);}
 function cards(type){return '<div class="ws-grid">'+list(type).map(t=>`<button class="ws-image-card story" data-ws="template-open:${esc(t.id)}"><img src="${PulsifyComposition.preview(t.slides[0])}" alt="${esc(t.name)}"><div class="ws-image-info"><strong>${esc(t.name)}</strong><small>${t.slides.length} designed panels · editable template</small></div></button>`).join('')+'</div>';}
 return {list,find,cards};
})();
