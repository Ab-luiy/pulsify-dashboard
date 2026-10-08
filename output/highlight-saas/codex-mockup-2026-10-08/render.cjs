const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu']});
const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
let report=[];
for(let n=2;n<=14;n++){
const id=String(n).padStart(2,'0');
await page.goto('file:///'+path.join(__dirname,id+'.html').replaceAll('\\','/'));
await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(im=>im.decode()));});
const checks=await page.evaluate(()=>{
let issues=[];
for(const el of document.querySelectorAll('.pos')){let r=el.getBoundingClientRect();if(r.left<0||r.right>1080||r.top<250||r.bottom>1580)issues.push({kind:'safe area',text:el.innerText.slice(0,70),bounds:[r.left,r.top,r.right,r.bottom]});}
for(const el of document.querySelectorAll('h1,p,.panel')){if(el.scrollWidth>el.clientWidth+2)issues.push({kind:'overflow',text:el.innerText.slice(0,70)});}
const blocks=Array.from(document.querySelectorAll('.pos')).map(el=>({el,r:el.getBoundingClientRect()}));
for(let a=0;a<blocks.length;a++)for(let b=a+1;b<blocks.length;b++){const x=blocks[a].r,y=blocks[b].r;if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)issues.push({kind:'group overlap',text:blocks[a].el.innerText.slice(0,35)+' / '+blocks[b].el.innerText.slice(0,35)});}
return {issues,images:Array.from(document.images).map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0}))};});
report.push({slide:n,...checks});
await page.screenshot({path:path.join(__dirname,id+'.png')});console.log('Rendered '+id+'; issues '+checks.issues.length);
}
fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));
await page.setViewportSize({width:390,height:844});await page.goto('file:///'+path.join(__dirname,'review.html').replaceAll('\\','/'));await page.screenshot({path:path.join(__dirname,'review-mobile.png')});
console.log('Mobile review overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(__dirname,'review-desktop.png')});
await browser.close();
})();
