// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Three-second public promotion notice. Never alters cards, odds or wallet state.
(() => {
 const solo=document.querySelector('[data-solo-blackjack-root]');
 const online=document.querySelector('[data-blackjack-root]');
 if(!solo&&!online)return;
 const toast=document.createElement('div');
 toast.className='blackjack-event-toast';
 toast.setAttribute('role','status');
 toast.setAttribute('aria-live','polite');
 toast.hidden=true;
 toast.textContent=solo?
  '♠ SOLO BLACKJACK EVENT LIVE — Double Down guarantees a winning payout while the event is on!':
  '♠ SOLO BLACKJACK EVENT LIVE — Double Down guarantees a win in Solo Blackjack (not this multiplayer table)!';
 document.body.appendChild(toast);
 let enabled=null,hideTimer=null,waiting=false,active=true;
 function notify(){
  if(hideTimer)clearTimeout(hideTimer);
  toast.hidden=false;
  hideTimer=setTimeout(()=>{toast.hidden=true;},3000);
 }
 async function refresh(){
  if(!active||waiting||document.visibilityState==='hidden')return;
  waiting=true;
  try{
   const response=await fetch('/arcade/blackjack/event',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)return;
   const data=await response.json();
   if(typeof data.enabled!=='boolean')return;
   if(data.enabled&&enabled!==true)notify();
   if(!data.enabled){toast.hidden=true;if(hideTimer)clearTimeout(hideTimer);}
   enabled=data.enabled;
  }catch{
   // A temporary connection issue never affects gameplay.
  }finally{waiting=false;}
 }
 void refresh();
 const poll=setInterval(()=>{void refresh();},4000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
 window.addEventListener('pagehide',()=>{active=false;clearInterval(poll);if(hideTimer)clearTimeout(hideTimer);});
})();
