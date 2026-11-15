// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Live, server-authoritative shared Blackjack UI. Rendering never chooses cards or winnings.
(() => {
 const root=document.querySelector('[data-blackjack-root]');
 if(!root)return;
 const myId=document.body.dataset.siteUser||'',csrf=document.body.dataset.siteCsrf||'';
 const format=n=>Number(n||0).toLocaleString('en-GB');
 const suits={S:'♠',H:'♥',D:'♦',C:'♣'};
 const wagerKey=myId?'sb-store:arcade:wager:'+myId+':blackjack':null;
 const experience=()=>window.SBArcadeExperience;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
 let model=null,signature='',clockOffset=0,cardKeys=new Set(),busy=false,active=true,wagerDraft=null;
 const connection=root.querySelector('[data-bj-connection]');
 const table=root.querySelector('[data-bj-table]'),panel=root.querySelector('[data-bj-action-panel]');
 try{
  const old=JSON.parse(localStorage.getItem(wagerKey)||'null');
  if(Number.isSafeInteger(old?.wager)&&old.wager>=10&&old.wager<=1000)wagerDraft=old.wager;
 }catch{}
 function saveWager(value){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<10||n>1000)return;
  wagerDraft=n;
  try{localStorage.setItem(wagerKey,JSON.stringify({wager:n,at:Date.now()}));}catch{}
 }
 function cardMarkup(card,key,isNew,flipped=false){
  const animation=isNew?' bj-card-enter'+(flipped?' bj-card-flip':''):'';
  if(card?.back)return '<span class="bj-card bj-card-back'+animation+'" data-bj-card-key="'+escape(key)+'"><span>SB</span></span>';
  const rank=escape(card?.rank||'?'),suit=suits[card?.suit]||'♠';
  const red=card?.suit==='H'||card?.suit==='D';
  return '<span class="bj-card '+(red?'bj-card-red':'bj-card-black')+animation+'" data-bj-card-key="'+escape(key)+'" aria-label="'+rank+' '+suit+'">'+
   '<span class="bj-card-corner">'+rank+' <small>'+suit+'</small></span>'+
   '<span class="bj-card-symbol">'+suit+'</span>'+
   '<span class="bj-card-corner bj-card-rotated">'+rank+' <small>'+suit+'</small></span></span>';
 }
 function handLabel(hand){
  if(hand.outcome==='blackjack')return 'BLACKJACK · 3:2';
  if(hand.outcome==='push')return 'PUSH';
  if(hand.outcome==='bust')return 'BUST';
  if(hand.outcome==='won')return 'WIN';
  if(hand.outcome==='lost')return 'LOSS';
  if(hand.done)return hand.autoStood?'AUTO STAND':'STAND';
  return 'PLAYING';
 }
 function seatMarkup(p,seat,seen,allKeys,newSounds){
  if(!p)return '<section class="bj-seat bj-seat-empty"><div class="bj-seat-top"><b>Seat '+seat+'</b></div><p>Available seat</p></section>';
  const mine=p.userId===myId,activeTurn=p.active;
  const hands=(p.hands||[]).map((hand,index)=>{
   const cards=hand.cards.map((card,i)=>{
    const key=model.roundId+':'+p.userId+':'+index+':'+i+':'+card.rank+':'+card.suit;
    allKeys.add(key);if(!seen.has(key))newSounds.push('card');
    return cardMarkup(card,key,seen.size>0&&!seen.has(key));
   }).join('');
   return '<div class="bj-hand '+(activeTurn&&model.handIndex===index?'bj-hand-current ':'')+(['won','blackjack'].includes(hand.outcome)?'bj-hand-win':hand.outcome==='lost'||hand.outcome==='bust'?'bj-hand-lose':'')+'">'+
    '<div class="bj-cards">'+cards+'</div>'+
    '<div class="bj-hand-status"><strong>'+format(hand.value?.total||0)+'</strong>'+
    '<span>'+escape(handLabel(hand))+'</span><small>'+format(hand.wager)+' pts</small></div></div>';
  }).join('');
  return '<section class="bj-seat '+(mine?'bj-seat-own ':'')+(activeTurn?'bj-seat-active':'')+'">'+
   '<div class="bj-seat-top"><span class="bj-seat-number">#'+seat+'</span>'+
   '<b>'+escape(p.name)+'</b>'+(mine?'<span class="bj-you">YOU</span>':'')+'</div>'+
   (p.hands?.length?hands:'<div class="bj-seat-ready">'+(p.bet?
      '<span class="bj-chip" aria-hidden="true">✦</span><strong>'+format(p.bet)+' pts ready</strong>':'Awaiting wager')+'</div>')+
   '</section>';
 }
 function renderTable(seen){
  const added=new Set(),sounds=[];
  const dealer=(model.dealer||[]).map((card,i)=>{
   const key=model.roundId+':dealer:'+i+':'+(card.back?'back':card.rank+':'+card.suit);
   added.add(key);if(!seen.has(key))sounds.push('card');
   const flipped=seen.has(model.roundId+':dealer:'+i+':back')&&!card.back;
   return cardMarkup(card,key,seen.size>0&&!seen.has(key),flipped);
  }).join('');
  const seats=[];
  for(let i=1;i<=4;i++)seats.push(seatMarkup((model.players||[]).find(p=>p.seat===i),i,seen,added,sounds));
  const label=model.phase==='betting'?'BETTING OPEN':model.phase==='playing'?'CARDS IN PLAY':
   model.phase==='settled'?'ROUND COMPLETE':model.phase==='cancelled'?'NO BETS PLACED':'WAITING FOR PLAYERS';
  table.innerHTML='<div class="bj-table-surface" data-bj-surface>'+
    '<div class="bj-table-halo"></div>'+
    '<div class="bj-dealer-area"><div class="bj-dealer-header"><span class="bj-dealer-badge">SB DEALER</span><span>'+
    (model.dealerValue?'Dealer · '+format(model.dealerValue.total):'Dealer')+'</span></div>'+
    '<div class="bj-dealer-cards" data-bj-dealer-cards>'+dealer+'</div></div>'+
    '<div class="bj-felt-logo"><strong>SB BLACKJACK</strong><small>6 DECKS · STAND SOFT 17 · BLACKJACK PAYS 3:2</small></div>'+
    '<div class="bj-table-phase">'+label+'</div>'+
    '<div class="bj-seats" data-bj-seats>'+seats.join('')+'</div></div>';
  cardKeys=added;
  if(seen.size>0&&sounds.length)experience()?.play('card');
 }
 function message(){
  if(!model.joined)return 'You are spectating. Join the live queue below to play in the next available round.';
  if(!model.reserved&&['betting','playing'].includes(model.phase))
   return 'You are in the waiting queue. Your seat opens in a future round.';
  if(model.phase==='betting')return model.placedBet?
   'Your wager is locked in. Watch for the deal.':
   model.canBet?'Choose a wager and place your bet before the timer expires.':'Betting is open for the reserved seats.';
  if(model.phase==='playing')return model.turnUser===myId?
   'Your turn! Choose Hit, Stand, Double Down or Split.':'Dealer and other players are taking their turns.';
  if(model.phase==='settled')return 'Round completed. All payouts are confirmed by the server.';
  return 'Waiting for the next game.';
 }
 function controls(){
  const oldInput=panel.querySelector('[data-blackjack-wager]');
  if(oldInput&&oldInput.value)saveWager(oldInput.value);
  let form='';
  if(model.canBet){
   const wager=Math.min(1000,Math.max(10,wagerDraft||model.lastWager||50));
   form='<form method="post" action="/arcade/online/blackjack/bet" data-blackjack-form data-bj-bet class="bj-bet-form">'+
    '<label>Wager in points <input type="number" name="wager" data-blackjack-wager data-arcade-wager="blackjack" min="10" max="1000" step="1" value="'+wager+'" required></label>'+
    '<div class="bj-quick-bets">'+[10,50,100,500,1000].map(n=>'<button type="button" data-bj-wager="'+n+'">'+format(n)+'</button>').join('')+'</div>'+
    '<button type="submit" class="btn btn-primary" '+(model.balance<10?'disabled':'')+'>Place Wager</button></form>';
  }
  if(!model.joined){
   form='<form method="post" action="/arcade/online/join" class="bj-join-direct" data-online-join-direct>'+
    '<input type="hidden" name="_csrf" value="'+escape(csrf)+'">'+
    '<input type="hidden" name="game" value="blackjack">'+
    '<input type="hidden" name="next" value="blackjack">'+
    '<button type="submit" class="btn btn-primary">♠ Join & Play Blackjack</button></form>';
  }
  if(model.actions?.length){
   form+='<div class="bj-actions">'+model.actions.map(action=>
    '<form method="post" action="/arcade/online/blackjack/action" data-blackjack-form data-bj-action>'+
    '<input type="hidden" name="action" value="'+escape(action)+'">'+
    '<button type="submit" class="btn '+(action==='stand'?'btn-outline':'btn-primary')+'">'+
    ({hit:'Hit',stand:'Stand',double:'Double Down',split:'Split'}[action]||action)+'</button></form>').join('')+'</div>';
  }
  const result=model.myResult?'<div class="bj-round-result '+(model.myResult.profit>0?'bj-result-win':'bj-result-loss')+'">'+
   '<div><small>YOUR ROUND PROFIT</small><strong>'+(model.myResult.profit>0?'+':'')+format(model.myResult.profit)+' pts</strong></div>'+
   '<p>'+format(model.myResult.payout)+' paid from '+format(model.myResult.wager)+' wagered</p></div>':'';
  panel.innerHTML='<div class="bj-action-zone"><div class="bj-wager-head">'+
   '<div><small>YOUR POINTS</small><strong>'+format(model.balance)+'</strong></div>'+
   '<div><small>POINTS IN GAME</small><strong>'+format(model.roundWager)+' pts</strong></div>'+
   '<div><small>PLAYERS IN GAME</small><strong>'+format(model.roundPlayers)+'</strong></div></div>'+
   '<div class="bj-timer"><small>ROUND STATUS</small><strong data-bj-countdown>—</strong></div>'+
   '<p class="bj-message">'+escape(message())+'</p>'+form+result+'</div>';
  const wallet=root.querySelector('[data-bj-wallet]');
  if(wallet)wallet.textContent=format(model.balance)+' ✦';
  if(model.myResult?.cinematic){
   const marker=document.createElement('span');
   marker.hidden=true;
   marker.dataset.arcadeBigwin='1';
   marker.dataset.arcadeRound='blackjack:'+model.roundId;
   marker.dataset.arcadeProfit=String(model.myResult.profit);
   marker.dataset.arcadeSettled=String(model.myResult.settledAt);
   panel.append(marker);
  }
 }
 function apply(incoming){
  if(!incoming||typeof incoming!=='object'||typeof incoming.phase!=='string')throw Error('Invalid table state');
  // An older poll can finish after a successful action. Ignore stale responses
  // rather than replacing the current hand with an out-of-date table.
  if(model&&incoming.roundId&&model.roundId&&incoming.roundId<model.roundId)return;
  if(model&&incoming.roundId===model.roundId&&Number(incoming.seq)<Number(model.seq))return;
  const previous=model;
  const oldSignature=signature;
  model=incoming;
  clockOffset=Number(incoming.serverTime||Date.now())-Date.now();
  signature=String(incoming.roundId)+':'+incoming.phase+':'+incoming.seq+':'+incoming.balance+':'+(incoming.actions||[]).join(',');
  if(signature!==oldSignature){
   const oldCards=new Set(cardKeys);
   renderTable(oldCards);
   controls();
   if(previous){
    if(incoming.lastEvent?.type==='bet')experience()?.play('chip');
    if(incoming.lastEvent?.type==='split'||incoming.lastEvent?.type==='double')experience()?.play('chip');
    if(incoming.phase==='settled'&&previous.phase!=='settled')experience()?.play(incoming.myResult?.profit>0?'win':'loss');
   }
  }
  if(connection)connection.textContent='● Connected · Round '+(model.roundId||'—');
  updateCountdown();
 }
 function updateCountdown(){
  if(!model)return;
  const holder=root.querySelector('[data-bj-countdown]');
  if(!holder)return;
  const now=Date.now()+clockOffset;
  const until=model.phase==='betting'?model.startsAt:
   model.phase==='playing'?model.turnDeadline:
   model.phase==='settled'||model.phase==='cancelled'?(model.endsAt||now)+5500:null;
  if(!until){holder.textContent='Waiting for players';return;}
  const remaining=Math.max(0,Math.ceil((until-now)/1000));
  const display=(remaining<10?'0':'')+remaining+'s';
  holder.textContent=model.phase==='playing'?
   (model.turnUser===myId?'YOUR TURN · ':'PLAYER TURN · ')+display:
   model.phase==='betting'?'BET CLOSES IN '+display:
   'NEXT ROUND IN '+display;
 }
 let pollBusy=false;
 async function poll(){
  if(!active||pollBusy||document.visibilityState==='hidden')return;
  pollBusy=true;
  try{
   const r=await fetch('/arcade/online/blackjack/state',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('Server unavailable');
   apply(await r.json());
  }catch{
   if(connection)connection.textContent='Connection interrupted — reconnecting';
  }finally{pollBusy=false;}
 }
 async function send(form){
  if(busy||!model)return;
  const isBet=form.matches('[data-bj-bet]');
  if(isBet&&!form.reportValidity())return;
  const data=new URLSearchParams({request_id:crypto.randomUUID(),round_id:String(model.roundId),_csrf:csrf});
  if(isBet){
   const wager=form.querySelector('input[name="wager"]').value;
   data.set('wager',wager);saveWager(wager);
  }else{
   data.set('action',form.querySelector('input[name="action"]').value);
   data.set('seq',String(model.seq));
  }
  busy=true;
  for(const btn of panel.querySelectorAll('button'))btn.disabled=true;
  try{
   const response=await fetch(form.action,{method:'POST',credentials:'same-origin',cache:'no-store',
    redirect:'manual',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:data});
   const payload=await response.json();
   if(!response.ok)throw Error(payload?.error||'Action could not be completed.');
   apply(payload);
  }catch(error){
   if(connection)connection.textContent='Checking game state after request…';
   const note=panel.querySelector('.bj-message');
   if(note)note.textContent=error?.message||'Request failed. Refresh to check your cards.';
  }finally{
   busy=false;
   // Never retry a payment automatically after a network failure.
   await poll();
  }
 }
 document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||!root.contains(form)||!form.matches('[data-blackjack-form]'))return;
  event.preventDefault();
  void send(form);
 });
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-bj-wager]');
  if(!button||!root.contains(button))return;
  const input=panel.querySelector('[data-blackjack-wager]');
  if(!input)return;
  input.value=button.dataset.bjWager;
  saveWager(input.value);
  experience()?.play('click');
 });
 document.addEventListener('input',event=>{
  if(event.target.matches?.('[data-blackjack-wager]'))saveWager(event.target.value);
 });
 // Keep the lobby reservation alive while the player watches or plays at the table.
 // The heartbeat does not register a new player or wager any points.
 let beatBusy=false;
 async function heartbeat(){
  if(!active||!model?.joined||beatBusy||document.visibilityState==='hidden')return;
  beatBusy=true;
  try{
   const response=await fetch('/arcade/online/heartbeat',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({_csrf:csrf})
   });
   if(!response.ok)throw Error('Lobby heartbeat declined');
  }catch{
   if(connection)connection.textContent='Lobby connection interrupted — reconnecting';
  }finally{beatBusy=false;}
 }
 const pollId=setInterval(()=>{void poll();},1800);
 const heartbeatId=setInterval(()=>{void heartbeat();},20000);
 const timerId=setInterval(updateCountdown,250);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){void heartbeat();void poll();}});
 window.addEventListener('pagehide',()=>{active=false;clearInterval(pollId);clearInterval(heartbeatId);clearInterval(timerId);});
 void poll();
})();
