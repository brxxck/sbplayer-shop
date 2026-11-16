// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Profile-targeted virtual-points challenges. Uses the website's authenticated SSE connection.
(() => {
 const me=document.body.dataset.siteUser||'';
 if(!me||document.body.dataset.siteMember!=='1')return;
 const csrf=()=>document.body.dataset.siteCsrf||'';
 const headers={'accept':'application/json','x-arcade-challenge':'1'};
 let currentId=null,actionBusy=false,pollBusy=false;
 const dismissed=new Set();
 const label=face=>face==='heads'?'SB (Heads)':'CAM (Tails)';
 const other=face=>face==='heads'?'tails':'heads';
 const count=n=>Number(n||0).toLocaleString('en-GB');
 const overlay=document.createElement('dialog');
 overlay.className='arcade-challenge-overlay';
 overlay.setAttribute('aria-label','Coin Flip challenge');
 overlay.innerHTML=
  '<div class="arcade-challenge-content">'+
   '<div class="arcade-challenge-mark" aria-hidden="true">🪙</div>'+
   '<p class="arcade-challenge-kicker" data-pvp-kicker>INCOMING CHALLENGE</p>'+
   '<h2 data-pvp-title>You’ve been challenged!</h2>'+
   '<p class="arcade-challenge-summary" data-pvp-message></p>'+
   '<div class="arcade-challenge-versus">'+
    '<div><div class="pvp-side-symbol pvp-side-sb" data-pvp-left-art>SB</div><strong data-pvp-left-name></strong><small data-pvp-left-face></small></div>'+
    '<b>VS</b>'+
    '<div><div class="pvp-side-symbol pvp-side-cam" data-pvp-right-art>CAM</div><strong data-pvp-right-name></strong><small data-pvp-right-face></small></div>'+
   '</div>'+
   '<div class="arcade-pvp-coin-scene" hidden data-pvp-coin-scene><div class="arcade-pvp-coin" data-pvp-coin><span>SB</span><span>CAM</span></div></div>'+
   '<div class="arcade-challenge-wager"><small data-pvp-wager-title>YOUR WAGER</small><strong data-pvp-wager></strong><span data-pvp-pot></span></div>'+
   '<p class="arcade-challenge-feedback" data-pvp-feedback role="status"></p>'+
   '<div class="arcade-challenge-buttons" data-pvp-actions>'+
    '<button type="button" class="btn btn-primary" data-pvp-accept>Accept Challenge</button>'+
    '<button type="button" class="btn btn-outline" data-pvp-decline>Decline</button>'+
   '</div>'+
   '<button type="button" class="arcade-pvp-later" data-pvp-later>Remind me later</button>'+
   '<a href="/members" class="btn btn-outline arcade-pvp-finish" data-pvp-finish hidden>View Members</a>'+
   '<button type="button" class="btn btn-quiet arcade-pvp-close" data-pvp-close hidden>Close</button>'+
  '</div>';
 document.body.append(overlay);
 const get=name=>overlay.querySelector('[data-pvp-'+name+']');
 function setText(name,value){const node=get(name);if(node)node.textContent=String(value??'');}
 const show=()=>{
  if(!overlay.open){
   if(typeof overlay.showModal==='function')overlay.showModal();
   else overlay.setAttribute('open','');
  }
 };
 const close=()=>{
  currentId=null;
  if(overlay.open&&typeof overlay.close==='function')overlay.close();
  else overlay.removeAttribute('open');
 };
 const setSide=(side,who,face)=>{
  const art=get(side+'-art');
  if(art){
   art.className='pvp-side-symbol '+(face==='heads'?'pvp-side-sb':'pvp-side-cam');
   art.textContent=face==='heads'?'SB':'CAM';
  }
  setText(side+'-name',who);
  setText(side+'-face',label(face));
 };
 function showIncoming(c){
  if(!c||!Number.isSafeInteger(Number(c.id)))return;
  currentId=Number(c.id);
  overlay.dataset.mode='incoming';
  setText('kicker','INCOMING COIN FLIP CHALLENGE');
  setText('title','You’ve been challenged!');
  setText('message',(c.creator_name||'A member')+' wants to flip against you.');
  setSide('left',c.creator_name||'Challenger',c.face);
  setSide('right','You',other(c.face));
  setText('wager-title','YOUR WAGER');
  setText('wager',count(c.wager)+' points');
  setText('pot','Winner receives '+count(c.wager*2)+' points');
  setText('feedback','You can accept, decline, or decide later. No points are deducted until you accept.');
  get('actions').hidden=false;get('later').hidden=false;
  get('finish').hidden=true;get('close').hidden=true;
  get('coin-scene').hidden=true;
  show();
 }
 function showResult(c){
  if(!c||c.status!=='complete'||!c.result)return;
  const leftFace=c.face;
  const rightFace=other(c.face);
  currentId=Number(c.id);
  overlay.dataset.mode='result';
  const won=c.winner_id===me;
  setText('kicker',won?'CHALLENGE WON':'CHALLENGE COMPLETE');
  setText('title',won?'You won the Coin Flip!':'Coin Flip complete');
  setText('message','Coin landed on '+label(c.result)+'.');
  setSide('left',c.creator_name||'Challenger',leftFace);
  setSide('right',c.target_name||c.joiner_name||'Opponent',rightFace);
  setText('wager-title',won?'POINTS RETURNED':'YOUR WAGER');
  setText('wager',count(won?c.wager*2:c.wager)+' points');
  setText('pot',won?'Profit: +'+count(c.wager)+' points':'You lost '+count(c.wager)+' points');
  setText('feedback','Both wallets have been settled by the server.');
  get('actions').hidden=true;get('later').hidden=true;get('finish').hidden=false;get('close').hidden=false;
  get('finish').href='/u/'+(me===c.creator_id?c.target_id||c.joiner_id:c.creator_id);
  const scene=get('coin-scene'),coin=get('coin');
  scene.hidden=false;
  coin.className='arcade-pvp-coin '+(c.result==='tails'?'pvp-result-cam':'pvp-result-sb');
  // Re-trigger only the animation; the actual landing side is server-selected.
  void coin.offsetWidth;
  coin.classList.add('pvp-flip-animated');
  show();
 }
 async function readJson(response){
  let json;
  try{json=await response.json();}catch{throw Error('Unexpected website response.');}
  if(!response.ok||json?.ok===false)throw Error(json?.error||'Unable to process the challenge.');
  return json;
 }
 async function getDetails(id){
  const response=await fetch('/arcade/api/challenges/'+encodeURIComponent(id),
   {credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
  return (await readJson(response)).challenge;
 }
 async function loadIncoming(){
  if(pollBusy||overlay.open)return;
  pollBusy=true;
  try{
   const response=await fetch('/arcade/api/challenges/incoming',
    {credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
   const data=await readJson(response);
   const next=(data.challenges||[]).find(c=>!dismissed.has(Number(c.id)));
   if(next)showIncoming(next);
  }catch{/* A private invitation never blocks the rest of the website. */}
  finally{pollBusy=false;}
 }
 async function act(action){
  if(actionBusy||!currentId)return;
  actionBusy=true;
  const buttons=[...get('actions').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  setText('feedback','Checking your points and settling the challenge…');
  try{
   const response=await fetch('/arcade/coinflip/challenges/'+currentId+'/'+action,{
    method:'POST',credentials:'same-origin',cache:'no-store',redirect:'manual',headers,
    body:new URLSearchParams({_csrf:csrf()})
   });
   const data=await readJson(response);
   if(action==='join'&&data.challenge.status==='complete'){showResult(data.challenge);}
   else{
    dismissed.add(Number(currentId));
    close();
    void loadIncoming();
   }
  }catch(error){setText('feedback',error.message||'Please retry.');}
  finally{actionBusy=false;buttons.forEach(b=>b.disabled=false);}
 }
 get('accept').addEventListener('click',()=>void act('join'));
 get('decline').addEventListener('click',()=>void act('decline'));
 get('later').addEventListener('click',()=>{if(currentId)dismissed.add(Number(currentId));close();});
 get('close').addEventListener('click',()=>{close();void loadIncoming();});
 overlay.addEventListener('cancel',event=>{
  if(actionBusy){event.preventDefault();return;}
  if(currentId&&overlay.dataset.mode==='incoming')dismissed.add(Number(currentId));
  close();
 });
 window.addEventListener('sb:arcade-challenge',async event=>{
  const data=event.detail||{};
  if(!Number.isSafeInteger(Number(data.id)))return;
  if(data.action==='created'){void loadIncoming();return;}
  try{
   const detail=await getDetails(data.id);
   if(detail.status==='complete')showResult(detail);
   else if(detail.status!=='open'){dismissed.add(Number(data.id));if(currentId===Number(data.id))close();}
   if(!overlay.open)void loadIncoming();
  }catch{}
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&!overlay.open)void loadIncoming();
 });
 // Member profile challenge setup. Forms are handled independently of the
 // site's global save mechanism, keeping the member on the same profile.
 const trigger=document.querySelector('[data-open-coin-challenge]');
 const setup=document.querySelector('[data-profile-challenge-dialog]');
 if(trigger&&setup){
  trigger.addEventListener('click',()=>{if(typeof setup.showModal==='function')setup.showModal();else setup.setAttribute('open','');});
  setup.querySelector('[data-close-coin-challenge]')?.addEventListener('click',()=>{
   if(typeof setup.close==='function')setup.close();else setup.removeAttribute('open');
  });
  const form=setup.querySelector('[data-profile-challenge-form]');
  // // BUILT BY SB // RUNING ON WEED AND CAFFEINE
  // PvP stakes have their own saved value, separate from House Coin Flip.
  const stake=form?.querySelector('input[data-pvp-wager]');
  const stakeKey='sb-store:arcade:wager:'+me+':coinflip_pvp';
  const saveStake=()=>{
   if(!stake||!/^\d+$/.test(stake.value))return;
   const wager=Number(stake.value);
   if(!Number.isSafeInteger(wager)||wager<10||wager>10000)return;
   try{localStorage.setItem(stakeKey,JSON.stringify({wager,at:Date.now()}));}catch{}
  };
  if(stake){
   try{
    const saved=JSON.parse(localStorage.getItem(stakeKey)||'null');
    if(saved&&Number.isSafeInteger(saved.wager)&&saved.wager>=10&&saved.wager<=10000&&
       Number.isFinite(saved.at)&&saved.at>=Number(stake.dataset.lastRoundAt||0)){
      stake.value=String(saved.wager);
    }
   }catch{}
   stake.addEventListener('input',saveStake);
   stake.addEventListener('change',saveStake);
  }
  form?.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!form.reportValidity()||form.dataset.sending)return;
   saveStake();
   form.dataset.sending='1';
   const button=form.querySelector('button[type=submit]');
   const status=setup.querySelector('[data-profile-challenge-status]');
   if(button)button.disabled=true;
   status.textContent='Sending challenge…';
   try{
    const response=await fetch(form.action,{
     method:'POST',credentials:'same-origin',cache:'no-store',redirect:'manual',
     headers,body:new URLSearchParams(new FormData(form))
    });
    const json=await readJson(response);
    status.textContent='Challenge sent! Points reserved. The member will be notified.';
    status.className='profile-challenge-success';
    form.querySelector('input[name=request_id]').value=crypto.randomUUID();
    window.setTimeout(()=>{if(setup.open)setup.close();status.textContent='';},1400);
   }catch(error){status.className='profile-challenge-error';status.textContent=error.message||'Challenge could not be sent.';}
   finally{delete form.dataset.sending;if(button)button.disabled=false;}
  });
 }
 void loadIncoming();
})();
