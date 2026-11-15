// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Solo Blackjack table, rendered with the shared Arcade chrome and card styles.
// Only public cards and server-authorized actions are displayed.
import {randomUUID} from 'node:crypto';
import {esc,token} from './views.js';
import {chrome,historyList} from './arcade-views.js';
const fmt=n=>Number(n||0).toLocaleString('en-GB');
const symbols={S:'♠',H:'♥',D:'♦',C:'♣'};
const labels={won:'WIN',lost:'LOSS',push:'PUSH',blackjack:'BLACKJACK · 3:2',bust:'BUST'};
export const soloCardMarkup=card=>{
 if(card?.back)return '<span class="bj-card bj-card-back" aria-label="Face-down card"><span>SB</span></span>';
 const rank=esc(card?.rank||'?');
 const suit=esc(symbols[card?.suit]||'♠');
 const color=['H','D'].includes(card?.suit)?'bj-card-red':'bj-card-black';
 return '<span class="bj-card '+color+'" aria-label="'+rank+' '+suit+'">'+
  '<span class="bj-card-corner">'+rank+'<small>'+suit+'</small></span>'+
  '<span class="bj-card-symbol">'+suit+'</span>'+
  '<span class="bj-card-corner bj-card-rotated">'+rank+'<small>'+suit+'</small></span></span>';
};
const handLabel=h=>h.outcome?labels[h.outcome]||h.outcome.toUpperCase():
 h.done?(h.value?.total===21?'21 · STAND':'STAND'):'YOUR TURN';
export function soloTableMarkup(state){
 const dealer=state.dealer.length?state.dealer.map(soloCardMarkup).join(''):
  '<div class="sbj-empty-cards"><span class="bj-card bj-card-back"><span>SB</span></span>'+
  '<span class="bj-card bj-card-back"><span>SB</span></span></div>';
 const hands=state.hands.map((h,i)=>
  '<section class="sbj-hand '+(state.activeIndex===i?'sbj-hand-active ':'')+
   (['won','blackjack'].includes(h.outcome)?'sbj-hand-win':h.outcome==='lost'||h.outcome==='bust'?'sbj-hand-loss':'')+
   '" aria-label="Hand '+(i+1)+'">'+
   '<div class="sbj-hand-title"><strong>'+ (state.hands.length>1?'HAND '+(i+1):'YOUR HAND')+'</strong>'+
   '<span>'+fmt(h.wager)+' pts wagered</span></div>'+
   '<div class="sbj-player-cards">'+h.cards.map(soloCardMarkup).join('')+'</div>'+
   '<div class="sbj-hand-bottom"><strong>'+fmt(h.value.total)+'</strong>'+
   '<span>'+esc(handLabel(h))+'</span>'+
   (h.doubled?'<small>DOUBLED</small>':'')+'</div></section>'
 ).join('');
 return '<div class="sbj-felt" data-sbj-felt data-sbj-phase="'+esc(state.phase)+'">'+
  '<div class="sbj-table-shimmer" aria-hidden="true"></div>'+
  '<div class="sbj-dealer"><div class="sbj-dealer-tag"><span>SB DEALER</span><b>'+
   (state.dealerValue?fmt(state.dealerValue.total)+' POINTS':'HIDDEN CARD')+'</b></div>'+
   '<div class="sbj-dealer-cards">'+dealer+'</div></div>'+
  '<div class="sbj-table-logo" aria-hidden="true"><strong>SB BLACKJACK</strong>'+
   '<small>6 DECKS · STANDS ON SOFT 17 · NATURAL 3:2</small></div>'+
  '<div class="sbj-table-hands">'+(hands||
   '<div class="sbj-start-placeholder"><span class="sbj-placeholder-chip" aria-hidden="true">✦</span>'+
   '<strong>YOUR TABLE IS READY</strong><p>Choose your wager and deal the cards below.</p></div>')+'</div>'+
  '</div>';
}
const resultMarkup=state=>{
 if(state.phase!=='settled')return '';
 const good=state.profit>0;
 return '<section class="sbj-result '+(good?'sbj-result-won':'sbj-result-lost')+'" aria-live="polite" role="status">'+
  '<div class="sbj-result-label"><span>'+esc(good?'ROUND WON':state.profit===0?'PUSH · BET RETURNED':'ROUND COMPLETE')+'</span>'+
  '<strong>'+(state.profit>0?'+':'')+fmt(state.profit)+' pts</strong></div>'+
  '<div class="sbj-receipt"><span>Wagered <b>'+fmt(state.wager)+'</b></span>'+
  '<span>Returned <b>'+fmt(state.payout)+'</b></span></div>'+
  '<p>'+ (state.hands.some(h=>h.outcome==='blackjack')?
   'Natural Blackjack pays 3:2. Payouts are rounded down to whole points.':
   'The dealer has finished playing. Your result has been saved to history.')+'</p></section>';
};
function wagerForm(ctx,state){
 const wager=Math.min(1000,Math.max(10,Number(state.lastWager)||50));
 return '<form action="/arcade/blackjack/start" method="post" class="sbj-wager-form" data-sbj-form data-sbj-start>'+
  token(ctx)+'<input type="hidden" name="request_id" value="'+randomUUID()+'">'+
  '<label>YOUR WAGER <input type="number" name="wager" min="10" max="1000" step="1" required'+
   ' data-sbj-wager data-arcade-wager="blackjack_solo" data-last-round-at="'+String(Number(state.lastWagerAt)||0)+'" value="'+wager+'"></label>'+
  '<div class="sbj-chip-values" role="group" aria-label="Quick wager amounts">'+
  [10,25,50,100,250,500,1000].map(v=>'<button type="button" data-sbj-quick="'+v+'">'+fmt(v)+'</button>').join('')+
  '</div><button class="btn btn-primary sbj-deal" type="submit" '+(state.balance<10?'disabled':'')+
  '>♠ Deal Cards</button></form>';
}
function actionsMarkup(ctx,state){
 if(state.phase!=='playing'||!state.actions.length)return '';
 return '<div class="sbj-action-buttons" role="group" aria-label="Blackjack actions">'+
  state.actions.map(action=>
   '<form action="/arcade/blackjack/action" method="post" data-sbj-form data-sbj-action>'+
   token(ctx)+'<input type="hidden" name="round_id" value="'+state.roundId+'">'+
   '<input type="hidden" name="revision" value="'+state.revision+'">'+
   '<input type="hidden" name="request_id" value="'+randomUUID()+'">'+
   '<input type="hidden" name="move" value="'+action+'">'+
   '<button class="btn '+(action==='stand'?'btn-outline':'btn-primary')+'" type="submit">'+
   ({hit:'🎴 Hit',stand:'✋ Stand',double:'✦ Double Down',split:'♠ Split'}[action])+'</button></form>'
  ).join('')+'</div>';
}
export function soloControlsMarkup(ctx,state){
 const stateLabel=state.phase==='playing'?'Choose an action for your highlighted hand.':
  state.phase==='settled'?'Hand settled. Ready for another round.':
  'Place your wager to deal a private hand.';
 return '<div class="sbj-controls-inner">'+
  '<div class="sbj-stats"><div><small>AVAILABLE POINTS</small><strong>'+fmt(state.balance)+'</strong></div>'+
   '<div><small>POINTS WAGERED</small><strong>'+fmt(state.wager)+'</strong></div>'+
   '<div><small>HANDS IN PLAY</small><strong>'+fmt(state.hands.length)+'</strong></div></div>'+
  '<p class="sbj-message" data-sbj-message>'+esc(stateLabel)+'</p>'+
  (state.canBet?wagerForm(ctx,state):'')+
  (state.activeRoundId&&state.activeRoundId!==state.roundId?'<a class="btn btn-primary sbj-resume" href="/arcade/blackjack?round='+state.activeRoundId+'">♠ Resume your active hand</a>':'')+
  (state.balance<10&&!state.activeRoundId?'<p class="sbj-message">You need at least 10 points to start. <a href="/points">Claim Level Points →</a></p>':'')+
  actionsMarkup(ctx,state)+resultMarkup(state)+
  '<p class="sbj-safe-note">Your hand is saved on the server. Closing the page does not discard it or risk a duplicate wager.</p>'+
  '</div>';
}
export function soloBlackjackPage(ctx,summary,state,rounds){
 const initial=esc(JSON.stringify(state));
 const cinematic=state.phase==='settled'&&state.cinematic?'<span hidden data-arcade-bigwin="1" data-arcade-round="blackjack_solo:'+state.roundId+
  '" data-arcade-profit="'+state.profit+'" data-arcade-settled="'+state.settledAt+'"></span>':'';
 return chrome(ctx,'Solo Blackjack',summary,
  '<div class="sbj-root" data-solo-blackjack-root data-sbj-state="'+initial+'">'+
  '<header class="sbj-intro"><div><p>♠ SB ARCADE · PRIVATE TABLE</p>'+
  '<h2>Play Blackjack against the dealer</h2>'+
  '<span>Instant rounds, full card animations and cinematic wins. Your turn is yours — no multiplayer timer.</span></div>'+
  '<a class="btn btn-outline" href="/arcade/online/blackjack">♠ Multiplayer Blackjack</a></header>'+
  '<div class="sbj-connection" data-sbj-connection aria-live="polite">Private table ready</div>'+
  '<div data-sbj-table>'+soloTableMarkup(state)+'</div>'+
  '<section class="sbj-controls" data-sbj-controls>'+soloControlsMarkup(ctx,state)+'</section>'+
  cinematic+
  '<section class="panel padded sbj-rules"><h2>How Solo Blackjack works</h2>'+
  '<p>Start with 10–1,000 Level Points. Hit, Stand, Double Down (one additional card) or Split a matching pair once. Split aces draw one extra card each. Doubling and splitting each reserve an additional equal wager. Dealer stands on every 17, including soft 17. A natural Blackjack pays 3:2, a normal win 1:1 and a tie returns the wager. Fractional payouts round down to whole points.</p>'+
  '<p class="muted tiny">Only virtual community points are used. All cards, balances and payouts are confirmed by the server. Your current hand resumes after refresh.</p></section>'+
  historyList(rounds)+'</div>');
}
