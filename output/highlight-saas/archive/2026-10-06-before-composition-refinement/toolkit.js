const escapeHTML=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const emphasise=(s,phrase)=>s.replace(phrase,`<span class="under">${phrase}</span>`);
const diagram=(view,body)=>`<svg class="diagram" data-key viewBox="${view}">${body}</svg>`;
const person=(x,y,r=18)=>`<circle cx="${x}" cy="${y}" r="${r}"/><path d="M${x-30} ${y+60} Q${x-30} ${y+28} ${x} ${y+28} Q${x+30} ${y+28} ${x+30} ${y+60}"/>`;
const arrow=(a,b,y)=>`<path d="M${a} ${y} Q${(a+b)/2} ${y-4} ${b} ${y} M${b-18} ${y-13} L${b} ${y} L${b-18} ${y+13}"/>`;
async function buildSlide(n){
 const data=await (await fetch('../assets/copy.json')).json();let lines=data[n].lines.map(l=>escapeHTML(l.replace(/^- /,'')));
 const framing=new URLSearchParams(location.search).get('framing')||'crop';const compare=[11,13,14].includes(n);let extra='';
 const patch=(i,phrase)=>lines[i]=emphasise(lines[i],phrase);
 if(n===1)patch(0,'a whole year');
 if(n===2)patch(4,'two businesses');
 if(n===3){const labels=lines.shift().split('. ').map(s=>s.replace(/\.$/,''));extra=`<div class="chain" data-key><svg viewBox="0 0 900 470"><path d="M270 25 Q370 16 465 25 M445 12 L465 25 L445 38 M705 65 Q730 112 700 148 M688 130 L700 148 L713 130 M490 201 Q390 210 283 200 M305 187 L283 200 L305 214 M174 237 Q149 290 170 323 M156 307 L170 323 L183 306 M270 375 Q380 367 465 375 M445 362 L465 375 L445 388"/></svg>${labels.map(s=>`<span data-chain>${s}.</span>`).join('')}</div>`}
 if(n===4){patch(1,"don't know what to say");patch(2,"nobody's watching");patch(3,'where to send them');patch(4,"who's closing")}
 if(n===5){patch(2,'half of them');patch(4,'which post');extra=diagram('0 0 900 270',`<path d="M40 30 H155 V102 H82 L45 132 V102 H40Z M72 55 H124 M72 75 H113"/>${arrow(190,320,75)}<rect x="365" y="20" width="95" height="95" rx="4"/><path d="M365 50 H460 M386 10 V32 M438 10 V32 M389 72 H408 M420 72 H438"/>${arrow(490,620,75)}<path class="red strong" d="M686 29 L768 112 M766 31 L686 113"/><text x="44" y="190">dm</text><text x="350" y="190">book</text><text x="650" y="190">don't close</text>`)}
 if(n===6)patch(1,'2am');
 if(n===7){patch(0,'plateau');extra=diagram('0 0 900 360',`<path d="M20 15 V295 H855"/><path class="strong" d="M55 265 Q145 232 217 169 T372 107 Q416 100 472 108 T602 106 T790 105"/><path class="red" d="M465 124 Q626 119 799 124 M468 132 Q670 128 795 130"/><text class="small" x="30" y="345">effort →</text><text class="small" x="25" y="45">progress</text>`)}
 if(n===8){extra=diagram('0 0 900 170',`${[60,165,270,375].map(x=>person(x,45)).join('')}${arrow(450,650,75)}<g class="red">${person(748,45)}</g>`)}
 if(n===10){patch(1,'your voice');extra=diagram('0 0 900 220',`<path d="M60 25 Q60 5 85 5 Q110 5 110 25 V70 Q110 95 85 95 Q60 95 60 70Z M40 65 Q40 120 85 120 Q130 120 130 65 M85 120 V145 M60 145 H110"/>${arrow(180,320,75)}<rect x="375" y="10" width="110" height="125" rx="3"/><path d="M400 42 H457 M400 65 H449 M400 88 H457"/>${arrow(530,670,75)}<rect x="730" y="10" width="125" height="125" rx="3"/><path d="M730 35 H855 M750 70 H820 M750 92 H800"/>`)}
 if(n===11)patch(3,'no more guessing');
 if(n===12){extra=diagram('0 0 900 320',`<path d="M30 55 Q85 0 140 55 Q85 110 30 55Z"/><circle cx="85" cy="55" r="18"/>${arrow(158,230,55)}<path d="M291 10 L291 106 L320 77 L346 120 L368 108 L342 67 L383 62Z"/>${arrow(399,470,55)}<rect x="510" y="10" width="95" height="100" rx="3"/><path d="M510 37 H605 M530 0 V20 M581 0 V20 M533 67 L550 83 L581 52"/>${arrow(634,704,55)}<circle cx="793" cy="58" r="51"/><path d="M815 32 Q772 13 771 45 Q771 59 794 62 Q822 66 813 83 Q797 103 771 86 M794 20 V98"/><text x="22" y="188">watched</text><text x="260" y="188">clicked</text><text x="494" y="188">booked</text><text x="757" y="188">paid</text><path class="red" d="M29 211 Q414 206 845 211 M35 219 Q440 216 837 218"/>`)}
 if(n===13)patch(1,'every framework was tested first.');
 if(n===14)extra='<img class="coin" src="../assets/coin-master-3d.png" data-key>';
 const text=compare?`<p data-copy>${lines[0]}</p><div class="lower">${lines.slice(1).map(l=>`<p data-copy>${l}</p>`).join('')}</div>`:lines.map(l=>`<p data-copy>${l}</p>`).join('');
 const slide=document.querySelector('.slide');slide.className=`slide s${String(n).padStart(2,'0')} ${framing}`;slide.innerHTML=`<img class="photo" src="../assets/photo-${String(n).padStart(2,'0')}${compare&&framing==='full'?'-full':''}.jpg">${extra}<div class="copy">${text}</div>`;
 // Measure text paragraphs rather than the full-size positioned container.
 document.querySelectorAll('[data-copy]').forEach(el=>el.setAttribute('data-key',''));
 await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode()));window.slideReady=true;
}
