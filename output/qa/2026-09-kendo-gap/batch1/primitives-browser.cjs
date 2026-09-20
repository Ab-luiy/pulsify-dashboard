const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../../standard-preview'),qa=__dirname;fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(8779,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
const now=Date.now(),iso=h=>new Date(now-h*3600000).toISOString();
const threads=[['t1','Alex Morgan','alex.trades',2,'outbound','That makes sense. Can you send the breakdown?',false],['t2','Jordan Lee','jordan.ecom',38,'outbound','I put together the example we spoke about.',true],['t3','Sam Rivera','sam.rivera',6,'outbound','Thanks for sharing that video.',false],['t4','Taylor Brooks','taylor.fx',1,'inbound','How does the mentorship work?',false],['t5','Casey Williams','casey.shop',8,'inbound','Could we look at the numbers together?',false]].map(([id,name,handle,h,origin,last_text,due])=>({id,name,handle,last_text,origin,last_message_at:iso(h),first_message_at:iso(100),last_our_message_at:iso(h),last_their_message_at:iso(h+1),last_direction:due?'outbound':'inbound',follow_up_due:due,hours_since_our_message:h,awaiting_us:!due,stage:due?'opener':'replied',stage_label:due?'Follow-up due':'Replied',our_messages:3,their_messages:2,notes:''}));
const stats={outbound:{dms_sent:3,messages_sent:9,follow_ups_due:1,replies:2,reply_rate:66.7,positive:1,negative:0,ghosted:0,ghost_rate:0},inbound:{conversations:2,awaiting_us:2,answered:0,positive:1,negative:0},pipeline:{appointments_booked:1,closed:0,close_rate:0}};
let isArchived=false;const client={client:'sample',client_name:'Sample coaching',status:'client'};
const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',async route=>{const u=new URL(route.request().url());let d={ok:true,rows:[]};
if(u.pathname==='/api/operator-bootstrap')d={ok:true,clients:[],overview:{summary:{}},operator:{email:'qa@example.test'}};
else if(u.pathname==='/api/outreach')d=u.searchParams.has('id')?{messages:[{direction:'outbound',text:'I put together the breakdown for you.',sent_at:iso(4)},{direction:'inbound',text:'That makes sense. Can you send it over?',sent_at:iso(2)}]}:{threads,stats,events:[],generated_at:iso(0),timezone:'Europe/Istanbul'};
else if(u.pathname==='/api/spine/conversations')d={conversations:threads.map(t=>({...t,participant_username:t.handle,participant_name:t.name,message_count:5,in_crm:t.id==='t1'}))};
else if(u.pathname==='/api/pipeline')d={contacts:[{client_id:'sample',client_name:'Sample coaching',contact_name:'Avery Scott',contact_email:'avery@example.test',stage:'Booked',last_seen:iso(3),bookings:1,paid_cents:0}]};
else if(u.pathname==='/api/search')d=u.searchParams.has('status')?{ready:true,indexed:{dm:{count:50}},totals:{dms:50}}:{hits:[...threads.slice(0,3).map(t=>({kind:'dm',conversation_id:t.id,name:t.name,handle:t.handle,snippet:t.last_text,sent_at:t.last_message_at,score:.87,direction:'inbound'})),{kind:'dm',conversation_id:'t1',name:'Alex Morgan',handle:'alex.trades',snippet:'I want a clearer plan for my next month.',sent_at:iso(5),score:.76}],took_ms:42};
else if(u.pathname==='/api/clients')d={clients:isArchived?[]:[client]};
else if(u.pathname==='/api/workspace-archive'){if(route.request().method()==='POST'){isArchived=route.request().postDataJSON().action==='archive';d={ok:true};}else d={archived:isArchived?[client]:[]};}
else if(u.pathname==='/api/account')d={ok:true,account:{email:'qa@example.test',display_name:'QA operator'},team:{operators:[]},security:{access_protected_paths:[],admin_key_uses:0},defaults:{},currencies:['USD']};
else if(u.pathname==='/api/integrations')d={ok:true,integrations:[]};
else if(u.pathname==='/api/zernio')d={ok:true,configured:true,connected:true,account:{username:'qa'},webhook:{registered:true}};
else if(u.pathname==='/api/webhooks')d={ok:true,endpoints:[],events:['lead.created']};
else if(u.pathname==='/api/notifications')d={items:[],unread:0};
await route.fulfill({json:d});});

page.setDefaultTimeout(8000);
const checks=[];
for(const theme of ['dark','light'])for(const width of [1536,390]){
 await page.setViewportSize({width,height:1000});
 await page.goto('http://127.0.0.1:8779/admin.html?view=overview');
 await page.evaluate(t=>PulsifyTheme.apply(t),theme);
 for(const [view,ready] of [['overview','.ps-kpis'],['outreach','[data-toggle="t1"]'],['leads','#leads-body .contact-row'],['integrations','.int-hero'],['settings','.set-input']]){
  await page.evaluate(v=>PulsifyOperatorShell.go(v),view);await page.locator(ready).first().waitFor();
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
  assert.equal(await page.locator('.ps-header-title').textContent(),view==='outreach'?'Outreach tracker':view[0].toUpperCase()+view.slice(1));
  assert.equal(await page.locator('.ps-nav [aria-current=page]').getAttribute('data-view'),view);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' viewport overflow');
  await page.screenshot({path:path.join(qa,view+'-'+theme+'-'+width+'.png'),fullPage:true});
 }
 const focus=await page.locator('.set-input').first().evaluate(async e=>{e.focus();await new Promise(r=>setTimeout(r,180));const s=getComputedStyle(e);return {border:s.borderColor,shadow:s.boxShadow,height:s.height,ring:getComputedStyle(document.documentElement).getPropertyValue('--ring')};});
 assert.equal(focus.height,'40px');assert.notEqual(focus.shadow,'none');assert.ok(focus.shadow.includes('3px'));assert.ok(focus.ring.trim());
 await page.evaluate(()=>scrollTo(0,0));
 await page.locator('.ps-avatar').click();await page.waitForTimeout(180);
 assert.equal(await page.locator(':modal').count(),0);
 let box=await page.locator('.ps-menu:not(.ps-leave)').boundingBox(),trigger=await page.locator('.ps-avatar').boundingBox();
 assert.ok(box.x>=0&&box.x+box.width<=width+1);assert.ok(Math.abs(box.y-(trigger.y+trigger.height+6))<2);
 await page.screenshot({path:path.join(qa,'account-menu-'+theme+'-'+width+'.png')});
 await page.keyboard.press('Escape');await page.waitForTimeout(180);assert.equal(await page.locator('.ps-menu').count(),0);assert.ok(await page.locator('.ps-avatar').evaluate(e=>e===document.activeElement));
 await page.locator('.ps-dates').click();await page.waitForTimeout(180);assert.equal(await page.locator('.ps-menu [data-preset]').count(),13);assert.equal(await page.locator('.ps-menu [data-month] svg').count(),4);
 box=await page.locator('.ps-menu').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);await page.screenshot({path:path.join(qa,'date-menu-'+theme+'-'+width+'.png')});
 await page.locator('[data-preset="Last 7 days"]').click();await page.locator('[data-update]').click();await page.waitForTimeout(180);assert.equal(await page.locator('.ps-menu').count(),0);
 if(width===390)await page.locator('.ps-collapse').click();
 await page.locator('.ps-switch').click();await page.waitForTimeout(180);box=await page.locator('.ps-menu').boundingBox();trigger=await page.locator('.ps-switch').boundingBox();assert.ok(Math.abs(box.x-trigger.x)<2);await page.keyboard.press('Escape');await page.waitForTimeout(180);
 if(width===390)await page.locator('.ps-overlay').click({position:{x:375,y:200}});
 await page.evaluate(()=>PulsifyOperatorShell.go('outreach'));await page.locator('[data-toggle="t1"]').waitFor();assert.equal(await page.locator('[data-toggle="t1"] .contact-chevron svg').count(),1);await page.locator('[data-toggle="t1"]').click();assert.ok(await page.locator('[data-toggle="t1"] .contact-chevron').evaluate(e=>getComputedStyle(e,'::after').maskImage.includes('svg')));await page.locator('[data-toggle="t1"]').click();
 if(width===1536){await page.waitForTimeout(180);const pill=await page.locator('.ps-nav-pill').boundingBox(),nav=await page.locator('.ps-nav [aria-current=page]').boundingBox();assert.ok(Math.abs(pill.y-nav.y)<1);}
 const computed=await page.evaluate(async()=>{const el=document.createElement('div');el.innerHTML='<button class="ps-button primary">Primary</button><button class="ps-button ghost">Ghost</button><input class="ps-input"><input class="leads-search"><input class="sr-input"><div class="int-form"><input type="text"></div><div class="ot-note"><textarea></textarea></div>';document.body.append(el);const fields=[];for(const x of el.querySelectorAll('input,textarea')){x.focus();await new Promise(r=>setTimeout(r,180));const c=getComputedStyle(x);fields.push({height:c.height,shadow:c.boxShadow});}const b=getComputedStyle(el.querySelector('button'));const result={fields,button:{height:b.height,background:b.backgroundColor,shadow:b.boxShadow,duration:b.transitionDuration,easing:b.transitionTimingFunction},bridge:getComputedStyle(document.querySelector('.ps-shell')).getPropertyValue('--ui-accent')};el.remove();return result;});
 for(const field of computed.fields)assert.ok(field.shadow.includes('3px'));assert.equal(computed.fields[1].height,'36px');assert.equal(computed.fields[4].height,'80px');
 assert.equal(computed.button.height,'36px');assert.equal(computed.button.duration,'0.15s');assert.ok(computed.bridge.trim());
 await page.evaluate(()=>{const d=document.createElement('dialog');d.className='ps-popover int-dialog';d.innerHTML='<h2>Primitive dialog</h2><input class="ps-input" aria-label="Example"><button class="ps-control">Close</button>';document.body.append(d);d.showModal();});await page.waitForTimeout(180);
 box=await page.locator(':modal').boundingBox();assert.ok(Math.abs(box.x+box.width/2-width/2)<1);assert.ok(Math.abs(box.y+box.height/2-500)<1);await page.screenshot({path:path.join(qa,'dialog-'+theme+'-'+width+'.png')});await page.locator(':modal').evaluate(d=>{d.close();d.remove();});
 checks.push({theme,width,focus,computed});
}
await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.ps-avatar').click();assert.equal(await page.locator('.ps-menu').evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Escape');assert.equal(await page.locator('.ps-menu').count(),0);
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(qa,'primitive-checks.json'),JSON.stringify(checks,null,2));console.log('PASS 20 view screenshots + 12 menu/dialog screenshots; focus aliases, tokens, 36px buttons, 40px inputs, SVG icons, nav alignment, anchored non-modal menus, centered modal, Escape/focus return, reduced motion. Mock APIs only.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
