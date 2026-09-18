(() => {
 let scheduled=false;
 function render(){
  scheduled=false;const root=document.getElementById('wsStage'),view=window.PulsifyWorkspace?.route();if(!root||!view||!state.client)return;
  const config={scope:'client',client:state.client,view,readOnly:!!state.impersonated,headers:authHeaders,go:id=>PulsifyClientShell.go(id)};
  PulsifySurface.enhance(root,config);
  if(view==='home'&&!root.querySelector('.ps-launch')){
   const connected=provider=>(state.integrations||[]).some(i=>i.provider===provider&&i.connected===true);
   PulsifySurface.checklist(root,config,{instagram:connected('instagram'),youtube:connected('youtube'),payment:connected('stripe')||connected('whop'),proof:state.proofItems.length>0,sequence:state.studio.rows.length>0,live:state.studio.rows.some(r=>r.status==='published')});
  }
 }
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(render,40);}
 window.addEventListener('pulsify:client-view',e=>{schedule();if(!state.impersonated)PulsifySurface.intro(e.detail.view,state.client);});
 window.addEventListener('pulsify:client-ready',schedule);
 for(const name of ['proof','integrations','performance'])document.addEventListener('pulsify:'+name,()=>{document.querySelector('.ps-launch')?.remove();schedule();});
 const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches('.ps-launch,.ps-grid-tools,.ps-metric-handle,.ps-metric-footer'))))schedule();});
 const stage=document.getElementById('wsStage');if(stage)observer.observe(stage,{childList:true,subtree:true});schedule();
})();
