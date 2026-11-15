// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Accessible, responsive four-seat Blackjack table. The browser never receives the shoe or hidden dealer card.
import {randomUUID} from 'node:crypto';
import {shell,esc,token} from './views.js';
const n=v=>Number(v||0).toLocaleString('en-GB');
const suits={S:'♠',H:'♥',D:'♦',C:'♣'};
const card=card=>{
 if(card?.back)return '<span class="bj-card bj-card-back" aria-label="Face-down card"><span>SB</span></span>';
 const symbol=suits[card?.suit]||'♠',rank=esc(card?.rank||'?'),red=['H','D'].includes(card?.suit);
 return '<span class="bj-card '+(red?'bj-card-red':'bj-card-black')+'" aria-label="'+rank+' of '+esc(card?.suit||'')+'">'+
  '<span class="bj-card-corner">'+rank+' <small>'+symbol+'</small></span>'+
  '<span class="bj-card-symbol">'+symbol+'</span>'+
  '<span class="bj-card-corner bj-card-rotated">'+rank+' <small>'+symbol+'</small></span></span>';
};
const labelOf=hand=>{
 if(hand.outcome==='blackjack')return 'BLACKJACK · 3:2';
 if(hand.outcome==='push')return 'PUSH';
 if(hand.outcome==='bust')return 'BUST';
 if(hand.outcome==='won')return 'WON';
 if(hand.outcome==='lost')return 'LOST';
 if(hand.done)return hand.autoStood?'AUTO STAND':'STAND';
 return hand.value?.total===21?'21':'PLAYING';
};
function seatMarkup(player,selfId,turnUser,turnHand){
 if(!player)return '<div class="bj-seat bj-seat-empty" role="group" aria-label="Empty seat"><div class="bj-seat-top"><b>Available seat</b></div><p>Waiting for a player</p></div>';
 const mine=player.userId===selfId,active=player.userId===turnUser,betting=!player.hands?.length;
 const hands=(player.hands||[]).map((h,index)=>
  '<div class="bj-hand '+(active&&index===turnHand?'bj-hand-current ':'')+(['won','blackjack'].includes(h.outcome)?'bj-hand-win':h.outcome==='lost'||h.outcome==='bust'?'bj-hand-lose':'')+'">'+
  '<div class="bj-cards">'+h.cards.map(card).join('')+'</div>'+
  '<div class="bj-hand-status"><strong>'+n(h.value?.total||0)+'</strong><span>'+esc(labelOf(h))+'</span>'+
  '<small>'+n(h.wager)+' pts</small></div></div>').join('');
 return '<div class="bj-seat '+(mine?'bj-seat-own ':'')+(active?'bj-seat-active':'')+'" role="group" aria-label="Seat '+n(player.seat)+'">'+
  '<div class="bj-seat-top"><span class="bj-seat-number">#'+n(player.seat)+'</span><b>'+esc(player.name)+'</b>'+(mine?'<span class="bj-you">YOU</span>':'')+'</div>'+
  (betting?'<div class="bj-seat-ready">'+(player.bet?'<span class="bj-chip">✦</span><strong>'+n(player.bet)+' pts ready</strong>':'Awaiting wager')+'</div>':hands)+
 '</div>';
}
function tableMarkup(state,selfId){
 const seats=[1,2,3,4].map(index=>seatMarkup(state.players.find(p=>p.seat===index),selfId,state.turnUser,state.handIndex));
 const dealerState=state.dealerValue?'Dealer · '+n(state.dealerValue.total):'Dealer';
 const phase=state.phase==='betting'?'BETTING OPEN':
  state.phase==='playing'?'CARDS IN PLAY':
  state.phase==='settled'?'ROUND COMPLETE':
  state.phase==='cancelled'?'NO BETS PLACED':'WAITING FOR PLAYERS';
 return '<div class="bj-table-surface" data-bj-surface>'+
  '<div class="bj-table-halo"></div>'+
  '<div class="bj-dealer-area"><div class="bj-dealer-header"><span class="bj-dealer-badge">SB DEALER</span><span data-bj-dealer-total>'+esc(dealerState)+'</span></div>'+
  '<div class="bj-dealer-cards" data-bj-dealer-cards>'+state.dealer.map(card).join('')+'</div></div>'+
  '<div class="bj-felt-logo"><strong>SB BLACKJACK</strong><small>6 DECKS · DEALER STANDS ON SOFT 17 · BLACKJACK PAYS 3:2</small></div>'+
  '<div class="bj-table-phase" data-bj-phase>'+phase+'</div>'+
  '<div class="bj-seats" data-bj-seats>'+seats.join('')+'</div>'+
  '</div>';
}
function playerStatus(state){
 if(!state.joined)return 'You are spectating. Click Join & Play to enter the queue and reserve the next available seat.';
 if(!state.reserved&&['betting','playing'].includes(state.phase))return 'You are queued for the next round. This table has already reserved its seats.';
 if(state.phase==='betting')return state.canBet?'Your seat is ready. Place your wager before the timer expires.':
  state.placedBet?'Wager placed. Waiting for the dealer to deal.':'Betting open. Your wager is already locked.';
 if(state.phase==='playing')return state.turnUser===state.playerId?'It is your turn. Choose an action.':
  'Cards are being played. Watch the table for your turn.';
 if(state.phase==='settled')return 'Round settled. A new betting window opens shortly.';
 return 'Waiting for the next table.';
}
function controls(ctx,state){
 const roundId=state.roundId||'';
 const join='<form method="post" action="/arcade/online/join" data-online-join-direct class="bj-join-direct">'+
  token(ctx)+'<input type="hidden" name="game" value="blackjack">'+
  '<input type="hidden" name="next" value="blackjack">'+
  '<button type="submit" class="btn btn-primary">♠ Join & Play Blackjack</button></form>';
 const wager=Number.isSafeInteger(state.lastWager)?Math.min(1000,Math.max(10,state.lastWager)):50;
 const bet='<form method="post" data-blackjack-form data-bj-bet action="/arcade/online/blackjack/bet" class="bj-bet-form">'+
  token(ctx)+'<input type="hidden" name="request_id" value="'+randomUUID()+'">'+
  '<input type="hidden" name="round_id" value="'+esc(roundId)+'">'+
  '<label>Wager <input type="number" name="wager" data-blackjack-wager data-arcade-wager="blackjack" min="10" max="1000" step="1" value="'+wager+'" required></label>'+
  '<div class="bj-quick-bets"><button type="button" data-bj-wager="10">10</button>'+
  '<button type="button" data-bj-wager="50">50</button><button type="button" data-bj-wager="100">100</button>'+
  '<button type="button" data-bj-wager="500">500</button><button type="button" data-bj-wager="1000">1K</button></div>'+
  '<button type="submit" class="btn btn-primary">Place wager</button></form>';
 const actionButtons=state.actions.map(action=>
  '<form method="post" data-blackjack-form data-bj-action action="/arcade/online/blackjack/action">'+
   token(ctx)+'<input type="hidden" name="request_id" value="'+randomUUID()+'">'+
   '<input type="hidden" name="round_id" value="'+esc(roundId)+'">'+
   '<input type="hidden" name="seq" value="'+String(state.seq)+'">'+
   '<input type="hidden" name="action" value="'+action+'">'+
   '<button type="submit" class="btn '+(action==='stand'?'btn-outline':'btn-primary')+'">'+
   ({hit:'Hit',stand:'Stand',double:'Double Down',split:'Split'}[action])+'</button></form>'
 ).join('');
 return '<div class="bj-action-zone" data-bj-controls>'+
  '<div class="bj-wager-head"><div><small>YOUR POINTS</small><strong>'+n(state.balance)+'</strong></div>'+
  '<div><small>ROUND POT</small><strong>'+n(state.roundWager)+' pts</strong></div>'+
  '<div><small>PLAYERS BETTING</small><strong>'+n(state.roundPlayers)+'</strong></div></div>'+
  '<div class="bj-timer"><small>ROUND STATUS</small><strong data-bj-countdown>—</strong></div>'+
  '<p data-bj-message class="bj-message">'+esc(playerStatus(state))+'</p>'+
  (!state.joined?join:'')+
 (state.canBet?bet:'')+
  (state.actions.length?'<div class="bj-actions">'+actionButtons+'</div>':'')+
  (state.myResult?'<div class="bj-round-result '+(state.myResult.profit>0?'bj-result-win':'bj-result-loss')+'">'+
   '<div><small>LAST HAND RESULT</small><strong>'+(state.myResult.profit>0?'+':'')+n(state.myResult.profit)+' pts</strong></div>'+
   '<p>'+n(state.myResult.payout)+' returned from '+n(state.myResult.wager)+' wagered</p></div>':'')+
 '</div>';
}
export function blackjackPage(ctx,summary,state){
 const userId=ctx.user.id;
 state={...state,playerId:userId};
 return shell(ctx,'Online Blackjack','<div class="arcade-root bj-root" data-blackjack-root data-bj-round="'+esc(state.roundId||'')+'">'+
  '<div class="arcade-header bj-hero"><div><div class="arcade-eyebrow">SB ARCADE · MULTIPLAYER TABLE</div>'+
  '<h1>Blackjack <span class="bj-live">● LIVE TABLE</span></h1>'+
  '<p>Up to four players against one dealer. Place your bet, watch the cards and take your turn.</p></div>'+
  '<a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong data-bj-wallet>'+n(summary.balance)+' ✦</strong><small>Shared Arcade wallet</small></a></div>'+
  '<div class="bj-toolbar"><a href="/arcade/online" class="btn btn-outline">← Online Games</a>'+
  '<div class="arcade-experience-options"><button type="button" data-arcade-sound aria-pressed="true" class="arcade-experience-sound">🔊 Sound on</button>'+
  '<label>Animations <select data-arcade-motion><option value="full">Full</option>'+
  '<option value="reduced">Reduced</option><option value="instant">Instant</option></select></label></div>'+
  '<span class="bj-sync" data-bj-connection>Connecting…</span></div>'+
  '<div data-bj-table>'+tableMarkup(state,userId)+'</div>'+
  '<div data-bj-action-panel>'+controls(ctx,state)+'</div>'+
  '<section class="panel padded bj-rules"><h2>How this table works</h2>'+
  '<p>Seats are reserved when a betting window opens. Each player can wager 10–1,000 points. The dealer draws to 17 and stands on soft 17. Natural Blackjack pays 3:2 (rounded down to whole points); a normal win pays 1:1 and a tie returns your stake. Split matching ranks once; split aces receive one card each. Doubling and splitting charge an additional equal wager. If a turn times out, the server automatically stands that hand. All payouts are settled server-side even if you disconnect.</p>'+
  '<p class="muted tiny">This game uses entertainment points only. It does not involve real money or monetary prizes.</p></section></div>');
}
