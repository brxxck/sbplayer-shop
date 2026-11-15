// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// One shared Crash timeline: client renders confirmed server state and never
// chooses outcomes, pays wallets, predicts the secret crash point or retries bets.
(() => {
 const root=document.querySelector('[data-global-crash-root]');
 if(!root)return;
 const userId=document.body.dataset.siteUser||'',csrf=document.body.dataset.siteCsrf||'';
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>Number(v||0).toLocaleString('en-GB');
 const multiplier=cents=>(Number(cents||100)/100).toFixed(2)+'×';
 const experience=()=>window.SBArcadeExperience;
 const stateUrl='/arcade/online/crash/state';
 const wagerKey='sb-store:arcade:wager:'+userId+':crash_online';
 const autoKey='sb-store:arcade:auto-collect:'+userId+':crash_online';
 const board=root.querySelector('[data-gcr-gameboard]'),display=root.querySelector('[data-gcr-multiplier]');
 const countdown=root.querySelector('[data-gcr-countdown]'),connection=root.querySelector('[data-gcr-connection]');
 const flight=root.querySelector('[data-gcr-path]'),fill=root.querySelector('[data-gcr-fill]');
 const rocket=root.querySelector('[data-gcr-rocket]'),controls=root.querySelector('[data-gcr-controls]');
 const players=root.querySelector('[data-gcr-players]'),recent=root.querySelector('[data-gcr-history]');
 const fair=root.querySelector('[data-gcr-commitment]'),fairNote=root.querySelector('[data-gcr-fairness-note]');
 const stat=(name,value)=>{const e=root.querySelector('[data-gcr-stat="'+name+'"]');if(e)e.textContent=value;};
 const power=elapsedMs=>{
  const d=Math.max(0,Number(elapsedMs)||0);
  return Math.min(10000,Math.floor(100*Math.exp(.12*Math.max(0,d)/1000)+1e-9)));
 };
 let model=null,clockOffset=0,active=true,busy=false,polling=false,heartbeatBusy=false;
 let revision='',displayCents=100,raf=0,lastFrame=0,notice=null,verificationRound=null;
 let draftWager=null,draftAuto=null,draftTime=0;
 for(const [key,prop] of [[wagerKey,'wager'],[autoKey,'auto']]){
  try{
   const value=JSON.parse(localStorage.getItem(key)||'null');
   if(!value||!Number.isFinite(value.at))continue;
   if(prop==='wager'&&Number.isSafeInteger(value.value)&&value.value>=10&&value.value<=1000){
    draftWager=value.value;draftTime=Math.max(draftTime,value.at);
   }
   if(prop==='auto'&&(value.value===''||(/^\d{1,2}(?:\.\d{1,2})?$/.test(String(value.value))&&Number(value.value)>=1.10&&Number(value.value)<=20))){
    draftAuto=String(value.value);draftTime=Math.max(draftTime,value.at);
   }
  }catch{}
 }
 function store(key,value){
  try{localStorage.setItem(key,JSON.stringify({value,at:Date.now()}));}catch{}
 }
 function rememberDraft(){
  const wager=controls.querySelector('[data-gcr-wager]');
  if(wager&&/^\d+$/.test(wager.value)){
   const amount=Number(wager.value);
   if(Number.isSafeInteger(amount)&&amount>=10&&amount<=1000)draftWager=amount;
  }
  const auto=controls.querySelector('[data-gcr-auto]');
  if(auto){
   const value=auto.value.trim();
   if(value===''||(/^\d{1,2}(?:\.\d{1,2})?$/.test(value)&&Number(value)>=1.10&&Number(value)<=20))
    draftAuto=value;
  }
 }
 function rememberInput(el){
  if(el.matches('[data-gcr-wager]')){
   const amount=Number(el.value);
   if(/^\d+$/.test(el.value)&&Number.isSafeInteger(amount)&&amount>=10&&amount<=1000){
    draftWager=amount;draftTime=Date.now();store(wagerKey,amount);
   }
  }
  if(el.matches('[data-gcr-auto]')){
   const value=el.value.trim();
   if(value===''||(/^\d{1,2}(?:\.\d{1,2})?$/.test(value)&&Number(value)>=1.10&&Number(value)<=20)){
    draftAuto=value;draftTime=Date.now();store(autoKey,value);
   }
  }
 }
 function feedback(text,ms=5500){notice={text,until:Date.now()+ms};}
 function message(){
  if(notice&&notice.until>Date.now())return notice.text;
  if(!model.joined)return 'Join the Global Crash lobby to take part in the next betting window.';
  if(model.phase==='betting')return model.me?
   'Wager confirmed. Waiting for the next launch.':
   'Place your wager before betting closes.';
  if(model.phase==='playing')return model.me?.status==='active'?
   'Your wager is live. Cash out before the rocket crashes.':
   model.me?.status==='cashed_out'?'Points collected successfully!':
   'The round is in flight. Watch the rocket or wait for the next round.';
  if(model.phase==='settled')return model.me?.status==='lost'?
   'The rocket crashed before you collected.':'The round ended. A new betting window opens automatically.';
  return 'Waiting for the next round.';
 }
 function controlsMarkup(){
  const m=model,me=m.me;
  const preferenceFresh=draftTime>Number(m.lastBetAt||0);
  const betValue=preferenceFresh&&draftWager!==null?draftWager:Math.max(10,Math.min(1000,Number(m.lastWager)||50));
  const autoValue=preferenceFresh&&draftAuto!==null?draftAuto:
    m.lastAutoAt?(Number(m.lastAutoAt)/100).toFixed(2):'';
  const stake=m.canBet?
   '<form method="post" action="/arcade/online/crash/bet" data-gcr-form data-gcr-bet class="gcr-bet-form">'+
   '<div class="gcr-bet-inputs"><label>Wager in points <input type="number" min="10" max="1000" step="1" name="wager" data-gcr-wager value="'+safe(betValue)+'" required></label>'+
   '<label>Auto-collect (optional) <input type="number" min="1.10" max="20" step="0.01" name="auto_at" data-gcr-auto placeholder="Off" value="'+safe(autoValue)+'"></label></div>'+
   '<div class="gcr-quick-wagers">'+[10,50,100,500,1000].map(w=>'<button type="button" data-gcr-quick="'+w+'">'+fmt(w)+'</button>').join('')+'</div>'+
   '<button type="submit" class="btn btn-primary gcr-submit" '+(m.balance<10?'disabled':'')+'>🚀 Place wager</button></form>':'';
  const cash=m.canCashout?
   '<form method="post" action="/arcade/online/crash/collect" data-gcr-form data-gcr-collect>'+
   '<button type="submit" class="btn btn-primary gcr-cashout">💰 CASH OUT</button></form>':'';
  const join=!m.joined?
   '<form method="post" class="gcr-join-form" action="/arcade/online/join">'+
   '<input type="hidden" name="_csrf" value="'+safe(csrf)+'"><input type="hidden" name="game" value="crash">'+
   '<input type="hidden" name="next" value="crash"><button class="btn btn-primary" type="submit">🚀 Join Global Crash</button></form>':'';
  const profit=me?'<div class="gcr-bet-receipt"><div><span>YOUR WAGER</span><strong>'+fmt(me.wager)+' pts</strong></div>'+
   '<div><span>YOUR PROFIT</span><strong class="'+(me.profit<0?'gcr-loss':'gcr-profit')+'" data-gcr-profit>'+
   (me.profit!==null?(me.profit>=0?'+':'')+fmt(me.profit)+' pts':
    me.currentProfit!==null?(me.currentProfit>=0?'+':'')+fmt(me.currentProfit)+' pts':'Pending')+
   '</strong></div></div>':'';
  const marker=me?.cinematic?
   '<span hidden data-arcade-bigwin="1" data-arcade-round="global-crash:'+m.roundId+
   '" data-arcade-profit="'+(me.payout-me.wager)+'" data-arcade-settled="'+me.cashedAt+'"></span>':'';
  return '<div class="gcr-control-title"><h2>Play Global Crash</h2><span>'+safe(m.phase)+'</span></div>'+
   '<p class="gcr-player-message" data-gcr-message>'+safe(message())+'</p>'+
   join+stake+cash+profit+
   '<div class="gcr-wallet"><span>YOUR BALANCE</span><strong>'+fmt(m.balance)+' pts</strong></div>'+marker;
 }
 function renderParticipants(){
  players.innerHTML=model.players.length?model.players.map(p=>
   '<div class="gcr-player-row"><span class="gcr-player-name">'+safe(p.name)+'</span>'+
   '<strong>'+fmt(p.wager)+' pts</strong><span class="gcr-player-status '+(p.status==='cashed_out'?'collected':p.status==='lost'?'lost':'active')+'">'+
   (p.status==='cashed_out'?'✓ '+multiplier(p.cashAt):p.status==='lost'?'Lost':'Playing')+'</span></div>').join(''):
   '<p class="gcr-empty">No wagers yet. Be the first to join this round.</p>';
 }
 function renderRecent(){
  recent.innerHTML=(model.recent||[]).map(item=>
   '<div class="gcr-history-chip '+(item.crashAt<200?'gcr-history-low':item.crashAt>=1000?'gcr-history-high':'')+
   '" title="Round #'+safe(item.roundId)+'">'+multiplier(item.crashAt)+'</div>').join('')||
   '<span class="muted">No completed rounds yet</span>';
 }
 async function verifyResult(seed,roundId,commitment,expected){
  if(!crypto.subtle||!seed||!/^[0-9a-f]{64}$/.test(seed))return;
  try{
   const bytes=new Uint8Array(seed.match(/../g).map(x=>parseInt(x,16)));
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
   const hex=[...hash].map(b=>b.toString(16).padStart(2,'0')).join('');
   if(hex!==commitment)throw Error('Seed commitment mismatch');
   const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode('sb-global-crash:'+roundId)));
   let roll=0;for(let i=0;i<6;i++)roll=roll*256+signed[i];
   const crash=Math.max(100,Math.min(10000,Math.floor(96/((roll+1)/(281474976710656+1)))));
   if(crash!==expected)throw Error('Multiplier did not match commitment');
   if(model?.roundId===roundId)fairNote.textContent='✓ Verified — SHA-256 commitment and revealed seed match the crash.';
  }catch{
   if(model?.roundId===roundId)fairNote.textContent='⚠ Unable to verify this round result.';
  }
 }
 function apply(snapshot){
  if(!snapshot||typeof snapshot!=='object'||!Number.isInteger(snapshot.roundId))throw Error('Invalid global round state.');
  if(model&&snapshot.roundId<model.roundId)return;
  if(model&&snapshot.roundId===model.roundId&&snapshot.seq<model.seq)return;
  // A delayed poll should never undo a confirmed collection or replacement round.
  const prior=model,priorRevision=revision;
  const priorMe=prior?.me?.status;
  const oldRound=prior?.roundId;
  rememberDraft();
  model=snapshot;clockOffset=Number(snapshot.serverTime)-Date.now();
  revision=snapshot.roundId+':'+snapshot.phase+':'+snapshot.seq+':'+snapshot.balance+':'+snapshot.me?.status;
  if(connection)connection.textContent='● Connected · Shared round #'+snapshot.roundId;
  board.dataset.gcrPhase=snapshot.phase;
  root.querySelector('[data-gcr-round]').textContent='#'+fmt(snapshot.roundId);
  stat('players',fmt(snapshot.roundPlayers));
  stat('wager',fmt(snapshot.roundWager)+' pts');
  stat('active',fmt(snapshot.activePlayers));
  stat('collected',fmt(snapshot.collectedPlayers));
  root.querySelector('[data-gcr-lobby]').textContent=fmt(snapshot.lobbyPlayers)+' in lobby';
  root.querySelector('[data-gcr-header-wallet]').textContent=fmt(snapshot.balance)+' ✦';
  if(revision!==priorRevision){
   controls.innerHTML=controlsMarkup();
   renderParticipants();
   renderRecent();
  }
  if(fair){
   fair.textContent=snapshot.commitment||'—';
   const seedField=root.querySelector('[data-gcr-seed]');
   const seedLabel=root.querySelector('[data-gcr-seed-label]');
   if(seedField&&seedLabel){
    seedField.hidden=!snapshot.seed;
    seedLabel.hidden=!snapshot.seed;
    if(snapshot.seed)seedField.textContent=snapshot.seed;
    else seedField.textContent='';
   }
   if(snapshot.seed&&verificationRound!==snapshot.roundId){
    verificationRound=snapshot.roundId;
    if(crypto?.subtle){
     fairNote.textContent='Checking the revealed seed and committed crash value…';
     void verifyResult(snapshot.seed,snapshot.roundId,snapshot.commitment,snapshot.crashAt);
    }else fairNote.textContent='Seed revealed. Verification requires a secure browser.';
   }else if(!snapshot.seed){
    fairNote.textContent='Pre-round SHA-256 commitment. Hidden seed is revealed after the crash.';
   }
  }
  if(prior){
   if(oldRound!==snapshot.roundId){experience()?.play('countdown');feedback('New round — place your wager before launch.',2000);}
   else if(prior.phase!==snapshot.phase){
    if(snapshot.phase==='playing')experience()?.play('launch');
    else if(snapshot.phase==='settled')experience()?.play('crash');
   }
   if(priorMe!=='cashed_out'&&snapshot.me?.status==='cashed_out')experience()?.play('cashout');
   if(!prior.me&&snapshot.me&&snapshot.phase==='betting')experience()?.play('chip');
  }
 }
 function drawFrame(now){
  if(!active)return;
  const reduced=experience()?.getPreferences?.()?.motion!=='full'||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(model){
   if(reduced&&now-lastFrame<70){raf=requestAnimationFrame(drawFrame);return;}
   lastFrame=now;
   let cents=Number(model.multiplierCents||100);
   if(model.phase==='playing'&&model.flightStartedAt){
    // Predict only a very short interval beyond the latest confirmed snapshot.
    // The actual unknown crash point is never sent to the browser.
    const time=Math.min(Date.now()+clockOffset,Number(model.serverTime)+650);
    cents=power(time-model.flightStartedAt);
   }
   if(model.phase==='settled')cents=Number(model.crashAt||100);
   if(model.phase==='betting')cents=100;
   displayCents=cents;
   display.textContent=multiplier(cents);
   const fraction=Math.min(1,Math.max(0,Math.log(Math.max(1,cents/100))/Math.log(22)));
   const endX=34+720*fraction,endY=280-218*Math.pow(fraction,.86);
   const count=32;
   const points=Array.from({length:count+1},(_,i)=>{
    const t=fraction*i/count;
    return [34+720*t,280-218*Math.pow(t,.86)];
   });
   const path=points.map((pt,i)=>(i?'L ':'M ')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)).join(' ');
   flight.setAttribute('d',path);
   fill.setAttribute('d',path+' L '+endX.toFixed(1)+' 292 L 34 292 Z');
   const stage=board.getBoundingClientRect();
   rocket.style.transform='translate3d('+((endX/800)*(stage.width||800)-22)+'px,'+
    ((endY/330)*(stage.height||330)-23)+'px,0) rotate(25deg)';
   const nowServer=Date.now()+clockOffset;
   const until=model.phase==='betting'?model.startsAt:model.phase==='settled'?model.endsAt+5000:null;
   const seconds=until?Math.max(0,Math.ceil((until-nowServer)/1000)):0;
   countdown.textContent=model.phase==='betting'?'BETS CLOSE IN '+seconds+'s':
    model.phase==='playing'?'CASH OUT BEFORE THE CRASH!':
    model.phase==='settled'?'CRASHED · NEXT ROUND IN '+seconds+'s':'Connecting…';
   if(model.me?.status==='active'&&model.phase==='playing'){
    const profit=root.querySelector('[data-gcr-profit]');
    if(profit)profit.textContent=(Math.floor(model.me.wager*cents/100)-model.me.wager>=0?'+':'')+
     fmt(Math.floor(model.me.wager*cents/100)-model.me.wager)+' pts';
   }
  }
  raf=requestAnimationFrame(drawFrame);
 }
 async function poll(){
  if(!active||polling||document.visibilityState==='hidden')return;
  polling=true;
  try{
   const response=await fetch(stateUrl,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Live connection failed.');
   apply(await response.json());
  }catch{
   if(connection)connection.textContent='Reconnecting to the shared game…';
  }finally{polling=false;}
 }
 async function heartbeat(){
  if(!active||!model?.joined||heartbeatBusy||document.visibilityState==='hidden')return;
  heartbeatBusy=true;
  try{
   await fetch('/arcade/online/heartbeat',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({_csrf:csrf})});
  }finally{heartbeatBusy=false;}
 }
 async function submit(form){
  if(busy||!model)return;
  if(!form.reportValidity())return;
  const isBet=form.hasAttribute('data-gcr-bet');
  if(isBet&&!model.canBet||!isBet&&!model.canCashout)return;
  rememberDraft();
  const data=new URLSearchParams({_csrf:csrf,request_id:crypto.randomUUID(),round_id:String(model.roundId)});
  if(isBet){
   const wager=form.querySelector('[data-gcr-wager]');
   const auto=form.querySelector('[data-gcr-auto]');
   data.set('wager',wager.value);data.set('auto_at',auto.value);
   rememberInput(wager);rememberInput(auto);
  }
  busy=true;for(const button of controls.querySelectorAll('button'))button.disabled=true;
  try{
   const response=await fetch(form.action,{method:'POST',credentials:'same-origin',
    cache:'no-store',redirect:'manual',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:data});
   const payload=await response.json();
   if(!response.ok)throw Error(payload?.error||'The action was not accepted.');
   apply(payload);
   feedback(isBet?'Your wager is in the shared round.':'Cash-out confirmed. Your points were credited.',2500);
  }catch(error){
   feedback(error?.message||'Unable to confirm this action. Check the updated game state.',6000);
  }finally{
   busy=false;await poll();
   if(model){const msg=controls.querySelector('[data-gcr-message]');if(msg)msg.textContent=message();}
  }
 }
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||!root.contains(form)||!form.matches('[data-gcr-form]'))return;
  event.preventDefault();
  if(busy)return;
  void submit(form);
 });
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-gcr-quick]');
  if(!button||!root.contains(button))return;
  const field=controls.querySelector('[data-gcr-wager]');
  if(!field)return;
  field.value=button.dataset.gcrQuick;rememberInput(field);experience()?.play('click');
 });
 document.addEventListener('input',event=>{
  if(event.target.matches?.('[data-gcr-wager],[data-gcr-auto]'))rememberInput(event.target);
 });
 const pollId=setInterval(()=>{void poll();},3500);
 // The existing website SSE stream triggers prompt refreshes on table changes.
 window.addEventListener('sb:global-crash',()=>{if(document.visibilityState==='visible')void poll();});
 const beatId=setInterval(()=>{void heartbeat();},20000);
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){void heartbeat();void poll();}
 });
 window.addEventListener('pagehide',()=>{
  active=false;clearInterval(pollId);clearInterval(beatId);
  if(raf)cancelAnimationFrame(raf);
 });
 raf=requestAnimationFrame(drawFrame);
 void poll();
})();
