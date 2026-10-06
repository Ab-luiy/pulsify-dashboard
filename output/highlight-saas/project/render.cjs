const {chromium}=require('C:/Users/Abdullah/Desktop/pulsify-saas/node_modules/playwright');
const {createServer}=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'html'),out=path.resolve(__dirname,'..');
const server=createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root)||!fs.existsSync(file)){res.statusCode=404;return res.end()};const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file))});
(async()=>{server.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const port=server.address().port;
 for(let n=1;n<=14;n++){const id=String(n).padStart(2,'0');fs.writeFileSync(path.join(root,'slides',id+'.html'),`<!doctype html><html><head><meta charset="utf-8"><title>Slide ${id}</title><link rel="stylesheet" href="../toolkit.css"></head><body><main class="slide"></main><script src="../toolkit.js"></script><script>buildSlide(${n})</script></body></html>`)}
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const audits=[];
 const comparisons=process.argv.includes('--comparisons');const selected=comparisons?[11,13,14]:process.argv.slice(2).length?process.argv.slice(2).map(Number):Array.from({length:14},(_,i)=>i+1).filter(n=>n!==9);
 try{for(const n of selected){const id=String(n).padStart(2,'0');for(const framing of (comparisons?['full','crop']:['crop'])){await page.goto(`http://127.0.0.1:${port}/slides/${id}.html?framing=${framing}`);await page.waitForFunction(()=>window.slideReady);await page.screenshot({path:comparisons?path.join(__dirname,'comparisons',`${id}-${framing}.png`):path.join(out,id+'.png')});
 const geometry=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-key]')).map(el=>{const r=el.getBoundingClientRect();return{element:el.className,x:r.x,y:r.y,w:r.width,h:r.height,safe:r.y>=250&&r.bottom<=1580&&r.x>=60&&r.right<=1020}}));
 const doc=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.copy'});const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
 const typography=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-copy]')).map(el=>{
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const boxes=[];let node;
   while(node=walker.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);boxes.push(...Array.from(range.getClientRects()).filter(r=>r.width>1));}
   const rows=[];for(const r of boxes){if(!rows.some(y=>Math.abs(y-r.y)<5))rows.push(r.y);}
   return{paragraph:Number(el.dataset.paragraph),authored_lines:el.querySelectorAll('br').length+1,rendered_lines:rows.length,ink_safe:boxes.every(r=>r.x>=60&&r.right<=1020&&r.y>=250&&r.bottom<=1580)};
 }));
 const product=await page.evaluate(()=>[...document.querySelectorAll('.product-window')].map(el=>({label:el.querySelector('header').innerText,assets:[...el.querySelectorAll('img')].map(img=>img.getAttribute('src'))})));
 const text=await page.locator('[data-copy]').allTextContents(),chain=await page.locator('[data-chain]').allTextContents();audits.push({slide:n,framing,text,chain,geometry,typography,product,fonts:fonts.fonts});console.log('Rendered',id,framing,geometry.every(g=>g.safe)?'safe':'inspect bounds',n!==11&&typography.some(t=>t.authored_lines!==t.rendered_lines)?'inspect unintended wraps':'');}}
 fs.writeFileSync(path.join(out,comparisons?'comparison-audit.json':selected.length===13?'layout-audit.json':'hard-slides-audit.json'),JSON.stringify(audits,null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
