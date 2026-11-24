// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Plinko uses the same Arcade chrome, point balance, history and cinematic engine.
import {randomUUID} from 'node:crypto';
import {esc,token} from './views.js';
import {chrome,historyList,resultBox} from './arcade-views.js';
import {PLINKO_ROWS,PLINKO_RISKS,PLINKO_COUNTS,PLINKO_TABLES} from './plinko.js';

const n=value=>Number(value||0).toLocaleString('en-GB');
const mult=cents=>(cents/100).toFixed(2)+'×';
const payoutSlots=table=>'<div class="plinko-multiplier-list" data-plinko-slots aria-label="Slot payouts">'+
 table.map((cents,slot)=>'<span class="plinko-slot-value" data-plinko-slot="'+slot+
 '" title="Slot '+(slot+1)+' payout '+mult(cents)+'">'+mult(cents)+'</span>').join('')+'</div>';
const riskControl=(risk)=>'<fieldset class="plinko-risk"><legend>Risk level</legend>'+
 PLINKO_RISKS.map(level=>'<label class="plinko-risk-'+level+'"><input name="risk" type="radio" value="'+level+'"'+
 (level===risk?' checked':'')+'><span><b>'+level[0].toUpperCase()+level.slice(1)+'</b>'+
 '<small>'+(level==='low'?'Smoother payouts':level==='medium'?'Balanced rewards':'Rare big multipliers')+'</small></span></label>').join('')+
 '</fieldset>';
const countControls=count=>'<fieldset class="plinko-ball-count"><legend>Balls per drop</legend>'+
 PLINKO_COUNTS.map(c=>'<label><input type="radio" name="count" value="'+c+'"'+
 (c===count?' checked':'')+'><span>'+c+' ball'+(c===1?'':'s')+'</span></label>').join('')+'</fieldset>';

export function plinkoPage(ctx,summary,{round=null,rounds=[]}={}){
 const latest=round||rounds[0]||null;
 const saved=latest?.details||{};
 const rows=PLINKO_ROWS.includes(saved.rows)?saved.rows:12;
 const risk=PLINKO_RISKS.includes(saved.risk)?saved.risk:'medium';
 const count=PLINKO_COUNTS.includes(saved.count)?saved.count:1;
 const wager=Number.isSafeInteger(saved.perBall)&&saved.perBall>=1?saved.perBall:50;
 const table=PLINKO_TABLES[rows][risk];
 const result=latest?{
  id:latest.id,rows:saved.rows,risk:saved.risk,count:saved.count,
  wager:latest.wager,payout:latest.payout,
  balls:Array.isArray(saved.balls)?saved.balls:[],
  createdAt:latest.created_at
 }:null;
 const encoded=esc(JSON.stringify(result));
 const state=esc(JSON.stringify(PLINKO_TABLES));
 const selectRows='<select name="rows" data-plinko-rows>'+
  PLINKO_ROWS.map(n=>'<option value="'+n+'"'+(rows===n?' selected':'')+'>'+n+' rows · '+(n+1)+' slots</option>').join('')+
 '</select>';
 // Compact results prevent 25-100 ball drops from filling the page.
 const resultChip=b=>'<span class="plinko-last-chip '+(b.payout>=b.wager?'win':'loss')+'">'+
  mult(b.multiplierCents)+' <small>'+(b.payout-b.wager>=0?'+':'')+n(b.payout-b.wager)+' pts</small></span>';
 const lastBalls=Array.isArray(saved.balls)?saved.balls:[];
 const topBalls=lastBalls.slice(0,12),remainingBalls=lastBalls.slice(12);
 const ballResult=latest?'<section class="plinko-last panel padded" data-plinko-last-result>'+
  '<div class="arcade-section-title"><h2>Last drop</h2><span>'+
  n(saved.count)+' ball'+(saved.count===1?'':'s')+' · '+esc(saved.risk)+' risk</span></div>'+
  '<div class="plinko-last-results">'+topBalls.map(resultChip).join('')+'</div>'+
  (remainingBalls.length?'<details class="plinko-last-more"><summary>Show all '+lastBalls.length+
   ' results ('+remainingBalls.length+' more)</summary><div class="plinko-last-results">'+
   remainingBalls.map(resultChip).join('')+'</div></details>':'')+
  '<div class="plinko-last-actions"><div><small>TOTAL NET PROFIT</small><strong class="'+
  (latest.payout>=latest.wager?'plinko-profit':'plinko-loss')+'">'+
  (latest.payout-latest.wager>=0?'+':'')+n(latest.payout-latest.wager)+' pts</strong></div>'+
  '<button type="button" class="btn btn-outline" data-plinko-replay>↻ Replay last drop</button></div>'+
  '</section>':'';
 const panel='<section class="plinko-panel panel padded">'+
  '<div class="arcade-section-title"><h2>🔴 SB Plinko</h2><span>Full animation · live point payouts</span></div>'+
  '<div class="plinko-layout">'+
  '<div class="plinko-stage"><div class="plinko-canvas-box">'+
  '<canvas data-plinko-canvas width="800" height="640" role="img" aria-label="Plinko peg board with '+rows+' rows">'+
  'Plinko board: choose risk and rows and drop balls to play.</canvas>'+
  '<div class="plinko-board-label"><span class="plinko-board-ribbon">SB</span>'+
  '<b>PLINKO</b><small>FALL · BOUNCE · WIN</small></div>'+
  '<div class="plinko-board-notice" data-plinko-message role="status" aria-live="polite">'+
  'Choose your wager and drop a ball</div>'+
  '</div>'+payoutSlots(table)+
  '<div class="plinko-board-actions">'+
  '<button type="button" class="btn btn-outline" data-plinko-skip hidden>Skip animation →</button></div></div>'+
  '<aside class="plinko-controls">'+
  '<div class="plinko-controls-title"><h3>Place your wager</h3><small>Level Points only</small></div>'+
  '<form action="/arcade/plinko/drop" method="post" class="plinko-form arcade-form" data-plinko-form>'+
  token(ctx)+'<input type="hidden" name="request_id" value="'+randomUUID()+'">'+
  '<label class="arc-label">Wager per ball <input type="number" min="1" step="1" name="wager"'+
  ' inputmode="numeric" data-plinko-wager data-arcade-wager="plinko" data-last-round-at="'+
  (latest?.created_at||0)+'" value="'+wager+'" required></label>'+
  '<div class="plinko-quick-wagers">'+[10,50,100,250,500,1000].map(value=>
   '<button type="button" data-plinko-quick="'+value+'">'+n(value)+'</button>').join('')+'</div>'+
  '<label class="arc-label">Board size'+selectRows+'</label>'+
  riskControl(risk)+countControls(count)+
  '<div class="plinko-stake-summary"><div><span>TOTAL WAGER</span><strong data-plinko-stake>'+
  n(wager*count)+' pts</strong></div><div><span>YOUR BALANCE</span><strong data-plinko-balance data-plinko-wallet="'+Number(summary.balance)+'">'+
  n(summary.balance)+' pts</strong></div></div>'+
  '<button class="btn btn-primary plinko-drop-btn" data-plinko-submit type="submit">🔴 Drop '+count+
  ' ball'+(count===1?'':'s')+'</button>'+
  '<p class="muted tiny">Each peg makes an independently random left/right choice. The ball animation follows the exact saved server result. Payouts are rounded down to whole points.</p>'+
  '</form><div class="plinko-session"><span>THIS SESSION</span><strong data-plinko-session>0 pts</strong>'+
  '<small>Net points won or lost while this tab is open</small></div>'+
  '</aside></div></section>';
 return chrome(ctx,'Plinko',summary,
  '<div class="plinko-root" data-plinko-root data-plinko-tables="'+state+
  '" data-plinko-last="'+encoded+'" data-plinko-user="'+esc(ctx.user?.id||'')+'">'+
  panel+ballResult+historyList(rounds)+'</div>');
}
