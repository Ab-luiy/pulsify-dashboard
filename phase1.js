(() => {
 const app=document.querySelector('.app'),oldNav=document.querySelector('nav.sb-nav'),content=[...app.children].find(n=>n.tagName!=='ASIDE');
 const views=[['live','Overview'],['metrics','Metrics'],['crm','CRM'],['instagram','Instagram'],['content','Content'],['plan','Plan'],['payments','Payments'],['income','Income'],['payouts','Payouts'],['cashflow','Cash flow'],['calendar','Calendar'],['health','Health']];
 const params=new URLSearchParams(location.search),embed=params.get('embed')==='1';
 const buttons=[...oldNav.querySelectorAll('[data-tab]')];
 function show(id){id=({overview:'live',payments:'sales'})[id]||id;const b=buttons.find(b=>b.dataset.tab===id);if(b)b.click();history.replaceState({psView:id},'',location.pathname+location.search);}
 function theme(){const dark=document.documentElement.dataset.theme==='dark';document.documentElement.classList.remove('theme-track','theme-night');document.documentElement.classList.add(dark?'theme-night':'theme-track');document.body.classList.toggle('dark',dark);}
 window.addEventListener('pulsify:theme',theme);theme();
 // Old code still uses header fields while painting data; preserve these nodes.
 app.classList.add('phase1-dashboard');
 if(embed){document.body.classList.add('ps-embedded');show(params.get('view')||'live');window.addEventListener('message',e=>{if(e.origin!=='https://pulsify-ai.com')return;if(e.data?.type==='pulsify-theme')PulsifyTheme.apply(e.data.mode);if(e.data?.type==='pulsify-view')show(e.data.view);});return;}
 const stash=document.createElement('div');stash.hidden=true;document.body.append(stash);stash.append(app);
 const root=document.createElement('div');document.body.append(root);let shell;
 shell=PulsifyShell.mount({container:root,workspace:'Pulsify',nav:[{label:'Dashboard',items:views.map(([id,label])=>({id,label,icon:'chart'}))},{label:'Workspace',items:[{id:'console',label:'Command center'},{id:'settings',label:'Settings'}]}],onView:id=>{if(id==='console'){location.href='https://pulsify-ai.com/admin';return false;}if(id==='settings'){stash.append(app);shell.settings();return;}shell.main.replaceChildren(app);show(id);},onWorkspace:async client=>{if(!client){location.href='https://pulsify-ai.com/admin';return;}const r=await fetch('/api/impersonate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not open client workspace');location.href=new URL(data.url,'https://pulsify-ai.com').href;},signOut:()=>location.href='/cdn-cgi/access/logout'});
 window.PulsifyDashboardShell=shell;
 fetch('/api/clients').then(r=>r.ok?r.json():Promise.reject()).then(d=>shell.setClients(d.clients||[])).catch(()=>{});
})();
