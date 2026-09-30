const fs=require('fs'),path=require('path');
const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const source=fs.readFileSync(path.join(__dirname,'board.html'),'utf8');
const common=`main{width:1520px;padding:30px 38px 24px}h1{font-size:43px}.eyebrow{margin-bottom:8px}.intro{font-size:19px;margin:10px 0 19px}.card p{font-size:17px;line-height:1.35}.card h3{font-size:21px;margin-top:12px}.title{font-size:14px;line-height:1.3;min-height:36px;margin-bottom:8px}.source{font-size:11px}.foot{font-size:12px;margin-top:15px}.card{padding:12px;border-radius:9px}.crop{aspect-ratio:16/9;height:auto}.crop img{width:254%;left:-3%;top:-2%}.alex img{width:213%;left:-3.7%;top:-4.7%}.travis img{width:213%;left:-3.3%;top:0}.replace{margin-top:16px;padding:16px;gap:19px}.replace h2{font-size:25px}.replace p{font-size:16px}.replace .note{display:none}.sample .crop{aspect-ratio:16/9}.nathan img{width:207.5%;left:-1.8%;top:-2.5%}.kole img{width:215.8%;left:-10.8%;top:-6.4%}.sample h3{font-size:17px}.sample p{font-size:15px}.draft{margin-top:14px;gap:20px}.draft h2{font-size:19px}.draft p{font-size:15px}.draft .example-title{font-size:22px}`;
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{for(const variant of ['cards','rows']){const page=await browser.newPage({viewport:{width:1520,height:1200},deviceScaleFactor:1.5});await page.setContent(source);await page.evaluate(({variant,css})=>{
 document.querySelector('h1').textContent=variant==='cards'?"Don't look like another guru":"Let the lesson do the talking";
 document.querySelector('.intro').textContent='Show the work they will learn from when they click.';
 const cards=[...document.querySelectorAll('.card')];
 const notes=[['Skip the cash graphics','Show the trades behind your result.'],['Skip the effortless promise','Explain the decisions behind your setup.'],['Skip the oversized labels','Show the page or board you will explain.']];
 cards.forEach((card,i)=>{card.querySelector('h3').textContent=notes[i][0];const ps=[...card.querySelectorAll('p')];ps[0].remove();ps[1].textContent=notes[i][1];});
 document.querySelector('.foot').textContent='Packaging references. These screenshots do not show buyer conversion.';
 document.querySelector('.replace>div>p').textContent='A board, chart or store page gives the viewer a preview of the lesson.';
 document.querySelector('.replace>div>p+p').remove();
 document.querySelector('.draft>div>p').remove();
 document.querySelector('.draft>div+div>p').textContent='Show a trade you got wrong, then explain what you changed.';
 if(variant==='rows'){
  const replace=document.querySelector('.replace');
  const samples=[...replace.querySelectorAll('.sample')];
  const mainGrid=document.querySelector('.avoid');mainGrid.classList.add('rows');
  const paired=[samples[1].cloneNode(true),samples[1].cloneNode(true),samples[0].cloneNode(true)];
  cards.forEach((card,i)=>{
   const before=document.createElement('div');before.className='before';
   before.append(card.querySelector('.crop'),card.querySelector('.source'),card.querySelector('.title'));
   const text=document.createElement('div');text.className='change';
   text.append(card.querySelector('h3'),card.querySelector('p'));
   paired[i].classList.add('after');
   const badge=document.createElement('div');badge.className='caption-note';badge.textContent='Borrow this presentation';paired[i].prepend(badge);
   card.replaceChildren(before,text,paired[i]);
  });replace.remove();document.querySelector('.draft').remove();
 }
 const style=document.createElement('style');style.textContent=css+(variant==='rows'?`.rows{display:flex;flex-direction:column;gap:12px}.rows .card{display:grid;grid-template-columns:320px 1fr 320px;gap:30px;align-items:center;padding:13px 19px}.rows .crop{width:320px}.rows .title{min-height:0;font-size:13px;margin:0}.rows .source{margin:5px 0 4px}.rows .card h3{font-size:26px;max-width:450px;line-height:1.15;margin:0 0 12px}.rows .card p{font-size:21px;max-width:480px;line-height:1.4}.rows .after p{display:none}.rows .after h3{font-size:14px;margin:6px 0 0}.caption-note{font-size:11px;font-weight:750;margin-bottom:7px}.rows .sample{align-self:start}.rows .after .crop{width:320px}`:`.avoid{gap:16px}.replace{grid-template-columns:.8fr 1fr 1fr}.replace .sample .crop{max-width:100%}`);document.head.append(style);
 },{variant,css:common});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));document.documentElement.classList.add('capture')});fs.writeFileSync(path.join(__dirname,`mockup-${variant}.html`),'<!doctype html>'+await page.evaluate(()=>document.documentElement.outerHTML.replace('class="capture"','')));await page.locator('main').screenshot({path:path.join(__dirname,`mockup-${variant}.png`)});console.log(variant,await page.locator('main').boundingBox());await page.close();}}finally{await browser.close()}})();
