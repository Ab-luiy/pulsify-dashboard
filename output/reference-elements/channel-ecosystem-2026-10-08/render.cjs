const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1080,height:1350},deviceScaleFactor:1});
 await page.goto('file:///'+path.join(__dirname,'slide.html').replaceAll('\\','/'));
 await page.evaluate(async()=>{await Promise.all([...document.fonts].map(f=>f.load()));await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
 const report=await page.evaluate(()=>{
  const issues=[]; const text=[...document.querySelectorAll('.critical')];
  for(const e of text){const r=e.getBoundingClientRect();if(r.left<45||r.right>1035||r.top<40||r.bottom>1310)issues.push({type:'bounds',text:e.innerText});}
  for(const e of document.querySelectorAll('svg text')){const r=e.getBoundingClientRect();if(r.left<45||r.right>1035||r.top<0||r.bottom>1350)issues.push({type:'svg-text-bounds',text:e.textContent});}
  for(let i=0;i<text.length;i++)for(let j=i+1;j<text.length;j++){const a=text[i].getBoundingClientRect(),b=text[j].getBoundingClientRect();if(Math.min(a.right,b.right)>Math.max(a.left,b.left)+2&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+2)issues.push({type:'text-overlap',text:text[i].innerText});}
  return{issues,fontsLoaded:document.fonts.check('700 80px ReferenceArial'),images:[...document.images].map(i=>({src:i.getAttribute('src'),decoded:i.naturalWidth>0})),svgTextCount:document.querySelectorAll('svg text').length};
 });
 await page.screenshot({path:path.join(__dirname,'slide.png')});
 await page.setViewportSize({width:390,height:488});
 await page.addStyleTag({content:'html{width:390px;height:488px}body{width:1080px;height:1350px;transform:scale(.3611111111);transform-origin:0 0;overflow:visible}'});
 await page.screenshot({path:path.join(__dirname,'phone.png')});
 fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
 await browser.close();if(report.issues.length||!report.fontsLoaded||report.images.some(i=>!i.decoded))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exit(1)});
