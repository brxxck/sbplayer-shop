// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Poker browser presentation. The server alone deals cards, decides actions and moves points.
(()=>{
 const root=document.querySelector('[data-poker-table]');
 if(!root)return;
 const id=root.dataset.pokerTable,code=root.dataset.pokerCode||'';
 let state;try{state=JSON.parse(root.dataset.pokerState||'{}');}catch{state={};}
 const text=(selector,value)=>{const x=root.querySelector(selector);if(x)x.textContent=String(value);};
 const find=selector=>root.querySelector(selector);
 const money=v=>Number(v||0).toLocaleString('en-GB');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const suit={s:'♠',h:'♥',d:'♦',c:'♣'};
 const soundEl=find('[data-poker-sound]'),motionEl=find('[data-poker-motion]');
 const remember=(key,fallback)=>{try{return localStorage.getItem('sb:poker:'+key)??fallback;}catch{return fallback;}};
 soundEl.checked=remember('sound','on')==='on';
 motionEl.checked=remember('motion','on')==='on';
 const save=(key,value)=>{try{localStorage.setItem('sb:poker:'+key,value);}catch{}};
 soundEl.addEventListener('change',()=>save('sound',soundEl.checked?'on':'off'));
 motionEl.addEventListener('change',()=>save('motion',motionEl.checked?'on':'off'));
 let audio=null;
 function play(kind){
  if(!soundEl.checked)return;
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return;
   audio=audio||new Context();
   if(audio.state==='suspended')return;
   const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
   o.type=kind==='win'?'sine':'triangle';
   o.frequency.setValueAtTime(kind==='win'?720:kind==='bet'?390:490,t);
   o.frequency.exponentialRampToValueAtTime(kind==='win'?920:kind==='bet'?260:570,t+.11);
   g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.04,t+.02);
   g.gain.exponentialRampToValueAtTime(.001,t+.16);
   o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.17);
  }catch{}
 }
 const card=(c,hide=false)=>{
  if(hide)return '<span class="poker-card back" aria-label="Hidden card"></span>';
  if(!c)return '<span class="poker-card placeholder" aria-hidden="true">?</span>';
  const mark=suit[c[1]]||'♠',rank=c[0]==='T'?'10':c[0];
  return '<span class="poker-card '+('hd'.includes(c[1])?'red':'')+(motionEl.checked?' dealt':'')+'" aria-label="'+esc(rank+mark)+'">'+esc(rank+mark)+'</span>';
 };
 const csrf=()=>document.querySelector('.poker-root [name="_csrf"]')?.value||'';
 let busy=false,signature='',previousHand='',previousPhase='',seenResult='';
 async function send(path,body={}){
  if(busy)return;
  busy=true;refreshControls();
  try{
   const data=new URLSearchParams({_csrf:csrf(),...body});
   const response=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:data});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Poker action rejected.');
   if(result&&result.id){state=result;render();}
   play('bet');text('[data-poker-feedback]','Action accepted.');
  }catch(e){text('[data-poker-feedback]',e.message||'Unable to complete Poker action.');}
  finally{busy=false;refreshControls();}
 }
 function seatHtml(p){
  const myself=p.id===state.self;
  const position=((p.seat-(state.mySeat??0)+state.seats)%state.seats);
  const name=p.bot?p.name:p.name||'Player';
  const avatar=p.avatarUrl?'<img src="'+esc(p.avatarUrl)+'" alt="" loading="lazy">':esc(p.bot?'🤖':name.slice(0,1).toUpperCase());
  const cards=p.cards?.length?p.cards.map(c=>card(c)).join(''):p.cardCount?Array.from({length:p.cardCount},()=>card(null,true)).join(''):'';
  const seconds=Math.max(0,Math.ceil((state.hand.turnEndsAt-(Date.now()-(Date.now()-syncAt)))/1000));
  return '<div class="poker-seat poker-seat-'+position+(myself?' owner-seat':'')+(p.folded?' folded':'')+(p.turn?' active':'')+
   '" aria-label="'+esc(name)+'" title="'+esc(name)+'">'+
   '<div class="poker-seat-cards">'+cards+'</div><span class="poker-avatar">'+avatar+'</span>'+
   '<div class="poker-identity"><b>'+esc(name)+(myself?' (You)':'')+'</b>'+
   '<small>'+money(p.points)+' pts'+(p.wager?' · '+money(p.wager)+' in pot':'')+'</small></div>'+
   (p.seat===state.hand.dealerSeat?'<span class="poker-dealer">D</span>':'')+
   (p.turn?'<span class="poker-clock">'+seconds+'s</span>':'')+'</div>';
 }
 let syncAt=Date.now();
 // // BUILT BY SB // RUNING ON WEED AND CAFFEINE
 // Suggestions are display-only: they never submit a Poker action.
 function renderSuggestion(){
  const h=state.hand,suggestion=h?.myTurn?h.suggestedPlay:null;
  const panel=find('[data-poker-suggestion]');
  if(!panel)return;
  panel.dataset.suggestedAction=suggestion?.action||'';
  const label=find('[data-poker-suggestion-action]');
  const explanation=find('[data-poker-suggestion-reason]');
  if(label)label.textContent=suggestion?.label||
    (h?.phase==='results'?'Next hand coming up…':state.joined?'Available on your turn':'Join a table to receive guidance');
  if(explanation)explanation.textContent=suggestion?
    suggestion.hand+' · '+suggestion.reason:
    'Uses only your private cards, public community cards and visible bets. Hidden cards are never used.';
 }
 function refreshControls(){
  const h=state.hand;
  const bar=find('[data-poker-buttons]'),raise=find('[data-poker-raise]');
  if(!bar||!raise)return;
  renderSuggestion();
  if(!h||!state.joined){bar.innerHTML='';raise.innerHTML='';return;}
  const me=h.players.find(p=>p.id===state.self);
  if(!me){bar.innerHTML='';raise.innerHTML='';return;}
  if(!h.myTurn){bar.innerHTML='';raise.innerHTML='';return;}
  const owed=h.toCall||0,max=h.maxRaiseTo||0,canRaise=h.canRaise&&max>=h.minRaise;
  bar.innerHTML='<button type="button" data-poker-action="fold"'+(busy?' disabled':'')+'>✕ Fold</button>'+
   (owed===0?'<button type="button" data-poker-action="check"'+(busy?' disabled':'')+'>✓ Check</button>':
   '<button type="button" data-poker-action="call"'+(busy?' disabled':'')+'>✓ Call '+money(owed)+'</button>')+
   '<button type="button" data-poker-action="raise"'+(!canRaise||busy?' disabled':'')+'>⇧ Raise</button>'+
   '<button type="button" data-poker-action="allin"'+(max<=me.street||busy?' disabled':'')+'>★ All-In</button>';
  const old=raise.querySelector('input')?.value;
  if(!canRaise){raise.innerHTML='';return;}
  const min=Math.max(h.minRaise,1),preferred=old!==undefined&&Number(old)>=min&&Number(old)<=max?Number(old):min;
  raise.innerHTML='<label for="poker-raise-input">Raise to</label><input id="poker-raise-input" data-poker-raise-input type="number" min="'+
   min+'" max="'+max+'" step="1" value="'+preferred+'"><button type="button" data-poker-preset="half">½ Pot</button>'+
   '<button type="button" data-poker-preset="pot">Pot</button><button type="button" data-poker-preset="max">Max</button>';
 }
 function render(){
  if(!state?.id)return;
  text('[data-poker-wallet]',money(state.balance));
  text('[data-poker-seated]',state.seated+' / '+state.seats);
  text('[data-poker-hand-count]',money(state.handsPlayed));
  const profit=Number(state.sessionProfit||0);
  text('[data-poker-profit]',(profit>0?'+':'')+money(profit)+' pts');
  const h=state.hand;
  const board=find('[data-poker-board]');
  if(!h){
   text('[data-poker-pot]','0 pts');text('[data-poker-phase]','WAITING FOR PLAYERS');
   if(board)board.innerHTML=Array.from({length:5},()=>card(null)).join('');
   text('[data-poker-status]',state.joined?'Waiting for another active player…':'Spectating this table');
   if(find('[data-poker-seats]'))find('[data-poker-seats]').innerHTML=
    state.members.map(m=>'<div class="poker-seat poker-seat-'+m.seat+'"><div class="poker-identity"><b>'+esc(m.name)+
    '</b><small>'+money(m.points)+' pts</small></div></div>').join('');
   refreshControls();return;
  }
  text('[data-poker-pot]',money(h.pot)+' pts');
  text('[data-poker-phase]',h.phase.toUpperCase());
  const newSignature=h.id+'|'+h.seq+'|'+h.board.length+'|'+JSON.stringify(h.players.map(p=>[p.id,p.wager,p.folded,p.cards,p.turn]));
  if(signature!==newSignature){
   const seatList=find('[data-poker-seats]');
   if(seatList)seatList.innerHTML=h.players.map(seatHtml).join('');
   if(board)board.innerHTML=[...h.board,...Array.from({length:5-h.board.length},()=>null)].map(c=>card(c)).join('');
   const mine=find('[data-poker-my-cards]');if(mine)mine.innerHTML=
    h.myCards?.length?'<strong>YOUR HAND</strong> '+h.myCards.map(c=>card(c)).join(''):'';
   if(previousHand===h.id&&previousPhase!==h.phase)play('deal');
   if(previousHand!==h.id&&previousHand)play('deal');
   if(h.phase==='results'&&seenResult!==h.id){seenResult=h.id;const payout=Number(h.payouts?.[state.self]||0);if(payout)play('win');}
   previousHand=h.id;previousPhase=h.phase;signature=newSignature;
  }
  let status='Waiting for the next action';
  if(h.phase==='results'){
   status='Hand finished — '+(h.awards||[]).map(a=>a.winners.map(id=>(h.players.find(p=>p.id===id)?.name||'Player')).join(' & ')+' won '+money(a.pot)+' pts').join(' · ');
  }else if(h.myTurn)status='YOUR TURN · '+(h.toCall?'Call '+money(h.toCall)+' pts, raise or fold':'Check, raise or fold');
  else {const p=h.players.find(x=>x.turn);status=p?p.name+' is deciding…':'Dealing cards…';}
  text('[data-poker-status]',status);
  if(find('[data-poker-log]'))find('[data-poker-log]').innerHTML=(h.history||[]).map(a=>'<div>'+esc(a.text)+'</div>').join('')||
   '<div>No actions yet.</div>';
  if(find('[data-poker-chat]'))find('[data-poker-chat]').innerHTML=(state.histories||[]).map(x=>
   '<div><small>'+esc(x.name)+':</small> '+esc(x.message)+'</div>').join('')||'<div>No messages yet.</div>';
  refreshControls();tickClock();
 }
 function tickClock(){
  const h=state.hand;if(!h||h.phase==='results')return;
  const seconds=Math.max(0,Math.ceil((h.turnEndsAt-state.serverTime-(Date.now()-syncAt))/1000));
  const clock=find('.poker-seat.active .poker-clock');
  if(clock)clock.textContent=seconds+'s';
 }
 root.addEventListener('click',event=>{
  if(event.target.closest('[data-poker-copy]')){
   const invite=new URL('/arcade/poker/table/'+id,location.origin);
   invite.searchParams.set('code',state.inviteCode||code);
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(invite.href).then(()=>text('[data-poker-feedback]','Private invite link copied.')).catch(()=>text('[data-poker-feedback]',invite.href));
   else text('[data-poker-feedback]',invite.href);
   return;
  }
  const preset=event.target.closest('[data-poker-preset]');
  if(preset){
   const h=state.hand,input=find('[data-poker-raise-input]');
   if(!input||!h)return;
   const amount=preset.dataset.pokerPreset==='max'?h.maxRaiseTo:
    Math.min(h.maxRaiseTo,Math.max(h.minRaise,Math.ceil(h.currentBet+(preset.dataset.pokerPreset==='half'?h.pot/2:h.pot))));
   input.value=String(amount);return;
  }
  const button=event.target.closest('[data-poker-action]');
  if(!button||busy)return;
  const h=state.hand;if(!h?.myTurn)return;
  const action=button.dataset.pokerAction,raiseInput=find('[data-poker-raise-input]');
  const amount=action==='raise'?String(raiseInput?.value||''):'';
  void send('/arcade/poker/table/'+id+'/action',{action,raise_to:amount,hand_id:h.id,seq:String(h.seq),
   request_id:crypto.randomUUID()});
 });
 const chatForm=find('[data-poker-chat-form]');
 chatForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const input=chatForm.elements.namedItem('message');
  const message=input?.value?.trim();
  if(!message||busy)return;
  send('/arcade/poker/table/'+id+'/chat',{message}).then(()=>{input.value='';});
 });
 async function poll(){
  if(!document.hidden&&!busy){
   try{
    const query=code?'?code='+encodeURIComponent(code):'';
    const res=await fetch('/arcade/poker/table/'+id+'/state'+query,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    if(res.ok){
     state=await res.json();syncAt=Date.now();render();
    }
   }catch{}
  }
 }
 setInterval(poll,1500);
 setInterval(tickClock,300);
 render();
})();
