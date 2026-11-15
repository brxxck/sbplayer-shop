// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Shared Roulette table. Display-only odds and options originate from
// the server's canonical bet catalogue; all outcomes and payments stay server-side.
import {randomUUID} from 'node:crypto';
import {shell,esc,token} from './views.js';
import {arcadeMobileMenu} from './arcade-views.js';
import {ROULETTE_WHEEL,ROULETTE_BETS,rouletteColor} from './roulette-rules.js';
const n=value=>Number(value||0).toLocaleString('en-GB');
const colour=num=>'roulette-number-'+rouletteColor(num);
const button=(key,label,extra='')=>'<button type="button" class="roulette-choice '+extra+
 '" data-roulette-choice="'+esc(key)+'">'+esc(label)+'</button>';

function bettingTable(){
 const grid=Array.from({length:12},(_,r)=>'<div class="roulette-number-row">'+
  [1,2,3].map(col=>{
   const num=r*3+col;
   return button('number:'+num,String(num),colour(num));
  }).join('')+'</div>').join('');
 const outside=[
  ['half:low','1–18'],['parity:even','EVEN'],['color:red','RED'],
  ['color:black','BLACK'],['parity:odd','ODD'],['half:high','19–36']
 ].map(([key,label])=>button(key,label,key.startsWith('color:')?'roulette-'+key.slice(6):''));
 return [
  '<div class="roulette-betting-table">',
  '<div class="roulette-number-layout">',
  button('number:0','0','roulette-number-green roulette-zero'),
  '<div class="roulette-number-grid">',grid,'</div></div>',
  '<div class="roulette-group-label">DOZENS</div>',
  '<div class="roulette-dozens">',
  [1,2,3].map(i=>button('dozen:'+i,((i-1)*12+1)+'–'+(i*12))).join(''),'</div>',
  '<div class="roulette-group-label">EVEN-MONEY BETS</div>',
  '<div class="roulette-outside">',outside.join(''),'</div>',
  '<div class="roulette-group-label">COLUMNS</div>',
  '<div class="roulette-columns">',
  [1,2,3].map(i=>button('column:'+i,'COLUMN '+i)).join(''),'</div></div>'
 ].join('');
}
function history(state){
 return state.history.map(r=>'<span class="roulette-history-number '+colour(r.number)+
  '" title="Round #'+n(r.roundId)+'">'+n(r.number)+'</span>').join('')||
  '<span class="muted">No completed results</span>';
}
function players(state){
 if(!state.participants.length)return '<p class="muted">Nobody has bet this round yet.</p>';
 return state.participants.map(p=>'<div class="roulette-player"><span class="roulette-player-name">'+esc(p.name)+'</span>'+
  '<span>'+n(p.stake)+' pts</span><strong>'+
  (state.phase==='results'?(p.payout?n(p.payout)+' paid':'Lost'):'BET PLACED')+
  '</strong></div>').join('');
}
export function onlineRoulettePage(ctx,summary,state){
 const catalogue=esc(JSON.stringify(ROULETTE_BETS.map(b=>({key:b.key,type:b.type,label:b.label,odds:b.odds}))));
 const initial=esc(JSON.stringify(state)),wheel=esc(JSON.stringify(ROULETTE_WHEEL));
 const html=[
  '<div class="arcade-root roulette-root" data-roulette-root data-roulette-state="',initial,
  '" data-roulette-catalog="',catalogue,'" data-roulette-wheel="',wheel,'">',
  '<header class="arcade-header roulette-hero"><div>',
  '<div class="arcade-eyebrow">SB ARCADE · LIVE MULTIPLAYER</div>',
  '<h1>🎡 Live Roulette <span class="roulette-live">● LIVE TABLE</span></h1>',
  '<p>One European wheel shared by everyone. <b>30 full seconds to place bets</b>, then an 8-second spin and a 4-second reveal.</p>',
  '</div><a class="arcade-wallet" href="/points"><small>YOUR LEVEL POINTS</small>',
  '<strong data-roulette-balance>',n(summary.balance),' ✦</strong><small>Shared Arcade wallet</small></a></header>',
  arcadeMobileMenu(ctx,'Live Roulette'),
  '<div class="roulette-toolbar"><a href="/arcade/online" class="btn btn-outline">← Online Games</a>',
  '<div class="arcade-experience-options"><button type="button" class="arcade-experience-sound" data-arcade-sound aria-pressed="true">🔊 Sound on</button>',
  '<label>Animations <select data-arcade-motion><option value="full">Full</option><option value="reduced">Reduced</option><option value="instant">Instant</option></select></label></div>',
  '<span class="roulette-connection" data-roulette-connection>Connecting…</span></div>',
  '<section class="roulette-stats" aria-label="Current shared round statistics">',
  '<div><small>PLAYERS BETTING</small><strong data-roulette-stat="players">',n(state.roundPlayers),'</strong></div>',
  '<div><small>POINTS IN GAME</small><strong data-roulette-stat="wager">',n(state.roundWager),' pts</strong></div>',
  '<div><small>WATCHING</small><strong data-roulette-stat="watching">',n(state.watching),'</strong></div>',
  '<div><small>ROUND</small><strong data-roulette-stat="round">#',n(state.roundId),'</strong></div></section>',
  '<div class="roulette-layout"><section class="roulette-left">',
  '<div class="roulette-wheel-panel">',
  '<div class="roulette-wheel-header"><div><span class="roulette-eyebrow">GLOBAL WHEEL</span>',
  '<h2 data-roulette-phase-label>BETTING OPEN</h2></div>',
  '<div class="roulette-time"><small>TIME REMAINING</small><strong data-roulette-countdown>00:30</strong></div></div>',
  '<div class="roulette-wheel-box" data-roulette-wheel-box data-roulette-phase="',esc(state.phase),'">',
  '<canvas width="640" height="640" data-roulette-canvas role="img" aria-label="European roulette wheel with 37 pockets and a spinning ball">',
  'European Roulette wheel: 0 to 36, one green zero.</canvas>',
  '<div class="roulette-wheel-center"><small>SB ROULETTE</small>',
  '<strong data-roulette-center>',state.phase==='results'?n(state.winningNumber):'?', '</strong>',
  '<span data-roulette-wheel-caption>','BETTING IS OPEN','</span></div></div>',
  '<div class="roulette-history-panel"><span>RECENT RESULTS</span><div class="roulette-history" data-roulette-history>',
  history(state),'</div></div>',
  '<div class="roulette-proof"><strong>PRE-ROUND COMMITMENT</strong>',
  '<code data-roulette-commitment>',esc(state.commitment),'</code>',
  '<div data-roulette-seed-container',state.seed?'':' hidden','><strong>REVEALED SERVER SEED</strong>',
  '<code data-roulette-seed>',esc(state.seed||''),'</code></div>',
  '<p data-roulette-proof-status>Server result stays hidden until after the spin.</p></div></div>',
  '<section class="roulette-participants panel padded"><div class="roulette-section-title">',
  '<h2>Players in this round</h2><span data-roulette-participant-count>',n(state.roundPlayers),' players</span></div>',
  '<div class="roulette-player-list" data-roulette-participants>',players(state),'</div></section></section>',
  '<section class="roulette-right"><div class="roulette-betting-panel">',
  '<div class="roulette-section-title"><h2>Place your chips</h2><span class="roulette-betting-countdown"><span data-roulette-phase-mobile>Betting closes in</span> <strong data-roulette-countdown-mobile>00:30</strong></span></div>',
  '<p class="roulette-hint">Choose a chip value, then tap a number or outside bet. Edit your slip before confirming; points are only charged after confirmation.</p>',
  '<div class="roulette-chip-palette" role="group" aria-label="Chip value">',
  [10,25,50,100,250,500,1000].map(v=>
   '<button type="button" class="roulette-chip-option'+(v===10?' selected':'')+
   '" data-roulette-chip="'+v+'" aria-pressed="'+(v===10?'true':'false')+'">'+n(v)+'</button>').join(''),
  '</div>',bettingTable(),
  '<div class="roulette-special-bets"><label for="roulette-bet-group">Additional bets</label>',
  '<select id="roulette-bet-group" data-roulette-group>',
  '<option value="split">Split · 17:1</option><option value="street">Street · 11:1</option>',
  '<option value="corner">Corner · 8:1</option><option value="six">Six Line · 5:1</option></select>',
  '<div class="roulette-special-choices" data-roulette-special-choices></div></div>',
  '<section class="roulette-slip"><div class="roulette-section-title"><h2>Bet slip</h2>',
  '<button type="button" data-roulette-clear class="roulette-clear-btn">Clear</button></div>',
  '<div class="roulette-slip-list" data-roulette-slip><p class="muted">Choose a chip and tap the table.</p></div>',
  '<div class="roulette-slip-summary"><span>TOTAL PENDING</span><strong data-roulette-pending>0 pts</strong></div>',
  '<div class="roulette-slip-summary"><span>ALREADY WAGERED</span><strong data-roulette-already>',n(state.myWager),' pts</strong></div>',
  '<div class="roulette-slip-summary"><span>AVAILABLE</span><strong data-roulette-wallet>',n(state.balance),' pts</strong></div>',
  '<form method="post" action="/arcade/online/roulette/bet" data-roulette-form>',token(ctx),
  '<input type="hidden" name="round_id" data-roulette-form-round value="',String(state.roundId),'">',
  '<input type="hidden" name="request_id" data-roulette-request value="',randomUUID(),'">',
  '<input type="hidden" name="bets_json" data-roulette-bets-json value="[',esc('{"key":"color:red","stake":10}'),']">',
  '<button type="submit" class="btn btn-primary roulette-confirm" data-roulette-confirm disabled>Confirm bets</button></form>',
  '<button type="button" class="btn btn-outline roulette-repeat" data-roulette-repeat',
  state.repeatBets.length?'':' disabled','>↻ Repeat last confirmed bet</button>',
  '<p class="roulette-hint">10–1,000 points per chip, max 10,000 per player per round. Confirmed bets cannot be cancelled.</p>',
  '</section></div><div class="roulette-my-results"><div class="roulette-section-title">',
  '<h2>My round</h2><span data-roulette-my-status>Watching</span></div>',
  '<div data-roulette-my-bets><p class="muted">No confirmed bets yet.</p></div>',
  '<div class="roulette-round-profit"><span>ROUND PROFIT</span><strong data-roulette-my-profit>—</strong></div>',
  '</div></section></div>',
  '<section class="panel padded roulette-rules"><h2>How global Roulette works</h2>',
  '<p>Each round gives everyone <b>30 full seconds to bet</b>, followed by an <b>8-second wheel spin</b> and a <b>4-second result</b>. The next betting window starts automatically.</p>',
  '<p>European Roulette: number 35:1, split 17:1, street 11:1, corner 8:1, six-line 5:1, dozen/column 2:1, and even-money bets 1:1. Winning payouts include the original stake. Zero loses all even-money bets. Standard theoretical house edge: 2.70%.</p>',
  '<p>Only non-redeemable entertainment Level Points are used. Wheel motion and sounds never determine or alter server-generated results.</p></section>',
  '</div>'
 ].join('');
 return shell(ctx,'Live Roulette',html);
}
