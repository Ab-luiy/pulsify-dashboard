const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');let impersonated=false;let rows=[],stories=[],aiFails=false;const payments=[{id:1,amount_cents:125000,currency:'USD',occurred_at:'2026-08-15'},{id:2,amount_cents:175000,currency:'USD',occurred_at:'2026-09-02'}];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
 res.setHeader('content-type','application/json');
 if(url.pathname==='/api/clients'){res.end(JSON.stringify({ok:true,clients:[{client:'qa',client_name:'QA workspace',page_active:1}]}));return;}if(url.pathname==='/api/operator-bootstrap'){res.end(JSON.stringify({ok:true,operator:{email:'qa@example.test'},clients:[{client:'qa',client_name:'QA workspace',page_active:1}],overview:{summary:{client_count:1,at_risk_count:0,total_collected_by_currency:{USD:300000}}}}));return;}if(url.pathname==='/api/contract-status'){res.end(JSON.stringify({ok:true,configured:false,missing:['DOCUSIGN_HMAC_SECRET'],webhook:'https://qa.test/api/docusign-connect',role:'Client',rows:[]}));return;}if(url.pathname==='/api/workspace-summary'){res.end(JSON.stringify({ok:true,counts:{stories:1,carousels:0,sequences:1,images:0,payments:2,youtube:1,copy:1,lead:0}}));return;}if(url.pathname==='/api/client-dashboard'){res.end(JSON.stringify({ok:true,client:'qa',client_name:'QA workspace',impersonated,sections:{team:{members:[{name:'QA specialist',role:'Editor'}]},plans:{phases:[{title:'QA roadmap',progress:0.5}]}},revenue:{total_revenue_cents:300000,current_month_revenue_cents:175000,payments}}));return;}
 if(url.pathname==='/api/copywriter'){if(req.method==='GET'){res.end(JSON.stringify({ok:true,available:true}));return;}res.statusCode=aiFails?502:200;res.end(JSON.stringify(aiFails?{ok:false,error:'Test provider unavailable; your draft is safe.'}:{ok:true,output:'Hook: A useful lesson.\nBody: Show one concrete example.\nClose: Try it today.'}));return;}
 if(url.pathname==='/api/studio-sequences'&&req.method==='GET'){res.end(JSON.stringify({ok:true,rows:stories}));return;}
 if(url.pathname==='/api/studio-generate'||url.pathname==='/api/studio-sequences'){let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{const body=JSON.parse(raw);if(url.pathname.endsWith('generate')){const id=stories.length+1;stories.push({...body,id,status:'draft',updated_at:new Date().toISOString(),output:{manual_mode:true,slides:[]}});res.end(JSON.stringify({ok:true,id}));}else{const row=stories.find(r=>r.id===body.id);if(row)row.output=JSON.parse(body.raw_text);res.end(JSON.stringify({ok:true}));}});return;}
 res.setHeader('content-type','application/json');if(url.pathname==='/api/workspace-records'&&req.method==='POST'){let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{const body=JSON.parse(raw),id=body.id||String(rows.length+1),updated_at=new Date().toISOString();rows=rows.filter(r=>r.id!==id);rows.push({...body,id,updated_at});res.end(JSON.stringify({ok:true,id,updated_at}));});return;}res.end(JSON.stringify({ok:true,rows:url.pathname==='/api/workspace-records'?rows:[]}));return;}
 let name=url.pathname==='/portal'?'/portal/index.html':url.pathname==='/portal/login'?'/portal/login/index.html':url.pathname;
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.statusCode=404;res.end();return;}
 const ext=path.extname(file);res.setHeader('content-type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'})[ext]||'text/plain');
 let content=fs.readFileSync(file);if(name==='/portal/index.html')content=content.toString();if(name.endsWith('.html')&&url.searchParams.has('qaTheme'))content=content.toString().replace('<head>','<head><script>localStorage.setItem("theme",'+JSON.stringify(url.searchParams.get('qaTheme'))+');</script>');res.end(content);
});

(async()=>{await new Promise(r=>server.listen(8771,'127.0.0.1',r));
if(process.env.QA_SERVE){console.log('QA server http://127.0.0.1:8771');return;}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const qa=path.resolve(root,'../qa/2026-09-phase1');fs.mkdirSync(qa,{recursive:true});
try{const flickerPage=await browser.newPage({viewport:{width:1536,height:1000}});let releaseClients;const clientsGate=new Promise(resolve=>{releaseClients=resolve;});await flickerPage.route('**/api/clients',async route=>{await clientsGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,clients:[{client:'qa',client_name:'QA workspace',page_active:1}]})});});await flickerPage.goto('http://127.0.0.1:8771/admin/console-view.html?view=home',{waitUntil:'domcontentloaded'});assert.equal(await flickerPage.locator('#authScreen').isVisible(),false,'operator sign-in fallback must stay hidden while Access verification is pending');assert.equal(await flickerPage.locator('#shell').isVisible(),false,'operator view stays hidden until Access verification succeeds');releaseClients();await flickerPage.locator('#shell').waitFor();assert.equal(await flickerPage.locator('#authScreen').isVisible(),false,'operator sign-in fallback stays hidden after successful Access verification');await flickerPage.close();
const page=await browser.newPage({viewport:{width:1536,height:1000}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});page.setDefaultTimeout(10000);
for(const theme of ['dark','light'])for(const width of [1536,390]){
 await page.setViewportSize({width,height:1000});
 await page.goto('http://127.0.0.1:8771/admin.html?view=overview&qaTheme='+theme);
 await page.getByRole('heading',{name:'Your workspace'}).waitFor();await page.getByRole('button',{name:'QA workspace Open the client workspace'}).waitFor();
 assert.equal(await page.locator('#adminKey').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'operator overflow');
 await page.screenshot({path:path.join(qa,'overview-'+theme+'-'+width+'.png'),fullPage:true});
 impersonated=true;await page.goto('http://127.0.0.1:8771/portal?client=qa&view=home&qaTheme='+theme);await page.locator('.ps-banner').waitFor();assert.match(await page.locator('.ps-banner').innerText(),/Viewing as QA workspace/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'client overflow');await page.screenshot({path:path.join(qa,'client-'+theme+'-'+width+'.png'),fullPage:true});
 await page.goto('http://127.0.0.1:8771/portal/login?qaTheme='+theme);await page.locator('#email').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'login overflow');await page.screenshot({path:path.join(qa,'login-'+theme+'-'+width+'.png'),fullPage:true});
}
await page.setViewportSize({width:1536,height:1000});await page.goto('http://127.0.0.1:8771/admin.html?view=overview');await page.locator('.ps-dates').click();assert.equal(await page.locator('[data-preset]').count(),13);await page.locator('[data-preset="Last 7 days"]').click();await page.locator('[data-update]').click();assert.equal(await page.locator('.ps-date-label').innerText(),'Last 7 days');await page.locator('.ps-collapse').click();assert.equal(await page.locator('.ps-sidebar').evaluate(e=>Math.round(e.getBoundingClientRect().width)),64);await page.reload();assert.equal(await page.locator('.ps-sidebar').evaluate(e=>Math.round(e.getBoundingClientRect().width)),64);await page.evaluate(()=>PulsifyOperatorShell.go('settings'));await page.locator('[data-theme-mode="light"]').click();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
await page.evaluate(()=>PulsifyOperatorShell.go('home'));
await page.frameLocator('iframe').locator('#shell').waitFor();
await page.locator('iframe').evaluate(f=>{f.contentWindow.phase1Preserved='draft';});
await page.evaluate(()=>{PulsifyOperatorShell.go('settings');PulsifyOperatorShell.go('home');});
assert.equal(await page.locator('iframe').evaluate(f=>f.contentWindow.phase1Preserved),'draft','operator iframe must retain its document and draft state');
await page.evaluate(()=>{localStorage.setItem('pulsify:range:qa',JSON.stringify('Custom'));localStorage.setItem('pulsify:custom-range:qa',JSON.stringify({from:'2026-09-01',to:'2026-09-30'}));});
await page.goto('http://127.0.0.1:8771/portal?client=qa&view=revenue');
await page.waitForFunction(()=>document.querySelector('#wsStage')?.textContent.includes('2026-09-01 to 2026-09-30'));
assert.match(await page.locator('#wsStage').innerText(),/\$1,750/);
await page.evaluate(()=>PulsifyClientShell.go('revenue/transactions'));
assert.equal(await page.locator('#paymentRows tr').count(),1,'selected range excludes August payment');
impersonated=false;await page.goto('http://127.0.0.1:8771/portal?client=qa&view=home');
await page.locator('.ps-switch').click();assert.equal(await page.locator('[data-client=""]').count(),0,'normal client has no operator workspace switch');
assert.deepEqual(errors,[]);console.log('PASS Phase 1: screenshots, impersonation, date filtering, preserved operator iframe drafts, client-scoped switcher, theme and responsive layout. APIs mocked.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
