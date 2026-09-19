(() => {
 let scheduled=false;
 function render(){
  scheduled=false;const root=document.getElementById('wsStage'),view=window.PulsifyWorkspace?.route();if(!root||!view||!state.client)return;
  const config={scope:'client',client:state.client,view,readOnly:!!state.impersonated,headers:authHeaders,go:id=>PulsifyClientShell.go(id)};
  PulsifySurface.enhance(root,config);
  if(view==='home'&&!root.querySelector('.ps-launch')&&!window.__pulsifyChecklistInFlight){
   window.__pulsifyChecklistInFlight=true;
   const connected=provider=>(state.integrations||[]).some(i=>i.provider===provider&&i.connected===true);
   const local={instagram:connected('instagram'),youtube:connected('youtube'),payment:connected('stripe')||connected('whop'),proof:state.proofItems.length>0,sequence:state.studio.rows.length>0,live:state.studio.rows.some(r=>r.status==='published')};
   // Server checklist (Phase 4) is the truth when reachable: it auto-completes from the client's data and its ids map onto the card's steps.
   const map={'offer-voice-note':'voice','who-you-sell-to':'icp','connect-instagram':'instagram','connect-youtube':'youtube','connect-payments':'payment','first-proof':'proof','first-sequence':'sequence','ship-it':'live'};
   const back=Object.fromEntries(Object.entries(map).map(([k,v])=>[v,k]));
   const onStep=(id,done)=>{if(!back[id]||state.impersonated)return;fetch('/api/checklist',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',...authHeaders()},body:JSON.stringify({client:state.client,step:back[id],state:done?'done':'open'})}).catch(()=>{});};
   fetch('/api/checklist?client='+encodeURIComponent(state.client),{credentials:'same-origin',headers:authHeaders()}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    const facts={...local};for(const s of data.steps||[]){if(map[s.id]&&s.state==='done')facts[map[s.id]]=true;}
    if(view===window.PulsifyWorkspace?.route()&&root.isConnected&&!root.querySelector('.ps-launch'))PulsifySurface.checklist(root,{...config,onStep},facts);
   }).catch(()=>{if(!root.querySelector('.ps-launch'))PulsifySurface.checklist(root,{...config,onStep},local);}).finally(()=>{window.__pulsifyChecklistInFlight=false;});
  }
 }
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(render,40);}
 window.addEventListener('pulsify:client-view',e=>{schedule();if(!state.impersonated)PulsifySurface.intro(e.detail.view,state.client);});
 window.addEventListener('pulsify:client-ready',schedule);
 for(const name of ['proof','integrations','performance'])document.addEventListener('pulsify:'+name,()=>{document.querySelector('.ps-launch')?.remove();schedule();});
 const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches('.ps-launch,.ps-grid-tools,.ps-metric-handle,.ps-metric-footer'))))schedule();});
 const stage=document.getElementById('wsStage');if(stage)observer.observe(stage,{childList:true,subtree:true});schedule();
})();
