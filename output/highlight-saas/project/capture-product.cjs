const {execFileSync}=require('node:child_process');
const {randomBytes,createHash}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/Abdullah/Desktop/pulsify-saas/node_modules/playwright');
const root=path.resolve(__dirname,'../../..'),cwd=path.join(root,'output/standard-preview');
const dest=path.join(__dirname,'html/assets/product');fs.mkdirSync(dest,{recursive:true});
const wrangler='C:/Users/Abdullah/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/bin/wrangler.js';
const sql=s=>JSON.parse(execFileSync(process.execPath,[wrangler,'d1','execute','pulsify-portal','--remote','--json','--command',s],{cwd,encoding:'utf8',windowsHide:true}));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
(async()=>{
 const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');
 const email=fs.readFileSync(path.join(cwd,'wrangler.toml'),'utf8').match(/OPERATOR_EMAILS\s*=\s*"([^"]+)"/)[1].split(',')[0];
 let browser,previewHash;const sources=[];
 try{
  sql(`INSERT INTO operator_sessions (token_hash,email,provider_user_id,created_at,expires_at) VALUES (${quote(hash)},${quote(email)},'codex-story-product-capture',${quote(new Date().toISOString())},${quote(new Date(Date.now()+1800000).toISOString())})`);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:1,extraHTTPHeaders:{'x-pulsify-operator':'1'}});
  await context.addCookies([{name:'__Host-pulsify_operator',value:token,domain:'pulsify-ai.com',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
  const page=await context.newPage();
  const response=await context.request.post('https://pulsify-ai.com/api/impersonate',{data:{client:'demo-example'}});const exchange=await response.json();
  if(!exchange.ok)throw new Error('Cannot open read-only Example preview');
  await page.goto('https://pulsify-ai.com'+exchange.url,{waitUntil:'networkidle'});
  const previewCookie=(await context.cookies()).find(c=>c.name==='pulsify_client_session');if(previewCookie)previewHash=createHash('sha256').update(previewCookie.value).digest('hex');
  await context.setExtraHTTPHeaders({});
  const routes=[['voice','voice'],['projects','youtube/projects'],['write','copy/write'],['funnel','performance/funnel'],['video','performance/video'],['revenue','revenue'],['home',''],['team','team']];
  for(const [name,route] of routes.filter(([name])=>!process.argv[2]||name===process.argv[2])){
   await page.setViewportSize({width:1440,height:name==='funnel'?2200:1200});
   const url='https://pulsify-ai.com/app/portal/'+route+'?client=demo-example';await page.goto(url,{waitUntil:'networkidle'});await page.waitForTimeout(1800);
   const body=await page.locator('body').innerText();if(/unauthorized|This page did not load/.test(body))throw new Error(`Capture failed: ${name}`);
   const exit=page.getByRole('button',{name:'Exit preview',exact:true});
   if(await exit.count())await exit.evaluate(el=>el.parentElement.parentElement.style.display='none');
   await page.screenshot({path:path.join(dest,name+'.png'),fullPage:true});
   const regions=await page.evaluate(()=>[...document.querySelectorAll('h1,h2,h3,section')].map(el=>{const r=el.getBoundingClientRect();return{tag:el.tagName,text:el.innerText.slice(0,160),x:r.x,y:r.y,w:r.width,h:r.height}}));
   sources.push({name,url:page.url(),captured_at:new Date().toISOString(),workspace:'Example',data:'Demo workspace, not client results',regions});console.log('Captured',name);
  }
  const previous=fs.existsSync(path.join(dest,'sources.json'))?JSON.parse(fs.readFileSync(path.join(dest,'sources.json'),'utf8')):[];
  fs.writeFileSync(path.join(dest,'sources.json'),JSON.stringify([...previous.filter(p=>!sources.some(s=>s.name===p.name)),...sources],null,2));
 }finally{if(browser)await browser.close();sql(`DELETE FROM operator_sessions WHERE token_hash=${quote(hash)}`);if(previewHash)sql(`DELETE FROM impersonation_sessions WHERE token_hash=${quote(previewHash)}`);console.log('Disposable capture sessions removed.');}
})().catch(e=>{const detail=(e.stdout?.toString()||e.stderr?.toString()||e.message).replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,'[redacted email]').replace(/[a-f0-9]{64}/g,'[redacted hash]');console.error(detail.slice(0,2000));process.exitCode=1});
