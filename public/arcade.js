// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Smooth arcade interactions. Outcomes and wallet movements are exclusively server-authoritative.
(() => {
  if(!document.querySelector('.arcade-root'))return;

  // // BUILT BY SB // RUNING ON WEED AND CAFFEINE
  // The server remembers completed wagers across devices. A more recent,
  // unsubmitted change is saved in this signed-in browser only.
  const memberId=document.body.dataset.siteUser||'';
  const wagerGames=new Set(['coinflip','slots','mines','crash','blackjack','crash_online','plinko','blackjack_solo']);
  const wagerKey=field=>memberId&&wagerGames.has(field?.dataset.arcadeWager)
    ?'sb-store:arcade:wager:'+memberId+':'+field.dataset.arcadeWager:null;
  function rememberWager(field){
    const key=wagerKey(field);
    if(!key||!/^\d+$/.test(field.value))return;
    const wager=Number(field.value);
    if(!Number.isSafeInteger(wager)||wager<10||wager>1000)return;
    try{localStorage.setItem(key,JSON.stringify({wager,at:Date.now()}));}catch{}
  }
  // // BUILT BY SB // RUNING ON WEED AND CAFFEINE
  // Keep Crash auto-collect separate from wagers and sync the last submitted
  // value from the server's persisted round. Blank explicitly means disabled.
  const autoCollectKey=memberId?'sb-store:arcade:auto-collect:'+memberId:null;
  function validAutoCollect(value){
    return value===''||(/^\d{1,2}(?:\.\d{1,2})?$/.test(value)&&Number(value)>=1.10&&Number(value)<=20);
  }
  function rememberAutoCollect(field){
    if(!autoCollectKey||!field||!validAutoCollect(field.value))return;
    try{localStorage.setItem(autoCollectKey,JSON.stringify({value:field.value,at:Date.now()}));}catch{}
  }
  function hydrateAutoCollect(root){
    if(!autoCollectKey)return;
    const field=root.querySelector('input[data-arcade-auto-collect]');
    if(!field)return;
    try{
      const cached=JSON.parse(localStorage.getItem(autoCollectKey)||'null');
      const lastRoundAt=Number(field.dataset.lastRoundAt||0);
      if(!cached||!Number.isFinite(cached.at)||cached.at<lastRoundAt||!validAutoCollect(cached.value))return;
      field.value=cached.value;
    }catch{}
  }
  function hydrateWagers(root){
    if(!memberId)return;
    for(const field of root.querySelectorAll('input[data-arcade-wager]')){
      const key=wagerKey(field);
      if(!key)continue;
      try{
        const cached=JSON.parse(localStorage.getItem(key)||'null');
        const roundAt=Number(field.dataset.lastRoundAt||0);
        if(!cached||!Number.isSafeInteger(cached.wager)||cached.wager<10||cached.wager>1000||
           !Number.isFinite(cached.at)||cached.at<roundAt)continue;
        field.value=String(cached.wager);
      }catch{}
    }
  }
  for(const type of ['input','change']){
    document.addEventListener(type,event=>{
      const field=event.target;
      if(!(field instanceof HTMLInputElement))return;
      if(field.matches('.arcade-root input[data-arcade-wager]'))rememberWager(field);
      if(field.matches('.arcade-root input[data-arcade-auto-collect]'))rememberAutoCollect(field);
    });
  }

  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const csrf=()=>document.body.dataset.siteCsrf||'';
  const ajaxHeaders={'accept':'application/json','x-arcade-async':'1'};
  const symbols=(value)=>Math.max(1,Number(value)||1).toFixed(2)+'×';
  const queued=[];
  let busy=false,crashCleanup=()=>{};

  // Spin the visible reel strips immediately, then stop sequentially on the
  // three symbols confirmed by the server. These animations never choose rewards.
  const reelFaces=['🍒','🍋','🔔','💎','7️⃣'];
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function beginSlotSpin(){
    if(reducedMotion)return {stop(){}};
    const reels=[...document.querySelectorAll('.arcade-root [data-slot-reels] .arcade-reel')];
    const tracks=[];
    for(const reel of reels){
      const windowNode=reel.querySelector('.arcade-reel-window');
      if(!windowNode)continue;
      const track=document.createElement('div');
      track.className='arcade-reel-track';
      const loop=Array.from({length:5},()=>reelFaces[Math.floor(Math.random()*reelFaces.length)]);
      track.innerHTML=[...loop,...loop].map(symbol=>'<span>'+symbol+'</span>').join('');
      windowNode.replaceChildren(track);
      reel.classList.add('spinning');
      track.style.animation='arcade-reel-running .46s linear infinite';
      tracks.push({reel,track});
    }
    return {tracks,stop(){
      for(const {reel,track} of tracks){
        track.style.animation='';
        reel.classList.remove('spinning');
        if(reel.isConnected){
          const initial=reel.dataset.symbol;
          const face=document.createElement('div');face.className='arcade-reel-face';
          face.textContent=({Cherry:'🍒',Lemon:'🍋',Bell:'🔔',Diamond:'💎',Seven:'7️⃣'})[initial]||'❔';
          reel.querySelector('.arcade-reel-window')?.replaceChildren(face);
        }
      }
    }};
  }
  async function finishSlotSpin(spin,payload){
    if(!spin?.tracks?.length)return;
    const template=document.createElement('template');
    template.innerHTML=payload.html;
    const finalReels=[...template.content.querySelectorAll('[data-slot-reels] .arcade-reel')];
    const target=finalReels.map(x=>x.querySelector('.arcade-reel-face')?.textContent||'❔');
    if(target.length!==spin.tracks.length)throw Error('Invalid reel result.');
    const stops=spin.tracks.map(async({reel,track},i)=>{
      const delay=160*i;await sleep(delay);
      if(!reel.isConnected)return;
      const windowNode=reel.querySelector('.arcade-reel-window');
      if(!windowNode)return;
      track.style.animation='';
      const symbols=Array.from({length:13},()=>reelFaces[Math.floor(Math.random()*reelFaces.length)]);
      symbols.push(target[i]);
      track.innerHTML=symbols.map(x=>'<span>'+x+'</span>').join('');
      track.style.transform='translate3d(0,0,0)';
      const duration=440+i*130;
      const height=windowNode.clientHeight||120;
      if(typeof track.animate==='function'){
        const motion=track.animate(
          [{transform:'translate3d(0,0,0)'},{transform:'translate3d(0,-'+(13*height)+'px,0)'}],
          {duration,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
        await motion.finished.catch(()=>{});
        motion.cancel();
      }else await sleep(duration);
      if(!reel.isConnected)return;
      const face=document.createElement('div');
      face.className='arcade-reel-face';face.textContent=target[i];
      windowNode.replaceChildren(face);
      reel.classList.remove('spinning');reel.classList.add('stopped');
    });
    await Promise.all(stops);
    await sleep(130);
  }


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
    const slotSpin=form.action.endsWith('/arcade/slots/spin')?beginSlotSpin():null;
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
      if(slotSpin)await finishSlotSpin(slotSpin,payload);
      replaceGame(payload);
      succeeded=true;
    }catch(error){
      const stillOpen=!!document.querySelector('.arcade-root');
      if(stillOpen){
        announce(error?.message||'Unable to confirm this move. Refresh the game to check your balance.',true);
      }
      slotSpin?.stop();
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
    if(!(form instanceof HTMLFormElement)||(form.matches('[data-blackjack-form],[data-plinko-form],[data-roulette-form],[data-sbj-form]')||form.closest('[data-global-crash-root]'))||!form.closest('.arcade-root')||form.method.toLowerCase()!=='post')return;
    event.preventDefault();
    if(!form.reportValidity())return;
    const wager=form.querySelector('input[data-arcade-wager]');
    if(wager)rememberWager(wager);
    const autoCollect=form.querySelector('input[data-arcade-auto-collect]');
    if(autoCollect)rememberAutoCollect(autoCollect);
    const button=event.submitter||form.querySelector('button[type=submit]');
    if(busy){if(tileReveal(form))queueTile(form);return;}
    void submitGame(form,button);
  });

  function mount(root){
    hydrateWagers(root);
    hydrateAutoCollect(root);
    if(!reducedMotion){
      const stage=root.querySelector('[data-coin-stage][data-coin-result]:not([data-coin-result=""])');
      stage?.querySelector('.arcade-coin-disc')?.classList.add('animated');
      // Reels move when the player spins, rather than when old results are loaded.
    }
    const game=root.querySelector('[data-crash-game]');
    if(!game){crashCleanup=()=>{};return;}
    const chartPath=game.querySelector('[data-crash-chart-line]');
    const rocket=game.querySelector('[data-crash-rocket]');
    const flightStage=game.querySelector('.arcade-crash-display');
    // Logarithmic visual scale makes the rocket gain altitude alongside the
    // server multiplier. No crash point is needed or exposed before settlement.
    function flightPoint(value){
      const fraction=Math.min(1,Math.max(0,Math.log(Math.max(1,value))/Math.log(30)));
      return {x:28+640*fraction,y:232-184*Math.pow(fraction,1.1)};
    }
    function drawRocket(value){
      if(!chartPath||!rocket||!flightStage)return;
      const end=flightPoint(value);
      const count=36;
      const points=Array.from({length:count+1},(_,i)=>{
        const t=i/count,curve=1+(Math.max(1,value)-1)*t;
        return flightPoint(curve);
      });
      chartPath.setAttribute('d',points.map((pt,i)=>(i?'L ':'M ')+pt.x.toFixed(2)+' '+pt.y.toFixed(2)).join(' '));
      const width=flightStage.clientWidth||700,height=flightStage.clientHeight||260;
      rocket.style.transform='translate3d('+((end.x/700)*width-21)+'px,'+((end.y/260)*height-21)+'px,0) rotate(35deg)';
    }
    if(game.dataset.crashReplay==='1' && game.dataset.crashActive!=='1'){
      drawRocket(1);
      crashCleanup=()=>{};
      return;
    }
    const multiplier=game.querySelector('[data-crash-multiplier]');
    const message=game.querySelector('[data-crash-message]');
    const collect=game.querySelector('[data-crash-collect]');
    if(game.dataset.crashActive==='1'&&collect)collect.disabled=true;
    let offset=0,state=null,inRequest=false,finished=false,ended=false;
    let animation=null,polling=null;
    const displayCrash=(value)=>{if(multiplier)multiplier.textContent=symbols(value);};
    function paint(){
      if(!game.isConnected||state?.round?.status!=='active')return;
      const clock=Date.now()+offset,start=state.round.startedAt;
      if(clock<start){
        displayCrash(1);drawRocket(1);
        flightStage?.classList.remove('inflight');
        if(message)message.textContent='Starting in '+Math.max(1,Math.ceil((start-clock)/1000))+'…';
        if(collect)collect.disabled=true;
      }else{
        const speed=Math.min(30,Math.exp((clock-start)/5000));
        displayCrash(speed);drawRocket(speed);
        flightStage?.classList.add('inflight');
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
        else finished=false;
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
          flightStage?.classList.remove('inflight');
          flightStage?.classList.add('crashed');
          drawRocket((data.round.crashAt||100)/100);
          displayCrash((data.round.crashAt||100)/100);
          if(message)message.textContent='Crashed!';
        }else if(data.round?.status==='cashed_out'){
          flightStage?.classList.remove('inflight');
          flightStage?.classList.add('collected');
          drawRocket((data.round.cashAt||100)/100);
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
      if(animation!==null)cancelAnimationFrame(animation);
      if(polling!==null)clearInterval(polling);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',onPageHide);
    };
    const terminal=game.dataset.crashOutcome;
    if(terminal){
      const finalValue=Number(game.dataset.crashFinal||1);
      drawRocket(finalValue);
      flightStage?.classList.toggle('collected',terminal==='cashed_out');
      flightStage?.classList.toggle('crashed',terminal==='lost');
    }else drawRocket(1);
    void refresh();
    if(game.dataset.crashActive==='1'){
      const frame=()=>{if(ended)return;paint();animation=requestAnimationFrame(frame);};
      animation=requestAnimationFrame(frame);
      polling=setInterval(refresh,650);
    }
  }
  mount(document.querySelector('.arcade-root'));
})();
