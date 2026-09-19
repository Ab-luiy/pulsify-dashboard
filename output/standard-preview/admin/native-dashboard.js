(() => {
 let loading,root,requested='live',header;
 const aliases={youtube:'metrics',dashboard:'live',payments:'sales'};
 function activate(){
  if(!root||root.hidden||!header)return;
  const id=aliases[requested]||requested;
  root.querySelector('nav.sb-nav [data-tab="'+CSS.escape(id)+'"]')?.click();
  root.classList.toggle('theme-night',document.documentElement.dataset.theme==='dark');
  root.classList.toggle('theme-track',document.documentElement.dataset.theme!=='dark');
  window.PulsifySurface?.enhance(root,{scope:'operator',view:id,go:v=>PulsifyOperatorShell.go(v)});
  const labels={crm:['Outreach pipeline','Review leads, follow up and keep the next step clear.'],metrics:['YouTube','Track your channel and published videos.'],instagram:['Instagram','Review reach, content and conversations.'],content:['Content','Manage the work you are preparing and publishing.'],sales:['Payments','Review recorded sales and collections.'],live:['Business overview','Your recorded activity and results.'],plan:['Plan','Track progress against your operating plan.'],income:['Income','Review your recorded income.'],payouts:['Payouts','Track recorded payouts.'],cashflow:['Cash flow','Review money in and money out.'],calendar:['Calendar','See your scheduled work.'],health:['Health','Track your personal log.']};
  const [title,note]=labels[id]||[requested,''];header.querySelector('h1').textContent=title;header.querySelector('p').textContent=note;
  document.title=title+' | Pulsify';
  if(id==='crm')loadUnmatched();
 }
 async function loadUnmatched(){
  const box=root?.querySelector('#psUnmatchedInbox');if(!box||box.dataset.loaded==='loading')return;box.dataset.loaded='loading';
  try{const response=await fetch('/api/spine/conversations?unmatched=1');const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load unmatched conversations.');const rows=data.conversations||[];box.dataset.loaded='ready';box.innerHTML='<div class="panel-head"><div><h2>Unmatched Instagram inbox</h2><div class="panel-note">Conversations that have not been projected into a CRM lead yet.</div></div><span class="ps-badge">'+rows.length+'</span></div><div class="table-wrap"><table><thead><tr><th>Handle</th><th>Last message</th><th>Direction</th><th>Updated</th></tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr><td>@'+PulsifyShell.esc(row.participant_username||row.participant_id||row.participant_name||'unknown')+'</td><td>'+PulsifyShell.esc(row.last_text||'')+'</td><td>'+PulsifyShell.esc(row.last_direction||'')+'</td><td>'+PulsifyShell.esc(row.last_message_at||'')+'</td></tr>').join(''):'<tr><td colspan="4">No unmatched conversations.</td></tr>')+'</tbody></table></div>';}catch(error){box.dataset.loaded='error';box.innerHTML='<p class="ps-error"></p>';box.firstChild.textContent=error.message;}
 }
 async function load(main){
  root=document.createElement('section');root.className='native-dashboard phase1-dashboard';main.append(root);
  root.innerHTML='<div class="ps-kpis">'+Array.from({length:8},()=>'<div class="ps-kpi skeleton" style="min-height:156px"></div>').join('')+'</div>';
  const response=await fetch('/admin/dashboard.html');if(!response.ok)throw Error('Could not load the dashboard.');
  const template=document.createElement('template');template.innerHTML=await response.text();
  const scripts=[...template.content.querySelectorAll('script:not([type]),script[type="text/javascript"]')];
  scripts.forEach(s=>s.remove());root.replaceChildren(template.content);
  const legacyHeader=root.querySelector('.page-head');if(legacyHeader)legacyHeader.hidden=true;
  header=document.createElement('div');header.className='ps-page-header';header.innerHTML='<div><h1></h1><p></p></div><button class="ps-control">Refresh</button>';root.prepend(header);header.querySelector('button').onclick=()=>{window.crmSyncNow?.();window.PulsifyDashboardRefresh?.();};
  const crm=root.querySelector('#tab-crm .grid');if(crm){const partners=crm.querySelector('#clients')?.closest('.card'),prompts=crm.querySelector('.prompt-vault-card');for(const [node,title] of [[partners,'Client relationships'],[prompts,'Research and asset prompts']]){if(!node)continue;const details=document.createElement('details');details.className='ps-secondary-panel';const summary=document.createElement('summary');summary.textContent=title;details.append(summary,node);crm.append(details);}}
  const crmCard=root.querySelector('#crmBoard')?.closest('.card');if(crmCard){const details=document.createElement('details');details.className='ps-secondary-panel';details.innerHTML='<summary>Pipeline breakdown and import notes</summary>';for(const selector of ['#crmNote','.crm-intel','.pipeline-box']){const node=crmCard.querySelector(selector);if(node)details.append(node);}crmCard.append(details);}
  if(crm){const unmatched=document.createElement('section');unmatched.id='psUnmatchedInbox';unmatched.className='card';unmatched.innerHTML='<div class="skeleton" style="min-height:120px"></div>';crm.append(unmatched);}
  // Trusted, same-origin build artifact; execute once after its DOM is mounted.
  for(const old of scripts){const script=document.createElement('script');script.textContent=old.textContent;root.append(script);}
  root.addEventListener('click',e=>{const jump=e.target.closest('[data-jump-tab]');if(jump)PulsifyOperatorShell.go(jump.dataset.jumpTab==='live'?'dashboard':jump.dataset.jumpTab);});
  const observer=new MutationObserver(changes=>{if(changes.some(c=>[...c.addedNodes].some(n=>n.nodeType===1&&n.matches('.kpi,.kpi-row'))))PulsifySurface.enhance(root,{scope:'operator',view:aliases[requested]||requested,go:v=>PulsifyOperatorShell.go(v)});});observer.observe(root,{childList:true,subtree:true});
  activate();
 }
 window.PulsifyNativeDashboard={show(id,main){requested=id;if(root)root.hidden=false;if(!loading)loading=load(main).catch(error=>{root.innerHTML='<p class="ps-error"></p>';root.firstChild.textContent=error.message;loading=null;throw error;});return loading.then(activate);},hide(){if(root)root.hidden=true;}};
 window.addEventListener('pulsify:theme',()=>{if(root)activate();});
})();
