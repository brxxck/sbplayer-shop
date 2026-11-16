// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Website-wide multiplayer lobby with Blackjack and Roulette. Global Crash is hidden.
import {shell,esc,token} from './views.js';
const n=value=>Number(value||0).toLocaleString('en-GB');

// Only live playable online games are shown. Global Crash is intentionally
// hidden and unqueueable until its multiplayer engine is rebuilt.
const form=(ctx,joined)=>'<form method="post" action="/arcade/online/'+(joined?'leave':'join')+'" class="online-join-form">'+
 token(ctx)+'<input type="hidden" name="game" value="blackjack">'+
 '<input type="hidden" name="next" value="blackjack">'+
 '<button type="submit" class="btn '+(joined?'btn-outline':'btn-primary')+'">'+
 (joined?'Leave Blackjack queue':'♠ Join & Play Blackjack')+'</button></form>';

function blackjackCard(ctx,data){
 const seats='<div class="online-counter"><span>AT TABLE</span><strong data-online-stat="blackjack.seated">'+n(data.seated)+' / 4</strong></div>'+
  '<div class="online-counter"><span>WAITING</span><strong data-online-stat="blackjack.waiting">'+n(data.waiting)+'</strong></div>';
 const players='<div class="online-counter"><span>PLAYERS IN LOBBY</span><strong data-online-stat="blackjack.lobbyPlayers">'+n(data.lobbyPlayers)+'</strong></div>';
 const wager='<div class="online-counter"><span>POINTS IN LIVE ROUND</span><strong data-online-stat="blackjack.roundWager">'+n(data.roundWager)+' pts</strong></div>';
 const roundPlayers='<div class="online-counter"><span>PLAYERS IN LIVE ROUND</span><strong data-online-stat="blackjack.roundPlayers">'+n(data.roundPlayers)+'</strong></div>';
 const status=data.joined?(data.atTable?'You have a seat (#'+n(data.position)+').':'You are #'+n(data.position)+' in the waiting queue.'):
  'Join to reserve a seat and open the live table.';
 return '<article class="online-room" data-online-game="blackjack">'+
  '<div class="online-room-head"><span class="online-room-graphic" aria-hidden="true">♠</span>'+
  '<div><div class="online-room-kicker">MULTIPLAYER TABLE</div><h2>4-Player Blackjack</h2></div>'+
  '<span class="online-room-badge" style="color:#83e5ba;border-color:#328468;background:#0c523629">LIVE GAME</span></div>'+
  '<p>One shared Blackjack table with four seats. New players wait in order until a seat opens.</p>'+
  '<div class="online-stats">'+players+seats+roundPlayers+wager+'</div>'+
  '<p class="online-own-status" data-online-status="blackjack" role="status">'+esc(status)+'</p>'+
  form(ctx,data.joined)+
  '<a class="btn '+(data.joined?'btn-primary':'btn-outline')+'" href="/arcade/online/blackjack">♠ '+
   (data.joined?'Play Blackjack now':'View live table')+' →</a>'+
  '<p class="online-warning">Four seats per round. Wagers are only placed at the table during the betting countdown.</p>'+
 '</article>';
}

function rouletteCard(state){
 const data=state.roulette;
 return '<article class="online-room" data-online-game="roulette">'+
  '<div class="online-room-head"><span class="online-room-graphic" aria-hidden="true">🎡</span>'+
  '<div><div class="online-room-kicker">EUROPEAN ROULETTE · GLOBAL</div><h2>Live Roulette</h2></div>'+
  '<span class="online-room-badge" style="color:#83e5ba;border-color:#328468;background:#0c523629">LIVE GAME</span></div>'+
  '<p>30 full seconds to bet. Everyone watches the same 8-second wheel spin and 4-second result.</p>'+
  '<div class="online-stats"><div class="online-counter"><span>WATCHING</span><strong data-online-stat="roulette.watching">'+n(data.watching)+'</strong></div>'+
  '<div class="online-counter"><span>PLAYERS BETTING</span><strong data-online-stat="roulette.roundPlayers">'+n(data.roundPlayers)+'</strong></div>'+
  '<div class="online-counter"><span>POINTS IN ROUND</span><strong data-online-stat="roulette.roundWager">'+n(data.roundWager)+' pts</strong></div>'+
  '<div class="online-counter"><span>CURRENT PHASE</span><strong class="roulette-lobby-phase" data-online-stat="roulette.phase">'+esc(data.phase)+'</strong></div></div>'+
  '<a class="btn btn-primary" href="/arcade/online/roulette">🎡 Open Live Roulette →</a>'+
  '<p class="online-warning">No queue limit. Choose chips and confirm before the betting countdown closes.</p></article>';
}

function pokerCard(){
 return '<article class="online-room" data-online-game="poker">'+
  '<div class="online-room-head"><span class="online-room-graphic" aria-hidden="true">♠</span>'+
  '<div><div class="online-room-kicker">TEXAS HOLD EM · LIVE AND PRIVATE</div><h2>Live Poker</h2></div>'+
  '<span class="online-room-badge">LIVE GAME</span></div>'+
  '<p>2–6 players · 50 / 100 blinds · points are your chips. No tournaments or buy-ins.</p>'+
  '<a class="btn btn-primary" href="/arcade/poker">♠ Join or Create Poker Table →</a>'+
  '<p class="online-warning">Also includes Solo Poker against medium bots and invite-only Private Poker.</p></article>';
}
export function onlineGamesPage(ctx,summary,state){
 return shell(ctx,'Online Games','<div class="online-games-root" data-online-games>'+
  '<div class="arcade-header online-hero"><div><div class="arcade-eyebrow">SB ARCADE · COMMUNITY MULTIPLAYER</div>'+
  '<h1>Online Games</h1><p>Play four-seat Blackjack, live Roulette and Texas Hold'em Poker.</p></div>'+
  '<a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong>'+n(summary.balance)+' <span>✦</span></strong><small>Claim more from levels →</small></a></div>'+
  '<nav class="arcade-tabs" aria-label="Arcade sections"><a href="/arcade">Solo Arcade</a><a href="/arcade/online" aria-current="page">Online Games</a>'+
  '<a href="/arcade/history">History</a><a href="/arcade/leaderboard">Leaderboard</a></nav>'+
  '<div class="online-section-heading"><div><h2>Shared game lobbies</h2><p>All live games share Level Points, live player counts and server-controlled rounds.</p></div>'+
  '<span class="online-live-indicator" data-online-connection>Checking lobbies…</span></div>'+
  '<section class="online-room-grid" aria-label="Multiplayer game lobbies">'+blackjackCard(ctx,state.blackjack)+rouletteCard(state)+pokerCard()+'</section>'+
  '<section class="online-foundation-notes panel padded"><h2>One table, shared rounds</h2><p>Up to four members can play Blackjack at one table. New players wait for the next betting round. The live round shows how many players joined and the points wagered. Global Roulette cycles through 30 seconds of betting, eight seconds of spinning and four seconds of results. Existing solo games are unchanged.</p></section>'+
 '</div>');
}
