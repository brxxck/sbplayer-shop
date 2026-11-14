// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Presentation only. Every result, wager, and award is verified and settled on the server.
const arcadeRoot=document.querySelector('.arcade-root');
if(arcadeRoot){
  const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const form of arcadeRoot.querySelectorAll('form[action^="/arcade/"]')){
    form.addEventListener('submit',event=>{
      if(event.defaultPrevented||!form.reportValidity())return;
      const button=event.submitter||form.querySelector('button[type="submit"]');
      if(!button||button.disabled)return;
      // Lock the submitted button on navigation, not on input or validation failure.
      button.disabled=true;
      window.addEventListener('pageshow',()=>{button.disabled=false;},{once:true});
    });
  }
  if(!prefersReducedMotion){
    const stage=arcadeRoot.querySelector('[data-coin-stage][data-coin-result]:not([data-coin-result=""])');
    stage?.querySelector('.arcade-coin-disc')?.classList.add('animated');
    for(const reel of arcadeRoot.querySelectorAll('[data-slot-reels] .arcade-reel'))reel.classList.add('animated');
  }
  const game=arcadeRoot.querySelector('[data-crash-game]');
  if(game){
    const multiplier=game.querySelector('[data-crash-multiplier]');
    const message=game.querySelector('[data-crash-message]');
    const collect=game.querySelector('[data-crash-collect]');
    let state=null,offset=0,loading=false;
    const display=(value)=>Math.max(1,value).toFixed(2)+'×';
    function paint(){
      if(!state?.round||state.round.status!=='active')return;
      const at=Date.now()+offset,started=state.round.startedAt;
      if(at<started){
        multiplier.textContent='1.00×';
        message.textContent='Starting in '+Math.max(1,Math.ceil((started-at)/1000))+'…';
        if(collect)collect.disabled=true;
      }else{
        const scaled=Math.min(30,Math.exp((at-started)/5000));
        multiplier.textContent=display(scaled);
        message.textContent='Collect your points before it crashes';
        if(collect)collect.disabled=false;
      }
    }
    async function refresh(){
      if(loading||document.visibilityState==='hidden')return;
      loading=true;
      try{
        const response=await fetch('/arcade/api/crash/state',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
        if(!response.ok)throw Error('Refresh failed');
        const data=await response.json();
        if(!data||!('round' in data))return;
        const former=state?.round;
        offset=Number(data.serverNow||Date.now())-Date.now();
        state=data;
        const round=data.round;
        if(round?.status==='active'){paint();return;}
        if(former?.status==='active'){window.location.reload();return;}
        if(round?.status==='lost'){
          game.querySelector('.arcade-crash-display')?.classList.add('crashed');
          multiplier.textContent=display((round.crashAt||100)/100);
          message.textContent='Crashed!';
        }else if(round?.status==='cashed_out'){
          multiplier.textContent=display((round.cashAt||100)/100);
          message.textContent='Points collected!';
        }
      }catch{
        if(message&&state?.round?.status==='active')message.textContent='Checking the round with the server…';
      }finally{loading=false;}
    }
    refresh();
    if(game.dataset.crashActive==='1'){
      const animation=setInterval(paint,90);
      const polling=setInterval(refresh,850);
      window.addEventListener('pagehide',()=>{clearInterval(animation);clearInterval(polling);},{once:true});
    }
  }
}
