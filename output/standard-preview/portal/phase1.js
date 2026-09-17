(() => {
 function start(){
 const legacy=document.querySelector('.ws-shell');if(!legacy||!window.PulsifyWorkspace)return;
 const root=document.createElement('div');document.body.append(root);
 const nav=[{label:'',items:[['home','Overview'],['content','Content'],['plans','Plans'],['todos','To-dos'],['team','Team']]},{label:'Growth',items:[['instagram','Instagram'],['youtube','YouTube'],['copy','Copywriter'],['performance','Performance'],['leads','Leads']]},{label:'Workspace',items:[['revenue','Payments'],['media','Media library'],['access','Integrations'],['settings','Settings']]}].map(g=>({...g,items:g.items.map(([id,label])=>({id,label}))}));
 let shell;const stash=document.createElement('div');stash.hidden=true;document.body.append(stash);
 const client=state.client||new URLSearchParams(location.search).get('client')||'client';
 shell=PulsifyShell.mount({container:root,workspace:state.clientName||state.client_name||client,clientId:client,user:client,nav,initial:window.PulsifyWorkspace.route(),onView:id=>{if(id==='settings'){stash.append(legacy);shell.settings();return;}shell.main.replaceChildren(legacy);PulsifyWorkspace.go(id,{replace:true,force:true});},canLeave:()=>PulsifyWorkspace.canLeave?.()!==false,onWorkspace:async id=>{if(!id)location.href='https://pulsify-ai.com/admin';},signOut:()=>document.getElementById('wsLogout').click()});
 window.PulsifyClientShell=shell;
 const back=document.getElementById('wsBack');back.className='ps-control';root.querySelector('.ps-header-title').before(back);
 PulsifyTheme.apply();
 window.addEventListener('pulsify:client-view',e=>shell.sync(e.detail.view,e.detail.title));
 function refreshIdentity(){const name=state.clientName||state.client_name||document.getElementById('wsClient')?.textContent||client;if(state.impersonated){shell.banner(name,()=>{const exit=document.getElementById('impersonationExit');if(exit)exit.click();else fetch('/api/client-logout',{method:'POST'}).then(()=>location.href='https://pulsify-ai.com/admin');});shell.setClients([{client,client_name:name}]);}root.querySelector('.ps-switch').textContent=name;}
 refreshIdentity();window.addEventListener('pulsify:client-ready',refreshIdentity);
 new MutationObserver(refreshIdentity).observe(document.getElementById('wsClient'),{childList:true,characterData:true,subtree:true});
 }
 if(state.client)start();else {const observer=new MutationObserver(()=>{if(state.client){observer.disconnect();start();}});observer.observe(document.getElementById('wsClient'),{childList:true,subtree:true});}
})();
