(() => {
 const session=window.PulsifySession;
 if(session?.client){try{const cached=JSON.parse(localStorage.getItem('pulsify:analytics:v1:'+session.client));if(cached?.client===session.client)renderDashboard({...cached,impersonated:session.impersonated});}catch{}}
 function start(){
 const legacy=document.querySelector('.ws-shell');if(!legacy||!window.PulsifyWorkspace)return;
 const root=document.createElement('div');document.body.append(root);
 const nav=[{label:'',items:[['home','Overview'],['content','Content'],['plans','Plans'],['todos','To-dos'],['team','Team']]},{label:'Growth',items:[['instagram','Instagram'],['youtube','YouTube'],['copy','Copywriter'],['performance','Performance'],['leads','Leads']]},{label:'Workspace',items:[['revenue','Payments'],['media','Media library'],['access','Integrations'],['settings','Settings']]}].map(g=>({...g,items:g.items.map(([id,label])=>({id,label}))}));
 let shell;const stash=document.createElement('div');stash.hidden=true;document.body.append(stash);
 const client=state.client||new URLSearchParams(location.search).get('client')||'client';
 const humanName=()=>{const n=state.clientName||state.client_name||document.getElementById('wsClient')?.textContent;return n && n!==client && !/^Loading/i.test(n)?n:client.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());};
 const clientName=humanName();
 shell=PulsifyShell.mount({container:root,workspace:clientName,operator:!!state.impersonated,clients:[{client,client_name:clientName}],clientId:client,user:client,nav,initial:window.PulsifyWorkspace.route(),onView:id=>{if(id==='settings'){stash.append(legacy);if(window.PulsifySettingsView){const holder=document.createElement('div');shell.main.replaceChildren(holder);PulsifySettingsView.render(holder,{role:'client',headers:()=>(typeof authHeaders==='function'?authHeaders():{}),signOut:()=>document.getElementById('wsLogout').click(),onWorkspaceName:name=>{const el=document.getElementById('wsClient');if(el)el.textContent=name;}});}else shell.settings();return;}shell.main.replaceChildren(legacy);PulsifyWorkspace.go(id,{replace:true,force:true});},canLeave:()=>PulsifyWorkspace.canLeave?.()!==false,onWorkspace:async id=>{if(!state.impersonated||id===client)return;if(!id){location.href='https://pulsify-ai.com/admin';return;}const r=await fetch('/api/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client:id})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not open client workspace');location.href=data.url;},signOut:()=>document.getElementById('wsLogout').click()});
 window.PulsifyClientShell=shell;
 if(window.PulsifyBell)PulsifyBell.mount({client,headers:()=>(typeof authHeaders==='function'?authHeaders():{}),go:id=>shell.go(id)});
 const back=document.getElementById('wsBack');back.className='ps-control';root.querySelector('.ps-header-title').before(back);
 PulsifyTheme.apply();
 window.addEventListener('pulsify:client-view',e=>shell.sync(e.detail.view,e.detail.title));
 function refreshIdentity(){const name=humanName();shell.setWorkspace(name);if(state.impersonated){shell.banner(name,()=>{const exit=document.getElementById('impersonationExit');if(exit)exit.click();else fetch('/api/client-logout',{method:'POST'}).then(()=>location.href='https://pulsify-ai.com/admin');});shell.setClients([{client,client_name:name}]);}root.querySelector('.ps-switch').textContent=name;}
 refreshIdentity();window.addEventListener('pulsify:client-ready',refreshIdentity);
 if(state.impersonated)fetch('/api/clients').then(r=>r.ok?r.json():Promise.reject()).then(data=>shell.setClients(data.clients||[{client,client_name:clientName}])).catch(()=>{});
 new MutationObserver(refreshIdentity).observe(document.getElementById('wsClient'),{childList:true,characterData:true,subtree:true});
 }
 if(state.client)start();else {const observer=new MutationObserver(()=>{if(state.client){observer.disconnect();start();}});observer.observe(document.getElementById('wsClient'),{childList:true,subtree:true});}
})();
