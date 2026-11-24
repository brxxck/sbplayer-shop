// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Shared multiplayer Crash UI: everyone sees the same server-authoritative round.
// All text, balances and bets are generated from authenticated, persisted data.
import {randomUUID} from 'node:crypto';
import {shell,esc,token} from './views.js';
const n=value=>Number(value||0).toLocaleString('en-GB');
const mult=cents=>(Number(cents||100)/100).toFixed(2)+'×';
const formRequest=()=>'<input type="hidden" name="request_id" value="'+randomUUID()+'">';
const readonly=(ctx,state)=>state.joined?'':'<form method="post" class="gcr-join-form" action="/arcade/online/join">'+
 token(ctx)+'<input type="hidden" name="game" value="crash">'+
 '<input type="hidden" name="next" value="crash">'+
 '<button class="btn btn-primary" type="submit">🚀 Join Global Crash</button></form>';
function betControls(ctx,state){
 const bet=state.canBet;
 const personal=state.me;
 let message=!state.joined?'Join the shared game lobby to place points in the next round.':
  bet?'Betting is open. Place your wager before the timer reaches zero.':
  personal?.status==='active'&&state.phase==='betting'?'Wager confirmed. Waiting for launch.':
  personal?.status==='active'?'You are in this round. Cash out before the rocket crashes.':
  personal?.status==='cashed_out'?'Cashed out at '+mult(personal.cashAt)+'! Your points were credited.':
  personal?.status==='lost'?'The rocket crashed before you collected.':
  state.phase==='playing'?'Round in progress. Join the next betting window.':
  state.phase==='settled'?'Result confirmed. The next round opens automatically.':'Waiting for the next round.';
 const wager=Math.max(1,Number(state.lastWager)||50);
 const auto=Number(state.lastAutoAt||0);
 const betForm='<form method="post" action="/arcade/online/crash/bet" class="gcr-bet-form" data-gcr-form data-gcr-bet>'+
  token(ctx)+formRequest()+'<input type="hidden" name="round_id" value="'+esc(state.roundId)+'">'+
  '<div class="gcr-bet-inputs"><label>Wager in points <input type="number" min="1" step="1" name="wager" data-gcr-wager value="'+wager+'" required></label>'+
  '<label>Auto-collect (optional) <input type="number" min="1.10" max="20" step="0.01" name="auto_at" data-gcr-auto placeholder="Off" value="'+(auto?(auto/100).toFixed(2):'')+'"></label></div>'+
  '<div class="gcr-quick-wagers">'+[10,50,100,500,1000].map(value=>'<button type="button" data-gcr-quick="'+value+'">'+n(value)+'</button>').join('')+'</div>'+
  '<button type="submit" class="btn btn-primary gcr-submit" '+(state.balance<1?'disabled':'')+'>🚀 Place wager</button></form>';
 const cash='<form method="post" action="/arcade/online/crash/collect" data-gcr-form data-gcr-collect>'+
  token(ctx)+formRequest()+'<input type="hidden" name="round_id" value="'+esc(state.roundId)+'">'+
  '<button type="submit" class="btn btn-primary gcr-cashout">💰 CASH OUT</button></form>';
 const personalStats=personal?'<div class="gcr-bet-receipt"><div><span>YOUR WAGER</span><strong>'+n(personal.wager)+' pts</strong></div>'+
  '<div><span>'+(!personal.status||personal.status==='active'?'CURRENT PROFIT':'ROUND PROFIT')+'</span>'+
  '<strong class="'+(personal.profit<0?'gcr-loss':'gcr-profit')+'" data-gcr-profit>'+
  (personal.profit!==null?(personal.profit>0?'+':'')+n(personal.profit):
  personal.currentProfit!==null?(personal.currentProfit>0?'+':'')+n(personal.currentProfit):'Pending')+
  (personal.profit!==null||personal.currentProfit!==null?' pts':'')+'</strong></div></div>':'';
 return '<div class="gcr-controls" data-gcr-controls>'+
  '<div class="gcr-control-title"><h2>Play Global Crash</h2><span data-gcr-phase-label>'+esc(state.phase)+'</span></div>'+
  '<p class="gcr-player-message" data-gcr-message>'+esc(message)+'</p>'+
  readonly(ctx,state)+(bet?betForm:'')+(state.canCashout?cash:'')+personalStats+
  '<div class="gcr-wallet"><span>YOUR BALANCE</span><strong data-gcr-wallet>'+n(state.balance)+' pts</strong></div></div>';
}
function players(state){
 return '<div class="gcr-players" data-gcr-players>'+
  (state.players.map(p=>'<div class="gcr-player-row"><span class="gcr-player-name">'+esc(p.name)+'</span>'+
   '<strong>'+n(p.wager)+' pts</strong><span class="gcr-player-status '+(p.status==='cashed_out'?'collected':p.status==='lost'?'lost':'active')+'">'+
   (p.status==='cashed_out'?'✓ '+mult(p.cashAt):p.status==='lost'?'Lost':'Playing')+'</span></div>').join('')||
   '<p class="gcr-empty">No wagers yet. Be the first to join this round.</p>')+
  '</div>';
}
function history(state){
 return '<div class="gcr-history" data-gcr-history>'+
  state.recent.map(r=>'<div class="gcr-history-chip '+(r.crashAt<200?'gcr-history-low':r.crashAt>=1000?'gcr-history-high':'')+
   '" title="Round #'+r.roundId+'">'+mult(r.crashAt)+'</div>').join('')+
  (state.recent.length?'':'<span class="muted">No completed rounds yet</span>')+'</div>';
}
export function globalCrashPage(ctx,summary,state){
 return shell(ctx,'Global Crash','<div class="arcade-root gcr-root" data-global-crash-root>'+
  '<div class="arcade-header gcr-hero"><div><div class="arcade-eyebrow">SB ARCADE · LIVE MULTIPLAYER</div>'+
  '<h1>🚀 Global Crash <span class="gcr-live">● LIVE</span></h1>'+
  '<p>One continuous game, shared across the entire website. Place points before launch and collect before the rocket crashes.</p></div>'+
  '<a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong data-gcr-header-wallet>'+n(summary.balance)+' ✦</strong><small>Shared Arcade wallet</small></a></div>'+
  '<div class="gcr-topbar"><a class="btn btn-outline" href="/arcade/online">← Online Games</a>'+
  '<div class="arcade-experience-options"><button type="button" data-arcade-sound aria-pressed="true" class="arcade-experience-sound">🔊 Sound on</button>'+
  '<label>Animations <select data-arcade-motion><option value="full">Full</option>'+
  '<option value="reduced">Reduced</option><option value="instant">Instant</option></select></label></div>'+
  '<span class="gcr-connection" data-gcr-connection>Connecting…</span></div>'+
  '<div class="gcr-layout"><section class="gcr-main">'+
  '<div class="gcr-gameboard" data-gcr-gameboard data-gcr-phase="'+esc(state.phase)+'">'+
  '<div class="gcr-stars" aria-hidden="true"></div>'+
  '<div class="gcr-multiplier" data-gcr-multiplier>'+mult(state.multiplierCents)+'</div>'+
  '<div class="gcr-countdown" data-gcr-countdown aria-live="off">Connecting to the current round…</div>'+
  '<svg class="gcr-svg" viewBox="0 0 800 330" preserveAspectRatio="none" aria-hidden="true">'+
  '<defs><linearGradient id="gcrFlightLine" x1="0" y1="1" x2="1" y2="0">'+
  '<stop offset="0%" stop-color="#0e8fba"/><stop offset="100%" stop-color="#60f8b5"/></linearGradient>'+
  '<linearGradient id="gcrFlightFill" x1="0" y1="0" x2="0" y2="1">'+
  '<stop offset="0%" stop-color="#36e6a24f"/><stop offset="100%" stop-color="#16416410"/></linearGradient></defs>'+
  '<path data-gcr-fill d="" fill="url(#gcrFlightFill)"/>'+
  '<path data-gcr-path d="" fill="none" stroke="url(#gcrFlightLine)" stroke-width="5" stroke-linecap="round"/></svg>'+
  '<div class="gcr-rocket" data-gcr-rocket aria-hidden="true">🚀<span class="gcr-thrust"></span></div>'+
  '<div class="gcr-boom" aria-hidden="true">💥</div>'+
  '<div class="gcr-round-label">GLOBAL ROUND <strong data-gcr-round>#'+n(state.roundId||0)+'</strong></div>'+
  '</div><section class="gcr-stats" aria-label="Current multiplayer round statistics">'+
  '<div><span>PLAYERS IN GAME</span><strong data-gcr-stat="players">'+n(state.roundPlayers)+'</strong></div>'+
  '<div><span>TOTAL POINTS IN GAME</span><strong data-gcr-stat="wager">'+n(state.roundWager)+' pts</strong></div>'+
  '<div><span>STILL FLYING</span><strong data-gcr-stat="active">'+n(state.activePlayers)+'</strong></div>'+
  '<div><span>CASHED OUT</span><strong data-gcr-stat="collected">'+n(state.collectedPlayers)+'</strong></div></section>'+
  '<div class="gcr-fairness"><span>PRE-ROUND COMMITMENT</span><code data-gcr-commitment>'+esc(state.commitment||'—')+'</code>'+
  '<span data-gcr-seed-label hidden>REVEALED SERVER SEED</span><code data-gcr-seed hidden></code>'+
  '<p data-gcr-fairness-note>Server-generated outcome; the hidden seed is revealed after the round finishes.</p></div>'+
  '<section class="panel padded gcr-history-panel"><div class="arcade-section-title"><h2>Recent crashes</h2>'+
  '<span>Latest results across the website</span></div>'+history(state)+'</section>'+
  '</section><aside class="gcr-sidebar">'+betControls(ctx,state)+
  '<section class="gcr-participant-panel"><div class="gcr-player-title"><h2>Players in this round</h2>'+
  '<span data-gcr-lobby>'+n(state.lobbyPlayers)+' in lobby</span></div>'+
  players(state)+'</section></aside></div>'+
  '<section class="panel padded gcr-rules"><h2>How Global Crash works</h2>'+
  '<p>Rounds start automatically, even when nobody is playing. Wager at least 1 Discord Level Point during the betting countdown. The rocket rises from 1.00×, and you may collect at any moment before it crashes. Set an optional 1.10×–20.00× auto-collect target so the server collects when the target is reached, even if your browser disconnects. Theoretical return for fixed auto-collect strategies is approximately 96%; actual outcomes vary.</p>'+
  '<p>Every wager, collection and loss is recorded server-side. The pre-round hash commitment and revealed seed make each completed crash value independently verifiable. Players cannot purchase or withdraw points for money.</p></section>'+
 '</div>');
}
