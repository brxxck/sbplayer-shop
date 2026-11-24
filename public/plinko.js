// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Plinko canvas physics presentation. Results, multipliers, paths and payouts
// come exclusively from the authenticated server. Animations never move points.
(() => {
 if(document.body.dataset.page!=='/arcade/plinko')return;
 const memberId=document.body.dataset.siteUser||'guest';
 const selectionKey='sb-store:arcade:plinko:settings:'+memberId;
 const wagerKey='sb-store:arcade:wager:'+memberId+':plinko';
 const sessionKey='sb-store:plinko:session:'+memberId;
 const SIZE={width:800,height:640,center:400,firstY:122,pegsHeight:365,slotsY:555};
 const colours={low:'#56e8bd',medium:'#f0c36a',high:'#fb7697'};
 const safeNumber=n=>Number(n||0).toLocaleString('en-GB');
 const fmt=cents=>(Number(cents||0)/100).toFixed(2)+'×';
 const experience=()=>window.SBArcadeExperience;
 const prefersReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const motion=()=>prefersReduced?'reduced':experience()?.getPreferences?.()?.motion||'full';
 let root=null,form=null,canvas=null,pen=null,tables=null,last=null,frame=0,runner=null,busy=false;
 let resizeDpr=1,paintBalls=[],paintParticles=[],highlightSlot=-1,profit=0;
 try{const stored=Number(sessionStorage.getItem(sessionKey));if(Number.isSafeInteger(stored))profit=stored;}catch{}
 const setProfit=value=>{
  if(!Number.isSafeInteger(value))return;
  profit=value;
  try{sessionStorage.setItem(sessionKey,String(value));}catch{}
  const target=root?.querySelector('[data-plinko-session]');
  if(target){target.textContent=(value>=0?'+':'')+safeNumber(value)+' pts';target.className=value>=0?'plinko-profit':'plinko-loss';}
 };
 const settings=()=>{
  const rows=Number(form?.elements.namedItem('rows')?.value||12);
  const risk=String(form?.querySelector('input[name="risk"]:checked')?.value||'medium');
  const count=Number(form?.querySelector('input[name="count"]:checked')?.value||1);
  const wager=Number(form?.elements.namedItem('wager')?.value||0);
  const riskTable=tables?.[rows]?.[risk];
  return {rows,risk,count,wager,multipliers:Array.isArray(riskTable)?riskTable:tables?.[12]?.medium||[]};
 };
 // A balance rendered by the server belongs to this Plinko component.
 // The shared Arcade wallet header lives OUTSIDE [data-plinko-root], so
 // querying it with root.querySelector returned nothing and disabled all drops.
 // This numeric attribute is refreshed with every successful round response.
 const availableBalance=()=>{
  const raw=root?.querySelector('[data-plinko-balance]')?.dataset.plinkoWallet;
  const balance=Number(raw);
  return raw!==undefined&&Number.isSafeInteger(balance)&&balance>=0?balance:0;
 };
 const spacing=rows=>Math.min(62,560/rows);
 const pegY=(rows,row)=>SIZE.firstY+row*(SIZE.pegsHeight/rows);
 const slotX=(rows,slot)=>SIZE.center+(slot-rows/2)*spacing(rows);
 const pegX=(rows,row,index)=>SIZE.center+(index-row/2)*spacing(rows);
 function parseJSON(value,defaultValue){
  try{return JSON.parse(value||'null')??defaultValue;}catch{return defaultValue;}
 }
 function setCanvasDpr(){
  if(!canvas)return;
  const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  if(resizeDpr===dpr&&canvas.width===SIZE.width*dpr)return;
  resizeDpr=dpr;canvas.width=SIZE.width*dpr;canvas.height=SIZE.height*dpr;
  pen=canvas.getContext('2d',{alpha:true});
  if(pen)pen.setTransform(dpr,0,0,dpr,0,0);
 }
 const rect=(x,y,w,h,r,colour)=>{
  pen.beginPath();pen.roundRect(x,y,w,h,r);pen.fillStyle=colour;pen.fill();
 };
 function dot(x,y,r,fill,glow=0){
  pen.save();pen.beginPath();pen.arc(x,y,r,0,Math.PI*2);
  pen.fillStyle=fill;pen.shadowBlur=glow;pen.shadowColor=fill;pen.fill();pen.restore();
 }
 function paint(time=0){
  if(!pen||!root)return;
  const {rows,risk,multipliers}=settings();
  const {width,height}=SIZE,colour=colours[risk]||colours.medium;
  pen.clearRect(0,0,width,height);
  const field=pen.createLinearGradient(0,0,width,height);
  field.addColorStop(0,'#101b34');field.addColorStop(.54,'#102d4a');field.addColorStop(1,'#071b30');
  rect(8,6,width-16,height-12,20,field);
  pen.save();pen.strokeStyle='rgba(123,165,207,.075)';pen.lineWidth=1;
  for(let x=36;x<width;x+=51){pen.beginPath();pen.moveTo(x,45);pen.lineTo(x,542);pen.stroke();}
  for(let y=52;y<550;y+=46){pen.beginPath();pen.moveTo(36,y);pen.lineTo(width-36,y);pen.stroke();}
  pen.restore();
  pen.save();pen.fillStyle='#9fd5e0';pen.textAlign='center';pen.font='750 12px system-ui, sans-serif';
  pen.fillText('REWARD SLOTS',SIZE.center,546);
  pen.restore();
  // Separate graphical payout slots, always aligned to the server's exact bin.
  const step=spacing(rows);
  for(let slot=0;slot<=rows;slot++){
   const cents=multipliers[slot]||0;
   const x=slotX(rows,slot),w=step*.89;
   let col=slot===highlightSlot?'#f9d271':cents>=1000?'#e6b55c':cents>=100?'#2ca989':'#5c617b';
   if(slot===highlightSlot){
    pen.save();pen.shadowColor='#ffe899';pen.shadowBlur=25;
    rect(x-w/2,SIZE.slotsY,w,52,6,'#f7d277');pen.restore();
   }else rect(x-w/2,SIZE.slotsY,w,52,6,col);
   pen.fillStyle=slot===highlightSlot?'#172637':'#eff9f7';
   pen.font=(rows===16?'700 11px':'800 13px')+' system-ui, sans-serif';
   pen.textAlign='center';pen.textBaseline='middle';
   pen.fillText(fmt(cents).replace('×','x'),x,SIZE.slotsY+24);
  }
  // Peg lights are rendered once per frame; active collisions light up briefly.
  for(let row=0;row<rows;row++){
   const y=pegY(rows,row);
   for(let index=0;index<=row;index++){
    const x=pegX(rows,row,index);
    dot(x,y,5.7,'#193f68',7);
    dot(x,y,3.4,'#d7eaff',4);
   }
  }
  if(time){
   paintParticles=paintParticles.filter(spark=>time-spark.at<500);
   for(const spark of paintParticles){
    const p=(time-spark.at)/500;
    pen.save();pen.globalAlpha=1-p;
    for(let j=0;j<5;j++){
     const a=j*Math.PI*2/5+spark.seed;
     dot(spark.x+Math.cos(a)*(6+19*p),spark.y+Math.sin(a)*(6+19*p),2.8*(1-p)+.4,spark.colour,12);
    }
    pen.restore();
   }
  }
  for(const ball of paintBalls){
   const x=ball.x,y=ball.y;
   if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   dot(x,y,17,ball.colour+'24',24);
   dot(x,y,9.5,ball.colour,22);
   dot(x-2.9,y-3.6,3.3,'#ffffff',4);
  }
 }
 function renderSlots(){
  if(!root)return;
  const {rows,risk,multipliers,count,wager}=settings();
  const container=root.querySelector('[data-plinko-slots]');
  if(container){
   container.innerHTML=multipliers.map((cents,slot)=>
    '<span class="plinko-slot-value '+(slot===highlightSlot?'plinko-slot-landed':'')+
    '" data-plinko-slot="'+slot+'" title="Slot '+(slot+1)+' · '+fmt(cents)+'">'+fmt(cents)+'</span>').join('');
   container.style.setProperty('--plinko-slots',String(rows+1));
  }
  const stake=root.querySelector('[data-plinko-stake]');
  if(stake)stake.textContent=Number.isSafeInteger(wager)?safeNumber(wager*count)+' pts':'—';
  const action=root.querySelector('[data-plinko-submit]');
  if(action){
   action.textContent='🔴 Drop '+count+' ball'+(count===1?'':'s');
   action.disabled=busy||!Number.isSafeInteger(wager)||wager<1||
    wager*count>availableBalance();
  }
  if(canvas)canvas.setAttribute('aria-label','Plinko board, '+rows+' rows, '+risk+' risk, '+(rows+1)+' multiplier slots');
 }
 const message=(text,isError=false)=>{
  const label=root?.querySelector('[data-plinko-message]');
  if(!label)return;
  label.textContent=text;
  label.classList.toggle('plinko-message-error',isError);
 };
 function saveSettings(){
  if(!form)return;
  const state=settings();
  try{localStorage.setItem(selectionKey,JSON.stringify({
   at:Date.now(),rows:state.rows,risk:state.risk,count:state.count
  }));}catch{}
 }
 function rememberWager(){
  const input=form?.querySelector('[data-plinko-wager]');
  if(!input)return;
  const wager=Number(input.value);
  if(!Number.isSafeInteger(wager)||wager<1)return;
  try{localStorage.setItem(wagerKey,JSON.stringify({wager,at:Date.now()}));}catch{}
 }
 function hydrateSettings(){
  if(!form)return;
  const stamp=Number(form.querySelector('[data-plinko-wager]')?.dataset.lastRoundAt||0);
  let selection=null;
  try{selection=parseJSON(localStorage.getItem(selectionKey),null);}catch{}
  if(selection&&Number(selection.at)>stamp){
   if([8,12,16].includes(selection.rows))form.elements.namedItem('rows').value=String(selection.rows);
   if(['low','medium','high'].includes(selection.risk)){
    const radio=form.querySelector('input[name="risk"][value="'+selection.risk+'"]');
    if(radio)radio.checked=true;
   }
   if([1,5,10,25,50,100].includes(selection.count)){
    const count=form.querySelector('input[name="count"][value="'+selection.count+'"]');
    if(count)count.checked=true;
   }
  }
  let saved=null;
  try{saved=parseJSON(localStorage.getItem(wagerKey),null);}catch{}
  if(saved&&Number(saved.at)>stamp&&Number.isSafeInteger(saved.wager)&&saved.wager>=1)
   form.querySelector('[data-plinko-wager]').value=String(saved.wager);
 }
 function mount(){
  root=document.querySelector('[data-plinko-root]');
  if(!root)return;
  form=root.querySelector('[data-plinko-form]');
  canvas=root.querySelector('[data-plinko-canvas]');
  tables=parseJSON(root.dataset.plinkoTables,null);
  last=parseJSON(root.dataset.plinkoLast,null);
  if(!tables||!form||!canvas)return;
  resizeDpr=0;setCanvasDpr();
  hydrateSettings();
  renderSlots();
  highlightSlot=last?.balls?.length===1?last.balls[0].slot:-1;
  paintBalls=[];paintParticles=[];
  paint();
  setProfit(profit);
 }
 const positions=(rows,decisions)=>{
  const coords=[{x:SIZE.center,y:58},{x:SIZE.center,y:SIZE.firstY}];
  let rights=0;
  for(let row=0;row<rows;row++){
   rights+=decisions[row];
   coords.push({
    x:SIZE.center+(2*rights-(row+1))*spacing(rows)/2,
    y:row===rows-1?SIZE.slotsY+4:pegY(rows,row+1)
   });
  }
  return coords;
 };
 function validBalls(round){
  const rows=Number(round?.details?.rows);
  const count=Number(round?.details?.count);
  const balls=round?.details?.balls;
  if(![8,12,16].includes(rows)||![1,5,10,25,50,100].includes(count)||!Array.isArray(balls)||balls.length!==count)return null;
  const result=[];
  for(const ball of balls){
   if(!Array.isArray(ball.decisions)||ball.decisions.length!==rows||
      ball.decisions.some(v=>v!==0&&v!==1))return null;
   const slot=ball.decisions.reduce((n,v)=>n+v,0);
   if(slot!==ball.slot||slot<0||slot>rows)return null;
   result.push({slot,multiplierCents:ball.multiplierCents,payout:ball.payout,wager:ball.wager,
    coords:positions(rows,ball.decisions),lastPeg:-1,landed:false});
  }
  return result;
 }
 function sparksAt(point,time,colour,index){
  paintParticles.push({x:point.x,y:point.y,at:time,colour,seed:(index%5)*1.26});
  if(paintParticles.length>70)paintParticles.shift();
 }
 function animate(result,done){
  const balls=validBalls(result);
  if(!balls){done();return;}
  runner?.skip?.();
  busy=true;renderSlots();
  const rows=result.details.rows;
  const style=motion();
  if(style==='instant'||document.visibilityState==='hidden'||!pen){
   highlightSlot=balls.at(-1).slot;renderSlots();paint();
   done();return;
  }
  const reduced=style==='reduced',msPerPeg=reduced?55:128,delay=balls.length>=50?(reduced?12:30):balls.length>=25?(reduced?25:65):(reduced?85:180);
  const journey=(rows+1)*msPerPeg;
  const beginning=performance.now();
  const skip=root.querySelector('[data-plinko-skip]');
  if(skip)skip.hidden=false;
  const colour=colours[result.details.risk]||'#5fe2c7';
  let finished=false,lastSound=0;
  function finish(){
   if(finished)return;finished=true;
   if(frame)cancelAnimationFrame(frame);frame=0;
   paintBalls=[];paintParticles=[];
   highlightSlot=balls.at(-1).slot;renderSlots();paint();
   if(skip)skip.hidden=true;
   runner=null;
   done();
  }
  runner={skip:finish};
  function step(now){
   if(finished||!root?.isConnected){finish();return;}
   let allDone=true;
   paintBalls=[];
   for(let i=0;i<balls.length;i++){
    const ball=balls[i],elapsed=now-beginning-i*delay;
    if(elapsed<0){allDone=false;continue;}
    const proportion=Math.max(0,Math.min(1,elapsed/journey));
    if(proportion<1)allDone=false;
    const points=ball.coords;
    const where=proportion*(points.length-1);
    const index=Math.min(points.length-2,Math.floor(where));
    const phase=Math.max(0,Math.min(1,where-index));
    const eased=phase*phase*(3-2*phase);
    const start=points[index],end=points[index+1];
    const x=start.x+(end.x-start.x)*eased;
    const y=start.y+(end.y-start.y)*phase-2.8*Math.sin(phase*Math.PI);
    paintBalls.push({x,y,colour});
    const collided=Math.min(rows-1,index-1);
    if(collided>ball.lastPeg){
     for(let row=ball.lastPeg+1;row<=collided;row++)if(row>=0){
      sparksAt(points[row+1],now,colour,row+i);
      if(now-lastSound>65&&!reduced){
       experience()?.play('peg',(row+i)%7);lastSound=now;
      }
     }
     ball.lastPeg=collided;
    }
    if(proportion>=1&&!ball.landed){
     ball.landed=true;highlightSlot=ball.slot;
     sparksAt({x:slotX(rows,ball.slot),y:SIZE.slotsY+4},now,'#ffe49b',i);
     experience()?.play(ball.payout>=ball.wager?'win':'loss');
    }
   }
   paint(now);
   if(allDone)finish();
   else frame=requestAnimationFrame(step);
  }
  message('Server result confirmed · following the exact saved ball path');
  frame=requestAnimationFrame(step);
 }
 function installResult(payload,round){
  const old=root?.closest('.arcade-root');
  if(!old)return;
  const template=document.createElement('template');
  template.innerHTML=String(payload.html||'').trim();
  const updated=template.content.querySelector('.arcade-root');
  if(!updated){
   message('Round saved on the server. Open Arcade history to review the result.',true);
   busy=false;renderSlots();return;
  }
  const previousCount=Number(round.wager);
  const previousPayout=Number(round.payout);
  if(Number.isSafeInteger(previousCount)&&Number.isSafeInteger(previousPayout))
   setProfit(profit+previousPayout-previousCount);
  old.replaceWith(updated);
  if(payload.url){
   try{history.replaceState(null,'',payload.url);}catch{}
  }
  busy=false;
  mount();
  message('Drop complete · '+(round.payout-round.wager>=0?'+':'')+
   safeNumber(round.payout-round.wager)+' net points');
 }
 async function submit(eventForm){
  if(busy||eventForm!==form)return;
  if(!form.reportValidity())return;
  const selected=settings();
  const available=availableBalance();
  if(!Number.isSafeInteger(selected.wager)||selected.wager<1||
     selected.wager*selected.count>available){
   message('Not enough points for that batch. Lower your wager or ball count.',true);
   return;
  }
  busy=true;renderSlots();paintBalls=[];paintParticles=[];highlightSlot=-1;paint();
  message('Confirming your drop with the game server…');
  const data=new URLSearchParams(new FormData(form));
  const endpoint=form.action;
  try{
   const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'manual',
    headers:{Accept:'application/json','x-arcade-async':'1','Content-Type':'application/x-www-form-urlencoded'},
    body:data});
   const payload=await response.json();
   if(!response.ok||payload?.ok!==true)throw Error(payload?.error||'Unable to confirm the Plinko drop.');
   const round=payload.round;
   if(!round||!round.details)throw Error('Round settled, but the animation data was unavailable. Check your history.');
   animate(round,()=>installResult(payload,round));
  }catch(error){
   busy=false;
   renderSlots();
   message((error?.message||'Unable to confirm the drop.')+' Check history before retrying.',true);
   // The same UUID remains in the original form for a safe, idempotent retry.
  }
 }
 document.addEventListener('submit',event=>{
  const target=event.target;
  if(!(target instanceof HTMLFormElement)||!target.matches('[data-plinko-form]'))return;
  event.preventDefault();
  void submit(target);
 });
 document.addEventListener('change',event=>{
  if(!root?.contains(event.target)||busy)return;
  if(event.target.matches('[name="rows"],[name="risk"],[name="count"]')){
   highlightSlot=-1;saveSettings();renderSlots();paint();
  }
 });
 document.addEventListener('input',event=>{
  if(!root?.contains(event.target)||busy)return;
  if(event.target.matches('[data-plinko-wager]')){rememberWager();renderSlots();}
 });
 document.addEventListener('click',event=>{
  const quick=event.target.closest?.('[data-plinko-quick]');
  if(quick&&root?.contains(quick)&&!busy){
   const wager=form.querySelector('[data-plinko-wager]');
   wager.value=String(quick.dataset.plinkoQuick);rememberWager();renderSlots();
   experience()?.play('click');return;
  }
  if(event.target.closest?.('[data-plinko-skip]')&&root?.contains(event.target)){
   runner?.skip?.();return;
  }
  if(event.target.closest?.('[data-plinko-replay]')&&root?.contains(event.target)&&!busy&&last){
   // A previous round may have used a different board size or risk.
   // Recreate that exact payout board before replaying its saved peg path.
   const previous=settings(),details=last;
   if([8,12,16].includes(details.rows))form.elements.namedItem('rows').value=String(details.rows);
   if(['low','medium','high'].includes(details.risk)){
    const radio=form.querySelector('input[name="risk"][value="'+details.risk+'"]');
    if(radio)radio.checked=true;
   }
   const replay={details:{rows:details.rows,risk:details.risk,count:details.count,balls:details.balls}};
   highlightSlot=-1;renderSlots();paint();
   animate(replay,()=>{
    form.elements.namedItem('rows').value=String(previous.rows);
    const originalRisk=form.querySelector('input[name="risk"][value="'+previous.risk+'"]');
    if(originalRisk)originalRisk.checked=true;
    busy=false;renderSlots();paint();
    message('Replay finished · no points wagered');
   });
  }
 });
 window.addEventListener('resize',()=>{if(!root)return;setCanvasDpr();paint();},{passive:true});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);runner=null;},{once:true});
 mount();
})();
