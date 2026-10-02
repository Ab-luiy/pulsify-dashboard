const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..'), out=__dirname;
const blue='#171717',red='#e31b23',ink='#171717',paper='#f2f2f2';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const image=p=>'data:image/'+(p.endsWith('.jpg')?'jpeg':'png')+';base64,'+fs.readFileSync(path.join(root,p)).toString('base64');
const ref=n=>image('outreach/packaging-references/attachments/'+n);
const t=(x,y,s,size=25,color=ink,weight=500)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`;
const lines=(x,y,ss,size=25,color=ink,weight=500,gap=34)=>ss.map((s,i)=>t(x,y+i*gap,s,size,color,weight)).join('');
const box=(x,y,w,h,fill='#fff',stroke=ink)=>[538,690].includes(y)?'':`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="2.3"/>`;
const arrow=(x,y,a,b,c=ink)=>{const dx=a-x,dy=b-y;return `<path d="M${x},${y} Q${x+dx*.48-dy*.09},${y+dy*.48+dx*.09} ${a},${b}" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${a-dx*.12-dy*.09},${b-dy*.12+dx*.09} Q${a-dx*.03},${b-dy*.03} ${a},${b} L${a-dx*.12+dy*.09},${b-dy*.12-dx*.09}" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`};
const underline=(x,y,w)=>`<path d="M${x},${y} Q${x+w*.35},${y-3} ${x+w},${y-1}" stroke="${red}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
const crop=(src,x,y,w,h,vb)=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="xMidYMid slice"><image href="${src}" width="${vb==='10 8 523 292'?1086:1131}" height="${vb==='10 8 523 292'?310:316}"/></svg>`;
const wrap=(body,w=1200,h=1050)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e7e7e7" stroke-width="1"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="${ink}"/></marker></defs><rect width="100%" height="100%" fill="${paper}"/><rect width="100%" height="100%" fill="url(#grid)"/><g font-family="Arial, sans-serif">${body}</g></svg>`;
const header=(n,heading,sub)=>t(48,61,'0'+n,26,blue,800)+t(108,63,heading,34,ink,800)+t(48,113,sub,25,blue,500)+underline(108,78,Math.min(heading.length*19,900));
const modules=[];
modules.push(wrap(header(1,'Your brand and offer','Pinpoint exactly what makes you different.')+
 `<circle cx="600" cy="360" r="191" fill="#f2f2f2" stroke="${ink}" stroke-width="2"/><circle cx="600" cy="360" r="133" fill="#fff" stroke="${ink}" stroke-width="2"/><circle cx="600" cy="360" r="79" fill="#ffffff" stroke="${red}" stroke-width="7"/>`+
 '<g text-anchor="middle">'+lines(600,353,['Your own','approach'],24,blue,800,30)+'</g>'+
 lines(64,281,['Who needs','your help?'],26,ink,700)+arrow(245,289,418,307)+
 lines(920,281,['What have','you solved?'],26,ink,700)+arrow(903,289,783,308)+
 lines(65,473,['What do they','want to achieve?'],26,ink,700)+arrow(278,456,435,441)+
 lines(918,473,['What makes your','method different?'],26,ink,700)+arrow(902,456,764,441)+
 t(48,625,'The roadmap starts with your actual experience.',29,ink,800)+underline(48,642,430)+
 box(48,690,337,177)+box(431,690,337,177)+box(815,690,337,177)+
 t(71,736,'Your results',26,ink,800)+lines(71,779,['Show what changed.','Explain what you did.'],22)+
 t(454,736,'Student problems',26,ink,800)+lines(454,779,['What keeps coming up?','How did you help?'],22)+
 t(838,736,'Your offer',26,ink,800)+lines(838,779,['What do you help with?','Who is it built for?'],22)+
 lines(48,947,['These become the ideas, examples and proof inside your content.'],26,blue,700)));
const trade=ref('good packaging (trading example).png'),ecom=ref('Good packaging2 (ecom example).png');
modules.push(wrap(header(2,'Ideas and packaging','Know what to record before you sit down.')+
 crop(trade,48,155,531,298,'57 19 525 294')+crop(ecom,621,155,531,298,'10 8 523 292')+
 t(48,493,'Trading / kole trades',24,ink,800)+t(621,493,'Ecom / Nathan Miller',24,ink,800)+
 lines(48,531,['How to Create your own','Profitable Trading Strategy'],23)+lines(621,531,['If your thinking about doing ecom in 2026','watch this... (brutally honest)'],21)+
 t(48,630,'Content Ideation rule of thumb:',29,ink,800)+underline(48,646,459)+
 lines(48,684,["Talk about a result, a win, or a problem you've solved for a student.","Use your own experience if you don't have that kind of audience yet."],23)+
 box(48,770,1104,190,'#fff')+t(72,809,'3 videos ready to build around your experience',25,ink,800)+
 t(72,851,'01',22,blue,800)+t(117,851,'how i [result] using [your method] (full breakdown)',23,ink,700)+
 t(72,892,'02',22,blue,800)+t(117,892,"after taking so many losses here's what you can learn from my mistakes.",22,ink,700)+
 t(72,933,'03',22,blue,800)+t(117,933,"here's how [student] went from [problem] to [result]",23,ink,700)));
let structure=header(3,'Video structure','Talking points you can record from.');
const steps=[['Intro',['Show real proof.','Confirm the title.']],['Body',['What changed?','Show what you did.']],['Mid-video CTA',['Offer help applying it.','Then keep teaching.']],['Body',['Show another example.','Explain the decisions.']],['Final CTA',['Recap the result.','Give one next step.']]];
steps.forEach((s,i)=>{const x=48+i*226;structure+=box(x,207,200,202,i===2?'#ffffff':'#fff')+t(x+15,246,'0'+(i+1),21,blue,800)+t(x+15,285,s[0],i===2?21:25,ink,800)+lines(x+15,334,s[1],16,ink,500,25);if(i<4)structure+=arrow(x+204,305,x+221,305)});
structure+=t(48,161,'Intro → body → mid-video CTA → body → final CTA',23,ink,700)+
 t(48,494,'One experience. Three different ways to explain it.',29,ink,800)+
 box(48,538,337,188)+box(431,538,337,188)+box(815,538,337,188)+
 t(70,584,'Break down a win',25,ink,800)+lines(70,627,['Show the result.','Walk through the decisions.'],21)+
 t(453,584,'Explain a mistake',25,ink,800)+lines(453,627,['Show what went wrong.','Explain what you changed.'],21)+
 t(837,584,'Compare examples',25,ink,800)+lines(837,627,['Put them side by side.','Explain the difference.'],21)+
 box(48,777,1104,165,'#ffffff',blue)+t(72,820,'After a useful lesson:',24,blue,800)+
 lines(72,861,["that's one of the things we work through in the program. if you want help", "applying it, the first link below explains more. if not, no worries, keep watching."],23)+
 t(48,999,'Build from what you actually do. Give them the useful detail.',24,ink,700);
modules.push(wrap(structure));
let route=header(4,'From viewer to client','Give interested people a clear next step.');
const nodes=[['YouTube video','They understand your approach.'],['DM or free training','They explore getting your help.'],['Application','You check whether it fits.'],['Sales conversation','You discuss working together.']];
nodes.forEach((n,i)=>{const y=163+i*174;route+=box(225,y,750,121,i===0?'#ffffff':'#fff',i===0?blue:ink)+t(260,y+45,n[0],29,ink,800)+t(260,y+85,n[1],24);if(i<3)route+=arrow(600,y+129,600,y+165)});
route+=box(48,875,1104,121,'#ffffff',blue)+t(72,916,'The overview is reusable. The roadmap is built around your business.',25,blue,800)+
 t(72,960,'Reply here and we can go through what this would look like for yours.',24,ink,700);
modules.push(wrap(route));
modules.forEach((s,i)=>fs.writeFileSync(path.join(out,`0${i+1}-module.svg`),s));
const nick=image('output/bergtrades-asset-v2/assets/nick/yt-3QDKzi4nFl8.jpg');
const proof=wrap(t(48,58,'Real client work / Nick',30,ink,800)+`<image href="${nick}" x="48" y="93" width="498" height="280"/>`+
 t(595,144,'$98,000',63,blue,800)+underline(595,157,265)+t(595,187,'total sales across the engagement',23,ink,700)+
 lines(595,245,['Positioning, content packaging and outreach.','One of the videos we packaged for Nick.'],23)+
 t(595,337,'A real result, with the work behind it.',25,ink,800),1200,420);
fs.writeFileSync(path.join(out,'00-client-work.svg'),proof);
const svgUri=s=>'data:image/svg+xml;base64,'+Buffer.from(s).toString('base64');
let board=t(70,88,'Building a qualified audience',58,ink,800)+t(70,140,'How we help you attract and convert the right people through your content.',29,blue,700);
board+=`<image href="${svgUri(proof)}" x="70" y="180" width="1200" height="420"/>`;
board+=lines(1400,298,['Your experience.','Your approach.','A clear reason to work with you.'],42,ink,800,62)+underline(1400,440,500);
for(let i=0;i<4;i++){const x=70+i*1260;board+=`<image href="${svgUri(modules[i])}" x="${x}" y="680" width="1200" height="1050"/>`;if(i<3)board+=arrow(x+1204,740,x+1253,740)}
const flattened=wrap(board,5180,1800).replace(/<image href="data:image\/svg\+xml;base64,([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"\/>/g,(_,b,x,y)=>'<g transform="translate('+x+' '+y+')">'+Buffer.from(b,'base64').toString().replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')+'</g>');
fs.writeFileSync(path.join(out,'full-board.svg'),flattened);
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Pulsify outreach walkthrough</title><style>*{box-sizing:border-box}body{margin:0;background:${paper};font-family:Arial;color:${ink}}nav{position:fixed;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:5px;padding:7px;background:#171717;border-radius:12px;z-index:10}button{border:0;color:#fff;background:transparent;font:700 14px Arial;padding:10px 15px;cursor:pointer;border-radius:7px}button:hover{background:#355ed4}main{position:fixed;inset:0;overflow:hidden;cursor:grab}#world{position:absolute;left:0;top:0;width:5180px;height:1800px;transform-origin:0 0}#world img{position:absolute}.title{position:absolute;left:70px;top:50px;font-weight:800;font-size:58px}.subtitle{position:absolute;left:70px;top:117px;font-size:29px;color:${blue}}footer{position:fixed;bottom:12px;left:15px;background:#ffffffdd;padding:8px 12px;border-radius:7px;font-size:13px}html.capture nav,html.capture footer{display:none}</style></head><body><nav><button onclick="focusBoard()">Overview</button><button onclick="focusProof()">Client work</button>${modules.map((_,i)=>`<button onclick="focusModule(${i})">${['Brand','Packaging','Structure','Sales path'][i]}</button>`).join('')}</nav><main id="canvas"><div id="world"><div class="title" contenteditable>Building a qualified audience</div><div class="subtitle" contenteditable>How we help you attract and convert the right people through your content.</div><img src="${svgUri(proof)}" style="left:70px;top:180px;width:1200px;height:420px">${modules.map((s,i)=>`<img src="${svgUri(s)}" style="left:${70+i*1260}px;top:680px;width:1200px;height:1050px">`).join('')}</div></main><footer>Scroll to zoom · drag to pan · choose a section above</footer><script>let scale=1,tx=0,ty=0,drag=null;const world=document.getElementById('world'),canvas=document.getElementById('canvas');function render(){world.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'}function frame(x,y,w,h){scale=Math.min((innerWidth-70)/w,(innerHeight-120)/h);tx=(innerWidth-w*scale)/2-x*scale;ty=75-y*scale;render()}function focusBoard(){frame(0,0,5180,1800)}function focusProof(){frame(70,180,1200,420)}function focusModule(i){frame(70+i*1260,680,1200,1050)}canvas.addEventListener('wheel',e=>{e.preventDefault();const old=scale;scale=Math.max(.1,Math.min(2,scale*Math.exp(-e.deltaY*.001)));tx=e.clientX-(e.clientX-tx)*scale/old;ty=e.clientY-(e.clientY-ty)*scale/old;render()},{passive:false});canvas.addEventListener('pointerdown',e=>{if(e.target.isContentEditable)return;drag=[e.clientX,e.clientY,tx,ty];canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(drag){tx=drag[2]+e.clientX-drag[0];ty=drag[3]+e.clientY-drag[1];render()}});canvas.addEventListener('pointerup',()=>drag=null);window.addEventListener('resize',focusBoard);focusBoard();</script></body></html>`;
fs.writeFileSync(path.join(out,'walkthrough.html'),html);
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{const p=await b.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});await p.setContent(html);await p.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()));document.documentElement.classList.add('capture')});for(let i=0;i<4;i++){await p.evaluate(i=>focusModule(i),i);await p.screenshot({path:path.join(out,`0${i+1}-preview.png`)});}await p.setViewportSize({width:1800,height:626});await p.setContent('<body style="margin:0"><img style="width:1800px;display:block" src="'+svgUri(wrap(board,5180,1800))+'"></body>');await p.evaluate(async()=>{await document.images[0].decode()});await p.screenshot({path:path.join(out,'overview.png')});console.log('Rendered overview and four section previews.')}finally{await b.close()}})();
