// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Counts down to the server's actual midnight UTC daily-reward reset.
(()=>{
  const timer=document.querySelector('[data-daily-reset-countdown]');
  if(!timer)return;
  const resetAt=Number(timer.dataset.resetAt);
  const serverNow=Number(timer.dataset.serverNow);
  if(!Number.isSafeInteger(resetAt)||!Number.isSafeInteger(serverNow)||resetAt<=0)return;
  const startedAt=performance.now();
  const localStartedAt=Date.now();
  const pad=n=>String(n).padStart(2,'0');
  let reloaded=false;
  function render(){
    // The displayed countdown uses UTC reset timestamps from the server,
    // avoiding browser timezone and clock-skew errors.
    const elapsed=Math.max(0,performance.now()-startedAt,Date.now()-localStartedAt);
    const seconds=Math.max(0,Math.ceil((resetAt-serverNow-elapsed)/1000));
    const hours=Math.floor(seconds/3600);
    const minutes=Math.floor(seconds%3600/60);
    const remainder=seconds%60;
    timer.textContent=pad(hours)+':'+pad(minutes)+':'+pad(remainder);
    if(seconds===0&&!reloaded){
      reloaded=true;
      // Reload the new server-selected game challenges at midnight UTC.
      window.location.reload();
    }
  }
  render();
  window.setInterval(render,1000);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)render();
  });
})();
