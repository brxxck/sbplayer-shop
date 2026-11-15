// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Smooth arcade interactions. Outcomes and wallet movements are exclusively server-authoritative.
(() => {
  if(!document.querySelector('.arcade-root'))return;

  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const csrf=()=>document.body.dataset.siteCsrf||'';
  const ajaxHeaders={'accept':'application/json','x-arcade-async':'1'};
  const symbols=(value)=>Math.max(1,Number(value)||1).toFixed(2)+'×';
  const queued=[];
  let busy=false,crashCleanup=()=>{};

  function announce(message,error=false){
    const root=document.querySelector('.arcade-root');
    if(!root)return;
    let notice=root.querySelector('.arcade-live-notice');
    if(!notice){
      notice=document.createElement('p');
      notice.className='arcade-live-notice';
      notice.setAttribute('role',error?'alert':'status');
      (root.querySelector('.arcade-tabs')||root.firstElementChild).after(notice);
    }
    notice.className='arcade-live-notice'+(error?' arcade-live-error':'');
    notice.setAttribute('role',error?'alert':'status');
    notice.textContent=message;
  }

  // Preserve a selected wager/mine count after a move, but never reuse a request ID.
  function choices(root){
    const values=new Map();
    for(const form of root.querySelectorAll('.arcade-form')){
      const path=new URL(form.action,location.href).pathname;
      const fields=[];
      for(const input of form.querySelectorAll('input[name],select[name]')){
        if(!['wager','bombs','face','auto_at','target_id'].includes(input.name))continue;
        if(input.type==='radio'&&!input.checked)continue;
        fields.push([input.name,input.value]);
      }
      values.set(path,fields);
    }
    return values;
  }
  function restoreChoices(root,values){
    for(const form of root.querySelectorAll('.arcade-form')){
      const path=new URL(form.action,location.href).pathname;
      for(const [name,value] of values.get(path)||[]){
        const field=[...form.elements].find(x=>x.name===name&&(x.type!=='radio'||x.value===value));
        if(!field)continue;
        if(field.type==='radio')field.checked=true;
        else field.value=value;
      }
    }
  }
  function highlightQueued(root){
    for(const item of queued){
      for(const field of root.querySelectorAll('.arcade-mine-grid input[name=tile]')){
        if(field.value===item.tile&&new URL(field.form.action).pathname===item.path){
          field.form.querySelector('button')?.classList.add('arcade-tile-pending');
        }
      }
    }
  }
  function replaceGame(payload,updateUrl=true){
    if(!payload||payload.ok!==true||typeof payload.html!=='string')throw Error('Invalid game response. Refresh the game before retrying.');
    const root=document.querySelector('.arcade-root');
    if(!root)throw Error('Game is no longer open.');
    const template=document.createElement('template');
    template.innerHTML=payload.html.trim();
    const updated=template.content.querySelector('.arcade-root');
    if(!updated)throw Error('Unable to update this game. Refresh before retrying.');
    const remembered=choices(root);
    crashCleanup();
    root.replaceWith(updated);
    restoreChoices(updated,remembered);
    highlightQueued(updated);
    if(updateUrl&&payload.url){
      const target=new URL(payload.url,location.origin);
      if(target.origin===location.origin&&target.pathname.startsWith('/arcade/')){
        history.replaceState(history.state,'',target.pathname+target.search);
      }
    }
    mount(updated);
    if(payload.notice)announce(payload.notice);
  }
  function parseResponse(response){
    if(response.type==='opaqueredirect'||response.status>=300&&response.status<400)
      throw Error('Your login needs refreshing. Open Arcade again.');
    return response.json().catch(()=>{throw Error('The server returned an unexpected response. Refresh this game.');});
  }
  const tileReveal=form=>form.action.includes('/arcade/mines/')&&form.action.endsWith('/reveal');

  function queueTile(form){
    if(queued.length>=10)return;
    const tile=form.querySelector('input[name=tile]')?.value||'';
    const path=new URL(form.action,location.href).pathname;
    if(!/^[0-9]{1,2}$/.test(tile)||queued.some(x=>x.tile===tile&&x.path===path))return;
    queued.push({tile,path});
    form.querySelector('button')?.classList.add('arcade-tile-pending');
  }
  function nextTile(){
    while(queued.length){
      const {tile,path}=queued.shift();
      const root=document.querySelector('.arcade-root');
      const input=[...root?.querySelectorAll('.arcade-mine-grid input[name=tile]')||[]]
        .find(x=>x.value===tile&&new URL(x.form.action).pathname===path);
      if(input&&!input.form.querySelector('button')?.disabled){
        void submitGame(input.form,input.form.querySelector('button'));
        return;
      }
    }
  }
  async function submitGame(form,button){
    if(busy)return;
    busy=true;
    const root=form.closest('.arcade-root');
    const mine=tileReveal(form);
    const grid=mine?form.closest('.arcade-mine-grid'):null;
    const originalText=button?.textContent;
    const data=new FormData(form);
    if(button?.name)data.append(button.name,button.value);
    if(button){
      button.disabled=true;
      button.classList.add(mine?'arcade-tile-pending':'arcade-action-pending');
      button.setAttribute('aria-busy','true');
    }
    if(grid)grid.setAttribute('aria-busy','true');
    let succeeded=false;
    try{
      const response=await fetch(form.action,{
        method:'POST',credentials:'same-origin',cache:'no-store',redirect:'manual',
        headers:ajaxHeaders,body:new URLSearchParams(data)
      });
      const payload=await parseResponse(response);
      if(!response.ok)throw Error(payload?.error||'Move was not accepted. Please retry.');
      if(payload?.ok!==true)throw Error(payload?.error||'Unable to confirm your game result.');
      replaceGame(payload);
      succeeded=true;
    }catch(error){
      const stillOpen=!!document.querySelector('.arcade-root');
      if(stillOpen){
        announce(error?.message||'Unable to confirm this move. Refresh the game to check your balance.',true);
      }
      queued.length=0; // Never replay a wager after an ambiguous network failure.
    }finally{
      if(button&&button.isConnected){
        button.disabled=false;
        button.classList.remove('arcade-tile-pending','arcade-action-pending');
        button.removeAttribute('aria-busy');
        if(originalText!==null)button.textContent=originalText;
      }
      if(grid?.isConnected)grid.removeAttribute('aria-busy');
      busy=false;
      if(succeeded&&queued.length)queueMicrotask(nextTile);
    }
  }

  // Only Arcade actions are intercepted. Other website forms keep their normal behavior.
  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||!form.closest('.arcade-root')||form.method.toLowerCase()!=='post')return;
    event.preventDefault();
    if(!form.reportValidity())return;
    const button=event.submitter||form.querySelector('button[type=submit]');
    if(busy){if(tileReveal(form))queueTile(form);return;}
    void submitGame(form,button);
  });

  function mount(root){
    if(!reducedMotion){
      const stage=root.querySelector('[data-coin-stage][data-coin-result]:not([data-coin-result=""])');
      stage?.querySelector('.arcade-coin-disc')?.classList.add('animated');
      for(const reel of root.querySelectorAll('[data-slot-reels] .arcade-reel'))reel.classList.add('animated');
    }
    const game=root.querySelector('[data-crash-game]');
    if(!game){crashCleanup=()=>{};return;}
    const multiplier=game.querySelector('[data-crash-multiplier]');
    const message=game.querySelector('[data-crash-message]');
    const collect=game.querySelector('[data-crash-collect]');
    let offset=0,state=null,inRequest=false,finished=false,ended=false;
    let animation=null,polling=null;
    const displayCrash=(value)=>{if(multiplier)multiplier.textContent=symbols(value);};
    function paint(){
      if(!game.isConnected||state?.round?.status!=='active')return;
      const clock=Date.now()+offset,start=state.round.startedAt;
      if(clock<start){
        displayCrash(1);
        if(message)message.textContent='Starting in '+Math.max(1,Math.ceil((start-clock)/1000))+'…';
        if(collect)collect.disabled=true;
      }else{
        displayCrash(Math.min(30,Math.exp((clock-start)/5000)));
        if(message)message.textContent='Collect points before the crash';
        if(collect&&!busy)collect.disabled=false;
      }
    }
    async function loadFinished(){
      if(finished||busy||ended||!game.isConnected)return;
      finished=true;
      try{
        const response=await fetch('/arcade/api/crash/fragment',{
          headers:ajaxHeaders,credentials:'same-origin',redirect:'manual',cache:'no-store'
        });
        const payload=await parseResponse(response);
        if(!response.ok||payload?.ok!==true)throw Error(payload?.error||'Failed to load the round result.');
        if(game.isConnected&&!busy)replaceGame(payload,false);
      }catch{
        finished=false; // Poll again if a result request momentarily fails.
      }
    }
    async function refresh(){
      if(ended||inRequest||busy||document.visibilityState==='hidden'||!game.isConnected)return;
      inRequest=true;
      try{
        const response=await fetch('/arcade/api/crash/state',{
          credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}
        });
        if(!response.ok)throw Error('Unable to refresh round.');
        const data=await response.json();
        if(!data||!('round' in data)||!game.isConnected)return;
        offset=Number(data.serverNow||Date.now())-Date.now();
        state=data;
        if(data.round?.status==='active'){paint();return;}
        if(data.round?.status==='lost'){
          game.querySelector('.arcade-crash-display')?.classList.add('crashed');
          displayCrash((data.round.crashAt||100)/100);
          if(message)message.textContent='Crashed!';
        }else if(data.round?.status==='cashed_out'){
          displayCrash((data.round.cashAt||100)/100);
          if(message)message.textContent='Points collected!';
        }
        if(game.dataset.crashActive==='1')void loadFinished();
      }catch{
        if(message&&state?.round?.status==='active')message.textContent='Checking the round with the server…';
      }finally{inRequest=false;}
    }
    const onVisibility=()=>{if(document.visibilityState==='visible')void refresh();};
    const onPageHide=()=>crashCleanup();
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',onPageHide,{once:true});
    crashCleanup=()=>{
      ended=true;
      if(animation!==null)clearInterval(animation);
      if(polling!==null)clearInterval(polling);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',onPageHide);
    };
    void refresh();
    if(game.dataset.crashActive==='1'){
      animation=setInterval(paint,80);
      polling=setInterval(refresh,650);
    }
  }
  mount(document.querySelector('.arcade-root'));
})();
