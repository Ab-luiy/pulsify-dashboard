const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const qa=path.resolve(__dirname,'../../qa/2026-09-phase2');fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1536,height:1000}}),errors=[],requests=[],prefs=new Map();let slow=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{localStorage.setItem('pulsify:featureIntroSeen:qa',JSON.stringify(['instagram','youtube','copy','performance','crm']));window.__intervals=[];const interval=window.setInterval;window.setInterval=(f,ms,...args)=>{window.__intervals.push({f,ms});return interval(f,ms,...args);};});
 await page.route('**/api/workspace-preferences*',async route=>{const req=route.request(),key=new URL(req.url()).searchParams.get('key');if(req.method()==='PUT'){const b=req.postDataJSON();prefs.set(b.key,b.value);return route.fulfill({json:{ok:true}});}await route.fulfill({json:{ok:true,value:prefs.get(key)||null}});});
 await page.route('**/api/spine/state*',async route=>{const req=route.request(),key=new URL(req.url()).searchParams.get('key');if(req.method()==='PUT'){const b=req.postDataJSON();prefs.set(b.key,b.value);return route.fulfill({json:{ok:true}});}await route.fulfill({json:{ok:true,state:prefs.has(key)?{value:prefs.get(key)}:null}});});
 await page.route('**/admin/dashboard.html',async route=>{if(slow)await new Promise(r=>setTimeout(r,600));await route.continue();});
 try{
  for(const theme of ['dark','light'])for(const width of [1536,390]){
   await page.setViewportSize({width,height:1000});slow=true;
   await page.goto('http://127.0.0.1:8771/admin.html?view=crm&qaTheme='+theme);await page.locator('.native-dashboard').waitFor();
   await page.screenshot({path:path.join(qa,`operator-loading-${theme}-${width}.png`)});await page.locator('.native-dashboard #tab-crm.active').waitFor();slow=false;
   for(const view of ['crm','instagram','youtube','content','payments','health','metrics','plan','income','payouts','cashflow','calendar','dashboard']){
    await page.evaluate(v=>PulsifyOperatorShell.go(v),view);await page.waitForTimeout(350);
    assert.equal(await page.locator('iframe').count(),0,'dashboard must be native');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,view+' overflow '+width);
    await page.screenshot({path:path.join(qa,`operator-${view}-${theme}-${width}.png`)});
   }
   await page.goto('http://127.0.0.1:8771/portal?client=qa&view=home&qaTheme='+theme);await page.locator('.ps-launch').waitFor();
   for(const view of ['home','content','plans','todos','team','instagram','youtube','copy','performance','leads','revenue','media','access','settings']){
    await page.evaluate(v=>PulsifyClientShell.go(v),view);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'client '+view+' overflow '+width);
    await page.screenshot({path:path.join(qa,`client-${view}-${theme}-${width}.png`)});
   }
  }
  await page.setViewportSize({width:1536,height:1000});await page.goto('http://127.0.0.1:8771/portal?client=qa&view=home');await page.locator('.ps-launch').waitFor();
  assert.equal(await page.locator('.ps-metric').count(),8);
  await page.locator('[data-step="voice"] summary').click();await page.locator('[data-complete-step="voice"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-step="voice"]')?.dataset.complete==='true');
  await page.reload();await page.waitForFunction(()=>document.querySelector('[data-step="voice"]')?.dataset.complete==='true');
  const first=await page.locator('.ps-metric').first().getAttribute('data-metric');await page.locator('.ps-metric-handle').first().press('Alt+ArrowRight');
  assert.notEqual(await page.locator('.ps-metric').first().getAttribute('data-metric'),first);
  await page.waitForTimeout(250);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.ps-metric').length===8);await page.waitForTimeout(150);assert.notEqual(await page.locator('.ps-metric').first().getAttribute('data-metric'),first);
  await page.getByRole('button',{name:'Metrics',exact:true}).click();await page.locator('.ps-surface-dialog input').first().uncheck();await page.locator('.ps-surface-dialog button').click();assert.equal(await page.locator('.ps-metric:visible').count(),7);
  await page.evaluate(()=>{localStorage.removeItem('pulsify:featureIntroSeen:qa');PulsifyClientShell.go('instagram');});await page.locator('.ps-surface-dialog').waitFor();await page.screenshot({path:path.join(qa,'feature-intro.png')});await page.locator('.ps-surface-dialog button').click();
  await page.evaluate(()=>{PulsifyClientShell.go('home');PulsifyClientShell.go('instagram');});assert.equal(await page.locator('.ps-surface-dialog').count(),0);
  await page.goto('http://127.0.0.1:8771/admin.html?view=crm');await page.locator('#tab-crm.active').waitFor();
  const intervals=await page.evaluate(()=>__intervals.map(i=>i.ms));assert.ok(intervals.includes(45000));
  await page.evaluate(()=>PulsifyOperatorShell.go('settings'));const before=requests.filter(u=>u.includes('/api/crm-sync')).length;
  await page.evaluate(()=>__intervals.find(i=>i.ms===45000).f());await page.waitForTimeout(100);assert.equal(requests.filter(u=>u.includes('/api/crm-sync')).length,before,'hidden CRM must not poll');
  assert.ok(requests.some(u=>u.includes('/api/spine/snapshot')));assert.ok(!requests.some(u=>u.includes('dashboard-data-v2.json')));
  assert.deepEqual(errors,[]);console.log('PASS native navigation, 108 view screenshots, responsive themes, 8 KPIs, persisted order/visibility/checklist, one-time intro and hidden-view polling. APIs mocked.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
