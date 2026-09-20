const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),qa=path.resolve(root,'../qa/2026-09-phase5');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+(url.pathname==='/portal'?'/portal/index.html':url.pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(8775,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
 const page=await browser.newPage({viewport:{width:1536,height:1000}}),errors=[],requests=[];
 page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
 let failedRead=true,notificationGets=0,slowBell=false,failIntegrations=false,slowBootstrap=false;
 const client={client:'qa',client_name:'QA workspace',page_active:1};
 const item={id:'n1',kind:'lead.replied',title:'Joe replied',body:'Interested',created_at:new Date().toISOString(),entity:{conversation_id:'t1'},severity:'success'};
 await page.route('**/api/**',async route=>{
  const req=route.request(),u=new URL(req.url());requests.push({path:u.pathname,headers:req.headers()});
  let d={ok:true,rows:[]},status=200;
  if(u.pathname==='/api/notifications'){
   if(req.method()==='GET'){notificationGets++;if(slowBell)await new Promise(r=>setTimeout(r,250));d={ok:true,items:[item],unread:75};}
   else {status=failedRead?503:200;d={ok:!failedRead,marked:1};}
  }else if(u.pathname==='/api/clients')d={ok:true,clients:[client]};
  else if(u.pathname==='/api/operator-bootstrap'){if(slowBootstrap)await new Promise(r=>setTimeout(r,300));d={ok:true,clients:[client],overview:{summary:{}},operator:{email:'qa@example.test'}};}
  else if(u.pathname==='/api/integrations'){status=failIntegrations?503:200;d={ok:!failIntegrations,integrations:[]};}
  else if(u.pathname==='/api/zernio')d={ok:true,configured:true,connected:true,account:{username:'qa'},webhook:{registered:true}};
  else if(u.pathname==='/api/realtime-config')d={ok:true};
  else if(u.pathname==='/api/outreach')d={ok:true,threads:[],events:[],generated_at:new Date().toISOString(),stats:{outbound:{},inbound:{},pipeline:{}}};
  else if(u.pathname==='/api/spine/conversations')d={ok:true,conversations:[]};
  else if(u.pathname==='/api/webhooks')d={ok:true,endpoints:[],events:['lead.created']};
  else if(u.pathname==='/api/account')d={ok:true,account:{email:'qa@example.test'},team:{operators:[]},security:{access_protected_paths:[],admin_key_uses:0},defaults:{},currencies:['USD']};
  else if(u.pathname==='/api/search')d={ok:true,hits:[],ready:true};
  else if(u.pathname==='/api/client-dashboard')d={ok:true,...client,sections:{},revenue:{payments:[]}};
  await route.fulfill({status,json:d});
 });
 await page.goto('http://127.0.0.1:8775/admin.html');
 await page.waitForFunction(()=>document.querySelector('.ps-bell-badge')?.textContent==='75');
 // Opening and closing in a single frame used to dereference the removed panel.
 await page.evaluate(()=>{const b=document.querySelector('.ps-notifications');for(let i=0;i<10;i++)b.click();});
 await page.waitForTimeout(80);assert.equal(await page.locator('.ps-bell').count(),0);
 await page.locator('.ps-notifications').click();await page.locator('[data-toggle="n1"]').click();
 await page.locator('[data-read="n1"]').click();await page.getByText('Could not save that change. Please retry.').waitFor();
 assert.equal(await page.locator('.ps-bell-badge').textContent(),'75','failed write must preserve unread count');
 failedRead=false;await page.locator('[data-read="n1"]').click();
 await page.waitForFunction(()=>document.querySelector('.ps-bell-badge').textContent==='74');
 await page.keyboard.press('Escape');
 slowBell=true;const before=notificationGets;
 await page.evaluate(async()=>{const bell=PulsifyBell.mount({operator:true});await Promise.all([bell.load(),bell.load(),bell.load()]);});
 assert.equal(notificationGets-before,1,'overlapping loads coalesce');slowBell=false;
 // A cold direct visit must still have a client selector before bootstrap completes.
 slowBootstrap=true;await page.goto('http://127.0.0.1:8775/admin.html?view=integrations');
 await page.locator('[data-workspace]').waitFor();assert.equal(await page.locator('[data-workspace] option[value="qa"]').count(),1);
 await page.locator('[data-workspace]').selectOption('qa');await page.locator('[data-connect]').waitFor();
 await page.locator('[data-connect]').click();await page.locator('dialog[open]').waitFor();await page.locator('[data-cancel]').click();
 // Failure must offer retry, never falsely display disconnected services.
 failIntegrations=true;await page.evaluate(()=>PulsifyOperatorShell.go('integrations'));await page.locator('[data-retry]').waitFor();
 failIntegrations=false;await page.locator('[data-retry]').click();await page.locator('.int-hero-actions').waitFor();
 for(const view of ['overview','leads','search','outreach','crm','instagram','youtube','content','integrations','payments','health','settings','home','brain','delivery','campaigns','email']){
  await page.evaluate(v=>PulsifyOperatorShell.go(v),view);
  if(['brain','delivery','campaigns','email'].includes(view))await page.locator('iframe:not([hidden])').contentFrame().locator('#shell').waitFor();
  else if(view==='home')await page.locator('[data-archive="qa"]').waitFor();
  else await page.waitForTimeout(150);
  if(['crm','health','payments'].includes(view)){await page.waitForTimeout(600);await page.screenshot({path:path.join(qa,'batch3-'+view+'-dark-1536.png'),fullPage:false});}
  await page.locator('.ps-notifications').click();await page.locator('.ps-bell.show').waitFor();await page.keyboard.press('Escape');
 }
 // Client integrations must use client credentials, with no operator-only payment tools.
 await page.evaluate(async()=>{PulsifyOperatorShell.go('overview');const r=document.createElement('div');document.querySelector('.ps-main').replaceChildren(r);await PulsifyIntegrationsView.render(r,{client:'qa',operator:false,headers:()=>({'x-portal-token':'test-token'}),readOnly:true});});
 assert.equal(await page.locator('#int-matches').count(),0);
 const last=requests.filter(x=>x.path==='/api/integrations').at(-1);assert.equal(last.headers['x-pulsify-operator'],undefined);assert.equal(last.headers['x-portal-token'],'test-token');
 assert.equal(await page.locator('[data-newhook]').isDisabled(),true);
 await page.screenshot({path:path.join(qa,'bugfix-integrations-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('.ps-notifications').click();await page.locator('.ps-bell.show').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'mobile overflow');
 await page.waitForTimeout(200);await page.screenshot({path:path.join(qa,'bugfix-bell-mobile.png')});
 assert.deepEqual(errors,[]);console.log('PASS: all 17 operator sections, bell races/coalescing/failed writes/paged counts, cold Integrations, retry, client credentials, read-only controls, mobile. APIs mocked.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
