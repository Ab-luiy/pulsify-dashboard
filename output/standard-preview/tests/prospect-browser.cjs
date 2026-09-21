const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Abdullah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),qa=path.resolve(root,'../qa/2026-09-prospects');fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(8783,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1536,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state={added:{},overrides:{},removed:{}};const now=new Date().toISOString();
 await page.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());let d={ok:true};
 if(u.pathname==='/api/operator-bootstrap')d={ok:true,clients:[],overview:{summary:{}},operator:{email:'qa@example.test'}};
 if(u.pathname==='/api/notifications')d={ok:true,items:[],unread:0};
 if(u.pathname==='/api/crm-sync'){if(req.method()==='POST')Object.assign(state.overrides,req.postDataJSON().overrides||{});d={ok:true,state};}
 if(u.pathname==='/api/spine/leads')d={ok:true,leads:[{n:'Trading creator',ig:'trading.creator',niche:'Trading',updated_at:now},{n:'Ecommerce creator',ig:'ecommerce.creator',niche:'Ecommerce',updated_at:now}],nextCursor:null};
 if(u.pathname==='/api/outreach')d={ok:true,threads:[],events:[],stats:{outbound:{},inbound:{},pipeline:{}},generated_at:now};
 if(u.pathname==='/api/spine/snapshot')d={ok:true,snapshots:[{source:'instagram',kind:'media',payload:[{id:'123',media_type:'IMAGE',caption:'Current post',thumbnail_url:'https://scontent.cdninstagram.com/image.jpg'}]}]};
 if(u.pathname==='/api/spine/series')d={ok:true,series:[]};
 if(u.pathname==='/api/spine/instagram-image'){return route.fulfill({status:404,body:''});}
 await route.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
 await page.goto('http://127.0.0.1:8783/admin.html?view=crm');await page.locator('[data-filter="unreviewed"]').click();await page.getByText('Trading creator',{exact:true}).waitFor();
 assert.equal(await page.locator('.crm-prospect').count(),2);
 await page.locator('[data-edit="Trading creator"]').click();await page.getByRole('button',{name:'Approve prospect',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});
 await page.locator('[data-filter="approved"]').click();assert.equal(await page.locator('.crm-prospect').count(),1);assert.equal(state.overrides['Trading creator'].vetting,'approved');
 await page.screenshot({path:path.join(qa,'crm-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:path.join(qa,'crm-mobile.png')});
 await page.locator('[data-edit="Trading creator"]').click();await page.getByRole('button',{name:'Drop prospect',exact:true}).click();await page.locator('dialog').waitFor({state:'detached'});assert.equal(await page.locator('.crm-prospect').count(),0);
 await page.locator('[data-filter="dropped"]').click();assert.equal(await page.locator('.crm-prospect').count(),1);
 await page.evaluate(()=>PulsifyOperatorShell.go('instagram'));await page.locator('.sv-tile').waitFor();await page.locator('.sv-thumb-empty').waitFor();assert.equal(await page.locator('img[data-media-fallback]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS CRM approval/drop, source-data rendering, Instagram media/fallback, mobile overflow; mocked APIs.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
