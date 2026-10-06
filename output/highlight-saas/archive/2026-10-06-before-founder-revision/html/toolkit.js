const svgPath=d=>`<svg class="marks" viewBox="0 0 1080 1920"><path d="${d}"/></svg>`;
const progress=n=>`<div class="feature"><span class="number">${n}</span><div class="dots">${[1,2,3].map(i=>`<i class="${i===n?'on':''}"></i>`).join('')}</div></div>`;
const escapeHTML=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const emphasise=(s,phrase,kind='under')=>s.replace(phrase,`<span class="${kind}">${phrase}</span>`);
async function buildSlide(n){
 const data=await (await fetch('../assets/copy.json')).json();
 let lines=data[n].lines.map(l=>escapeHTML(l.replace(/^- /,'')));
 let extra='',classes='s'+String(n).padStart(2,'0');
 if([1,6,11,13,14].includes(n))classes+=' portrait';
 const patch=(i,phrase,kind)=>lines[i]=emphasise(lines[i],phrase,kind);
 if(n===1)patch(0,'a whole year','accent');
 if(n===2)patch(4,'two businesses','under');
 if(n===3){
  const labels=lines.shift().split('. ').map(s=>s.replace(/\.$/,''));
  extra+=`<div class="chain card" data-key>${labels.slice(0,3).map((s,i)=>`${i?'<span class="link">→</span>':''}<span data-chain>${s}.</span>`).join('')}<div class="second">${labels.slice(3).map((s,i)=>`${i?'<span class="link">→</span>':''}<span data-chain>${s}.</span>`).join('')}</div></div>`;
 }
 if(n===5){
  patch(4,'no idea which post','under');
  extra+=`<div class="card inbox" data-key><div class="label">illustrative inbox</div>${Array.from({length:5},()=>'<div class="row"><span class="avatar"></span><span class="bars"><i></i><i></i></span><span class="dot"></span></div>').join('')}</div>`;
  extra+=svgPath('M 902 832 C 982 1100 670 1120 512 1148 M 533 1114 Q 512 1130 512 1148 L 553 1158');
 }
 if(n===6)patch(1,'2am','accent');
 if(n===7)patch(0,'plateau','under');
 if(n===8){lines[5]=`<span class="quote">${lines[5]}</span>`;extra+=svgPath('M 914 1190 C 990 1400 780 1430 636 1353 M 657 1388 L 636 1353 L 679 1359');}
 if(n===9){lines=[lines[0].replace('On screen: ','')];extra+='<img class="coin" src="../assets/coin-master-3d.png" data-key>'}
 if([10,11,12].includes(n)){extra+=progress(n-9);classes+=' has-feature'}
 if(n===10)patch(1,'your voice','accent');
 if(n===11){patch(1,"who's closing. who's not.",'accent');patch(2,"who's hitting their calls.",'accent');patch(2,"who's hitting your numbers.",'accent')}
 if(n===12){
  extra+='<div class="screen"><img src="../assets/demo-screen.png"></div><span class="example" data-key>Example workspace</span><div class="zoom" data-key><img src="../assets/demo-detail.png"></div>';
  extra+=svgPath('M 900 1190 L 633 1245 M 900 1190 L 861 1255');
 }
 if(n===13)patch(1,'every framework was tested first.','under');
 if(n===14)extra+='<img class="coin" src="../assets/coin-master-3d.png" data-key>';
 const html=`<img class="photo" src="../assets/photo-${String(n).padStart(2,'0')}.jpg"><div class="shade"></div>${extra}<div class="copy" data-key>${lines.map((l,i)=>`<p data-copy class="${(n===4&&i===4)||(n===7&&i===2)?'quiet':''}">${l}</p>`).join('')}</div>`;
 const slide=document.querySelector('.slide');slide.className='slide '+classes;slide.innerHTML=html;
 await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode()));window.slideReady=true;
}


