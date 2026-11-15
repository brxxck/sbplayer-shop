// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Live lobby counters and temporary seat heartbeat; no points are moved here.
(() => {
 const root=document.querySelector('[data-online-games]');
 if(!root)return;
 const csrf=document.body.dataset.siteCsrf||'';
 const number=value=>Number(value||0).toLocaleString('en-GB');
 let joined=false,alive=true,pollBusy=false,beatBusy=false;
 const set=(key,value)=>{
  const node=root.querySelector('[data-online-stat="'+key+'"]');
  if(node)node.textContent=value;
 };
 const status=(key,value)=>{
  const node=root.querySelector('[data-online-status="'+key+'"]');
  if(node)node.textContent=value;
 };
 const notice=root.querySelector('[data-online-connection]');
 function apply(snapshot){
  if(!snapshot||typeof snapshot!=='object'||!snapshot.blackjack||!snapshot.crash||!snapshot.roulette)return;
  const bj=snapshot.blackjack,crash=snapshot.crash,roulette=snapshot.roulette;
  set('blackjack.seated',number(bj.seated)+' / 4');
  set('blackjack.waiting',number(bj.waiting));
  set('blackjack.lobbyPlayers',number(bj.lobbyPlayers));
  set('blackjack.roundPlayers',number(bj.roundPlayers));
  set('blackjack.roundWager',number(bj.roundWager)+' pts');
  set('crash.lobbyPlayers',number(crash.lobbyPlayers));
  set('crash.roundPlayers',number(crash.roundPlayers));
  set('crash.roundWager',number(crash.roundWager)+' pts');
  set('roulette.watching',number(roulette.watching));
  set('roulette.roundPlayers',number(roulette.roundPlayers));
  set('roulette.roundWager',number(roulette.roundWager)+' pts');
  set('roulette.phase',roulette.phase==='spinning'?'SPINNING':roulette.phase==='results'?'RESULT':'BETTING');
  status('blackjack',bj.joined?(bj.atTable?'You have a seat (#'+number(bj.position)+').':
    'You are #'+number(bj.position)+' in the waiting queue.'):'You have not joined the preview lobby.');
  status('crash',crash.joined?'You are in the shared Crash preview lobby.':
    'You have not joined the shared Crash preview lobby.');
  joined=!!(bj.joined||crash.joined);
  // When a membership expires, show the accurate button action without
  // submitting any background join or changing the user's queue position.
  for(const [game,state] of [['blackjack',bj],['crash',crash]]){
   const card=root.querySelector('[data-online-game="'+game+'"]');
   const form=card?.querySelector('.online-join-form');
   const button=form?.querySelector('button');
   if(!form||!button)continue;
   form.action='/arcade/online/'+(state.joined?'leave':'join');
   button.textContent=state.joined?'Leave lobby':game==='blackjack'?'Join Blackjack queue':'Join Global Crash';
   button.className='btn '+(state.joined?'btn-outline':'btn-primary');
  }
  if(notice)notice.textContent='Live lobby counts';
 }
 async function poll(){
  if(!alive||pollBusy||document.visibilityState==='hidden')return;
  pollBusy=true;
  try{
   const response=await fetch('/arcade/online/state',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Not connected');
   apply(await response.json());
  }catch{if(notice)notice.textContent='Connection interrupted · refresh to retry';}
  finally{pollBusy=false;}
 }
 async function heartbeat(){
  if(!alive||!joined||beatBusy||!csrf||document.visibilityState==='hidden')return;
  beatBusy=true;
  try{
   const response=await fetch('/arcade/online/heartbeat',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({_csrf:csrf})
   });
   if(!response.ok)throw Error('Heartbeat declined');
   apply(await response.json());
  }catch{if(notice)notice.textContent='Lobby connection lost · refresh to rejoin';}
  finally{beatBusy=false;}
 }
 const p=setInterval(()=>{void poll();},6000);
 const h=setInterval(()=>{void heartbeat();},20000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){void heartbeat();void poll();}});
 window.addEventListener('pagehide',()=>{alive=false;clearInterval(p);clearInterval(h);});
 void poll();
})();
