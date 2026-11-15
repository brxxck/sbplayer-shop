// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Reusable cinematic presentation and original synthesized sound cues.
// Server-confirmed results alone qualify. Audio and motion never affect wallets.
(() => {
 if(!document.body.dataset.page?.startsWith('/arcade'))return;
 const memberId=document.body.dataset.siteUser||'guest';
 const preferenceKey='sb-arcade:experience:'+memberId;
 const reducedOS=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const fallback={sound:true,volume:45,motion:reducedOS?'reduced':'full'};
 let prefs={...fallback};
 try{
  const saved=JSON.parse(localStorage.getItem(preferenceKey)||'null');
  if(saved&&typeof saved==='object'){
   prefs.sound=typeof saved.sound==='boolean'?saved.sound:fallback.sound;
   prefs.volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(100,saved.volume)):45;
   prefs.motion=['full','reduced','instant'].includes(saved.motion)?saved.motion:fallback.motion;
  }
 }catch{}
 let audio;
 function audioContext(){
  if(!prefs.sound||prefs.volume===0)return null;
  try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();return audio;}catch{return null;}
 }
 function note(frequency,at,duration=0.1,gain=.08,type='sine'){
  const ctx=audioContext();if(!ctx||ctx.state==='suspended')return;
  const osc=ctx.createOscillator(),amplitude=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(frequency,at);
  amplitude.gain.setValueAtTime(.0001,at);
  amplitude.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*prefs.volume/100),at+.012);
  amplitude.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(amplitude);amplitude.connect(ctx.destination);
  osc.start(at);osc.stop(at+duration+.02);
 }
 function play(cue){
  if(!prefs.sound)return;
  const ctx=audioContext();if(!ctx)return;
  if(ctx.state==='suspended'){void ctx.resume().catch(()=>{});return;}
  const now=ctx.currentTime+.01;
  if(cue==='bigwin'){
   [523.25,659.25,783.99,1046.5].forEach((tone,i)=>note(tone,now+i*.11,.28,.11,'triangle'));
   return;
  }
  // Synthesized cues reused by the shared, continuously running Crash game.
  if(cue==='launch'){
   [196,246.94,329.63,440].forEach((tone,i)=>note(tone,now+i*.095,.24,.085,'sawtooth'));
   return;
  }
  if(cue==='crash'){
   [310,220,146,98].forEach((tone,i)=>note(tone,now+i*.09,.25,.075,'sawtooth'));
   return;
  }
  if(cue==='cashout'){
   [523,784,1047].forEach((tone,i)=>note(tone,now+i*.10,.26,.085,'triangle'));
   return;
  }
  const sounds={click:[360,.06,.04,'triangle'],chip:[630,.09,.07,'sine'],
   card:[240,.08,.025,'triangle'],peg:[880,.035,.02,'sine'],
   win:[720,.16,.07,'sine'],loss:[180,.15,.045,'triangle'],countdown:[580,.075,.042,'triangle']};
  const spec=sounds[cue]||sounds.click;
  note(spec[0],now,spec[1],spec[2],spec[3]);
 }
 document.addEventListener('pointerdown',()=>{const ctx=audioContext();if(ctx?.state==='suspended')void ctx.resume().catch(()=>{});},{passive:true});
 function save(){
  try{localStorage.setItem(preferenceKey,JSON.stringify(prefs));}catch{}
  document.documentElement.dataset.arcadeMotion=prefs.motion;
  for(const button of document.querySelectorAll('[data-arcade-sound]')){
   const label=prefs.sound?'🔊 Sound on':'🔇 Sound off';
   if(button.textContent!==label)button.textContent=label;
   const pressed=prefs.sound?'true':'false';
   if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);
  }
  for(const select of document.querySelectorAll('[data-arcade-motion]'))
   if(select.value!==prefs.motion)select.value=prefs.motion;
 }
 document.addEventListener('click',event=>{
  const toggle=event.target.closest?.('[data-arcade-sound]');
  if(!toggle)return;
  prefs.sound=!prefs.sound;save();
  if(prefs.sound)play('click');
 });
 document.addEventListener('change',event=>{
  if(!event.target.matches?.('[data-arcade-motion]'))return;
  const motion=event.target.value;
  if(!['full','reduced','instant'].includes(motion))return;
  prefs.motion=motion;save();
 });
 const touched=new Set();
 function scan(){
  save();
  const wins=document.querySelectorAll('.arcade-root [data-arcade-bigwin="1"]');
  for(const win of wins){
   const id=String(win.dataset.arcadeRound||'');
   const profit=Number(win.dataset.arcadeProfit||0);
   const settled=Number(win.dataset.arcadeSettled||0);
   if(!id||touched.has(id)||!Number.isSafeInteger(profit)||profit<250||!settled||
      Math.abs(Date.now()-settled)>120000)continue;
   touched.add(id);
   const seenKey='sb-arcade:cinematic-seen:'+memberId+':'+id;
   try{if(localStorage.getItem(seenKey))continue;localStorage.setItem(seenKey,'1');}catch{}
   celebrate(profit);
  }
 }
 let overlay=null;
 function celebrate(profit){
  if(prefs.motion==='instant')return;
  const reduced=prefs.motion==='reduced'||reducedOS;
  overlay?.remove();
  overlay=document.createElement('div');
  overlay.className='arcade-cinematic'+(reduced?' arcade-cinematic-reduced':'');
  overlay.setAttribute('role','status');
  overlay.setAttribute('aria-live','polite');
  overlay.innerHTML='<div class="arcade-cinematic-backdrop"></div>'+
   '<div class="arcade-cinematic-stage"><span class="arcade-cinematic-eyebrow">SB ARCADE</span>'+
   '<div class="arcade-cinematic-symbol" aria-hidden="true">✦</div>'+
   '<h2>BIG WIN!</h2><div class="arcade-cinematic-profit" data-cinematic-profit></div>'+
   '<p>Points profit added to your balance</p><button class="arcade-cinematic-skip" type="button">Continue →</button></div>';
  document.body.append(overlay);
  const counter=overlay.querySelector('[data-cinematic-profit]');
  const format=n=>'+'+Math.round(n).toLocaleString('en-GB')+' pts';
  let frame=0,closed=false;
  const dismiss=()=>{
   if(closed)return;closed=true;
   if(frame)cancelAnimationFrame(frame);
   overlay?.remove();overlay=null;
  };
  overlay.querySelector('button').addEventListener('click',dismiss,{once:true});
  const start=performance.now(),duration=reduced?0:1700;
  function tick(at){
   if(closed)return;
   const fraction=duration===0?1:Math.min(1,(at-start)/duration);
   counter.textContent=format(profit*(1-Math.pow(1-fraction,3)));
   if(fraction<1)frame=requestAnimationFrame(tick);
  }
  tick(start);
  if(!reduced){
   for(let i=0;i<25;i++){
    const spark=document.createElement('i');
    spark.className='arcade-cinematic-spark';
    spark.style.left=((i*47+13)%100)+'%';
    spark.style.animationDelay=(i%11)*.09+'s';
    spark.style.animationDuration=(1.3+(i%6)*.22)+'s';
    overlay.append(spark);
   }
  }
  if(!reduced)play('bigwin');
  // Never trap the player; the celebration ends even if no interaction occurs.
  const currentOverlay=overlay;
  setTimeout(()=>{if(overlay===currentOverlay&&currentOverlay.isConnected)dismiss();},reduced?1500:4400);
 }
 // Future Blackjack and Plinko modules can use the same sound engine.
 window.SBArcadeExperience={play,getPreferences:()=>({...prefs})};
 save();
 const target=document.querySelector('main.content');
 if(target)new MutationObserver(scan).observe(target,{childList:true,subtree:true});
 scan();
})();
