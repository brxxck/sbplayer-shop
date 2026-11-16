// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Solo Blackjack cards and controls display only persisted server decisions.
// Never draw random cards, determine a payout, or move wallet points in the browser.
(() => {
 const root=document.querySelector('[data-solo-blackjack-root]');
 if(!root)return;
 const userId=document.body.dataset.siteUser||'';
 const wagerKey='sb-store:arcade:wager:'+userId+':blackjack_solo';
 const format=n=>Number(n||0).toLocaleString('en-GB');
 const experience=()=>window.SBArcadeExperience;
 const csrf=document.body.dataset.siteCsrf||'';
 const table=root.querySelector('[data-sbj-table]');
 const controls=root.querySelector('[data-sbj-controls]');
 const connection=root.querySelector('[data-sbj-connection]');
 const initial=(()=>{
  try{return JSON.parse(root.dataset.sbjState||'null');}catch{return null;}
 })();
 let model=initial,busy=false,active=true,noticeTimeout=null,cinemaTimeout=null;
 function lastLocalWager(){
  if(!userId)return null;
  try{
   const saved=JSON.parse(localStorage.getItem(wagerKey)||'null');
   return saved&&Number.isSafeInteger(saved.wager)&&saved.wager>=10&&saved.wager<=10000&&
    Number(saved.at)>Number(model?.lastWagerAt||0)?saved.wager:null;
  }catch{return null;}
 }
 function rememberWager(){
  const field=controls.querySelector('[data-sbj-wager]');
  const amount=Number(field?.value);
  if(!field||!/^\d+$/.test(field.value)||!Number.isSafeInteger(amount)||amount<10||amount>10000)return;
  try{localStorage.setItem(wagerKey,JSON.stringify({wager:amount,at:Date.now()}));}catch{}
 }
 function syncQuickWager(){
  const field=controls.querySelector('[data-sbj-wager]');
  const amount=Number(field?.value);
  for(const choice of controls.querySelectorAll('[data-sbj-quick]')){
   const selected=!!field&&amount===Number(choice.dataset.sbjQuick);
   choice.classList.toggle('is-selected',selected);
   choice.setAttribute('aria-pressed',String(selected));
  }
 }
 function hydrateWager(){
  const field=controls.querySelector('[data-sbj-wager]');
  if(!field)return;
  const cached=lastLocalWager();
  if(cached!==null)field.value=String(cached);
  syncQuickWager();
 }
 function status(message,isError=false){
  if(!connection)return;
  connection.textContent=message;
  connection.classList.toggle('sbj-connection-error',isError);
  if(noticeTimeout)clearTimeout(noticeTimeout);
  if(isError)noticeTimeout=setTimeout(()=>{
   if(active&&connection.isConnected){
    connection.textContent='Private table · server-confirmed cards';
    connection.classList.remove('sbj-connection-error');
   }
  },7000);
 }
 function cue(name){experience()?.play(name);}
 function animateCards(old,next){
  if(!table)return;
  const reduce=experience()?.getPreferences?.()?.motion!=='full'||
   window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dealerCards=table.querySelectorAll('.sbj-dealer-cards .bj-card');
  const oldDealer=old?.dealer||[];
  const flipping=oldDealer[1]?.back&&!next.dealer?.[1]?.back;
  dealerCards.forEach((node,index)=>{
   if(index>=oldDealer.length){
    if(!reduce)node.classList.add('sbj-card-deal');
   }else if(index===1&&flipping){
    if(!reduce)node.classList.add('sbj-card-flip');
   }
  });
  table.querySelectorAll('.sbj-hand').forEach((panel,index)=>{
   const previous=old?.hands?.[index]?.cards||[];
   const nextCards=next.hands?.[index]?.cards||[];
   panel.querySelectorAll('.sbj-player-cards .bj-card').forEach((card,j)=>{
    const before=previous[j],after=nextCards[j];
    if(!reduce&&(!before||before.rank!==after?.rank||before.suit!==after?.suit))
     card.classList.add('sbj-card-deal');
   });
  });
 }
 function cinematic(next){
  if(!next?.cinematic||next.phase!=='settled'||!(next.profit>0))return;
  if(cinemaTimeout)clearTimeout(cinemaTimeout);
  cinemaTimeout=setTimeout(()=>{
   if(!active||model?.roundId!==next.roundId||model?.phase!=='settled')return;
   if(root.querySelector('[data-arcade-round="blackjack_solo:'+next.roundId+'"]'))return;
   const marker=document.createElement('span');marker.hidden=true;
   marker.dataset.arcadeBigwin='1';
   marker.dataset.arcadeRound='blackjack_solo:'+next.roundId;
   marker.dataset.arcadeProfit=String(next.profit);
   marker.dataset.arcadeSettled=String(next.settledAt);
   root.append(marker);
  },650);
 }
 function apply(payload,animate=true){
  const incoming=payload?.state;
  if(!incoming||typeof incoming.phase!=='string'||!Number.isSafeInteger(incoming.revision))
   throw Error('Invalid Blackjack server response.');
  if(model&&incoming.roundId===model.roundId&&incoming.revision<model.revision)return;
  const old=model;
  model=incoming;
  // The server provides safe, escaped card markup and live action buttons.
  if(typeof payload.table==='string'&&typeof payload.controls==='string'){
   table.innerHTML=payload.table;
   controls.innerHTML=payload.controls;
  }
  const balance=root.closest('.arcade-root')?.querySelector('.arcade-wallet strong');
  if(balance)balance.textContent=format(incoming.balance)+' ✦';
  const changed=old&&(
   old.roundId!==incoming.roundId||old.revision!==incoming.revision||
   old.phase!==incoming.phase
  );
  if(animate&&changed){
   animateCards(old,incoming);
   if(old.roundId!==incoming.roundId)cue('chip');
   if(old.phase!=='settled'&&incoming.phase==='settled'){
    cue(incoming.profit>0?'win':incoming.profit===0?'chip':'loss');
    cinematic(incoming);
   }else if(incoming.phase==='playing')cue('card');
  }
  hydrateWager();
  if(incoming.roundId&&incoming.roundId!==old?.roundId){
   try{history.replaceState(null,'','/arcade/blackjack?round='+incoming.roundId);}catch{}
  }
  if(connection){
   connection.textContent=incoming.phase==='playing'?
    '● Hand #'+incoming.roundId+' saved · your turn':
    incoming.phase==='settled'?'● Hand #'+incoming.roundId+' settled · points updated':
    '● Private table ready';
   connection.classList.remove('sbj-connection-error');
  }
 }
 async function refresh(showErrors=false){
  if(!active)return;
  try{
   const target='/arcade/blackjack/state';
   const query=model?.roundId?'?round='+encodeURIComponent(model.roundId):'';
   const res=await fetch(target+query,{credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'}});
   const data=await res.json();
   if(!res.ok)throw Error(data?.error||'Unable to refresh your hand.');
   apply(data,false);
  }catch(error){if(showErrors)status(error?.message||'Connection interrupted.',true);}
 }
 // Standard HTML POST is the safe fallback when a client-side fetch fails.
 // It carries the same immutable request UUID: the backend will neither draw
 // the next card nor debit the wallet twice on a repeated request.
 function nativeSubmit(form){
  if(!form?.isConnected)return false;
  form.setAttribute('data-sbj-native-fallback','1');
  HTMLFormElement.prototype.submit.call(form);
  return true;
 }
 async function send(form){
  if(busy)return;
  if(!form.reportValidity())return;
  rememberWager();
  busy=true;
  const action=form.querySelector('input[name="move"],input[name="action"]')?.value||'deal';
  const submittedButtons=[...controls.querySelectorAll('button')];
  for(const button of submittedButtons)button.disabled=true;
  status('Confirming '+action+' with the Blackjack server…');
  let nativeFallback=false;
  try{
   const fields=new URLSearchParams(new FormData(form));
   if(!fields.has('_csrf'))fields.set('_csrf',csrf);
   // Keep the original server-issued UUID for fallback, never mint a second
   // request ID after a connection failure.
   // Never use form.action: an input named "action" on old open pages can
   // shadow HTMLFormElement.action and send requests to a 404 address.
   const destination=form.getAttribute('action');
   if(!['/arcade/blackjack/start','/arcade/blackjack/action'].includes(destination))
    throw Error('Unexpected Blackjack action URL. Refresh the table.');
   const response=await fetch(destination,{method:'POST',credentials:'same-origin',
    cache:'no-store',redirect:'manual',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:fields});
   if(response.type==='opaqueredirect'||(response.status>=300&&response.status<400)){
    nativeFallback=true;
   }else{
    let data=null;
    try{data=await response.json();}catch{
     // Unexpected HTML/empty response (login redirect, proxy or expired
     // session): use the ordinary form path to show the real server page.
     nativeFallback=true;
    }
    if(!nativeFallback){
     if(!response.ok){
      await refresh();
      status((data?.error||'Blackjack server rejected the move.')+
       ' Your saved hand is unchanged or has been refreshed.',true);
     }else{
      apply(data);
      status(model.phase==='playing'?'Your move is confirmed. Choose what to do next.':
       'Round confirmed. All point transactions are saved.');
     }
    }
   }
  }catch(error){
   nativeFallback=true;
   status('Animated request failed. Using a safe standard form submission…',true);
  }finally{
   if(nativeFallback&&form.isConnected){
    // No synthetic 'submit' event: prevent a second AJAX interception.
    // The same UUID makes this safe even when the first POST succeeded.
    nativeSubmit(form);
   }
   busy=false;
   for(const button of submittedButtons)if(button.isConnected)button.disabled=false;
  }
 }
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||!root.contains(form)||!form.matches('[data-sbj-form]'))return;
  event.preventDefault();void send(form);
 });
 document.addEventListener('click',event=>{
  const choice=event.target.closest?.('[data-sbj-quick]');
  if(!choice||!root.contains(choice)||busy)return;
  const field=controls.querySelector('[data-sbj-wager]');
  if(!field)return;
  field.value=String(choice.dataset.sbjQuick);
  rememberWager();syncQuickWager();cue('click');
 });
 document.addEventListener('change',event=>{
  if(event.target.matches?.('[data-sbj-wager]')){rememberWager();syncQuickWager();}
 });
 document.addEventListener('input',event=>{
  if(event.target.matches?.('[data-sbj-wager]'))rememberWager();
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')void refresh();
 });
 window.addEventListener('pagehide',()=>{
  active=false;if(noticeTimeout)clearTimeout(noticeTimeout);
  if(cinemaTimeout)clearTimeout(cinemaTimeout);
 });
 // One set of real controls: mobile collapses secondary sections, desktop keeps them open.
 const smallScreen=window.matchMedia('(max-width:840px)');
 const disclosures=document.querySelectorAll?.('[data-sbj-mobile-disclosure]')||[];
 const matchViewport=()=>{
  for(const disclosure of disclosures)disclosure.open=!smallScreen.matches;
 };
 matchViewport();
 smallScreen.addEventListener?.('change',matchViewport);
 hydrateWager();
})();
