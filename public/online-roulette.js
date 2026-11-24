// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Client-only graphics, chip editor, live sound and result verification.
// Wheel animation never chooses the number or changes server wallet balances.
(() => {
 const root=document.querySelector('[data-roulette-root]');
 if(!root)return;
 const csrf=document.body.dataset.siteCsrf||'';
 const userId=document.body.dataset.siteUser||'';
 const number=n=>Number(n||0).toLocaleString('en-GB');
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const json=value=>{try{return JSON.parse(value||'null');}catch{return null;}};
 const experience=()=>window.SBArcadeExperience;
 const wheel=json(root.dataset.rouletteWheel)||[];
 const catalogue=json(root.dataset.rouletteCatalog)||[];
 const options=new Map(catalogue.map(x=>[x.key,x]));
 const canvas=root.querySelector('[data-roulette-canvas]');
 const pen=canvas?.getContext('2d');
 const wheelBox=root.querySelector('[data-roulette-wheel-box]');
 const center=root.querySelector('[data-roulette-center]');
 const caption=root.querySelector('[data-roulette-wheel-caption]');
 const timer=root.querySelector('[data-roulette-countdown]');
 const mobileTimer=root.querySelector('[data-roulette-countdown-mobile]');
 const mobilePhase=root.querySelector('[data-roulette-phase-mobile]');
 const phaseLabel=root.querySelector('[data-roulette-phase-label]');
 const connection=root.querySelector('[data-roulette-connection]');
 const slip=root.querySelector('[data-roulette-slip]');
 const form=root.querySelector('[data-roulette-form]');
 const stat=(key,value)=>{
  const element=root.querySelector('[data-roulette-stat="'+key+'"]');
  if(element)element.textContent=value;
 };
 const chipKey='sb-roulette:chip:'+userId;
 let chip=10,model=null;
 const initial=json(root.dataset.rouletteState);
 let clockOffset=0,busy=false,active=true,polling=false,heartbeatBusy=false;
 let pending=[],fingerprint='',requestKey='',revision='';
 let frame=0,lastFrame=0,spinSoundAt=0,lastLandingRound=null,lastVerifiedRound=null;
 let notice={text:'',until:0};
 const reds=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
 const colour=n=>n===0?'green':reds.has(n)?'red':'black';
 const rgba=n=>colour(n)==='red'?'#c43d50':colour(n)==='green'?'#18885f':'#182b40';
 const sector=Math.PI*2/37;
 // The source wheel order is shared with the server. Every rendered label,
 // pocket outline, highlighted result and ball landing uses this same angle.
 const pocketAngle=index=>-Math.PI/2+index*sector;
 const pocketPoint=(index,radius)=>({
  x:Math.cos(pocketAngle(index))*radius,
  y:Math.sin(pocketAngle(index))*radius
 });
 try{const value=Number(localStorage.getItem(chipKey));if(Number.isSafeInteger(value)&&value>=1)chip=value;}catch{}
 function announce(text,ms=4000){
  notice={text,until:Date.now()+ms};
  caption.textContent=text;
 }
 function chosenChip(){
  root.querySelectorAll('[data-roulette-chip]').forEach(button=>{
   const selected=Number(button.dataset.rouletteChip)===chip;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',selected?'true':'false');
  });
 }
 function renderSpecial(){
  const group=root.querySelector('[data-roulette-group]')?.value||'split';
  const matches=catalogue.filter(x=>x.type===group);
  const host=root.querySelector('[data-roulette-special-choices]');
  if(host)host.innerHTML=matches.map(item=>
   '<button type="button" data-roulette-choice="'+escape(item.key)+
   '" class="roulette-choice roulette-special-choice">'+escape(item.label)+
   '<small>'+item.odds+':1</small></button>').join('');
 }
 function rotateKey(){
  requestKey=crypto.randomUUID();
  const input=form?.querySelector('[data-roulette-request]');
  if(input)input.value=requestKey;
 }
 function renderSlip(){
  const signature=JSON.stringify(pending);
  if(signature!==fingerprint){fingerprint=signature;rotateKey();}
  const total=pending.reduce((sum,item)=>sum+item.stake,0);
  slip.innerHTML=pending.length?pending.map((item,i)=>{
   const entry=options.get(item.key);
   return '<div class="roulette-slip-item"><div><b>'+escape(entry?.label||item.key)+'</b>'+
    '<small>'+escape(entry?.type||'')+' · '+(entry?.odds||0)+':1</small></div>'+
    '<strong>'+number(item.stake)+' pts</strong>'+
    '<button type="button" data-roulette-remove="'+i+'" aria-label="Remove this chip">×</button></div>';
  }).join(''):'<p class="muted">Select a chip, then tap the table.</p>';
  const maxPending=Math.max(0,(model?.remainingBudget||0));
  const canBet=!!model?.canBet&&!busy&&pending.length>0&&pending.length<=30&&total<=maxPending&&
   total<=(model?.balance||0);
  root.querySelector('[data-roulette-confirm]').disabled=!canBet;
  root.querySelector('[data-roulette-confirm]').textContent=busy?'Confirming on server…':
   'Confirm '+number(total)+' pts';
  root.querySelector('[data-roulette-pending]').textContent=number(total)+' pts';
  root.querySelector('[data-roulette-already]').textContent=number(model?.myWager||0)+' pts';
  root.querySelector('[data-roulette-wallet]').textContent=number(model?.balance||0)+' pts';
  form.querySelector('[data-roulette-bets-json]').value=JSON.stringify(pending);
  form.querySelector('[data-roulette-form-round]').value=String(model?.roundId||'');
  const amounts=new Map();
  for(const bet of pending)amounts.set(bet.key,(amounts.get(bet.key)||0)+bet.stake);
  root.querySelectorAll('[data-roulette-choice]').forEach(button=>{
   const stake=amounts.get(button.dataset.rouletteChoice)||0;
   button.classList.toggle('roulette-chip-marked',stake>0);
   if(stake)button.dataset.chipTotal=number(stake);
   else delete button.dataset.chipTotal;
   button.disabled=!model?.canBet||busy;
  });
  root.querySelectorAll('[data-roulette-chip],[data-roulette-apply-chip],[data-roulette-custom-chip]').forEach(button=>{
   button.disabled=!model?.canBet||busy;
  });
  root.querySelector('[data-roulette-repeat]').disabled=!model?.canBet||busy||!model?.repeatBets?.length;
  root.querySelector('[data-roulette-clear]').disabled=busy||pending.length===0;
 }
 function addSelection(key){
  if(!model?.canBet||busy)return;
  const entry=options.get(key);
  if(!entry)return;
  if(pending.length>=30){announce('Maximum 30 chips per confirmation.',5500);return;}
  const total=pending.reduce((sum,item)=>sum+item.stake,0);
  if(total+chip>Math.min(model.remainingBudget,model.balance)){
   announce('Not enough points for that chip.',5500);
   return;
  }
  pending.push({key,stake:chip});
  experience()?.play('chip');
  renderSlip();
 }
 function renderMyBets(){
  const host=root.querySelector('[data-roulette-my-bets]');
  host.innerHTML=model.myBets.length?model.myBets.map(b=>
   '<div class="roulette-my-bet"><span>'+escape(b.label)+'</span>'+
   '<strong>'+number(b.stake)+' pts</strong>'+
   (model.phase==='results'?'<small>'+(b.payout?'+ '+number(b.payout)+' returned':'Lost')+'</small>':'')+'</div>').join(''):
   '<p class="muted">No confirmed bets in this round.</p>';
  const profit=root.querySelector('[data-roulette-my-profit]');
  profit.textContent=model.phase==='results'&&model.myWager>0?
   (model.myProfit>=0?'+':'')+number(model.myProfit)+' pts':'—';
  profit.className=model.phase==='results'?(model.myProfit>=0?'roulette-profit':'roulette-loss'):'';
  root.querySelector('[data-roulette-my-status]').textContent=model.phase==='results'&&model.myWager?
   model.myProfit>0?'WIN':model.myProfit===0?'PUSH':'LOSS':model.myWager?'WAGER CONFIRMED':'WATCHING';
  root.querySelector('[data-roulette-balance]').textContent=number(model.balance)+' ✦';
 }
 function renderPlayers(){
  const host=root.querySelector('[data-roulette-participants]');
  host.innerHTML=model.participants.length?model.participants.map(p=>
   '<div class="roulette-player"><span class="roulette-player-name">'+escape(p.name)+'</span>'+
   '<span>'+number(p.stake)+' pts</span><strong>'+
   (model.phase==='results'?(p.payout?number(p.payout)+' paid':'Lost'):'BET PLACED')+'</strong></div>').join(''):
   '<p class="muted">Nobody has bet this round yet.</p>';
  root.querySelector('[data-roulette-participant-count]').textContent=number(model.roundPlayers)+' players';
 }
 function renderHistory(){
  root.querySelector('[data-roulette-history]').innerHTML=model.history.map(item=>
   '<span class="roulette-history-number roulette-number-'+colour(item.number)+
   '" title="Round #'+number(item.roundId)+'">'+item.number+'</span>').join('')||
   '<span class="muted">No completed results</span>';
 }
 async function verify(seed,roundId,commitment,expected){
  if(!seed||!crypto.subtle)return;
  try{
   const bytes=new Uint8Array(seed.match(/../g).map(x=>parseInt(x,16)));
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
   const hex=[...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
   if(hex!==commitment)throw Error('Commitment mismatch');
   const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const limit=0x100000000-(0x100000000%37);
   let result=null;
   for(let counter=0;counter<100&&result===null;counter++){
    const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,
     new TextEncoder().encode('sb-global-roulette:'+roundId+':'+counter)));
    const view=new DataView(digest.buffer,digest.byteOffset,digest.byteLength);
    for(let offset=0;offset<=28;offset+=4){
     const value=view.getUint32(offset,false);
     if(value<limit){result=value%37;break;}
    }
   }
   if(result!==expected)throw Error('Winning number mismatch');
   if(model?.roundId===roundId)root.querySelector('[data-roulette-proof-status]').textContent=
    '✓ Verified — seed, commitment and winning number match.';
  }catch{
   if(model?.roundId===roundId)root.querySelector('[data-roulette-proof-status]').textContent=
    '⚠ Could not verify this result. Check the revealed seed.';
  }
 }
 function updateProof(){
  const commitment=root.querySelector('[data-roulette-commitment]');
  const container=root.querySelector('[data-roulette-seed-container]');
  commitment.textContent=model.commitment||'—';
  container.hidden=!model.seed;
  root.querySelector('[data-roulette-seed]').textContent=model.seed||'';
  if(!model.seed){
   root.querySelector('[data-roulette-proof-status]').textContent='The server seed stays hidden until the wheel stops.';
  }else if(lastVerifiedRound!==model.roundId){
   lastVerifiedRound=model.roundId;
   root.querySelector('[data-roulette-proof-status]').textContent='Verifying revealed server seed…';
   void verify(model.seed,model.roundId,model.commitment,model.winningNumber);
  }
 }
 function cinematic(){
  if(!model?.cinematic||model.myProfit<=0)return;
  const id='roulette:'+model.roundId;
  if(root.querySelector('[data-arcade-round="'+id+'"]'))return;
  const marker=document.createElement('span');
  marker.hidden=true;
  marker.dataset.arcadeBigwin='1';
  marker.dataset.arcadeRound=id;
  marker.dataset.arcadeProfit=String(model.myProfit);
  marker.dataset.arcadeSettled=String(model.spinEndsAt);
  root.append(marker);
 }
 function apply(snapshot){
  if(!snapshot||!Number.isSafeInteger(snapshot.roundId))throw Error('Invalid Roulette response.');
  if(model&&snapshot.roundId<model.roundId)return;
  if(model&&snapshot.roundId===model.roundId&&snapshot.version<model.version)return;
  const old=model,changed=!old||old.roundId!==snapshot.roundId||
   old.version!==snapshot.version||old.phase!==snapshot.phase;
  model=snapshot;clockOffset=Number(snapshot.serverTime)-Date.now();
  revision=snapshot.roundId+':'+snapshot.version+':'+snapshot.phase;
  if(connection)connection.textContent='● Connected · Round #'+number(snapshot.roundId);
  stat('players',number(snapshot.roundPlayers));
  stat('wager',number(snapshot.roundWager)+' pts');
  stat('watching',number(snapshot.watching));
  stat('round','#'+number(snapshot.roundId));
  root.querySelector('[data-roulette-form-round]').value=String(snapshot.roundId);
  if(old&&old.roundId!==snapshot.roundId){
   pending=[];fingerprint='';rotateKey();lastLandingRound=null;
   announce('New round: 30 seconds to place your bets.',2600);
  }
  if(changed){
   renderMyBets();renderPlayers();renderHistory();updateProof();
   if(old&&old.phase!==snapshot.phase){
    if(snapshot.phase==='spinning')experience()?.play('roulette-spin');
    if(snapshot.phase==='results'){
     experience()?.play('roulette-land');
     if(snapshot.myProfit>0)experience()?.play('roulette-win');
     lastLandingRound=snapshot.roundId;
    }
   }
   if(snapshot.phase==='results')cinematic();
  }
  renderSlip();renderClock();
 }
 function renderClock(){
  if(!model)return;
  const now=Date.now()+clockOffset;
  const target=model.phase==='betting'?model.betClosesAt:
   model.phase==='spinning'?model.spinEndsAt:model.resultsEndsAt;
  const remaining=Math.max(0,Math.ceil((target-now)/1000));
  const clockText='00:'+String(Math.min(99,remaining)).padStart(2,'0');
  timer.textContent=clockText;
  if(mobileTimer)mobileTimer.textContent=clockText;
  if(mobilePhase)mobilePhase.textContent=model.phase==='betting'?'Betting closes in':model.phase==='spinning'?'Wheel spinning':'Result display';
  phaseLabel.textContent=model.phase==='betting'?'BETTING OPEN':
   model.phase==='spinning'?'BETS LOCKED · SPINNING':'RESULT CONFIRMED';
  wheelBox.dataset.roulettePhase=model.phase;
  center.textContent=model.phase==='results'?String(model.winningNumber):'?';
  if(notice.until> Date.now())caption.textContent=notice.text;
  else caption.textContent=model.phase==='betting'?'PLACE YOUR BETS':
   model.phase==='spinning'?'NO MORE BETS':'WINNING NUMBER REVEALED';
  const button=root.querySelector('[data-roulette-confirm]');
  if(model.phase!=='betting'||remaining<=0)button.disabled=true;
 }
 function draw(){
  if(!pen||!model||!active)return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  if(canvas.width!==640*dpr||canvas.height!==640*dpr){
   canvas.width=640*dpr;canvas.height=640*dpr;
   pen.setTransform(dpr,0,0,dpr,0,0);
  }
  const now=Date.now()+clockOffset;
  const mode=experience()?.getPreferences?.()?.motion||'full';
  const reduce=mode!=='full'||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce&&now-lastFrame<65)return;
  lastFrame=now;
  pen.clearRect(0,0,640,640);
  const cx=320,cy=320;
  pen.save();pen.translate(cx,cy);
  pen.beginPath();pen.arc(0,0,303,0,Math.PI*2);
  pen.fillStyle='#251b16';pen.shadowColor='#000';pen.shadowBlur=35;pen.fill();
  pen.restore();
  const frameRing=pen.createRadialGradient(cx,cy,180,cx,cy,304);
  frameRing.addColorStop(0,'#5c422a');frameRing.addColorStop(.75,'#cfa35a');
  frameRing.addColorStop(.9,'#8b6235');frameRing.addColorStop(1,'#311d15');
  pen.beginPath();pen.arc(cx,cy,300,0,Math.PI*2);pen.fillStyle=frameRing;pen.fill();
  pen.beginPath();pen.arc(cx,cy,269,0,Math.PI*2);pen.fillStyle='#0c1d2d';pen.fill();
  const spinning=model.phase==='spinning';
  const elapsed=Math.max(0,Math.min(8000,now-model.betClosesAt));
  const progress=elapsed/8000;
  // During the concealed 8s phase the wheel and ball travel independently.
  // The ball settles into the disclosed pocket only after server settlement.
  const spinTurns=6+2*(1-Math.pow(1-progress,3));
  const rotation=spinning||model.phase==='results'?
   spinTurns*Math.PI*2+0.45:0.45;
  pen.save();pen.translate(cx,cy);pen.rotate(rotation);
  for(let i=0;i<37;i++){
   const centerAngle=pocketAngle(i);
   const begin=centerAngle-sector/2;
   pen.beginPath();pen.arc(0,0,260,begin,begin+sector);
   pen.arc(0,0,180,begin+sector,begin,true);
   pen.closePath();
   pen.fillStyle=rgba(wheel[i]);pen.fill();
   pen.strokeStyle='#d7ac68';pen.lineWidth=1.25;pen.stroke();
   // Previously pen.rotate(centerAngle) + (0,-224) shifted EVERY
   // label by -90 degrees and rotated it upside-down on the lower half.
   // Translate to the true pocket midpoint, then counter-rotate only
   // the lettering so it stays legible throughout the wheel spin.
   const pocket=pocketPoint(i,224);
   pen.save();pen.translate(pocket.x,pocket.y);pen.rotate(-rotation);
   pen.textAlign='center';pen.textBaseline='middle';
   pen.font='900 22px system-ui,sans-serif';
   pen.lineWidth=2.5;pen.strokeStyle='#06121b';
   pen.strokeText(String(wheel[i]),0,0);
   pen.fillStyle='#fff4d7';pen.fillText(String(wheel[i]),0,0);
   pen.restore();
  }
  const centerGrad=pen.createRadialGradient(0,0,30,0,0,179);
  centerGrad.addColorStop(0,'#d9bb75');centerGrad.addColorStop(.5,'#88663c');
  centerGrad.addColorStop(.8,'#3c3025');centerGrad.addColorStop(1,'#111c2a');
  pen.beginPath();pen.arc(0,0,178,0,Math.PI*2);pen.fillStyle=centerGrad;pen.fill();
  pen.lineWidth=10;pen.strokeStyle='#b89a61';pen.stroke();
  for(let j=0;j<12;j++){
   const angle=j*Math.PI/6;
   pen.beginPath();pen.moveTo(Math.cos(angle)*38,Math.sin(angle)*38);
   pen.lineTo(Math.cos(angle)*159,Math.sin(angle)*159);
   pen.lineWidth=7;pen.strokeStyle='#cfaa6c';pen.stroke();
  }
  pen.beginPath();pen.arc(0,0,38,0,Math.PI*2);
  pen.fillStyle='#e6c57e';pen.fill();pen.strokeStyle='#6e5233';pen.lineWidth=7;pen.stroke();
  pen.restore();
  // Ball orbits opposite the wheel, hops between grooves, then physically
  // aligns with the verified winning pocket during the reveal phase.
  let ballAngle=now/1700;
  let radius=281;
  if(spinning){
   const ease=1-Math.pow(1-progress,2);
   ballAngle=-Math.PI/2-progress*2*Math.PI*9+0.75;
   radius=282-39*ease+Math.sin(progress*125)*Math.max(0,4*(1-ease));
   if(!reduce&&now-spinSoundAt>130+progress*300){
    spinSoundAt=now;experience()?.play('roulette-tick',Math.floor(progress*16)%7);
   }
  }else if(model.phase==='results'&&model.winningNumber!==null){
   const index=wheel.indexOf(model.winningNumber);
   const target=pocketAngle(index)+rotation;
   const revealed=Math.max(0,Math.min(1,(now-model.spinEndsAt)/540));
   const prior=-Math.PI/2-2*Math.PI*9+.75;
   const delta=((target-prior+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
   ballAngle=prior+delta*(1-Math.pow(1-revealed,3));
   radius=243+Math.max(0,1-revealed)*8;
   if(reduce){ballAngle=target;radius=243;}
  }
  const bx=cx+Math.cos(ballAngle)*radius,by=cy+Math.sin(ballAngle)*radius;
  pen.save();pen.shadowColor='#fff3da';pen.shadowBlur=18;
  const gloss=pen.createRadialGradient(bx-3,by-4,1,bx,by,10);
  gloss.addColorStop(0,'#ffffff');gloss.addColorStop(.65,'#f7dfaa');gloss.addColorStop(1,'#9d8b70');
  pen.beginPath();pen.arc(bx,by,9,0,Math.PI*2);pen.fillStyle=gloss;pen.fill();pen.restore();
  if(model.phase==='results'){
   pen.save();pen.translate(cx,cy);
   const index=wheel.indexOf(model.winningNumber);
   if(index>=0){
    // Highlight the exact pocket corresponding to the revealed winning
    // number; the old (0,-225) location was also displaced by 90 degrees.
    const point=pocketPoint(index,225);
    const x=point.x*Math.cos(rotation)-point.y*Math.sin(rotation);
    const y=point.x*Math.sin(rotation)+point.y*Math.cos(rotation);
    pen.beginPath();pen.arc(x,y,15,0,2*Math.PI);
    pen.strokeStyle='#fce29d';pen.lineWidth=3;
    pen.shadowBlur=18;pen.shadowColor='#f9d365';pen.stroke();
   }
   pen.restore();
  }
 }
 let lastRendered=0;
 function frameLoop(at){
  if(!active)return;
  if(at-lastRendered>16){lastRendered=at;draw();}
  renderClock();
  frame=requestAnimationFrame(frameLoop);
 }
 async function poll(){
  if(!active||polling||document.visibilityState==='hidden')return;
  polling=true;
  try{
   const response=await fetch('/arcade/online/roulette/state',{
    credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Connection interrupted');
   apply(await response.json());
  }catch{
   if(connection)connection.textContent='Reconnecting to shared Roulette…';
  }finally{polling=false;}
 }
 async function heartbeat(){
  if(!active||heartbeatBusy||document.visibilityState==='hidden')return;
  heartbeatBusy=true;
  try{
   await fetch('/arcade/online/roulette/heartbeat',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({_csrf:csrf})});
  }catch{}finally{heartbeatBusy=false;}
 }
 async function submit(){
  if(busy||!model?.canBet||pending.length===0)return;
  const submitted=JSON.stringify(pending);
  busy=true;renderSlip();
  try{
   const response=await fetch(form.action,{
    method:'POST',credentials:'same-origin',cache:'no-store',redirect:'manual',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({_csrf:csrf,round_id:String(model.roundId),
     request_id:requestKey,bets_json:submitted})
   });
   const body=await response.json();
   if(!response.ok)throw Error(body?.error||'Could not confirm Roulette bets.');
   apply(body);
   pending=[];fingerprint='';rotateKey();
   announce('Bet slip confirmed and points deducted. Good luck!',3500);
   experience()?.play('chip');
  }catch(error){
   announce((error?.message||'Bet confirmation unavailable.')+
    ' Check the saved wagers before retrying.',6500);
   // Retain the same request ID after an uncertain network outcome so a
   // retry cannot debit a completed bet a second time.
  }finally{busy=false;renderSlip();void poll();}
 }
 document.addEventListener('click',event=>{
  const manual=event.target.closest?.('[data-roulette-apply-chip]');
  if(manual&&root.contains(manual)){
   const input=root.querySelector('[data-roulette-custom-chip]');
   if(!input?.reportValidity()||!/^\d+$/.test(input.value)){
    announce('Enter a whole chip amount of at least 1 point.',5000);return;
   }
   const amount=Number(input.value);
   if(!Number.isSafeInteger(amount)||amount<1){
    announce('Chip amount must be of at least 1 point.',5000);return;
   }
   chip=amount;
   try{localStorage.setItem(chipKey,String(chip));}catch{}
   chosenChip();announce('Custom chip set: '+number(chip)+' points.',2500);
   experience()?.play('click');return;
  }
  const clicked=event.target.closest?.('[data-roulette-chip]');
  if(clicked&&root.contains(clicked)){
   chip=Number(clicked.dataset.rouletteChip);
   try{localStorage.setItem(chipKey,String(chip));}catch{}
   chosenChip();experience()?.play('click');return;
  }
  const option=event.target.closest?.('[data-roulette-choice]');
  if(option&&root.contains(option)){addSelection(option.dataset.rouletteChoice);return;}
  const remove=event.target.closest?.('[data-roulette-remove]');
  if(remove&&root.contains(remove)&&!busy){
   const index=Number(remove.dataset.rouletteRemove);
   if(Number.isInteger(index)&&index>=0&&index<pending.length)pending.splice(index,1);
   renderSlip();experience()?.play('click');return;
  }
  if(event.target.closest?.('[data-roulette-clear]')&&root.contains(event.target)&&!busy){
   pending=[];renderSlip();experience()?.play('click');return;
  }
  if(event.target.closest?.('[data-roulette-repeat]')&&root.contains(event.target)&&!busy&&model?.canBet){
   const last=model.repeatBets||[];
   const total=last.reduce((a,b)=>a+b.stake,0);
   if(total>model.remainingBudget||total>model.balance){
    announce('Not enough points to repeat your last confirmed bet slip.',5500);return;
   }
   pending=last.map(({key,stake})=>({key,stake}));
   renderSlip();announce('Previous chip selections loaded. Confirm to place them.',3500);
   experience()?.play('chip');return;
  }
 });
 document.addEventListener('change',event=>{
  if(root.contains(event.target)&&event.target.matches('[data-roulette-group]'))renderSpecial();
 });
 document.addEventListener('submit',event=>{
  if(!root.contains(event.target)||!event.target.matches('[data-roulette-form]'))return;
  event.preventDefault();void submit();
 });
 const pollId=setInterval(()=>{void poll();},2500);
 const heartbeatId=setInterval(()=>{void heartbeat();},20000);
 window.addEventListener('sb:roulette',()=>{if(document.visibilityState==='visible')void poll();});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){void heartbeat();void poll();}
 });
 window.addEventListener('pagehide',()=>{
  active=false;clearInterval(pollId);clearInterval(heartbeatId);
  cancelAnimationFrame(frame);
 });
 chosenChip();renderSpecial();
 if(initial){clockOffset=Number(initial.serverTime)-Date.now();apply(initial);}
 frame=requestAnimationFrame(frameLoop);void poll();
})();
