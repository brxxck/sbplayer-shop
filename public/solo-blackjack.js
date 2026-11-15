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
   return saved&&Number.isSafeInteger(saved.wager)&&saved.wager>=10&&saved.wager<=1000&&
    Number(saved.at)>Number(model?.lastWagerAt||0)?saved.wager:null;
  }catch{return null;}
 }
 function rememberWager(){
  const field=controls.querySelector('[data-sbj-wager]');
  const amount=Number(field?.value);
  if(!field||!/^\d+$/.test(field.value)||!Number.isSafeInteger(amount)||amount<10||amount>1000)return;
  try{localStorage.setItem(wagerKey,JSON.stringify({wager:amount,at:Date.now()}));}catch{}
 }
 function hydrateWager(){
  const field=controls.querySelector('[data-sbj-wager]');
  if(!field)return;
  const cached=lastLocalWager();
  if(cached!==null)field.value=String(cached);
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
 async function send(form){
  if(busy)return;
  if(!form.reportValidity())return;
  rememberWager();
  busy=true;
  for(const button of controls.querySelectorAll('button'))button.disabled=true;
  try{
   const fields=new URLSearchParams(new FormData(form));
   if(!fields.has('_csrf'))fields.set('_csrf',csrf);
   const response=await fetch(form.action,{method:'POST',credentials:'same-origin',
    cache:'no-store',redirect:'manual',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:fields});
   const data=await response.json();
   if(!response.ok)throw Error(data?.error||'The dealer could not confirm your move.');
   apply(data);
   status(model.phase==='playing'?'Your move is confirmed. Choose what to do next.':
    'Round confirmed. All point transactions are saved.');
  }catch(error){
   status((error?.message||'Your move was not confirmed.')+
    ' Checking your saved hand…',true);
   // Refresh only. Never replay a wager or card action automatically.
   await refresh();
  }finally{
   busy=false;
   for(const button of controls.querySelectorAll('button'))button.disabled=false;
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
  rememberWager();cue('click');
 });
 document.addEventListener('change',event=>{
  if(event.target.matches?.('[data-sbj-wager]'))rememberWager();
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
 hydrateWager();
})();
