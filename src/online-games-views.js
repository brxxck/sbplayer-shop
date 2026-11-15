// BUILT BY SB // RUNING ON WEED AND CAFFEINE
// Website-wide multiplayer lobby: live Blackjack and continuously running Global Crash.
import {shell,esc,token} from './views.js';
const n=value=>Number(value||0).toLocaleString('en-GB');

const form=(ctx,game,joined)=>'<form method="post" action="/arcade/online/'+(joined?'leave':'join')+'" class="online-join-form">'+
 token(ctx)+'<input type="hidden" name="game" value="'+game+'">'+
 '<button type="submit" class="btn '+(joined?'btn-outline':'btn-primary')+'">'+
 (joined?'Leave lobby':game==='blackjack'?'Join Blackjack queue':'Join Global Crash')+'</button></form>';

function card(ctx,game,data){
 const bj=game==='blackjack',seats=bj?'<div class="online-counter"><span>AT TABLE</span><strong data-online-stat="blackjack.seated">'+n(data.seated)+' / 4</strong></div><div class="online-counter"><span>WAITING</span><strong data-online-stat="blackjack.waiting">'+n(data.waiting)+'</strong></div>':'';
 const players='<div class="online-counter"><span>PLAYERS IN LOBBY</span><strong data-online-stat="'+game+'.lobbyPlayers">'+n(data.lobbyPlayers)+'</strong></div>';
 const wager='<div class="online-counter"><span>POINTS IN LIVE ROUND</span><strong data-online-stat="'+game+'.roundWager">'+n(data.roundWager)+' pts</strong></div>';
 const roundPlayers='<div class="online-counter"><span>PLAYERS IN LIVE ROUND</span><strong data-online-stat="'+game+'.roundPlayers">'+n(data.roundPlayers)+'</strong></div>';
 const description=bj?'One shared blackjack table with four seats. New players wait in order until a seat opens.':
  'Synchronized Global Crash rounds with live wagers, player totals, and no fixed four-player cap.';
 const status=bj?
  (data.joined?(data.atTable?'You have a seat (#'+n(data.position)+').':'You are #'+n(data.position)+' in the waiting queue.'):'You have not joined the preview lobby.'):
  (data.joined?'You are in the Global Crash lobby.':'Join this lobby to place wagers during the next betting window.');
 return '<article class="online-room" data-online-game="'+game+'">'+
  '<div class="online-room-head"><span class="online-room-graphic" aria-hidden="true">'+(bj?'♠':'🚀')+'</span>'+
  '<div><div class="online-room-kicker">'+(bj?'MULTIPLAYER TABLE':'GLOBAL LIVE ROUNDS')+'</div>'+
  '<h2>'+(bj?'4-Player Blackjack':'Global Crash')+'</h2></div>'+
  '<span class="online-room-badge" style="color:#83e5ba;border-color:#328468;background:#0c523629">LIVE GAME</span></div>'+
  '<p>'+description+'</p>'+
  '<div class="online-stats">'+players+seats+roundPlayers+wager+'</div>'+
  '<p class="online-own-status" data-online-status="'+game+'" role="status">'+esc(status)+'</p>'+
  form(ctx,game,data.joined)+
  (bj?'<a class="btn btn-primary" href="/arcade/online/blackjack">♠ Open Blackjack table →</a>':'<a class="btn btn-primary" href="/arcade/online/crash">🚀 Watch Global Crash live →</a>')+
  '<p class="online-warning">'+(bj?'Four seats per round. Wagers are only placed at the table during the betting countdown.':'Place 10–1,000 points in the live betting window and collect before the rocket crashes.')+'</p>'+
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

export function onlineGamesPage(ctx,summary,state){
 return shell(ctx,'Online Games','<div class="online-games-root" data-online-games>'+
  '<div class="arcade-header online-hero"><div><div class="arcade-eyebrow">SB ARCADE · COMMUNITY MULTIPLAYER</div>'+
  '<h1>Online Games</h1><p>Play four-seat Blackjack, global Crash or live Roulette with 30 full seconds for betting.</p></div>'+
  '<a class="arcade-wallet" href="/points"><small>YOUR POINTS</small><strong>'+n(summary.balance)+' <span>✦</span></strong><small>Claim more from levels →</small></a></div>'+
  '<nav class="arcade-tabs" aria-label="Arcade sections"><a href="/arcade">Solo Arcade</a><a href="/arcade/online" aria-current="page">Online Games</a>'+
  '<a href="/arcade/history">History</a><a href="/arcade/leaderboard">Leaderboard</a></nav>'+
  '<div class="online-section-heading"><div><h2>Shared game lobbies</h2><p>All three games share Level Points, live player counts and server-controlled rounds.</p></div>'+
  '<span class="online-live-indicator" data-online-connection>Checking lobbies…</span></div>'+
  '<section class="online-room-grid" aria-label="Multiplayer game lobbies">'+card(ctx,'blackjack',state.blackjack)+card(ctx,'crash',state.crash)+rouletteCard(state)+'</section>'+
  '<section class="online-foundation-notes panel padded"><h2>One table, shared rounds</h2><p>Up to four members can play Blackjack at one table. New players wait for the next betting round. The live round shows how many players joined and the points wagered. Global Crash runs automatically without a four-seat participant cap, while global Roulette cycles through 30 seconds of betting, eight seconds of spinning and four seconds of results. Existing solo games are unchanged.</p></section>'+
 '</div>');
}
